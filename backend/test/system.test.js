const test = require('node:test');
const assert = require('node:assert/strict');
const express = require('express');
const { createSystemService } = require('../src/services/systemService');
const createSystemRouter = require('../src/routes/systemRoutes');

const env = {
  SUPABASE_PROJECT_REF: 'abcdefghijklmnopqrst',
  SUPABASE_MANAGEMENT_TOKEN: 'test-management-token'
};
function fixture(overrides = {}) {
  let time = 0;
  let healthy = false;
  let projectState = 'INACTIVE';
  const requests = [];
  const service = createSystemService({
    env, now: () => time,
    checkDatabase: async () => healthy,
    fetchImpl: async (url, options) => {
      requests.push({ url, method: options.method });
      return { ok: true, json: async () => ({ status: projectState }) };
    }, ...overrides
  });
  return { service, requests, advance: ms => { time += ms; }, setHealthy: value => { healthy = value; }, setProject: value => { projectState = value; } };
}

test('a healthy database works without administrative credentials or management calls', async () => {
  const f = fixture({ env: {} });
  f.setHealthy(true);
  assert.equal((await f.service.getStatus()).state, 'ready');
  assert.equal(f.requests.length, 0);
});

test('missing administrative configuration and injected project path fail closed', async () => {
  for (const config of [{}, { ...env, SUPABASE_MANAGEMENT_TOKEN: '' }, { ...env, SUPABASE_PROJECT_REF: '../other' }]) {
    const f = fixture({ env: config });
    assert.equal((await f.service.getStatus()).state, 'unavailable');
    await assert.rejects(f.service.restore(), { status: 503 });
    assert.equal(f.requests.length, 0);
  }
});

test('public activation works without a user session or activation code', async () => {
  let probes = 0;
  const f = fixture({ checkDatabase: async () => { probes++; return false; } });
  assert.equal((await f.service.restore()).state, 'restoring');
  assert.equal(probes, 1);
  assert.equal(f.requests.filter(req => req.method === 'POST').length, 1);
});

test('paused project receives a single restore despite concurrent requests and stale state', async () => {
  const f = fixture();
  assert.equal((await f.service.getStatus()).state, 'paused');
  const statuses = await Promise.all(Array.from({ length: 8 }, () => f.service.restore()));
  assert.ok(statuses.every(status => status.state === 'restoring'));
  assert.equal(f.requests.filter(req => req.method === 'POST').length, 1);
  await f.service.restore();
  assert.equal(f.requests.filter(req => req.method === 'POST').length, 1);
  assert.equal(f.requests.find(req => req.method === 'POST').url, 'https://api.supabase.com/v1/projects/abcdefghijklmnopqrst/restore');
});

test('lost restore response retains cooldown and does not resend the operation', async () => {
  let posts = 0;
  const f = fixture({ fetchImpl: async (url, options) => {
    if (options.method === 'POST') { posts++; throw new Error('connection lost'); }
    return { ok: true, json: async () => ({ status: 'INACTIVE' }) };
  } });
  await assert.rejects(f.service.restore(), { status: 503 });
  f.advance(10000);
  assert.equal((await f.service.restore()).state, 'restoring');
  assert.equal(posts, 1);
});

test('Healthy in Supabase alone is insufficient: a database query must succeed', async () => {
  const f = fixture();
  f.setProject('ACTIVE_HEALTHY');
  assert.equal((await f.service.getStatus()).state, 'checking_database');
  await f.service.restore();
  assert.equal(f.requests.filter(req => req.method === 'POST').length, 0);
  f.setHealthy(true);
  f.advance(6000);
  assert.equal((await f.service.getStatus()).state, 'ready');
});

test('restoring, unknown and failed project states never trigger a restore', async () => {
  for (const state of ['RESTORING', 'COMING_UP', 'PAUSING', 'UPGRADING', 'INIT_FAILED', 'REMOVED', 'NEW_UNKNOWN_STATE']) {
    const f = fixture();
    f.setProject(state);
    assert.notEqual((await f.service.restore()).state, 'ready');
    assert.equal(f.requests.filter(req => req.method === 'POST').length, 0);
  }
});

test('cache merges concurrent status checks and expires', async () => {
  const f = fixture();
  await Promise.all(Array.from({ length: 12 }, () => f.service.getStatus()));
  assert.equal(f.requests.length, 1);
  await f.service.getStatus();
  assert.equal(f.requests.length, 1);
  f.advance(6000);
  await f.service.getStatus();
  assert.equal(f.requests.length, 2);
});

test('management errors do not reveal provider bodies, token or database details', async () => {
  for (const status of [401, 403, 404, 429, 500]) {
    const f = fixture({ fetchImpl: async () => ({ ok: false, status, json: async () => ({ secret: env.SUPABASE_MANAGEMENT_TOKEN }) }) });
    await assert.rejects(f.service.getStatus(), error => {
      assert.equal(error.status, status === 429 ? 429 : 503);
      assert.ok(!error.message.includes(env.SUPABASE_MANAGEMENT_TOKEN));
      return true;
    });
  }
});

async function withServer(callback) {
  const f = fixture();
  const app = express();
  app.use('/api/system', createSystemRouter(f.service));
  const server = app.listen(0, '127.0.0.1');
  await new Promise(resolve => server.once('listening', resolve));
  const base = `http://127.0.0.1:${server.address().port}/api/system`;
  try { await callback(base, f); } finally { await new Promise(resolve => server.close(resolve)); }
}

test('public HTTP activation ignores caller-supplied projects and does not leak secrets', async () => {
  await withServer(async (base, f) => {
    const status = await fetch(`${base}/status`);
    assert.equal(status.headers.get('cache-control'), 'no-store');
    assert.deepEqual(Object.keys(await status.json()).sort(), ['canWake', 'message', 'state']);
    const accepted = await fetch(`${base}/wake`, { method: 'POST' });
    assert.equal(accepted.status, 202);
    assert.equal((await accepted.json()).state, 'restoring');
    const injected = await fetch(`${base}/wake`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ projectRef: 'other-project', action: 'delete', url: 'https://example.com' }) });
    assert.equal(injected.status, 202);
    assert.ok(!(await injected.text()).includes(env.SUPABASE_MANAGEMENT_TOKEN));
    assert.equal(f.requests.filter(req => req.method === 'POST').length, 1);
    assert.equal(f.requests.find(req => req.method === 'POST').url, 'https://api.supabase.com/v1/projects/abcdefghijklmnopqrst/restore');
  });
});

test('wake has an independent attempt limit and rejects oversized/malformed bodies', async () => {
  await withServer(async base => {
    for (const body of ['{"invalid":', JSON.stringify({ invalid: 'x'.repeat(1500) })]) {
      const response = await fetch(`${base}/wake`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body });
      assert.ok([400, 413].includes(response.status));
      assert.deepEqual(await response.json(), { error: 'Solicitud de activación inválida.' });
    }
    for (let i = 0; i < 3; i++) {
      assert.equal((await fetch(`${base}/wake`, { method: 'POST' })).status, 202);
    }
    assert.equal((await fetch(`${base}/wake`, { method: 'POST' })).status, 429);
    const status = await fetch(`${base}/status`);
    assert.equal(status.status, 202);
    assert.equal((await status.json()).state, 'restoring');
  });
});
