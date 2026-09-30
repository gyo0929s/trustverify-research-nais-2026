import test from 'node:test';
import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { once } from 'node:events';
import { readFile } from 'node:fs/promises';
import { canonicalJson } from '../src/kci/adapter.js';
import { GROUNDING, RECORD_RELEVANCE } from '../src/claim-evidence/contract.js';
import { createTrustVerifyServer } from '../src/server.js';

// Korean Claim–Evidence qualification (K1, K2). Offline replay through the trace route; live KCI must never run.
const artifact = path => readFile(new URL(`../artifacts/evaluation/${path}`, import.meta.url), 'utf8').then(JSON.parse);
const korean = await artifact('claim-evidence-korean/korean-cases.json');
const originalD4 = await artifact('claim-evidence-p0/d4-unrelated-reference.json');
const financeD4 = await artifact('claim-evidence-finance-d4/finance-d4.json');
const sha256 = value => createHash('sha256').update(canonicalJson(value), 'utf8').digest('hex');
const byId = id => korean.cases.find(item => item.case_id === id);

async function withServer(run) {
  const liveMustNotRun = { async articleSearch() { throw new Error('no live KCI'); }, async articleDetail() { throw new Error('no live KCI'); } };
  const server = createTrustVerifyServer({ kciAdapter: liveMustNotRun });
  server.listen(0, '127.0.0.1');
  await once(server, 'listening');
  const base = `http://127.0.0.1:${server.address().port}`;
  const post = body => fetch(`${base}/api/claim-evidence/trace`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) });
  try { await run(post); } finally { server.close(); await once(server, 'close'); }
}

test('K1 and K2 use real KCI records: VERIFIED with canonical metadata and hash-consistent Korean abstracts', () => {
  assert.deepEqual(korean.cases.map(item => item.article_id), ['ART001298965', 'ART003117733']);
  for (const item of korean.cases) {
    assert.equal(item.citation_integrity_live.status, 'VERIFIED');
    assert.equal(item.citation_integrity_live.rule_id, 'REF-META-001');
    assert.ok(item.citation_integrity_live.field_comparisons.every(comparison => comparison.result === 'MATCH'));
    const evidence = korean.abstract_evidence[item.article_id];
    const { evidence_hash: hash, ...content } = evidence;
    assert.equal(sha256(content), hash);
    assert.equal(evidence.record_id, item.article_id);
    assert.ok(evidence.abstracts.some(abstract => /\p{Script=Hangul}/u.test(abstract.value)), 'Korean abstract present');
  }
  // K1 uses the exact canonical KCI title (with fullwidth quotes), not the older typed variant.
  assert.ok(byId('K1').citation.title.includes('＂행동경제학＂'));
  assert.equal(Object.hasOwn(byId('K1').citation, 'doi'), false);
  assert.equal(byId('K2').citation.doi, '10.22875/jiti.2024.25.4.001');
  // The quoted passages come from the real abstracts, not hand-written evidence.
  const k1Korean = korean.abstract_evidence.ART001298965.abstracts.find(abstract => abstract.lang === 'original').value;
  assert.ok(k1Korean.includes('인간이 가지는 인지적인 한계와 편향들에 대한 고려를 충분히 한 법제가 결국 자본시장을 발전시키는 법제가 될 것이며'));
  const k2Korean = korean.abstract_evidence.ART003117733.abstracts.find(abstract => abstract.lang === 'original').value;
  assert.ok(k2Korean.includes('미국 SEC가 제재금을 부과하는 사례도 발생하고 있다'));
});

for (const caseId of ['K1', 'K2']) {
  for (const variant of ['control', 'perturbation']) {
    test(`${caseId} ${variant} replays through the KOREAN_P0 trace to the observed ${byId(caseId)[variant].observed_status}`, async () => {
      const expected = byId(caseId)[variant];
      await withServer(async post => {
        const body = await (await post({ scenario: 'KOREAN_P0', evidence_mode: 'FROZEN_EVIDENCE', draft_text: expected.draft_sentence, references: [byId(caseId).reference] })).json();
        assert.equal(body.scenario, 'KOREAN_P0');
        assert.equal(body.citation_integrity.status, 'VERIFIED');
        assert.equal(body.citation_integrity.article_id, byId(caseId).article_id);
        assert.equal(body.citation_integrity.finding_id, expected.citation_integrity.finding_id);
        assert.equal(body.claim_evidence.status, expected.observed_status);
        assert.equal(body.claim_evidence.signal, expected.signal);
        assert.equal(body.claim_evidence.rule_id, expected.rule_id);
        assert.deepEqual(body.claim_evidence.evidence_span, expected.evidence_span);
        assert.equal(body.claim_evidence.finding_id, expected.finding_id);
      });
    });
  }
}

test('K2 is a clean pair; K1 is recorded as not discriminating (observed limitation, not tuned)', () => {
  const k2 = byId('K2');
  assert.equal(k2.qualification, 'CLEAN_PAIR');
  assert.equal(k2.control.observed_status, 'CONSISTENT_WITH_EVIDENCE');
  assert.equal(k2.perturbation.observed_status, 'POTENTIAL_CLAIM_SHIFT');
  assert.equal(k2.perturbation.signal, 'MODALITY_STRENGTHENED');
  assert.deepEqual(k2.perturbation.observed_dimensions.modality.citing_markers, ['반드시']);
  assert.equal(k2.presentation_preset, true);

  const k1 = byId('K1');
  assert.equal(k1.qualification, 'NOT_DISCRIMINATING');
  assert.equal(k1.presentation_preset, false);
  assert.equal(k1.control.observed_status, 'POTENTIAL_CLAIM_SHIFT');
  assert.equal(k1.control.observed_dimensions.modality.evidence, 'POSSIBILITY');
  assert.deepEqual(k1.control.observed_dimensions.modality.evidence_markers, ['수 있']);
});

test('controlled claims are labeled; thresholds unchanged; other scenarios untouched', () => {
  for (const item of korean.cases) {
    assert.equal(item.control.provenance, 'CONTROLLED_PRESERVATION');
    assert.equal(item.perturbation.provenance, 'CONTROLLED_PERTURBATION');
    assert.equal(item.control.draft_sentence.replace(/\s*\[1\]\.$/u, ''), item.control.citing_claim.replace(/\.$/u, ''));
  }
  assert.deepEqual({ ...GROUNDING }, { MIN_SHARED_ANCHORS: 3, MIN_COVERAGE: 0.6 });
  assert.deepEqual({ ...RECORD_RELEVANCE }, { MIN_SHARED_ANCHORS: 2 });
  assert.deepEqual(originalD4.cases.map(item => item.claim_evidence.finding_id), ['claim-d46caafa57abe6b9', 'claim-4ea2a838ec1d26e7']);
  assert.deepEqual(financeD4.cases.map(item => item.claim_evidence.finding_id), ['claim-8137ba956fb76737', 'claim-4c638eca82e6cb66']);
});

test('Korean artifact is sanitized and carries no accusing verdicts', () => {
  const serialized = JSON.stringify(korean.evidence) + JSON.stringify(korean.abstract_evidence) + JSON.stringify(korean.cases.map(item => item.metadata));
  assert.equal(/key=|authorization|public_url|\[REDACTED\]|open\.kci\.go\.kr|kciportal|source_path/i.test(serialized), false);
  assert.ok((serialized.match(/https?:\/\/[^"\s]+/g) ?? []).every(url => url.startsWith('http://dx.doi.org/')));
  assert.equal(/WRONG_REFERENCE|FAKE_REFERENCE|HALLUCINATION|"FALSE"/.test(JSON.stringify(korean.cases)), false);
});
