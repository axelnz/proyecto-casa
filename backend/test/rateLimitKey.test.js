const test = require('node:test');
const assert = require('node:assert/strict');
const express = require('express');
const rateLimit = require('express-rate-limit');
const { createRateLimitKey } = require('../src/config/rateLimitKey');

const request = (edgeIp, ip = '192.0.2.9') => ({
  get: () => edgeIp, ip, socket: { remoteAddress: '10.0.0.1' }
});

test('only Render trusts the edge header; missing or malformed values fall back to the socket', () => {
  const localKey = createRateLimitKey({});
  const renderKey = createRateLimitKey({ RENDER: 'true' });
  assert.equal(localKey(request('203.0.113.1')), '192.0.2.9');
  assert.equal(renderKey(request('203.0.113.1')), '203.0.113.1');
  for (const value of [undefined, '', '203.0.113.1, 203.0.113.2', 'not-an-ip']) {
    assert.equal(renderKey(request(value)), '10.0.0.1');
  }
});

test('IPv6 addresses in the same subnet share the attempt limit', () => {
  const key = createRateLimitKey({ RENDER: 'true' });
  assert.equal(key(request('2001:db8:1234:5600::1')), key(request('2001:db8:1234:56ff::2')));
  assert.notEqual(key(request('2001:db8:1234:5600::1')), key(request('2001:db8:1234:5700::1')));
});

test('changing forwarded headers cannot reset a client limit behind the Render edge', async () => {
  const app = express();
  app.set('trust proxy', 1);
  app.use(rateLimit({ windowMs: 60000, limit: 2, keyGenerator: createRateLimitKey({ RENDER: 'true' }) }));
  app.get('/', (req, res) => res.sendStatus(200));
  const server = app.listen(0, '127.0.0.1');
  await new Promise(resolve => server.once('listening', resolve));
  const url = `http://127.0.0.1:${server.address().port}`;
  try {
    for (let i = 0; i < 3; i++) {
      const result = await fetch(url, { headers: { 'CF-Connecting-IP': '203.0.113.1', 'X-Forwarded-For': `192.0.2.${i + 1}` } });
      assert.equal(result.status, i < 2 ? 200 : 429);
    }
    assert.equal((await fetch(url, { headers: { 'CF-Connecting-IP': '203.0.113.2' } })).status, 200);
  } finally {
    await new Promise(resolve => server.close(resolve));
  }
});
