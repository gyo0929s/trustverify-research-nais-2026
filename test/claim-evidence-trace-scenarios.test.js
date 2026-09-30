import test from 'node:test';
import assert from 'node:assert/strict';
import { once } from 'node:events';
import { readFile } from 'node:fs/promises';
import { createTrustVerifyServer } from '../src/server.js';
import { INSUFFICIENT_BOUNDARY_NOTE } from '../src/claim-evidence/trace.js';

// Scenario-selectable frozen trace: ORIGINAL_D4 (default, unchanged) and FINANCE_D4. Offline; live KCI must never run.
const artifact = path => readFile(new URL(`../artifacts/evaluation/${path}`, import.meta.url), 'utf8').then(JSON.parse);
const original = await artifact('claim-evidence-p0/d4-unrelated-reference.json');
const finance = await artifact('claim-evidence-finance-d4/finance-d4.json');
const FIN_SENTENCE = 'The estimation results suggest that equity prices fall in response to a contractionary, hawkish monetary policy shock';

async function withServer(run) {
  const liveMustNotRun = { async articleSearch() { throw new Error('no live KCI'); }, async articleDetail() { throw new Error('no live KCI'); } };
  const server = createTrustVerifyServer({ kciAdapter: liveMustNotRun });
  server.listen(0, '127.0.0.1');
  await once(server, 'listening');
  const base = `http://127.0.0.1:${server.address().port}`;
  const post = body => fetch(`${base}/api/claim-evidence/trace`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) });
  try { await run(post); } finally { server.close(); await once(server, 'close'); }
}

test('omitted scenario keeps the original D4 behavior and says so', async () => {
  await withServer(async post => {
    for (const expected of original.cases) {
      const body = await (await post({ draft_text: expected.draft_sentence, references: original.bibliography.split('\n'), evidence_mode: 'FROZEN_EVIDENCE' })).json();
      assert.equal(body.scenario, 'ORIGINAL_D4');
      assert.equal(body.scenario_defaulted, true);
      assert.equal(body.citation_integrity.article_id, expected.citation_integrity.kci_record_id);
      assert.equal(body.claim_evidence.status, expected.claim_evidence.status);
      assert.equal(body.claim_evidence.insufficiency_reason, expected.claim_evidence.insufficiency_reason);
      assert.equal(body.claim_evidence.finding_id, expected.claim_evidence.finding_id);
    }
    const explicit = await (await post({ scenario: 'ORIGINAL_D4', draft_text: original.cases[0].draft_sentence, references: original.bibliography.split('\n') })).json();
    assert.equal(explicit.scenario_defaulted, false);
    assert.equal(explicit.claim_evidence.finding_id, original.cases[0].claim_evidence.finding_id);
  });
});

test('FINANCE_D4: [2] → ART002510435 VERIFIED → INSUFFICIENT_EVIDENCE / CLAIM_NOT_GROUNDED_IN_ABSTRACT', async () => {
  await withServer(async post => {
    const body = await (await post({ scenario: 'FINANCE_D4', draft_text: `${FIN_SENTENCE} [2].`, references: finance.bibliography.split('\n'), evidence_mode: 'FROZEN_EVIDENCE' })).json();
    const expected = finance.cases.find(item => item.case_id === 'FIN-D4');
    assert.equal(body.scenario, 'FINANCE_D4');
    assert.equal(body.evidence_mode, 'FROZEN_EVIDENCE');
    assert.equal(body.linking.marker, '[2]');
    assert.equal(body.citation_integrity.article_id, 'ART002510435');
    assert.equal(body.citation_integrity.article_title, finance.abstract_evidence.ART002510435.title);
    assert.equal(body.citation_integrity.status, 'VERIFIED');
    assert.equal(body.claim_evidence.status, 'INSUFFICIENT_EVIDENCE');
    assert.equal(body.claim_evidence.insufficiency_reason, 'CLAIM_NOT_GROUNDED_IN_ABSTRACT');
    assert.equal(body.claim_evidence.rule_id, 'CE-GROUND-001');
    assert.equal(body.claim_evidence.evidence_span, null);
    assert.equal(body.claim_evidence.human_review_required, true);
    assert.equal(body.claim_evidence.boundary_note, INSUFFICIENT_BOUNDARY_NOTE);
    assert.equal(body.claim_evidence.finding_id, expected.claim_evidence.finding_id);
  });
});

