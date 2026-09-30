import test from 'node:test';
import assert from 'node:assert/strict';
import { once } from 'node:events';
import { readFile } from 'node:fs/promises';
import { createCitationAuditService } from '../src/citation/audit.js';
import { createCitationBatchService, MAX_BATCH_SIZE, summarizeBatch } from '../src/citation/batch.js';
import { parseReference, parseReferenceList } from '../src/citation/reference-parser.js';
import { createTrustVerifyServer } from '../src/server.js';

// Fully offline: replays the sanitized evidence frozen from the live demo run (2026-10-01).
const frozen = JSON.parse(await readFile(new URL('../artifacts/evaluation/batch-demo/demo-batch-results.json', import.meta.url), 'utf8'));
const demoRows = parseReferenceList(await readFile(new URL('./fixtures/batch/demo-bibliography.txt', import.meta.url), 'utf8')).rows;
const toRecord = record => ({ source_record_id: record.article_id, ...record });
const ZERO = { state: 'KCI_ZERO_RESULTS', messages: ['No Data'], records: [], total: 0 };
const UNAVAILABLE = { state: 'KCI_UNAVAILABLE', messages: [], records: [], total: null };

// Frozen adapter: search evidence looked up by exact query title, detail by article ID.
function frozenAdapter({ overrides = {} } = {}) {
  const searchByTitle = new Map();
  const detailById = new Map();
  for (const item of frozen.items) {
    const evidence = frozen.evidence[item.evidence_hash];
    searchByTitle.set(item.input.title, evidence.search);
    if (evidence.detail) detailById.set(evidence.detail.records[0].article_id, evidence.detail);
  }
  const calls = { search: 0, detail: 0, inFlight: 0, maxInFlight: 0 };
  const track = async work => {
    calls.inFlight += 1;
    calls.maxInFlight = Math.max(calls.maxInFlight, calls.inFlight);
    try { await new Promise(resolve => setImmediate(resolve)); return await work(); } finally { calls.inFlight -= 1; }
  };
  return {
    calls,
    articleSearch: ({ title }) => track(async () => {
      calls.search += 1;
      if (Object.hasOwn(overrides, title)) {
        const override = overrides[title];
        if (override instanceof Error) throw override;
        return structuredClone(override);
      }
      const search = searchByTitle.get(title);
      if (!search) return structuredClone(ZERO);
      return { state: search.state, messages: [], total: search.total, records: search.records.map(toRecord) };
    }),
    articleDetail: id => track(async () => {
      calls.detail += 1;
      const detail = detailById.get(id);
      if (!detail) return structuredClone(UNAVAILABLE);
      return { state: detail.state, messages: [], total: 1, records: detail.records.map(toRecord) };
    }),
  };
}

function batchWith(adapter) {
  return createCitationBatchService({ auditService: createCitationAuditService({ kciAdapter: adapter }) });
}

async function withNetworkBlocked(run) {
  const realFetch = globalThis.fetch;
  globalThis.fetch = () => { throw new Error('Live network access is forbidden in batch tests'); };
  try { return await run(); } finally { globalThis.fetch = realFetch; }
}

// Compares against the observed live summary; keys added to the summary later must be zero here.
function assertObservedSummary(summary) {
  const observed = frozen.observed_summary;
  assert.deepEqual(summary.status_counts, observed.status_counts);
  assert.equal(summary.total, observed.total);
  assert.equal(summary.system_failure, observed.system_failure);
  assert.equal(summary.row_errors, observed.row_errors);
  for (const [key, count] of Object.entries(summary.not_audited)) assert.equal(count, observed.not_audited[key] ?? 0);
}

const statuses = result => result.items.map(item => item.finding?.status ?? item.finding?.system_state ?? item.outcome);

// Recomputes the summary independently from the items, so counts are proven to be derived.
function assertSummaryMatchesItems(result) {
  assert.deepEqual(result.summary, summarizeBatch(result.items));
  const research = result.items.filter(item => item.finding?.kind === 'RESEARCH_FINDING');
  for (const status of ['VERIFIED', 'METADATA_DRIFT', 'REVIEW_REQUIRED', 'NOT_FOUND_IN_KCI']) {
    assert.equal(result.summary.status_counts[status], research.filter(item => item.finding.status === status).length);
  }
  assert.equal(result.summary.system_failure, result.items.filter(item => item.finding?.kind === 'SYSTEM_FAILURE').length);
  assert.equal(result.summary.total, result.items.length);
}

