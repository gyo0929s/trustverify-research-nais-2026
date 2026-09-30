import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { createCitationAuditService } from '../src/citation/audit.js';
import { createCitationBatchService } from '../src/citation/batch.js';
import { createFrozenEvidenceAdapter } from '../src/citation/frozen-evidence.js';
import { parseReferenceList, parseReference } from '../src/citation/reference-parser.js';
import { alignClaimWithEvidence } from '../src/claim-evidence/align.js';
import { INSUFFICIENCY_REASONS, STATUSES } from '../src/claim-evidence/contract.js';
import { resolveCitationMarker } from '../src/claim-evidence/draft.js';

// D4 — valid but unrelated reference, replayed end to end offline with the network blocked.
const dir = new URL('../artifacts/evaluation/claim-evidence-p0/', import.meta.url);
const d4 = JSON.parse(await readFile(new URL('d4-unrelated-reference.json', dir), 'utf8'));
const p0 = JSON.parse(await readFile(new URL('cases.json', dir), 'utf8'));
const p0Evidence = JSON.parse(await readFile(new URL('abstract-evidence.json', dir), 'utf8')).evidence;

async function offline(run) {
  const realFetch = globalThis.fetch;
  globalThis.fetch = () => { throw new Error('Live network access is forbidden in D4 tests'); };
  try { return await run(); } finally { globalThis.fetch = realFetch; }
}

// The same pipeline the runner used: bibliography -> Citation Integrity -> marker -> abstract -> Claim–Evidence.
async function runPipeline(draftSentence) {
  const { rows } = parseReferenceList(d4.bibliography);
  const batch = await createCitationBatchService({
    auditService: createCitationAuditService({ kciAdapter: createFrozenEvidenceAdapter(d4) }),
  }).auditBatch({ references: rows });
  const resolution = resolveCitationMarker(draftSentence, rows);
  const citation = batch.items[resolution.row.index - 1].finding;
  const recordId = citation.evidence[0].source_record_id;
  const finding = alignClaimWithEvidence({ citingClaim: resolution.citing_claim, evidence: d4.abstract_evidence[recordId] });
  return { batch, resolution, citation, finding };
}

test('D4 bibliography rows are exact real KCI citations that pass Citation Integrity', async () => {
  const { batch } = await offline(() => runPipeline(d4.cases[0].draft_sentence));
  assert.deepEqual(batch.items.map(item => item.finding.status), ['VERIFIED', 'VERIFIED']);
  for (const [position, row] of d4.items.entries()) {
    assert.equal(batch.items[position].finding.finding_id, row.finding_id);
    assert.ok(batch.items[position].finding.field_comparisons.every(comparison => comparison.result === 'MATCH'));
  }
});

for (const expected of d4.cases) {
  test(`${expected.case_id} replays end to end to the observed ${expected.claim_evidence.status}`, async () => {
    const { resolution, citation, finding } = await offline(() => runPipeline(expected.draft_sentence));
    assert.equal(resolution.marker, expected.marker);
    assert.equal(resolution.row.index, expected.resolved_row_index);
    assert.equal(resolution.citing_claim, expected.citing_claim);
    assert.equal(citation.status, expected.citation_integrity.status);
    assert.equal(citation.evidence[0].source_record_id, expected.citation_integrity.kci_record_id);
    assert.equal(finding.status, expected.claim_evidence.status);
    assert.equal(finding.rule_id, expected.claim_evidence.rule_id);
    assert.equal(finding.insufficiency_reason, expected.claim_evidence.insufficiency_reason);
    assert.equal(finding.finding_id, expected.claim_evidence.finding_id);
  });
}

test('D4: real but unrelated reference is INSUFFICIENT_EVIDENCE / NO_RELEVANT_EVIDENCE_IN_REFERENCED_RECORD, not an accusation', async () => {
  const [d4Case, contrast] = d4.cases;
  assert.equal(d4Case.case_id, 'D4');
  assert.equal(d4Case.citation_integrity.status, 'VERIFIED');
  assert.equal(d4Case.claim_evidence.status, STATUSES.INSUFFICIENT_EVIDENCE);
  assert.equal(d4Case.claim_evidence.insufficiency_reason, INSUFFICIENCY_REASONS.NO_RELEVANT_EVIDENCE_IN_REFERENCED_RECORD);
  assert.equal(d4Case.claim_evidence.human_review_required, true);
  // Same sentence, correct reference: the reference is the only difference.
  assert.equal(contrast.citing_claim, d4Case.citing_claim);
  assert.equal(contrast.claim_evidence.status, STATUSES.CONSISTENT_WITH_EVIDENCE);
});

