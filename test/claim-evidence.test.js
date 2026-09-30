import test from 'node:test';
import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { readFile, readdir } from 'node:fs/promises';
import { canonicalJson } from '../src/kci/adapter.js';
import { alignClaimWithEvidence, compareExpression } from '../src/claim-evidence/align.js';
import { SIGNALS, STATUSES, TRACK } from '../src/claim-evidence/contract.js';

// Layer 3 P0 regression. Fully offline: frozen, sanitized KCI abstract evidence; network blocked.
const dir = new URL('../artifacts/evaluation/claim-evidence-p0/', import.meta.url);
const frozen = JSON.parse(await readFile(new URL('abstract-evidence.json', dir), 'utf8'));
const observed = JSON.parse(await readFile(new URL('cases.json', dir), 'utf8'));
const evidence = frozen.evidence;
const sha256 = value => createHash('sha256').update(canonicalJson(value), 'utf8').digest('hex');
const caseById = id => observed.cases.find(item => item.case_id === id);

function offline(run) {
  const realFetch = globalThis.fetch;
  globalThis.fetch = () => { throw new Error('Live network access is forbidden in Layer 3 tests'); };
  try { return run(); } finally { globalThis.fetch = realFetch; }
}
const align = (citingClaim, options = {}) => offline(() => alignClaimWithEvidence({ citingClaim, evidence, ...options }));

test('frozen abstract evidence is sanitized and hash-consistent', () => {
  const { evidence_hash: hash, ...content } = evidence;
  assert.equal(sha256(content), hash);
  assert.equal(evidence.record_id, 'ART003267604');
  assert.ok(evidence.abstracts.every(abstract => abstract.value.length > 100));
  const serialized = JSON.stringify(frozen);
  assert.equal(/https?:\/\/|key=|authorization|\[REDACTED\]|open\.kci\.go\.kr|kciportal|source_path/i.test(serialized), false);
});

for (const expected of observed.cases) {
  test(`${expected.case_id} (${expected.role}) replays to the observed ${expected.observed_status}`, () => {
    const finding = align(expected.citing_claim);
    assert.equal(finding.track, TRACK);
    assert.equal(finding.status, expected.observed_status);
    assert.equal(finding.signal, expected.signal);
    assert.deepEqual(finding.signals, expected.signals);
    assert.equal(finding.rule_id, expected.rule_id);
    assert.equal(finding.rule_version, expected.rule_version);
    assert.deepEqual(finding.evidence_span, expected.evidence_span);
    assert.equal(finding.evidence_hash, expected.evidence_hash);
    assert.equal(finding.finding_id, expected.finding_id);
    assert.equal(sha256({ citing_claim: expected.citing_claim, record_id: evidence.record_id }), expected.input_hash);
  });
}

test('C1 and C2 are grounded in the same span and differ only in the certainty dimension', () => {
  const c1 = align(caseById('C1').citing_claim);
  const c2 = align(caseById('C2').citing_claim);
  assert.equal(c1.evidence_span.sentence_index, c2.evidence_span.sentence_index);
  assert.equal(c2.observed.certainty.evidence, 'HEDGE');
  assert.equal(c2.observed.certainty.citing, 'STRONG');
  for (const dimension of ['causality', 'modality', 'negation']) assert.equal(c1.observed[dimension].citing, c2.observed[dimension].citing);
  assert.equal(c1.human_review_required, false);
  assert.equal(c2.human_review_required, true);
  assert.ok(c2.human_review_reason.includes('CERTAINTY_STRENGTHENED'));
});

test('I1: an ungrounded proposition is INSUFFICIENT_EVIDENCE, never a claim shift or a falsity verdict', () => {
  const finding = align(caseById('I1').citing_claim);
  assert.equal(finding.status, STATUSES.INSUFFICIENT_EVIDENCE);
  assert.equal(finding.evidence_span, null);
  assert.equal(finding.grounding.grounded, false);
  assert.equal(finding.human_review_required, true);
  assert.ok(finding.uncertainty.some(line => line.includes('does not mean the citation is wrong')));
});

