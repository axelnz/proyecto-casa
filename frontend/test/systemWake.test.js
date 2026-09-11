import test from 'node:test';
import assert from 'node:assert/strict';
import { monitorSystem, waitForRetry } from '../src/utils/systemWake.js';

function scenario(sequence, overrides = {}) {
  let time = 0;
  let posts = 0;
  const stages = [];
  const run = () => monitorSystem({
    getStatus: async () => {
      const next = sequence.shift() || 'restoring';
      if (next instanceof Error) throw next;
      return { state: next, message: next };
    },
    restore: async () => { posts++; return { state: 'restoring' }; },
    onStatus: status => stages.push(status.state),
    now: () => time, maxWaitMs: 30000,
    sleep: async ms => { time += ms; }, ...overrides
  });
  return { run, stages, posts: () => posts };
}

test('handles sleeping backend, restores once, checks database, then reports ready', async () => {
  const f = scenario([new Error('network timeout'), 'paused', 'restoring', 'checking_database', 'ready']);
  assert.equal((await f.run()).state, 'ready');
  assert.equal(f.posts(), 1);
  assert.ok(f.stages.includes('connecting'));
  assert.ok(f.stages.includes('checking_database'));
});

test('public activation passes only the cancellation signal, without a secret', async () => {
  const controller = new AbortController();
  const calls = [];
  const f = scenario(['paused', 'ready'], { signal: controller.signal, restore: async (...args) => {
    calls.push(args);
    return { state: 'restoring' };
  } });
  assert.equal((await f.run()).state, 'ready');
  assert.deepEqual(calls, [[controller.signal]]);
});

test('lost restore response is polled, never resubmitted', async () => {
  let posts = 0;
  const f = scenario(['paused', 'paused', 'restoring', 'ready'], { restore: async () => { posts++; throw new Error('timeout'); } });
  assert.equal((await f.run()).state, 'ready');
  assert.equal(posts, 1);
});

test('rejected requests, rate limit and unavailable state stop without reloading', async () => {
  for (const status of [403, 429]) {
    const error = Object.assign(new Error('denied'), { response: { status } });
    await assert.rejects(scenario(['paused'], { restore: async () => { throw error; } }).run(), /denied/);
  }
  await assert.rejects(scenario(['unavailable']).run(), /unavailable/);
  await assert.rejects(scenario(['paused'], { restore: async () => ({ state: 'unavailable', message: 'configuration missing' }) }).run(), /configuration missing/);
});

test('wait is bounded and ready does not require a restore', async () => {
  await assert.rejects(scenario(['restoring']).run(), /Todavía no pudimos confirmar/);
  const f = scenario(['ready']);
  assert.equal((await f.run()).state, 'ready');
  assert.equal(f.posts(), 0);
});

test('navigation cancellation immediately stops an outstanding retry timer', async () => {
  const controller = new AbortController();
  const pending = waitForRetry(100000, controller.signal);
  controller.abort();
  await assert.rejects(pending, { name: 'AbortError' });
  await assert.rejects(scenario(['paused'], { signal: controller.signal }).run(), { name: 'AbortError' });
});