test('B1 valid-only batch: three real records are VERIFIED and counts come from results', async () => {
  const result = await withNetworkBlocked(() => batchWith(frozenAdapter()).auditBatch({ references: demoRows.slice(0, 3) }));
  assert.deepEqual(statuses(result), ['VERIFIED', 'VERIFIED', 'VERIFIED']);
  assert.equal(result.summary.status_counts.VERIFIED, 3);
  assertSummaryMatchesItems(result);
});

test('B2 valid + METADATA_DRIFT: only the mutated row drifts, on the mutated field', async () => {
  const result = await withNetworkBlocked(() => batchWith(frozenAdapter()).auditBatch({ references: [demoRows[1], demoRows[3]] }));
  assert.deepEqual(statuses(result), ['VERIFIED', 'METADATA_DRIFT']);
  const mismatched = result.items[1].finding.field_comparisons.filter(item => item.result === 'MISMATCH').map(item => item.field);
  assert.deepEqual(mismatched, ['publication_year']);
  assertSummaryMatchesItems(result);
});

test('B3 UNPARSED row is NOT_AUDITED, never NOT_FOUND_IN_KCI, and never reaches KCI', async () => {
  const adapter = frozenAdapter();
  const unparsed = parseReference('just some words', 2);
  const result = await withNetworkBlocked(() => batchWith(adapter).auditBatch({ references: [demoRows[0], unparsed] }));
  assert.equal(result.items[1].outcome, 'NOT_AUDITED');
  assert.equal(result.items[1].parse_status, 'UNPARSED');
  assert.equal(result.items[1].finding, null);
  assert.equal(result.summary.status_counts.NOT_FOUND_IN_KCI, 0);
  assert.equal(result.summary.not_audited.UNPARSED, 1);
  assert.equal(adapter.calls.search, 1);
  assertSummaryMatchesItems(result);
});

test('B4 NOT_FOUND_IN_KCI row comes only from a validated zero-result search', async () => {
  const row = { ...parseReference('홍길동 (2020). A Title That Is Not Indexed In KCI. 저널.', 2) };
  const result = await withNetworkBlocked(() => batchWith(frozenAdapter()).auditBatch({ references: [demoRows[0], row] }));
  assert.equal(row.parse_status, 'READY');
  assert.deepEqual(statuses(result), ['VERIFIED', 'NOT_FOUND_IN_KCI']);
  assert.equal(result.items[1].finding.rule_id, 'REF-SEARCH-001');
  assert.equal(result.summary.not_audited.UNPARSED, 0);
  assertSummaryMatchesItems(result);
});

test('B5 citation-level SYSTEM FAILURE is isolated and never counted as a citation defect', async () => {
  const adapter = frozenAdapter({ overrides: { [demoRows[1].title]: UNAVAILABLE } });
  const result = await withNetworkBlocked(() => batchWith(adapter).auditBatch({ references: demoRows.slice(0, 3) }));
  assert.deepEqual(statuses(result), ['VERIFIED', 'KCI_UNAVAILABLE', 'VERIFIED']);
  assert.equal(result.items[1].finding.kind, 'SYSTEM_FAILURE');
  assert.equal(Object.hasOwn(result.items[1].finding, 'status'), false);
  assert.equal(result.summary.system_failure, 1);
  assert.equal(Object.values(result.summary.status_counts).reduce((sum, count) => sum + count, 0), 2);
  assertSummaryMatchesItems(result);
});

test('B6 mixed demo batch replays offline to the observed live results, in order', async () => {
  const result = await withNetworkBlocked(() => batchWith(frozenAdapter()).auditBatch({ references: demoRows }));
  assert.deepEqual(result.items.map(item => item.index), [1, 2, 3, 4, 5, 6]);
  assert.deepEqual(result.items.map(item => item.row_id), demoRows.map(row => row.row_id));
  for (const [position, observed] of frozen.items.entries()) {
    const item = result.items[position];
    assert.equal(item.finding.status, observed.observed_status);
    assert.equal(item.finding.rule_id, observed.rule_id);
    assert.equal(item.finding.finding_id, observed.finding_id);
    assert.deepEqual(item.finding.field_comparisons.map(({ field, result: outcome }) => ({ field, result: outcome })), observed.field_comparisons);
  }
  assertObservedSummary(result.summary);
  assertSummaryMatchesItems(result);
});