test('insufficient evidence cannot become a claim shift, even with strong shift markers', () => {
  const finding = align('Interproximal contacts definitely cause periodontal disease in elderly patients.');
  assert.equal(finding.status, STATUSES.INSUFFICIENT_EVIDENCE);
  assert.deepEqual(finding.signals, []);
  assert.equal(finding.observed, null);
});

test('absence of shift markers alone never produces CONSISTENT_WITH_EVIDENCE', () => {
  const finding = align('Orthodontic brackets were bonded to incisors in adolescent patients over twelve months.');
  assert.deepEqual(finding.signals, []);
  assert.equal(finding.status, STATUSES.INSUFFICIENT_EVIDENCE);
});

test('an ambiguous span (two equally grounded sentences) is INSUFFICIENT_EVIDENCE', () => {
  const sentence = 'Occlusal loads were dissipated locally at the first molar in the simulation.';
  const twin = { record_id: 'SYNTHETIC-AMBIGUITY', abstracts: [{ lang: 'english', value: `${sentence} ${sentence}` }], evidence_hash: 'synthetic' };
  const finding = offline(() => alignClaimWithEvidence({ citingClaim: 'Occlusal loads were dissipated locally at the first molar.', evidence: twin }));
  assert.equal(finding.status, STATUSES.INSUFFICIENT_EVIDENCE);
  assert.equal(finding.grounding.reason, 'AMBIGUOUS_SPAN');
});

test('Solar-off: the deterministic result needs no observer, and an observer annotation cannot change status', () => {
  const plain = align(caseById('C2').citing_claim);
  assert.deepEqual(plain.observer, { state: 'UNASSESSED' });
  const annotated = align(caseById('C2').citing_claim, { observer: { state: 'OBSERVED', suggested_status: 'CONSISTENT_WITH_EVIDENCE' } });
  assert.equal(annotated.status, plain.status);
  assert.equal(annotated.finding_id, plain.finding_id);
  const insufficient = align(caseById('I1').citing_claim, { observer: { state: 'OBSERVED', suggested_status: 'CONSISTENT_WITH_EVIDENCE' } });
  assert.equal(insufficient.status, STATUSES.INSUFFICIENT_EVIDENCE);
});

test('frozen replay is deterministic across repeated runs', () => {
  for (const expected of observed.cases) {
    const runs = Array.from({ length: 3 }, () => align(expected.citing_claim));
    assert.ok(runs.every(run => JSON.stringify(run) === JSON.stringify(runs[0])));
  }
});

test('rule unit checks: each monitored dimension raises only its own signal', () => {
  const cases = [
    ['X was associated with Y in the cohort.', 'X causes Y in the cohort.', SIGNALS.CAUSALITY_STRENGTHENED],
    ['The data cannot establish causation between X and Y.', 'X causes Y.', SIGNALS.CAUSALITY_STRENGTHENED],
    ['Load can be transmitted to adjacent teeth.', 'Load is always transmitted to adjacent teeth.', SIGNALS.MODALITY_STRENGTHENED],
    ['The results suggest a limit in capacity.', 'The results demonstrate a limit in capacity.', SIGNALS.CERTAINTY_STRENGTHENED],
    ['X was not associated with Y.', 'X was associated with Y.', SIGNALS.NEGATION_CHANGED],
    ['Ligament forces increased at the first molar.', 'Ligament forces decreased at the first molar.', SIGNALS.DIRECTION_CHANGED],
    ['X와 Y 사이에 유의한 관련성이 관찰되었다.', 'X가 Y를 유발한다.', SIGNALS.CAUSALITY_STRENGTHENED],
  ];
  for (const [source, citing, signal] of cases) {
    assert.ok(compareExpression(source, citing).signals.includes(signal), `${signal}: ${citing}`);
  }
  assert.deepEqual(compareExpression('The results suggest a limit.', 'The results suggest a limit.').signals, []);
});

