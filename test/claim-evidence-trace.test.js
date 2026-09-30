import test from 'node:test';
import assert from 'node:assert/strict';
import { once } from 'node:events';
import { readFile } from 'node:fs/promises';
import { createCitationAuditService } from '../src/citation/audit.js';
import { createFrozenEvidenceAdapter } from '../src/citation/frozen-evidence.js';
import { LINKING_STATES, traceDraftCitation } from '../src/claim-evidence/trace.js';
import { createTrustVerifyServer } from '../src/server.js';

// Draft → reference → KCI → claim trace, fully offline over the frozen D4 evidence.
const d4 = JSON.parse(await readFile(new URL('../artifacts/evaluation/claim-evidence-p0/d4-unrelated-reference.json', import.meta.url), 'utf8'));
const references = d4.bibliography.split('\n');
const [d4Case, contrastCase] = d4.cases;

// Spy dependencies: count audit calls so linking failures are proven never to reach KCI.
function deps() {
  const frozen = createFrozenEvidenceAdapter(d4);
  const audit = createCitationAuditService({ kciAdapter: frozen });
  const calls = { audit: 0 };
  return {
    calls,
    auditService: { auditCitation: async citation => { calls.audit += 1; return audit.auditCitation(citation); } },
    covers: citation => frozen.covers(citation),
    abstractEvidenceFor: recordId => d4.abstract_evidence[recordId] ?? null,
  };
}

async function offline(run) {
  const realFetch = globalThis.fetch;
  globalThis.fetch = () => { throw new Error('Live network access is forbidden in trace tests'); };
  try { return await run(); } finally { globalThis.fetch = realFetch; }
}
const trace = (draftText, refs = references, spy = deps()) => offline(() => traceDraftCitation({ draftText, references: refs, evidenceMode: 'FROZEN_EVIDENCE' }, spy));

test('D4 trace: marker [2] → row 2 → ART003062835 VERIFIED → INSUFFICIENT_EVIDENCE / NO_RELEVANT_EVIDENCE_IN_REFERENCED_RECORD', async () => {
  const result = await trace(d4Case.draft_sentence);
  assert.equal(result.linking.state, LINKING_STATES.RESOLVED);
  assert.equal(result.linking.marker, '[2]');
  assert.equal(result.linking.row_index, 2);
  assert.equal(result.citation_integrity.status, 'VERIFIED');
  assert.equal(result.citation_integrity.rule_id, 'REF-META-001');
  assert.equal(result.citation_integrity.article_id, 'ART003062835');
  assert.ok(result.citation_integrity.field_comparisons.every(item => item.result === 'MATCH'));
  assert.equal(result.citation_integrity.finding_id, d4.items[1].finding_id);
  assert.equal(result.claim_evidence.status, 'INSUFFICIENT_EVIDENCE');
  assert.equal(result.claim_evidence.rule_id, 'CE-GROUND-001');
  assert.equal(result.claim_evidence.insufficiency_reason, 'NO_RELEVANT_EVIDENCE_IN_REFERENCED_RECORD');
  assert.equal(result.claim_evidence.evidence_span, null);
  assert.equal(result.claim_evidence.finding_id, d4Case.claim_evidence.finding_id);
});

test('D4-CONTRAST trace: same sentence, only the cited source differs → CONSISTENT_WITH_EVIDENCE', async () => {
  const unrelated = await trace(d4Case.draft_sentence);
  const source = await trace(contrastCase.draft_sentence);
  assert.equal(source.citing_claim, unrelated.citing_claim);
  assert.equal(d4Case.draft_sentence.replace('[2]', '[n]'), contrastCase.draft_sentence.replace('[1]', '[n]'));
  assert.equal(source.citation_integrity.status, 'VERIFIED');
  assert.equal(source.citation_integrity.article_id, 'ART003267604');
  assert.equal(source.claim_evidence.status, 'CONSISTENT_WITH_EVIDENCE');
  assert.equal(source.claim_evidence.rule_id, 'CE-CONSIST-001');
  assert.equal(source.claim_evidence.evidence_span.sentence_index, 9);
  assert.equal(source.claim_evidence.finding_id, contrastCase.claim_evidence.finding_id);
});

