// KCI adversarial bibliography stress set H1–H5. Runs the existing adapter + audit engine unchanged
// against LIVE KCI and writes a sanitized observation file. Nothing here decides a status.
// Usage: node --env-file-if-exists=.env.local tools/evaluation/run-kci-h1-h5.mjs <output.json>
import { createHash } from 'node:crypto';
import { writeFile } from 'node:fs/promises';
import { canonicalJson, createKciAdapter } from '../../src/kci/adapter.js';
import { createCitationAuditService } from '../../src/citation/audit.js';
import { recordingAdapter, sanitizeRecord } from './sanitize.mjs';

const outputPath = process.argv[2];
if (!outputPath) throw new Error('output path required');
const sha256 = value => createHash('sha256').update(canonicalJson(value), 'utf8').digest('hex');

// Exact citation metadata of the qualified real KCI records (as confirmed below via articleDetail).
const RECORDS = {
  ART003141185: { title: 'Exploring AI-Assisted Writing Instruction from the Perspective of Human-Computer Collaboration', authors: ['대운해'], publication_year: '2024', doi: '10.21740/jas.2024.11.30.2.385' },
  ART003267604: { title: 'Computer simulation on the role of interproximal contacts in occlusal force transmission', authors: ['김미엘', '김미선', '최은숙', '권호범', '박영석'], publication_year: '2025', doi: '10.14368/jdras.2025.41.4.267' },
  ART003062835: { title: 'Computer Vision-based Basketball Player Training System', authors: ['장만', '신승수'], publication_year: '2024', doi: '10.9728/dcs.2024.25.3.595' },
};
const PDF_TITLE_ART001298965 = '금융시장에서의 금융소비자의 행동양태를 고려한 투자자보호규범의 설계에 대한 연구 ―소위 ‘행동경제학’적 관점을 반영하여';

// Cases fixed before execution. Only H1 is unmodified; H2–H5 each target a different failure mode.
const CASES = [
  {
    case_id: 'H1', failure_mode: 'VALID_CONTROL', base_record_id: 'ART003141185',
    input_mutation: 'none (exact real citation)',
    question_under_test: '정상적인 실제 인용을 잘못 경고하지 않는가?',
    input: { ...RECORDS.ART003141185 },
  },
  {
    case_id: 'H2', failure_mode: 'YEAR_DRIFT', base_record_id: 'ART003267604',
    input_mutation: 'publication_year 2025 -> 2024 (all other fields exact)',
    question_under_test: '연도만 틀렸을 때 어느 필드인지 특정하는가?',
    input: { ...RECORDS.ART003267604, publication_year: '2024' },
  },
  {
    case_id: 'H3', failure_mode: 'REAL_DOI_CROSS_SWAP', base_record_id: 'ART003062835', donor_record_id: 'ART003141185',
    input_mutation: 'doi replaced with the real DOI of ART003141185 (title/authors/year exact)',
    question_under_test: '형식상 유효하고 실제로 존재하는 다른 논문의 DOI가 붙었을 때 탐지하는가?',
    input: { ...RECORDS.ART003062835, doi: RECORDS.ART003141185.doi },
  },
  {
    case_id: 'H4', failure_mode: 'AUTHOR_CHIMERA', base_record_id: 'ART003267604', donor_record_id: 'ART003062835',
    input_mutation: 'authors[3] 권호범 -> 신승수 (real author of ART003062835); title/year/DOI exact',
    question_under_test: '다른 실제 논문의 실제 저자가 섞였을 때 현재 규칙은 어떻게 처리하는가?',
    input: { ...RECORDS.ART003267604, authors: ['김미엘', '김미선', '최은숙', '신승수', '박영석'] },
  },
  {
    case_id: 'H5', failure_mode: 'TITLE_IDENTITY_AMBIGUITY', base_record_id: 'ART001298965',
    input_mutation: 'title as printed in the PDF (U+2018/U+2019 quotes, space) vs KCI canonical (U+FF02, no space); REAL-TITLE-FORMAT-001',
    question_under_test: '같은 논문이지만 제목 표기가 다를 때 식별을 보수적으로 처리하는가?',
    input: { title: PDF_TITLE_ART001298965, authors: ['최승재'], publication_year: '2008' },
  },
];

const live = createKciAdapter();

// Confirm each real record used by a case through the existing pipeline (articleDetail).
const confirmations = {};
for (const id of [...new Set(CASES.flatMap(testCase => [testCase.base_record_id, testCase.donor_record_id].filter(Boolean)))]) {
  const detail = await live.articleDetail(id);
  confirmations[id] = { detail_state: detail.state, record: detail.state === 'KCI_OK' ? sanitizeRecord(detail.records[0]) : null };
}

const results = [];
for (const testCase of CASES) {
  const adapter = recordingAdapter(live);
  const finding = await createCitationAuditService({ kciAdapter: adapter }).auditCitation(testCase.input);
  const evidence = adapter.traces[0] ?? null;
  results.push({
    ...testCase,
    execution_mode: 'LIVE',
    kind: finding.kind,
    observed_status: finding.status ?? null,
    system_state: finding.system_state ?? null,
    rule_id: finding.rule_id ?? null,
    rule_version: finding.rule_version ?? null,
    finding_id: finding.finding_id ?? finding.failure_id,
    search_state: evidence?.search?.state ?? null,
    detail_state: evidence?.detail?.state ?? null,
    kci_record_ids: (finding.evidence ?? []).map(item => item.source_record_id),
    field_comparisons: (finding.field_comparisons ?? []).map(({ field, input_value, evidence_value, result }) => ({ field, input_value, evidence_value, result })),
    human_review_required: finding.human_review_required ?? null,
    reason: finding.reason,
    input_hash: sha256(testCase.input),
    frozen_evidence: evidence,
    evidence_hash: evidence ? sha256(evidence) : null,
  });
}

await writeFile(outputPath, JSON.stringify({ confirmations, cases: results }, null, 2));
console.log('written', outputPath);
