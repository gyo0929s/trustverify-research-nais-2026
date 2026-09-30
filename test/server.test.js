import test from 'node:test';
import assert from 'node:assert/strict';
import { once } from 'node:events';
import { readFile } from 'node:fs/promises';
import { classifyKciResponse } from '../src/kci/adapter.js';
import { createTrustVerifyServer, MAX_JSON_BODY_BYTES } from '../src/server.js';

const fixtureXml = async name => JSON.parse((await readFile(
  new URL(`../artifacts/api-qualification/kci/${name}.redacted.json`, import.meta.url), 'utf8',
)).replace(/^\uFEFF/, '')).response_xml;
const search = classifyKciResponse({ body: await fixtureXml('success-search'), operation: 'articleSearch' });
const detail = classifyKciResponse({ body: await fixtureXml('success-detail'), operation: 'articleDetail', expectedId: 'ART003062835' });

async function withServer(run, adapter = {
  async articleSearch() { return structuredClone(search); },
  async articleDetail() { return structuredClone(detail); },
}) {
  const server = createTrustVerifyServer({ kciAdapter: adapter });
  server.listen(0, '127.0.0.1');
  await once(server, 'listening');
  const { port } = server.address();
  try { await run(`http://127.0.0.1:${port}`); }
  finally { server.close(); await once(server, 'close'); }
}

test('POST /api/audit/citation returns canonical backend finding', async () => {
  await withServer(async base => {
    const response = await fetch(`${base}/api/audit/citation`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json; charset=utf-8' },
      body: JSON.stringify({
        title: 'Computer Vision-based Basketball Player Training System',
        publication_year: '2024',
      }),
    });
    assert.equal(response.status, 200);
    const body = await response.json();
    assert.equal(body.kind, 'RESEARCH_FINDING');
    assert.equal(body.status, 'VERIFIED');
    assert.equal(Object.hasOwn(body, '_display'), false);
  });
});

test('POST endpoint returns system failure contract without citation status', async () => {
  const unavailable = {
    async articleSearch() {
      return { state: 'KCI_UNAVAILABLE', messages: [], records: [], total: null };
    },
    async articleDetail() { throw new Error('must not run'); },
  };
  await withServer(async base => {
    const response = await fetch(`${base}/api/audit/citation`, {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ title: 'Example' }),
    });
    const body = await response.json();
    assert.equal(body.kind, 'SYSTEM_FAILURE');
    assert.equal(body.system_state, 'KCI_UNAVAILABLE');
    assert.equal(Object.hasOwn(body, 'status'), false);
  }, unavailable);
});

test('endpoint enforces content type, JSON validity, input validity, and body limit', async () => {
  await withServer(async base => {
    const wrongType = await fetch(`${base}/api/audit/citation`, { method: 'POST', body: '{}' });
    assert.equal(wrongType.status, 415);
    const malformed = await fetch(`${base}/api/audit/citation`, {
      method: 'POST', headers: { 'Content-Type': 'application/json' }, body: '{',
    });
    assert.equal(malformed.status, 400);
    const invalid = await fetch(`${base}/api/audit/citation`, {
      method: 'POST', headers: { 'Content-Type': 'application/json' }, body: '{}',
    });
    assert.equal(invalid.status, 400);
    const oversized = await fetch(`${base}/api/audit/citation`, {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ title: 'x'.repeat(MAX_JSON_BODY_BYTES) }),
    });
    assert.equal(oversized.status, 413);
    for (const response of [wrongType, malformed, invalid, oversized]) {
      const body = await response.json();
      assert.deepEqual(Object.keys(body), ['error']);
      assert.equal(JSON.stringify(body).includes('stack'), false);
    }
  });
});

test('/api/findings wraps display metadata without mutating canonical fixtures', async () => {
  await withServer(async base => {
    const response = await fetch(`${base}/api/findings`);
    assert.equal(response.status, 200);
    const body = await response.json();
    assert.equal(body.findings.length, 5);
    for (const entry of body.findings) {
      assert.ok(entry.finding);
      assert.equal(entry.display.evidence_mode, 'DEMO');
      assert.equal(Object.hasOwn(entry.finding, '_display'), false);
      assert.equal(Object.hasOwn(entry.finding, 'display'), false);
    }
  });
});