test('linking failures stop before KCI and are never KCI or evidence statuses', async () => {
  const claim = 'The simulation results suggest a limit in the load-sharing capacity of interproximal contacts';
  const cases = [
    [`${claim}.`, LINKING_STATES.MARKER_UNRESOLVED],
    [`${claim} [2a].`, LINKING_STATES.MARKER_UNRESOLVED],
    [`${claim} [1], [2].`, LINKING_STATES.MULTIPLE_MARKERS_UNSUPPORTED],
    [`${claim} [3].`, LINKING_STATES.REFERENCE_INDEX_OUT_OF_RANGE],
  ];
  for (const [draft, state] of cases) {
    const spy = deps();
    const result = await trace(draft, references, spy);
    assert.equal(result.linking.state, state, draft);
    assert.equal(spy.calls.audit, 0, `${draft} must not call KCI`);
    assert.equal(result.citation_integrity, null);
    assert.equal(result.claim_evidence, null);
    assert.equal(/NOT_FOUND_IN_KCI|SYSTEM_FAILURE|INSUFFICIENT_EVIDENCE/.test(JSON.stringify(result)), false);
  }
  const spy = deps();
  const parseReview = await trace(`${claim} [2].`, [references[0], '[2] Zhang, M., & Shin, S. S. (2024). Computer Vision-based Basketball Player Training System. 저널.'], spy);
  assert.equal(parseReview.linking.state, LINKING_STATES.REFERENCE_PARSE_REVIEW);
  assert.equal(parseReview.linking.parse_status, 'NEEDS_REVIEW');
  assert.equal(spy.calls.audit, 0);
});

test('a valid reference is audited once, and only the resolved row', async () => {
  const spy = deps();
  await trace(d4Case.draft_sentence, references, spy);
  assert.equal(spy.calls.audit, 1);
});

test('row order does not matter: the printed marker number selects the row', async () => {
  const reversed = await trace(d4Case.draft_sentence, [...references].reverse());
  assert.equal(reversed.citation_integrity.article_id, 'ART003062835');
  assert.equal(reversed.claim_evidence.finding_id, d4Case.claim_evidence.finding_id);
});

test('trace replay is deterministic and never emits accusing statuses', async () => {
  // Sequential on purpose: each run swaps globalThis.fetch, so overlapping runs would restore it incorrectly.
  const runs = [];
  for (let run = 0; run < 3; run += 1) runs.push(await trace(d4Case.draft_sentence));
  assert.ok(runs.every(run => JSON.stringify(run) === JSON.stringify(runs[0])));
  assert.equal(/WRONG_REFERENCE|FAKE_REFERENCE|HALLUCINATION|"FALSE"/.test(JSON.stringify(runs[0])), false);
  const source = await readFile(new URL('../src/claim-evidence/trace.js', import.meta.url), 'utf8');
  assert.equal(/WRONG_REFERENCE|FAKE_REFERENCE|HALLUCINATION/.test(source), false);
});

test('POST /api/claim-evidence/trace serves FROZEN_EVIDENCE only, validates input, and leaks nothing', async () => {
  const liveMustNotRun = { async articleSearch() { throw new Error('no live KCI'); }, async articleDetail() { throw new Error('no live KCI'); } };
  const server = createTrustVerifyServer({ kciAdapter: liveMustNotRun });
  server.listen(0, '127.0.0.1');
  await once(server, 'listening');
  const base = `http://127.0.0.1:${server.address().port}`;
  const post = body => fetch(`${base}/api/claim-evidence/trace`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) });
  try {
    const ok = await post({ draft_text: d4Case.draft_sentence, references, evidence_mode: 'FROZEN_EVIDENCE' });
    assert.equal(ok.status, 200);
    const body = await ok.json();
    assert.equal(body.evidence_mode, 'FROZEN_EVIDENCE');
    assert.equal(body.claim_evidence.insufficiency_reason, 'NO_RELEVANT_EVIDENCE_IN_REFERENCED_RECORD');
    assert.equal(/key=|authorization|\[REDACTED\]|open\.kci\.go\.kr|kciportal/i.test(JSON.stringify(body)), false);
    for (const bad of [
      { draft_text: d4Case.draft_sentence, references, evidence_mode: 'LIVE' },
      { draft_text: '', references },
      { draft_text: d4Case.draft_sentence, references: [] },
      { draft_text: d4Case.draft_sentence, references: [42] },
    ]) {
      const response = await post(bad);
      assert.equal(response.status, 400);
      assert.deepEqual(Object.keys(await response.json()), ['error']);
    }
  } finally { server.close(); await once(server, 'close'); }
});
