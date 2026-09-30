import test from 'node:test';
import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { readFile } from 'node:fs/promises';
import { canonicalJson } from '../src/kci/adapter.js';
import { createCitationAuditService } from '../src/citation/audit.js';
import { createFrozenEvidenceAdapter } from '../src/citation/frozen-evidence.js';
import { GROUNDING, RECORD_RELEVANCE, STATUSES } from '../src/claim-evidence/contract.js';
import { traceDraftCitation } from '../src/claim-evidence/trace.js';

// Finance-domain D4 qualification (ADOPTED as a candidate). Offline replay; network blocked.
const fin = JSON.parse(await readFile(new URL('../artifacts/evaluation/claim-evidence-finance-d4/finance-d4.json', import.meta.url), 'utf8'));
const originalD4 = JSON.parse(await readFile(new URL('../artifacts/evaluation/claim-evidence-p0/d4-unrelated-reference.json', import.meta.url), 'utf8'));
const sha256 = value => createHash('sha256').update(canonicalJson(value), 'utf8').digest('hex');
const references = fin.bibliography.split('\n');
const byId = id => fin.cases.find(item => item.case_id === id);

async function replay(draftText) {
  const adapter = createFrozenEvidenceAdapter(fin);
  const deps = {
    auditService: createCitationAuditService({ kciAdapter: adapter }),
    covers: citation => adapter.covers(citation),
    abstractEvidenceFor: recordId => fin.abstract_evidence[recordId] ?? null,
  };
  const realFetch = globalThis.fetch;
  globalThis.fetch = () => { throw new Error('Live network access is forbidden in finance D4 tests'); };
  try { return await traceDraftCitation({ draftText, references, evidenceMode: 'FROZEN_EVIDENCE' }, deps); } finally { globalThis.fetch = realFetch; }
}

test('both finance records are real KCI records that pass Citation Integrity with real abstracts', () => {
  for (const role of ['SOURCE_A', 'SOURCE_B']) {
    const record = fin.qualification[role];
    assert.equal(record.detail_state, 'KCI_OK');
    assert.equal(record.citation_integrity.status, 'VERIFIED');
    assert.equal(record.citation_integrity.rule_id, 'REF-META-001');
    assert.ok(record.citation_integrity.field_comparisons.every(item => item.result === 'MATCH'));
    assert.equal(record.abstract_available, true);
    assert.equal(record.english_abstract_available, true);
    const evidence = fin.abstract_evidence[record.article_id];
    const { evidence_hash: hash, ...content } = evidence;
    assert.equal(sha256(content), hash, `${role} abstract evidence hash`);
    assert.equal(evidence.record_id, record.article_id);
  }
});

for (const expected of fin.cases) {
  test(`${expected.case_id} replays offline to the observed ${expected.claim_evidence.status}`, async () => {
    const result = await replay(expected.draft_sentence);
    assert.equal(result.linking.marker, expected.marker);
    assert.equal(result.linking.row_index, expected.resolved_row_index);
    assert.equal(result.citing_claim, expected.citing_claim);
    assert.equal(result.citation_integrity.status, expected.citation_integrity.status);
    assert.equal(result.citation_integrity.article_id, expected.citation_integrity.article_id);
    assert.equal(result.citation_integrity.finding_id, expected.citation_integrity.finding_id);
    assert.equal(result.claim_evidence.status, expected.claim_evidence.status);
    assert.equal(result.claim_evidence.rule_id, expected.claim_evidence.rule_id);
    assert.equal(result.claim_evidence.insufficiency_reason, expected.claim_evidence.insufficiency_reason);
    assert.deepEqual(result.claim_evidence.evidence_span, expected.claim_evidence.evidence_span);
    assert.equal(result.claim_evidence.finding_id, expected.claim_evidence.finding_id);
  });
}

test('FIN-D4 vs FIN-D4-CONTRAST: only the bound reference changed', async () => {
  const unrelated = byId('FIN-D4');
  const source = byId('FIN-D4-CONTRAST');
  assert.equal(unrelated.draft_sentence.replace('[2]', '[n]'), source.draft_sentence.replace('[1]', '[n]'));
  assert.equal(unrelated.citing_claim, source.citing_claim);
  assert.equal(unrelated.claim_evidence.rule_version, source.claim_evidence.rule_version);
  assert.equal(unrelated.claim_evidence.processing_version, source.claim_evidence.processing_version);
  assert.equal(unrelated.citation_integrity.article_id, 'ART002510435');
  assert.equal(source.citation_integrity.article_id, 'ART002961723');
  assert.equal(unrelated.citation_integrity.status, 'VERIFIED');
  assert.equal(source.citation_integrity.status, 'VERIFIED');
  assert.equal(unrelated.claim_evidence.status, STATUSES.INSUFFICIENT_EVIDENCE);
  assert.equal(source.claim_evidence.status, STATUSES.CONSISTENT_WITH_EVIDENCE);
  assert.equal(source.claim_evidence.evidence_span.sentence_index, 4);
  assert.equal(fin.adoption, 'ADOPTED');
});

test('qualification used the unchanged engine: thresholds and the SOURCE B discrimination hold', () => {
  assert.deepEqual({ ...GROUNDING }, { MIN_SHARED_ANCHORS: 3, MIN_COVERAGE: 0.6 });
  assert.deepEqual({ ...RECORD_RELEVANCE }, { MIN_SHARED_ANCHORS: 2 });
  for (const item of fin.cases) assert.deepEqual(item.claim_evidence.grounding.thresholds, { ...GROUNDING });
  assert.equal(fin.discrimination.source_b_contains_discriminating_anchors, false);
  const sourceB = fin.abstract_evidence.ART002510435;
  const text = [sourceB.title, ...sourceB.abstracts.map(abstract => abstract.value), ...sourceB.keywords].join(' ').toLowerCase();
  for (const term of ['monetary', 'policy stance', 'text mining', 'minutes', 'hawkish', 'contractionary', 'central bank', '통화정책', '텍스트 마이닝', '의사록']) {
    assert.equal(text.includes(term), false, term);
  }
});

test('original D4 artifacts are unchanged by the finance qualification', () => {
  assert.deepEqual(originalD4.cases.map(item => [item.case_id, item.claim_evidence.status, item.claim_evidence.finding_id]), [
    ['D4', 'INSUFFICIENT_EVIDENCE', 'claim-d46caafa57abe6b9'],
    ['D4-CONTRAST', 'CONSISTENT_WITH_EVIDENCE', 'claim-4ea2a838ec1d26e7'],
  ]);
});

test('finance D4 artifact is sanitized and carries no accusing verdicts', () => {
  const serialized = JSON.stringify(fin.evidence) + JSON.stringify(fin.abstract_evidence) + JSON.stringify(fin.qualification);
  assert.equal(/key=|authorization|public_url|\[REDACTED\]|open\.kci\.go\.kr|kciportal|source_path/i.test(serialized), false);
  assert.ok((serialized.match(/https?:\/\/[^"\s]+/g) ?? []).every(url => url.startsWith('http://dx.doi.org/')));
  assert.equal(/WRONG_REFERENCE|FAKE_REFERENCE|HALLUCINATION|"FALSE"/.test(JSON.stringify(fin.cases)), false);
  assert.ok(fin.cases.every(item => item.provenance === 'CONTROLLED_PARAPHRASE'));
});
