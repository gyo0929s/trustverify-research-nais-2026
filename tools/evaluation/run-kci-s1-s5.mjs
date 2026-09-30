// KCI Citation Integrity S1–S5 controlled stress run.
// Uses the existing adapter and audit service unchanged. Writes a sanitized observation file only.
// Usage: node --env-file-if-exists=.env.local tools/evaluation/run-kci-s1-s5.mjs <output.json> [--primary-runs=5]
import { createHash } from 'node:crypto';
import { writeFile } from 'node:fs/promises';
import { createKciAdapter, canonicalJson } from '../../src/kci/adapter.js';
import { createCitationAuditService } from '../../src/citation/audit.js';
import { recordingAdapter, sanitizeRecord } from './sanitize.mjs';

const BASE_ID = 'ART003062835';
const BASE_TITLE = 'Computer Vision-based Basketball Player Training System';
const outputPath = process.argv[2];
const primaryRuns = Number((process.argv.find(arg => arg.startsWith('--primary-runs=')) ?? '--primary-runs=5').split('=')[1]);
if (!outputPath) throw new Error('output path required');

const sha256 = value => createHash('sha256').update(canonicalJson(value), 'utf8').digest('hex');

function summarize(finding) {
  return {
    kind: finding.kind,
    observed_status: finding.status ?? null,
    system_state: finding.system_state ?? null,
    rule_id: finding.rule_id ?? null,
    rule_version: finding.rule_version ?? null,
    finding_id: finding.finding_id ?? finding.failure_id,
    evidence_record_ids: (finding.evidence ?? []).map(item => item.source_record_id),
    field_comparisons: (finding.field_comparisons ?? []).map(({ field, input_value, evidence_value, result }) => ({ field, input_value, evidence_value, result })),
    human_review_required: finding.human_review_required ?? null,
    reason: finding.reason,
  };
}

const live = createKciAdapter();

// 1. Confirm the base record through the existing pipeline: articleSearch -> articleDetail.
const baseSearch = await live.articleSearch({ title: BASE_TITLE });
const baseDetail = baseSearch.state === 'KCI_OK' ? await live.articleDetail(BASE_ID) : null;
if (baseDetail?.state !== 'KCI_OK') {
  await writeFile(outputPath, JSON.stringify({ aborted: true, base_search_state: baseSearch.state, base_detail_state: baseDetail?.state ?? null }, null, 2));
  console.log('ABORT: base record could not be confirmed', baseSearch.state, baseDetail?.state);
  process.exit(1);
}
const base = sanitizeRecord(baseDetail.records[0]);
const baseCitation = {
  title: BASE_TITLE,
  authors: base.authors.map(author => author.name),
  publication_year: base.publication_year,
  doi: base.doi_raw,
};

// 2. Controlled one-variable mutations, fixed before any audit runs.
const CASES = [
  { case_id: 'S1', input_mutation: 'none (exact qualified citation)', question_under_test: '정상적인 실제 인용을 잘못 경고하지 않는가?', input: { ...baseCitation } },
  { case_id: 'S2', input_mutation: `publication_year ${baseCitation.publication_year} -> 2023`, question_under_test: '연도가 틀렸을 때 어느 필드가 어긋났는지 특정할 수 있는가?', input: { ...baseCitation, publication_year: '2023' } },
  { case_id: 'S3', input_mutation: `authors[1] ${baseCitation.authors[1]} -> Gil-Dong Hong`, question_under_test: '저자 정보가 실제 record와 다를 때 현재 deterministic rule은 어떻게 처리하는가?', input: { ...baseCitation, authors: [baseCitation.authors[0], 'Gil-Dong Hong', ...baseCitation.authors.slice(2)] } },
  { case_id: 'S4', input_mutation: 'doi suffix .595 -> .596', question_under_test: '실제 record와 다른 DOI가 입력되었을 때 현재 deterministic comparison은 어떻게 처리하는가?', input: { ...baseCitation, doi: baseCitation.doi.replace(/\.595$/, '.596') } },
  { case_id: 'S5', input_mutation: 'title: removed word "Player"', question_under_test: '제목이 변형되었을 때 record identity를 현재 보수적 규칙이 어떻게 처리하는가?', input: { ...baseCitation, title: 'Computer Vision-based Basketball Training System' } },
];

const results = [];
for (const testCase of CASES) {
  const adapter = recordingAdapter(live);
  const started = Date.now();
  const finding = await createCitationAuditService({ kciAdapter: adapter }).auditCitation(testCase.input);
  const frozenEvidence = { search: adapter.traces[0]?.search, detail: adapter.traces[0]?.detail };
  results.push({
    ...testCase,
    base_record_id: BASE_ID,
    execution_mode: 'LIVE',
    search_state: adapter.traces[0]?.search?.state ?? null,
    detail_state: adapter.traces[0]?.detail?.state ?? null,
    ...summarize(finding),
    elapsed_ms: Date.now() - started,
    input_hash: sha256(testCase.input),
    frozen_evidence: frozenEvidence,
    evidence_hash: sha256(frozenEvidence),
  });
}

// 3. Primary demo (S2) reliability: sequential live runs; stop on any system failure.
const s2 = CASES.find(testCase => testCase.case_id === 'S2');
const primary = [];
for (let run = 1; run <= primaryRuns; run += 1) {
  const adapter = recordingAdapter(live);
  const started = Date.now();
  const finding = await createCitationAuditService({ kciAdapter: adapter }).auditCitation(s2.input);
  const summary = summarize(finding);
  primary.push({
    run_number: run,
    search_state: adapter.traces[0]?.search?.state ?? null,
    detail_state: adapter.traces[0]?.detail?.state ?? null,
    article_id: summary.evidence_record_ids[0] ?? null,
    kind: summary.kind,
    observed_status: summary.observed_status,
    system_state: summary.system_state,
    rule_id: summary.rule_id,
    finding_id: summary.finding_id,
    mismatched_fields: summary.field_comparisons.filter(item => item.result === 'MISMATCH').map(item => item.field),
    evidence_hash: sha256({ search: adapter.traces[0]?.search, detail: adapter.traces[0]?.detail }),
    elapsed_ms: Date.now() - started,
  });
  if (finding.kind === 'SYSTEM_FAILURE') break;
  await new Promise(resolve => setTimeout(resolve, 1000));
}

const baseConfirmation = {
  search_state: baseSearch.state,
  search_total: baseSearch.total ?? null,
  search_candidate_ids: (baseSearch.records ?? []).map(record => record.source_record_id),
  detail_state: baseDetail.state,
  detail_article_id: base.article_id,
};
await writeFile(outputPath, JSON.stringify({ base_confirmation: baseConfirmation, base_record: base, base_citation: baseCitation, cases: results, primary_demo_runs: primary }, null, 2));
console.log('written', outputPath);
