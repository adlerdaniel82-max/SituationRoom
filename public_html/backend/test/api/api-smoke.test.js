require('../../src/config/env');

const test = require('node:test');
const assert = require('node:assert/strict');

const app = require('../../src/app');
const { getPool } = require('../../src/config/db');
const { loadSources } = require('../../src/config/sources');

let server;
let baseUrl;

test.before(async () => {
  await loadSources();
  await new Promise((resolve) => {
    server = app.listen(0, '127.0.0.1', () => {
      const address = server.address();
      baseUrl = `http://127.0.0.1:${address.port}`;
      resolve();
    });
  });
});

test.after(async () => {
  if (!server) {
    const pool = getPool();
    if (pool) {
      await pool.end();
    }
    return;
  }

  await new Promise((resolve, reject) => {
    server.close((error) => (error ? reject(error) : resolve()));
  });

  const pool = getPool();
  if (pool) {
    await pool.end();
  }
});

test('GET /api/health returns basic service state', async () => {
  const response = await fetch(`${baseUrl}/api/health`);
  assert.equal(response.status, 200);
  const body = await response.json();
  assert.equal(body.status, 'ok');
  assert.ok(body.timestamp);
});

test('GET /api/health/ready returns readiness information', async () => {
  const response = await fetch(`${baseUrl}/api/health/ready`);
  assert.equal(response.status, 200);
  const body = await response.json();
  assert.equal(body.ready, true);
});

test('GET /api/sources/status returns visible source rows without retired feeds', async () => {
  const response = await fetch(`${baseUrl}/api/sources/status`);
  assert.equal(response.status, 200);
  const body = await response.json();
  assert.ok(Array.isArray(body));
  const ids = new Set(body.map((entry) => entry.id));
  assert.ok(ids.has('usgs'));
  assert.ok(ids.has('guardian'));
  assert.ok(ids.has('aljazeera'));
  assert.equal(ids.has('ap'), false);
  assert.equal(ids.has('reuters'), false);
});

test('GET /api/events returns event rows', async () => {
  const response = await fetch(`${baseUrl}/api/events?limit=3`);
  assert.equal(response.status, 200);
  const body = await response.json();
  assert.ok(Array.isArray(body));
  assert.ok(body.length <= 3);
  if (body.length > 0) {
    assert.ok(body[0].id);
    assert.ok(body[0].source);
    assert.ok(body[0].title);
  }
});