test('FINANCE_D4 contrast: same sentence, only [2] → [1], gives CONSISTENT_WITH_EVIDENCE on sentence #4', async () => {
  await withServer(async post => {
    const references = finance.bibliography.split('\n');
    const unrelated = await (await post({ scenario: 'FINANCE_D4', draft_text: `${FIN_SENTENCE} [2].`, references })).json();
    const source = await (await post({ scenario: 'FINANCE_D4', draft_text: `${FIN_SENTENCE} [1].`, references })).json();
    const expected = finance.cases.find(item => item.case_id === 'FIN-D4-CONTRAST');
    assert.equal(source.citing_claim, unrelated.citing_claim);
    assert.equal(source.linking.marker, '[1]');
    assert.equal(source.citation_integrity.article_id, 'ART002961723');
    assert.equal(source.citation_integrity.article_title, finance.abstract_evidence.ART002961723.title);
    assert.equal(source.citation_integrity.status, 'VERIFIED');
    assert.equal(source.claim_evidence.status, 'CONSISTENT_WITH_EVIDENCE');
    assert.equal(source.claim_evidence.rule_id, 'CE-CONSIST-001');
    assert.equal(source.claim_evidence.evidence_span.sentence_index, 4);
    assert.equal(source.claim_evidence.boundary_note, null);
    assert.equal(source.claim_evidence.finding_id, expected.claim_evidence.finding_id);
  });
});

test('scenarios never fall back to each other, and unknown or LIVE requests are rejected', async () => {
  await withServer(async post => {
    // Original D4 bibliography under FINANCE_D4: not covered → no result, never the original evidence.
    const crossed = await (await post({ scenario: 'FINANCE_D4', draft_text: original.cases[0].draft_sentence, references: original.bibliography.split('\n') })).json();
    assert.deepEqual(crossed.citation_integrity, { state: 'NO_FROZEN_EVIDENCE' });
    assert.equal(crossed.claim_evidence.state, 'NOT_RUN');
    const crossedBack = await (await post({ scenario: 'ORIGINAL_D4', draft_text: `${FIN_SENTENCE} [1].`, references: finance.bibliography.split('\n') })).json();
    assert.deepEqual(crossedBack.citation_integrity, { state: 'NO_FROZEN_EVIDENCE' });

    for (const bad of [
      { scenario: 'FINANCE_D5', draft_text: `${FIN_SENTENCE} [1].`, references: finance.bibliography.split('\n') },
      { scenario: '', draft_text: `${FIN_SENTENCE} [1].`, references: finance.bibliography.split('\n') },
      { scenario: 'FINANCE_D4', evidence_mode: 'LIVE', draft_text: `${FIN_SENTENCE} [1].`, references: finance.bibliography.split('\n') },
    ]) {
      const response = await post(bad);
      assert.equal(response.status, 400);
      assert.deepEqual(Object.keys(await response.json()), ['error']);
    }
  });
});

test('trace responses carry no accusing wording and no secrets', async () => {
  await withServer(async post => {
    const body = await (await post({ scenario: 'FINANCE_D4', draft_text: `${FIN_SENTENCE} [2].`, references: finance.bibliography.split('\n') })).json();
    const serialized = JSON.stringify(body);
    assert.equal(/WRONG_REFERENCE|FAKE_REFERENCE|HALLUCINATION|"FALSE"|wrong paper|does not contain/i.test(serialized), false);
    assert.equal(/key=|authorization|\[REDACTED\]|open\.kci\.go\.kr|kciportal/i.test(serialized), false);
  });
  const source = await readFile(new URL('../src/claim-evidence/trace.js', import.meta.url), 'utf8');
  assert.equal(/잘못된 논문|없습니다\./.test(INSUFFICIENT_BOUNDARY_NOTE), false);
  assert.ok(source.includes(INSUFFICIENT_BOUNDARY_NOTE));
});