test('Layer 3 exposes no falsity, hallucination, or score verdicts', async () => {
  assert.deepEqual(Object.values(STATUSES).sort(), ['CONSISTENT_WITH_EVIDENCE', 'INSUFFICIENT_EVIDENCE', 'POTENTIAL_CLAIM_SHIFT']);
  const files = await readdir(new URL('../src/claim-evidence/', import.meta.url));
  for (const file of files) {
    const source = await readFile(new URL(`../src/claim-evidence/${file}`, import.meta.url), 'utf8');
    assert.equal(/['"](FALSE|WRONG_CLAIM|HALLUCINATION|FAKE|CONTRADICTED)['"]|score|probability/i.test(source), false, file);
  }
  const finding = align(caseById('C2').citing_claim);
  for (const key of ['track', 'status', 'signal', 'rule_id', 'rule_version', 'citation_record_id', 'citing_claim', 'evidence_span',
    'evidence_source', 'evidence_hash', 'observed', 'why', 'uncertainty', 'human_review_required', 'human_review_reason', 'processing_version']) {
    assert.ok(Object.hasOwn(finding, key), key);
  }
});

test('Claim–Evidence UI shows only the evaluated P0 cases, labeled as frozen evaluation evidence', async () => {
  const html = await readFile(new URL('../src/ui/index.html', import.meta.url), 'utf8');
  const decode = text => text.replace(/<[^>]+>/g, '').replace(/&quot;/g, '"').replace(/&amp;/g, '&').replace(/&lt;/g, '<').replace(/&gt;/g, '>');
  const section = (start, end) => {
    const from = html.indexOf(start);
    const to = html.indexOf(end, from);
    assert.ok(from >= 0 && to > from, `section ${start}`);
    return html.slice(from, to);
  };
  const workspace = section('WORKSPACE: CLAIM–EVIDENCE ALIGNMENT', 'END WORKSPACE CLAIM–EVIDENCE');
  const methodCard = section('<!-- Layer 2A: Claim-Evidence Alignment', '<!-- Layer 2B:');
  const text = decode(workspace);
  const c1 = caseById('C1');
  const c2 = caseById('C2');
  for (const value of [c1.citing_claim, c2.citing_claim, c1.evidence_span.text, c1.finding_id, c2.finding_id,
    c1.rule_id, c2.rule_id, caseById('I1').rule_id, c2.signal, evidence.record_id, evidence.title]) {
    assert.ok(text.includes(value), `workspace shows ${value}`);
  }
  assert.ok(text.includes(`Abstract sentence #${c1.evidence_span.sentence_index}`));
  assert.ok(text.includes(`${evidence.evidence_hash.slice(0, 8)}…${evidence.evidence_hash.slice(-4)}`));
  assert.ok(text.includes('P0 · FROZEN EVALUATION EVIDENCE'));
  assert.ok(text.includes('UNASSESSED'));
  assert.ok(decode(methodCard).includes(c1.evidence_span.text) && decode(methodCard).includes(c2.citing_claim));
  for (const block of [workspace, methodCard]) {
    assert.equal(/X is associated with Y|X causes Y|tactical performance|Solar|Backend integration pending|7f83b165|\bLIVE\b|HALLUCINATION|WRONG_CLAIM/.test(block), false);
  }
  // The only result statuses shown are the evaluated ones (definitions in the status banner aside).
  const results = section('<!-- P0 two-case comparison.', '<!-- Monitored Dimensions');
  assert.deepEqual([...new Set(results.match(/(CONSISTENT_WITH_EVIDENCE|POTENTIAL_CLAIM_SHIFT|INSUFFICIENT_EVIDENCE)/g))].sort(),
    [c1.observed_status, c2.observed_status, caseById('I1').observed_status].sort());
  assert.equal(results.includes('CAUSALITY_STRENGTHENED'), false);
});