test('batch findings are the unchanged single-citation contract', async () => {
  const adapter = frozenAdapter();
  const single = await createCitationAuditService({ kciAdapter: adapter }).auditCitation(
    { title: demoRows[3].title, authors: demoRows[3].authors, publication_year: demoRows[3].publication_year, doi: demoRows[3].doi },
  );
  const result = await withNetworkBlocked(() => batchWith(frozenAdapter()).auditBatch({ references: [demoRows[3]] }));
  assert.deepEqual(result.items[0].finding, single);
});

test('one row failure does not fail the whole batch', async () => {
  const adapter = frozenAdapter({ overrides: { [demoRows[0].title]: new Error('unexpected adapter crash') } });
  const invalid = { row_id: 'ref-x', parse_status: 'READY', title: '   ' };
  const result = await withNetworkBlocked(() => batchWith(adapter).auditBatch({ references: [demoRows[0], invalid, demoRows[1]] }));
  assert.deepEqual(result.items.map(item => item.outcome), ['ROW_ERROR', 'INVALID_INPUT', 'AUDITED']);
  assert.equal(result.items[2].finding.status, 'VERIFIED');
  assert.equal(result.summary.row_errors, 2);
  assertSummaryMatchesItems(result);
});

test('B7 max batch size: 20 rows run sequentially; 21 rows are rejected', async () => {
  const adapter = frozenAdapter();
  const twenty = Array.from({ length: MAX_BATCH_SIZE }, (_, position) => ({ ...demoRows[position % 3], row_id: `ref-${position + 1}` }));
  const result = await withNetworkBlocked(() => batchWith(adapter).auditBatch({ references: twenty }));
  assert.equal(result.count, 20);
  assert.equal(adapter.calls.maxInFlight, 1);
  assert.equal(result.summary.status_counts.VERIFIED, 20);
  await assert.rejects(() => batchWith(frozenAdapter()).auditBatch({ references: [...twenty, demoRows[0]] }), /at most 20/);
});

async function withServer(run) {
  const server = createTrustVerifyServer({ kciAdapter: frozenAdapter() });
  server.listen(0, '127.0.0.1');
  await once(server, 'listening');
  const { port } = server.address();
  try { await run(`http://127.0.0.1:${port}`); } finally { server.close(); await once(server, 'close'); }
}

const post = (base, path, body, contentType = 'application/json') => fetch(`${base}${path}`, {
  method: 'POST', headers: { 'Content-Type': contentType }, body: typeof body === 'string' ? body : JSON.stringify(body),
});