test('insufficiency reasons are distinguished: unrelated record vs related-but-ungrounded vs no abstract vs ambiguous', () => {
  const i1 = p0.cases.find(item => item.case_id === 'I1');
  const related = alignClaimWithEvidence({ citingClaim: i1.citing_claim, evidence: p0Evidence });
  assert.equal(related.insufficiency_reason, INSUFFICIENCY_REASONS.CLAIM_NOT_GROUNDED_IN_ABSTRACT);
  assert.equal(related.finding_id, i1.finding_id);

  const noAbstract = alignClaimWithEvidence({ citingClaim: i1.citing_claim, evidence: { record_id: 'SYNTHETIC-NO-ABSTRACT', title: 'x', abstracts: [], keywords: [] } });
  assert.equal(noAbstract.status, STATUSES.INSUFFICIENT_EVIDENCE);
  assert.equal(noAbstract.insufficiency_reason, INSUFFICIENCY_REASONS.NO_PUBLIC_ABSTRACT_EVIDENCE);

  const sentence = 'Occlusal loads were dissipated locally at the first molar in the simulation.';
  const twin = alignClaimWithEvidence({
    citingClaim: 'Occlusal loads were dissipated locally at the first molar.',
    evidence: { record_id: 'SYNTHETIC-AMBIGUITY', abstracts: [{ lang: 'english', value: `${sentence} ${sentence}` }] },
  });
  assert.equal(twin.insufficiency_reason, INSUFFICIENCY_REASONS.AMBIGUOUS_EVIDENCE_SPAN);

  const grounded = alignClaimWithEvidence({ citingClaim: p0.cases[0].citing_claim, evidence: p0Evidence });
  assert.equal(grounded.insufficiency_reason, null);
});

test('no reference or hallucination verdicts exist, and explanations never accuse', async () => {
  const forbidden = /WRONG_REFERENCE|FAKE_REFERENCE|HALLUCINATION|MISCITATION|FAKE\b/;
  assert.equal(forbidden.test(JSON.stringify(Object.values(INSUFFICIENCY_REASONS))), false);
  assert.equal(forbidden.test(JSON.stringify(d4.cases)), false);
  for (const file of ['align.js', 'contract.js', 'draft.js']) {
    const source = await readFile(new URL(`../src/claim-evidence/${file}`, import.meta.url), 'utf8');
    assert.equal(forbidden.test(source), false, file);
  }
  assert.ok(d4.cases[0].claim_evidence.why.includes('자동 판정이 아닙니다'));
});

test('draft marker resolution uses the printed number, never guesses', () => {
  const { rows } = parseReferenceList(d4.bibliography);
  assert.equal(resolveCitationMarker('Claim text [2].', rows).row.index, 2);
  assert.equal(resolveCitationMarker('Claim text [2].', rows).citing_claim, 'Claim text.');
  assert.equal(resolveCitationMarker('Claim text [2].', [rows[1]]).row.index, 2, 'printed number, not position');
  assert.deepEqual(resolveCitationMarker('Claim text.', rows), { resolved: false, reason: 'NO_MARKER' });
  assert.equal(resolveCitationMarker('Claim text [1], [2].', rows).reason, 'MULTIPLE_MARKERS');
  assert.equal(resolveCitationMarker('Claim text [9].', rows).reason, 'MARKER_NOT_IN_BIBLIOGRAPHY');
  const unnumbered = [parseReference('홍길동 (2020). First Title. 저널.', 1), parseReference('김철수 (2021). Second Title. 저널.', 2)];
  const byPosition = resolveCitationMarker('Claim [2].', unnumbered);
  assert.equal(byPosition.resolved_by, 'ROW_POSITION');
  assert.equal(byPosition.row.index, 2);
});

test('provenance: controlled cases are labeled, and no naturalistic sample is fabricated', () => {
  assert.equal(d4.provenance, 'CONTROLLED_PERTURBATION');
  assert.ok(d4.cases.every(item => item.provenance === 'CONTROLLED_PERTURBATION'));
  assert.ok(p0.cases.every(item => item.provenance === 'CONTROLLED_PERTURBATION'));
  const naturalistic = p0.naturalistic_ai_paraphrase;
  assert.equal(naturalistic.status, 'NOT_PROVIDED');
  for (const field of ['tool_name', 'prompt', 'raw_output', 'timestamp', 'observed_result']) assert.equal(naturalistic[field], null, field);
});

test('D4 frozen evidence is sanitized', () => {
  const serialized = JSON.stringify(d4.evidence) + JSON.stringify(d4.abstract_evidence);
  assert.equal(/key=|authorization|public_url|\[REDACTED\]|open\.kci\.go\.kr|kciportal|source_path/i.test(serialized), false);
  assert.ok((serialized.match(/https?:\/\/[^"\s]+/g) ?? []).every(url => url.startsWith('http://dx.doi.org/')));
  assert.equal(d4.abstract_evidence.ART003267604.evidence_hash, p0Evidence.evidence_hash, 'same abstract evidence as the committed P0');
});