test('B8 malformed batch requests return 4xx with an error field only', async () => {
  await withServer(async base => {
    const cases = [
      [await post(base, '/api/audit/citations', '{', 'application/json'), 400],
      [await post(base, '/api/audit/citations', { references: 'nope' }), 400],
      [await post(base, '/api/audit/citations', { references: [] }), 400],
      [await post(base, '/api/audit/citations', { references: [{ title: 'x' }] }), 400],
      [await post(base, '/api/audit/citations', { references: Array.from({ length: 21 }, () => demoRows[0]) }), 400],
      [await post(base, '/api/audit/citations', '{}', 'text/plain'), 415],
      [await post(base, '/api/references/parse', { text: 42 }), 400],
    ];
    for (const [response, expectedStatus] of cases) {
      assert.equal(response.status, expectedStatus);
      const body = await response.json();
      assert.deepEqual(Object.keys(body), ['error']);
      assert.equal(/stack|key=|authorization|https?:\/\//i.test(JSON.stringify(body)), false);
    }
    const wrongMethod = await fetch(`${base}/api/audit/citations`);
    assert.equal(wrongMethod.status, 405);
  });
});

test('HTTP flow: example -> parse -> batch keeps order, counts, and leaks no secrets', async () => {
  await withServer(async base => {
    const example = await (await fetch(`${base}/api/references/example`)).json();
    assert.equal(example.is_demo, true);
    const parsed = await (await post(base, '/api/references/parse', { text: example.text })).json();
    assert.equal(parsed.count, 6);
    assert.equal(parsed.max_batch_size, 20);
    const response = await post(base, '/api/audit/citations', { references: parsed.rows });
    assert.equal(response.status, 200);
    const result = await response.json();
    assert.equal(result.contract_version, 'trustverify-citation-batch-v1');
    assertObservedSummary(result.summary);
    assert.deepEqual(result.items.map(item => item.row_id), parsed.rows.map(row => row.row_id));
    assert.equal(/key=|authorization|\[REDACTED\]|open\.kci\.go\.kr/i.test(JSON.stringify(result)), false);
  });
});

test('frozen demo evidence carries no credential and no URL except the bibliographic DOI', () => {
  const serialized = JSON.stringify(frozen.evidence);
  assert.equal(/key=|authorization|public_url|\[REDACTED\]|open\.kci\.go\.kr|kciportal/i.test(serialized), false);
  const urls = serialized.match(/https?:\/\/[^"\s]+/g) ?? [];
  assert.ok(urls.every(url => url.startsWith('http://dx.doi.org/')));
});

test('FROZEN_EVIDENCE mode replays the observed demo through the real engine and never calls live KCI', async () => {
  const liveMustNotRun = {
    async articleSearch() { throw new Error('live KCI must not be called in FROZEN_EVIDENCE mode'); },
    async articleDetail() { throw new Error('live KCI must not be called in FROZEN_EVIDENCE mode'); },
  };
  const server = createTrustVerifyServer({ kciAdapter: liveMustNotRun });
  server.listen(0, '127.0.0.1');
  await once(server, 'listening');
  const base = `http://127.0.0.1:${server.address().port}`;
  try {
    const uncovered = parseReference('홍길동 (2020). A Title Without Frozen Evidence. 저널.', 7);
    const response = await post(base, '/api/audit/citations', { evidence_mode: 'FROZEN_EVIDENCE', references: [...demoRows, uncovered] });
    assert.equal(response.status, 200);
    const result = await response.json();
    assert.equal(result.evidence_mode, 'FROZEN_EVIDENCE');
    for (const [position, observed] of frozen.items.entries()) {
      assert.equal(result.items[position].finding.status, observed.observed_status);
      assert.equal(result.items[position].finding.finding_id, observed.finding_id);
    }
    assert.equal(result.items[6].outcome, 'NO_FROZEN_EVIDENCE');
    assert.equal(result.items[6].finding, null);
    assert.equal(result.summary.not_audited.NO_FROZEN_EVIDENCE, 1);
    assert.deepEqual(result.summary.status_counts, frozen.observed_summary.status_counts);

    const badMode = await post(base, '/api/audit/citations', { evidence_mode: 'DEMO', references: demoRows });
    assert.equal(badMode.status, 400);
    assert.deepEqual(Object.keys(await badMode.json()), ['error']);
  } finally { server.close(); await once(server, 'close'); }
});

test('NEEDS_REVIEW rows are listed but not sent to KCI', async () => {
  const adapter = frozenAdapter();
  const ambiguous = parseReference('Zhang, M., & Shin, S. S. (2024). Computer Vision-based Basketball Player Training System. 저널.', 2);
  assert.equal(ambiguous.parse_status, 'NEEDS_REVIEW');
  const result = await withNetworkBlocked(() => batchWith(adapter).auditBatch({ references: [demoRows[0], ambiguous] }));
  assert.deepEqual(result.items.map(item => item.outcome), ['AUDITED', 'NOT_AUDITED']);
  assert.equal(result.summary.not_audited.NEEDS_REVIEW, 1);
  assert.equal(adapter.calls.search, 1);
});

test('batch UI has no synthetic verdict path and uses the real batch endpoint', async () => {
  const source = await readFile(new URL('../src/ui/app.js', import.meta.url), 'utf8');
  assert.equal(source.includes('DEMO_BATCH_FIXTURES'), false);
  assert.equal(/\[\s*i\s*%/.test(source), false, 'no row-index modulo fixture selection');
  assert.equal(source.includes("(isDrift ? 'ART003062835'"), false, 'no hardcoded record fallback');
  assert.equal(source.includes("'REF-META-002')"), false, 'no hardcoded rule fallback');
  assert.ok(source.includes("fetch('/api/audit/citations'"));
  const executeBody = source.slice(source.indexOf('async function executeBatchAudit()'), source.indexOf('function renderBatchSummary()'));
  assert.equal(executeBody.includes("fetch('/api/audit/citation'"), false, 'batch does not loop the single endpoint');
  assert.equal(executeBody.includes("system_state: 'KCI_UNAVAILABLE'"), false, 'request errors are never turned into KCI outages');
});
