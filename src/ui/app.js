/**
 * TrustVerify Research — Presentation & Mentor Alignment Controller
 * NAIS 2026 Hackathon Final Presentation
 *
 * MENTOR ALIGNMENT:
 * - RESULT FIRST: Result ➔ Field Comparison ➔ Verdict & Why? ➔ Verification Path
 * - Core Evidence Verification (Visually Dominant, Steps 1-3) vs Expansion Layers (Stages 4-5)
 * - Compact Staged Protocol (STEP 1 후보 탐색 ➔ STEP 2 레코드 고정 ➔ STEP 3 필드 정합성)
 * - Verification Path (Active Steps 1-3 vs Optional Stages 4-5)
 * - Reference Evidence (선택적 · 이번 판정에는 미사용)
 * - Crossref Corroboration (선택적 · 독립 DOI 교차확인 / NOT_FOUND ≠ fake paper)
 * - OAI-PMH Snapshot (Frozen Evidence Snapshot / 라이브 실패와 명시적 분리)
 * - Translation Fidelity Expansion (TR-CIT-001 reuses KCI evidence, TR-CAUS-001 semantic shift)
 * - Finance-20 Reference Context (Small disclaimer: not a quality standard)
 */

// Canonical KCI Finding (REF-META-002)
const CANONICAL_KCI_DRIFT = {
  contract_version: 'trustverify-citation-finding-v1',
  kind: 'RESEARCH_FINDING',
  finding_id: 'fixture-finding-metadata-drift',
  track: 'CITATION_INTEGRITY',
  status: 'METADATA_DRIFT',
  rule_id: 'REF-META-002',
  rule_version: '1.0',
  input: {
    citation_id: 'fixture-citation-2',
    title: 'Computer Vision-based Basketball Player Training System',
    authors: ['문현철'],
    publication_year: '2023',
    doi: '10.9728/dcs.2024.25.3.595',
  },
  evidence: [
    {
      evidence_id: 'fixture-evidence-2',
      evidence_type: 'KCI_RECORD',
      source_system: 'KCI (한국연구재단 학술색인 Open API)',
      source_record_id: 'ART003062835',
      retrieved_at: '2026-09-30T00:00:00Z',
      normalized_content_sha256: '2222222222222222222222222222222222222222222222222222222222222222',
      redacted_snapshot_sha256: '3333333333333333333333333333333333333333333333333333333333333333',
      data: {
        title: 'Computer Vision-based Basketball Player Training System',
        authors: ['문현철'],
        publication_year: '2024',
        doi: '10.9728/dcs.2024.25.3.595',
      },
    },
  ],
  field_comparisons: [
    { field: 'title', label: '논문 제목', input_value: 'Computer Vision-based Basketball Player Training System', evidence_value: 'Computer Vision-based Basketball Player Training System', result: 'MATCH' },
    { field: 'authors', label: '저자', input_value: '문현철', evidence_value: '문현철', result: 'MATCH' },
    { field: 'publication_year', label: '출판연도', input_value: '2023', evidence_value: '2024', result: 'MISMATCH' },
    { field: 'doi', label: 'DOI', input_value: '10.9728/dcs.2024.25.3.595', evidence_value: '10.9728/dcs.2024.25.3.595', result: 'MATCH' },
  ],
  reason: 'KCI 공식 레코드와의 동일 논문 식별은 확인되었으나, 입력된 출판연도(2023)가 KCI 공식 수록 연도(2024)와 불일치합니다.',
  human_review_required: true,
  human_review_badge: '서지정보 확인 권장',
  human_review_callout: 'KCI 공식 레코드(ART003062835)에 정식 수록된 출판연도는 2024년입니다. 학술대회 발표/선공개 연도(2023)와 정식 학술지 수록 연도 간 차이인지 서지정보를 확인하세요.',
  verification_path: [
    { step: 1, is_optional: false, name: '1. 후보 탐색', api: 'KCI articleSearch', status: 'ok', detail: '✓ 후보 레코드 발견' },
    { step: 2, is_optional: false, name: '2. 실제 레코드 고정', api: 'KCI articleDetail', status: 'ok', detail: '✓ ART003062835' },
    { step: 3, is_optional: false, name: '3. 필드 정합성 검증', api: 'Title · Author · Year · DOI', status: 'warn', detail: '! Year 2023 → 2024' },
    { step: 4, is_optional: true, name: '4. 참고문헌 근거', api: 'Reference Evidence', status: 'unexecuted', detail: '○ 이번 판정에는 미사용' },
    { step: 5, is_optional: true, name: '5. 외부 교차확인', api: 'External Corroboration', status: 'unexecuted', detail: '○ 이번 판정에는 불필요' },
  ],
};

// Preset: NOT_FOUND_IN_KCI + Crossref Corroboration
const PRESET_NOT_FOUND = {
  contract_version: 'trustverify-citation-finding-v1',
  kind: 'RESEARCH_FINDING',
  finding_id: 'fixture-finding-not-found-crossref',
  track: 'CITATION_INTEGRITY',
  status: 'NOT_FOUND_IN_KCI',
  rule_id: 'REF-ZERO-001',
  rule_version: '1.0',
  input: {
    title: 'Attention Is All You Need',
    authors: ['Vaswani, A.'],
    publication_year: '2017',
    doi: '10.5555/3295222.3295349',
  },
  evidence: [],
  field_comparisons: [],
  reason: 'KCI 검색 결과가 0건입니다 (No Data). KCI 색인 수록 범위 제한에 의한 미발견이며, 가짜 논문이라는 뜻이 아닙니다.',
  human_review_required: true,
  human_review_badge: '색인 범위 확인 권장',
  human_review_callout: 'KCI에서 검색되지 않았으나 가짜 논문이 아닙니다. 해외 학술지(NeurIPS 등)는 독립 DOI(Crossref)를 통해 실재성을 별도 교차확인해야 합니다.',
  verification_path: [
    { step: 1, is_optional: false, name: '1. 후보 탐색', api: 'KCI articleSearch', status: 'notfound', detail: '! 후보 레코드 0건 (No Data)' },
    { step: 2, is_optional: false, name: '2. 실제 레코드 고정', api: 'KCI articleDetail', status: 'skip', detail: '- 대상 식별자 부재' },
    { step: 3, is_optional: false, name: '3. 필드 정합성 검증', api: 'Title · Author · Year · DOI', status: 'skip', detail: '- 필드 대조 미실행' },
    { step: 4, is_optional: true, name: '4. 참고문헌 근거', api: 'Reference Evidence', status: 'unexecuted', detail: '○ 이번 판정에는 미사용' },
    { step: 5, is_optional: true, name: '5. 외부 교차확인', api: 'External Corroboration', status: 'corroborated', detail: '✓ Crossref 독립 DOI 확인됨' },
  ],
  crossref_corroboration: {
    status: 'FOUND_IN_CROSSREF',
    doi: '10.5555/3295222.3295349',
    container: 'Advances in Neural Information Processing Systems (NeurIPS 2017)',
    interpretation: 'KCI 수록 범위에서는 확인되지 않았지만, 독립 DOI source에서는 실재 record가 확인되었습니다. (NOT_FOUND_IN_KCI ≠ fake paper)',
  },
};

// Preset: System Failure + OAI Frozen Snapshot Fallback
const PRESET_SYSTEM_FAILURE = {
  contract_version: 'trustverify-system-failure-v1',
  kind: 'SYSTEM_FAILURE',
  failure_id: 'fixture-system-failure-offline',
  system_state: 'KCI_UNAVAILABLE',
  operation: 'articleSearch',
  reason: 'KCI Open API 서버와 통신할 수 없습니다 (HTTP 503 Transport Failure). 인용 판정이 아닌 시스템 연결 오류입니다.',
  retry_recommended: true,
  research_finding_emitted: false,
  verification_path: [
    { step: 1, is_optional: false, name: '1. 후보 탐색', api: 'KCI articleSearch', status: 'fail', detail: '✕ KCI_UNAVAILABLE (HTTP 503 통신 장애)' },
    { step: 2, is_optional: false, name: '2. 실제 레코드 고정', api: 'KCI articleDetail', status: 'skip', detail: '- 통신 장애로 중단' },
    { step: 3, is_optional: false, name: '3. 필드 정합성 검증', api: 'Title · Author · Year · DOI', status: 'skip', detail: '- 판정 보류 (인용 결함 아님)' },
    { step: 4, is_optional: true, name: '4. 참고문헌 근거', api: 'Reference Evidence', status: 'unexecuted', detail: '○ 미실행' },
    { step: 5, is_optional: true, name: '5. 외부 교차확인', api: 'External Corroboration', status: 'unexecuted', detail: '○ 미실행' },
  ],
};

// Translation Expansion Findings
const TF_FINDINGS = {
  'TR-CAUS-001': {
    id: 'TR-CAUS-001',
    rule_id: 'TR-CAUS-001',
    rule_version: '1.0',
    track: 'TRANSLATION_FIDELITY',
    status: 'CAUSALITY_STRENGTHENED',
    status_label_ko: '인과 표현 격상',
    severity: 'review',
    title: '인과성 과장 왜곡 (상관성 유보 → 인과 단정)',
    source_span: '직접적인 인과관계라고 단정할 수는 없다.',
    target_span: 'X causes Y. Previous studies [1], [3] prove this relationship.',
    short_reason: '한국어 원문의 상관성 유보 서술("단정할 수는 없다")이 영문 결과물에서 "X causes Y" 및 "prove"라는 절대적 인과 단정으로 왜곡되었습니다.',
    solar_observation: 'Epistemic hedging(인과 유보) 표현이 완전히 탈락하고 확정적 인과(deterministic causation)로 강화된 의미 왜곡 신호입니다. 실증 데이터가 입증하지 않은 인과관계를 단정하여 학술적 타당성을 훼손합니다.',
    human_review_badge: '사람 검토 필요',
    human_review_callout: '인과 단정 표현을 완화하고 원문의 통계적 상관성 수준("suggests a significant association between X and Y, though direct causation is not established")으로 영문 수정을 권장합니다.',
    finance_context: {
      pilot_name: 'Finance-20 Pilot',
      observation: 'Strong assertion differs from the observed pilot reference distribution.',
      disclaimer: '정답표 · writing-quality score가 아니며, 실제 영문 금융논문 코퍼스의 서술 경향성과의 분포 차이만 보조 참고합니다.',
    },
  },
  'TR-CIT-001': {
    id: 'TR-CIT-001',
    rule_id: 'REF-META-002',
    rule_version: '1.0',
    track: 'TRANSLATION_FIDELITY',
    status: 'CITATION_REFERENCE_DRIFT',
    status_label_ko: '인용 레퍼런스 드리프트',
    severity: 'drift',
    title: '인용 번호 매핑 오류 및 KCI 서지 연도 불일치',
    source_span: '기존 연구 [1], [2]를 참고하였다.',
    target_span: 'Previous studies [1], [3] prove this relationship.',
    short_reason: '원문에서 인용된 선행연구 [2]가 AI 영어 번역본에서 [3]으로 잘못 매핑되었으며, 대상 인용 [2]는 KCI 레코드상 출판연도 불일치(2023 vs 2024)를 내포하고 있습니다.',
    kci_evidence_ref: CANONICAL_KCI_DRIFT,
    human_review_badge: '인용 매핑 및 서지 확인 권장',
    human_review_callout: '번역 과정에서 인용 번호가 [2]에서 [3]으로 변형되었습니다. 동시에 원문의 인용 [2]는 실제 KCI 공식 레코드와 출판연도가 다릅니다. KCI 외부 근거 계층을 재참조해야 합니다.',
    cross_layer_notice: 'Translation Fidelity does not replace KCI. It builds on the citation evidence layer.',
  },
};

// Example Bibliography Text (6 citations representative of academic papers)
const EXAMPLE_BIBLIOGRAPHY_TEXT = `[1] 문현철, "Computer Vision-based Basketball Player Training System", 2024, 10.9728/dcs.2024.25.3.595
[2] 문현철, "Computer Vision-based Basketball Player Training System", 2023, 10.9728/dcs.2024.25.3.595
[3] Vaswani, A., "Attention Is All You Need", 2017, 10.5555/3295222.3295349
[4] Kim, S., "Synthetic Mixed Citation Title", 2024, 10.0000/synthetic-fixture
[5] 박지훈, "딥러닝 기반 한국어 학술 논문 서지 분석", 2022
[6] 이영수, "비정형 학술 텍스트의 서지 무결성 자동 검증 체계", 2023`;

// Canonical Batch Fixtures for Instant & Deterministic Hackathon Demo
const DEMO_BATCH_FIXTURES = [
  {
    contract_version: 'trustverify-citation-finding-v1',
    kind: 'RESEARCH_FINDING',
    finding_id: 'batch-finding-1-verified',
    track: 'CITATION_INTEGRITY',
    status: 'VERIFIED',
    rule_id: 'REF-VERI-001',
    rule_version: '1.0',
    input: {
      citation_id: 'batch-citation-1',
      title: 'Computer Vision-based Basketball Player Training System',
      authors: ['문현철'],
      publication_year: '2024',
      doi: '10.9728/dcs.2024.25.3.595',
    },
    evidence: [
      {
        evidence_id: 'batch-evidence-1',
        evidence_type: 'KCI_RECORD',
        source_system: 'KCI (한국연구재단 학술색인 Open API)',
        source_record_id: 'ART003062835',
        retrieved_at: '2026-09-30T00:00:00Z',
        normalized_content_sha256: '2222222222222222222222222222222222222222222222222222222222222222',
        data: {
          title: 'Computer Vision-based Basketball Player Training System',
          authors: ['문현철'],
          publication_year: '2024',
          doi: '10.9728/dcs.2024.25.3.595',
        },
      },
    ],
    field_comparisons: [
      { field: 'title', label: '논문 제목', input_value: 'Computer Vision-based Basketball Player Training System', evidence_value: 'Computer Vision-based Basketball Player Training System', result: 'MATCH' },
      { field: 'authors', label: '저자', input_value: '문현철', evidence_value: '문현철', result: 'MATCH' },
      { field: 'publication_year', label: '출판연도', input_value: '2024', evidence_value: '2024', result: 'MATCH' },
      { field: 'doi', label: 'DOI', input_value: '10.9728/dcs.2024.25.3.595', evidence_value: '10.9728/dcs.2024.25.3.595', result: 'MATCH' },
    ],
    reason: 'KCI 공식 레코드(ART003062835)와 4개 서지 필드(제목, 저자, 출판연도, DOI)가 완벽히 일치합니다.',
    human_review_required: false,
    human_review_badge: '원문 보존 확인',
    human_review_callout: 'KCI 공식 서지정보와 직접 일치하므로 추가 조치가 필요하지 않습니다.',
    verification_path: [
      { step: 1, is_optional: false, name: '1. 후보 탐색', api: 'KCI articleSearch', status: 'ok', detail: '✓ 후보 레코드 발견' },
      { step: 2, is_optional: false, name: '2. 실제 레코드 고정', api: 'KCI articleDetail', status: 'ok', detail: '✓ ART003062835' },
      { step: 3, is_optional: false, name: '3. 필드 정합성 검증', api: 'Title · Author · Year · DOI', status: 'ok', detail: '✓ 4대 서지필드 일치' },
      { step: 4, is_optional: true, name: '4. 참고문헌 근거', api: 'Reference Evidence', status: 'unexecuted', detail: '○ 이번 판정에는 미사용' },
      { step: 5, is_optional: true, name: '5. 외부 교차확인', api: 'External Corroboration', status: 'unexecuted', detail: '○ 이번 판정에는 불필요' },
    ],
  },
  CANONICAL_KCI_DRIFT,
  PRESET_NOT_FOUND,
  {
    contract_version: 'trustverify-citation-finding-v1',
    kind: 'RESEARCH_FINDING',
    finding_id: 'batch-finding-4-review',
    track: 'CITATION_INTEGRITY',
    status: 'REVIEW_REQUIRED',
    rule_id: 'REF-ID-002',
    rule_version: '1.0',
    input: {
      citation_id: 'batch-citation-4',
      title: 'Synthetic Mixed Citation Title',
      authors: ['Kim, S.'],
      publication_year: '2024',
      doi: '10.0000/synthetic-fixture',
    },
    evidence: [],
    field_comparisons: [
      { field: 'title', label: '논문 제목', input_value: 'Synthetic Mixed Citation Title', evidence_value: '유사 후보 3건 발견 (단일 식별 불가)', result: 'MISMATCH' },
      { field: 'authors', label: '저자', input_value: 'Kim, S.', evidence_value: '(미확정)', result: 'MISMATCH' },
      { field: 'publication_year', label: '출판연도', input_value: '2024', evidence_value: '2024', result: 'MATCH' },
    ],
    reason: '검색된 후보 레코드가 복수이며, 저자 및 식별자 정보가 불충분하여 단일 KCI 공식 레코드로 고정할 수 없습니다.',
    human_review_required: true,
    human_review_badge: '연구자 수동 확인 필요',
    human_review_callout: 'KCI 내 검색된 복수 레코드 중 어느 논문을 의도한 인용인지 서지정보를 확인하세요.',
    verification_path: [
      { step: 1, is_optional: false, name: '1. 후보 탐색', api: 'KCI articleSearch', status: 'ok', detail: '✓ 복수 후보 3건' },
      { step: 2, is_optional: false, name: '2. 실제 레코드 고정', api: 'KCI articleDetail', status: 'warn', detail: '! 단일 식별자 고정 불가' },
      { step: 3, is_optional: false, name: '3. 필드 정합성 검증', api: 'Title · Author · Year · DOI', status: 'skip', detail: '- 대조 미실행' },
      { step: 4, is_optional: true, name: '4. 참고문헌 근거', api: 'Reference Evidence', status: 'unexecuted', detail: '○ 이번 판정에는 미사용' },
      { step: 5, is_optional: true, name: '5. 외부 교차확인', api: 'External Corroboration', status: 'unexecuted', detail: '○ 이번 판정에는 불필요' },
    ],
  },
  {
    contract_version: 'trustverify-citation-finding-v1',
    kind: 'RESEARCH_FINDING',
    finding_id: 'batch-finding-5-verified',
    track: 'CITATION_INTEGRITY',
    status: 'VERIFIED',
    rule_id: 'REF-VERI-001',
    rule_version: '1.0',
    input: {
      citation_id: 'batch-citation-5',
      title: '딥러닝 기반 한국어 학술 논문 서지 분석',
      authors: ['박지훈'],
      publication_year: '2022',
      doi: '',
    },
    evidence: [
      {
        evidence_id: 'batch-evidence-5',
        evidence_type: 'KCI_RECORD',
        source_system: 'KCI (한국연구재단 학술색인 Open API)',
        source_record_id: 'ART002891234',
        retrieved_at: '2026-09-30T00:00:00Z',
        normalized_content_sha256: '4444444444444444444444444444444444444444444444444444444444444444',
        data: {
          title: '딥러닝 기반 한국어 학술 논문 서지 분석',
          authors: ['박지훈'],
          publication_year: '2022',
        },
      },
    ],
    field_comparisons: [
      { field: 'title', label: '논문 제목', input_value: '딥러닝 기반 한국어 학술 논문 서지 분석', evidence_value: '딥러닝 기반 한국어 학술 논문 서지 분석', result: 'MATCH' },
      { field: 'authors', label: '저자', input_value: '박지훈', evidence_value: '박지훈', result: 'MATCH' },
      { field: 'publication_year', label: '출판연도', input_value: '2022', evidence_value: '2022', result: 'MATCH' },
    ],
    reason: 'KCI 등재학술지 공식 레코드(ART002891234)와 3개 서지 필드(제목, 저자, 출판연도)가 일치합니다.',
    human_review_required: false,
    human_review_badge: '원문 보존 확인',
    human_review_callout: 'KCI 등재학술지 서지정보와 확인되었습니다.',
    verification_path: [
      { step: 1, is_optional: false, name: '1. 후보 탐색', api: 'KCI articleSearch', status: 'ok', detail: '✓ 단일 후보 발견' },
      { step: 2, is_optional: false, name: '2. 실제 레코드 고정', api: 'KCI articleDetail', status: 'ok', detail: '✓ ART002891234' },
      { step: 3, is_optional: false, name: '3. 필드 정합성 검증', api: 'Title · Author · Year', status: 'ok', detail: '✓ 서지필드 일치' },
      { step: 4, is_optional: true, name: '4. 참고문헌 근거', api: 'Reference Evidence', status: 'unexecuted', detail: '○ 이번 판정에는 미사용' },
      { step: 5, is_optional: true, name: '5. 외부 교차확인', api: 'External Corroboration', status: 'unexecuted', detail: '○ 이번 판정에는 불필요' },
    ],
  },
  {
    contract_version: 'trustverify-citation-finding-v1',
    kind: 'RESEARCH_FINDING',
    finding_id: 'batch-finding-6-review',
    track: 'CITATION_INTEGRITY',
    status: 'REVIEW_REQUIRED',
    rule_id: 'REF-ID-002',
    rule_version: '1.0',
    input: {
      citation_id: 'batch-citation-6',
      title: '비정형 학술 텍스트의 서지 무결성 자동 검증 체계',
      authors: ['이영수'],
      publication_year: '2023',
      doi: '',
    },
    evidence: [],
    field_comparisons: [
      { field: 'title', label: '논문 제목', input_value: '비정형 학술 텍스트의 서지 무결성 자동 검증 체계', evidence_value: '비정형 텍스트 기반 학술 서지 검증 체계 연구', result: 'MISMATCH' },
      { field: 'authors', label: '저자', input_value: '이영수', evidence_value: '이영수, 박민우', result: 'MISMATCH' },
      { field: 'publication_year', label: '출판연도', input_value: '2023', evidence_value: '2023', result: 'MATCH' },
    ],
    reason: '검색 후보 레코드와 제목 유사도(82%) 미달 및 공저자 정보 불일치로 연구자 확인이 필요합니다.',
    human_review_required: true,
    human_review_badge: '제목 및 공저자 확인',
    human_review_callout: 'KCI 등재 논문 제목 및 공저자 표기를 다시 확인하십시오.',
    verification_path: [
      { step: 1, is_optional: false, name: '1. 후보 탐색', api: 'KCI articleSearch', status: 'ok', detail: '✓ 유사 후보 발견' },
      { step: 2, is_optional: false, name: '2. 실제 레코드 고정', api: 'KCI articleDetail', status: 'warn', detail: '! 제목 유사도 미달' },
      { step: 3, is_optional: false, name: '3. 필드 정합성 검증', api: 'Title · Author · Year', status: 'skip', detail: '- 대조 미완료' },
      { step: 4, is_optional: true, name: '4. 참고문헌 근거', api: 'Reference Evidence', status: 'unexecuted', detail: '○ 이번 판정에는 미사용' },
      { step: 5, is_optional: true, name: '5. 외부 교차확인', api: 'External Corroboration', status: 'unexecuted', detail: '○ 이번 판정에는 불필요' },
    ],
  },
];

// UI State
const state = {
  currentKciFinding: CANONICAL_KCI_DRIFT,
  activeTfFindingId: 'TR-CAUS-001',
  activeSection: 'overview',
  activePreset: 'drift',
  isFrozenSnapshotActive: false,
  // Batch Audit State
  auditMode: 'batch', // 'batch' | 'single'
  parsedCitations: [],
  batchFindings: [],
  batchFilter: 'ALL',
  batchSearchQuery: '',
  selectedBatchIndex: 1, // Default selected index (0-indexed: item 1 is METADATA_DRIFT)
  batchExecMode: 'LIVE', // 'LIVE' | 'DEMO'
  batchSystemErrorCount: 0,
};

// DOM References
const $ = id => document.getElementById(id);
const el = {
  topnavLinks: document.querySelectorAll('.topnav-link[data-target]'),
  // Mode Selector Bar
  tabModeBatch: $('tabModeBatch'),
  tabModeSingle: $('tabModeSingle'),
  batchWorkspace: $('batchWorkspace'),
  singleWorkspace: $('singleWorkspace'),
  modeDescText: $('modeDescText'),
  // Step 1: Input
  batchInputCard: $('batchInputCard'),
  batchInputText: $('batchInputText'),
  btnAnalyzeBatch: $('btnAnalyzeBatch'),
  btnLoadExampleBatch: $('btnLoadExampleBatch'),
  btnClearBatch: $('btnClearBatch'),
  // Step 2: Parse Preview
  batchParseCard: $('batchParseCard'),
  parseStatusSummary: $('parseStatusSummary'),
  parseTableBody: $('parseTableBody'),
  radioLiveKci: $('radioLiveKci'),
  radioDemoKci: $('radioDemoKci'),
  btnExecuteBatchAudit: $('btnExecuteBatchAudit'),
  // Progress
  batchProgressCard: $('batchProgressCard'),
  progressCountText: $('progressCountText'),
  progressFill: $('progressFill'),
  // Step 3: Summary
  batchResultsWrapper: $('batchResultsWrapper'),
  summaryTotalTitle: $('summaryTotalTitle'),
  countVerified: $('countVerified'),
  countDrift: $('countDrift'),
  countReview: $('countReview'),
  countNotFound: $('countNotFound'),
  sysStatusText: $('sysStatusText'),
  // Step 4: Results Table
  batchFilterPills: $('batchFilterPills'),
  filterCountAll: $('filterCountAll'),
  filterCountVerified: $('filterCountVerified'),
  filterCountDrift: $('filterCountDrift'),
  filterCountReview: $('filterCountReview'),
  filterCountNotFound: $('filterCountNotFound'),
  filterCountSystem: $('filterCountSystem'),
  batchSearchInput: $('batchSearchInput'),
  resultsTableBody: $('resultsTableBody'),
  btnReauditBatch: $('btnReauditBatch'),
  // Step 5: Detail Panel
  batchDetailPanel: $('batchDetailPanel'),
  // Single Citation Console (retained 100%)
  liveAuditForm: $('liveAuditForm'),
  liveTitle: $('liveTitle'),
  liveAuthors: $('liveAuthors'),
  liveYear: $('liveYear'),
  liveDoi: $('liveDoi'),
  btnExecuteLiveAudit: $('btnExecuteLiveAudit'),
  presetDrift: $('presetDrift'),
  presetNotFound: $('presetNotFound'),
  presetSysFail: $('presetSysFail'),
  liveApiStatus: $('liveApiStatus'),
  liveStatusMsg: $('liveStatusMsg'),
  oaiFallbackBox: $('oaiFallbackBox'),
  btnLoadOaiSnapshot: $('btnLoadOaiSnapshot'),
  kciResultPanel: $('kciResultPanel'),
  btnTfCaus: $('btnTfCaus'),
  btnTfCit: $('btnTfCit'),
  tfSpanCausKo: $('tfSpanCausKo'),
  tfSpanCausEn: $('tfSpanCausEn'),
  tfSpanCitKo: $('tfSpanCitKo'),
  tfSpanCitEn: $('tfSpanCitEn'),
  tfEvidencePanel: $('tfEvidencePanel'),
};

/* ------------------------------------------------------------------ NAVIGATION & SCROLL TRACKING */

function updateActiveNav(targetId) {
  state.activeSection = targetId;
  el.topnavLinks.forEach(link => {
    link.classList.toggle('is-active', link.dataset.target === targetId);
  });
}

function initScrollTracking() {
  const sections = ['overview', 'kci-live', 'test-evidence', 'claim-evidence', 'architecture']
    .map(id => $(id))
    .filter(Boolean);

  const observer = new IntersectionObserver(entries => {
    entries.forEach(entry => {
      if (entry.isIntersecting) {
        updateActiveNav(entry.target.id);
      }
    });
  }, { threshold: 0.25 });

  sections.forEach(sec => observer.observe(sec));

  // Smooth click scroll
  el.topnavLinks.forEach(link => {
    link.addEventListener('click', e => {
      const targetId = link.dataset.target;
      const targetSec = $(targetId);
      if (targetSec) {
        e.preventDefault();
        targetSec.scrollIntoView({ behavior: 'smooth', block: 'start' });
        history.replaceState(null, '', `#${targetId}`);
        updateActiveNav(targetId);
      }
    });
  });

  // Buttons in Hero
  $('btnGoLiveKci')?.addEventListener('click', e => {
    e.preventDefault();
    $('kci-live')?.scrollIntoView({ behavior: 'smooth', block: 'start' });
    history.replaceState(null, '', '#kci-live');
    updateActiveNav('kci-live');
  });

  $('btnGoClaimEvidence')?.addEventListener('click', e => {
    e.preventDefault();
    $('claim-evidence')?.scrollIntoView({ behavior: 'smooth', block: 'start' });
    history.replaceState(null, '', '#claim-evidence');
    updateActiveNav('claim-evidence');
  });

  $('btnGoTranslation')?.addEventListener('click', e => {
    e.preventDefault();
    $('claim-evidence')?.scrollIntoView({ behavior: 'smooth', block: 'start' });
    history.replaceState(null, '', '#claim-evidence');
    updateActiveNav('claim-evidence');
  });
}

/* ------------------------------------------------------------------ SECTION 2: LIVE KCI DEMO (RESULT FIRST) */

/**
 * Renders the KCI Result using the STRICT RESULT FIRST hierarchy:
 * 1. What was found? (Status Header)
 * 2. Which field differs? (Field Comparison Table)
 * 3. Why was that verdict produced? (Rule, Source Record, Reason, Human Review)
 * 4. How was the evidence obtained? (Verification Path: Active Steps 1-3 vs Optional Stages 4-5)
 */
function renderKciResult(finding, { isFrozenSnapshot = false, targetElement = el.kciResultPanel } = {}) {
  if (!finding || !targetElement) return;

  const isSystem = finding.kind === 'SYSTEM_FAILURE';
  const status = isSystem ? finding.system_state : finding.status;
  const isDrift = status === 'METADATA_DRIFT';
  const isNotFound = status === 'NOT_FOUND_IN_KCI';
  const isVerified = status === 'VERIFIED';
  const tone = isDrift ? 'drift' : (isVerified ? 'verified' : (isNotFound ? 'notfound' : (isSystem ? 'system' : 'review')));

  const recordId = finding.evidence?.[0]?.source_record_id || (isDrift ? 'ART003062835' : null);
  const kciUrl = recordId ? `https://www.kci.go.kr/kciportal/ci/sereArticleSearch/ciSereArtiView.kci?sereArticleSearchBean.artiId=${encodeURIComponent(recordId)}` : null;

  const path = finding.verification_path || CANONICAL_KCI_DRIFT.verification_path;

  let html = `
    <!-- 1. WHAT WAS FOUND? (Result Status Header) -->
    <div class="result-status-card tone-${tone}">
      <div class="status-badge-row">
        <div class="status-left">
          <span class="status-dot"></span>
          <span class="status-title">
            ${isFrozenSnapshot ? '📦 Frozen Evidence Snapshot (OAI-PMH 고정본)' : (isDrift ? '정보 불일치 (METADATA_DRIFT)' : (isNotFound ? 'KCI 미발견 (NOT_FOUND_IN_KCI)' : (isSystem ? '시스템 연결 오류 (SYSTEM_FAILURE)' : escapeHtml(status))))}
          </span>
        </div>
        <span class="rule-tag">규칙: ${escapeHtml(finding.rule_id || finding.operation || 'REF-META-002')} (v${escapeHtml(finding.rule_version || '1.0')})</span>
      </div>
      <p class="status-summary-text">${escapeHtml(finding.reason || '')}</p>
    </div>`;

  // 2. WHICH FIELD DIFFERS? (Field Comparison Table)
  if (finding.field_comparisons?.length) {
    html += `
      <div class="field-table-container">
        <div class="field-table-caption">항목별 서지 대조 (Which field differs?)</div>
        <div class="field-rows-list">
          ${finding.field_comparisons.map(row => {
            const isMismatch = row.result === 'MISMATCH';
            return `
              <div class="compare-row ${isMismatch ? 'is-mismatch' : 'is-match'}">
                <span class="col-field">${escapeHtml(row.label || row.field)}</span>
                <div class="col-result">
                  ${isMismatch
                    ? `<span class="val-pill mismatch">${escapeHtml(row.input_value)} <span class="arr">→</span> ${escapeHtml(row.evidence_value)} (MISMATCH)</span>`
                    : `<span class="val-pill match"><svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><polyline points="20 6 9 17 4 12"/></svg> 일치 (${escapeHtml(row.input_value)})</span>`}
                </div>
              </div>`;
          }).join('')}
        </div>
      </div>`;
  }

  // 3. WHY WAS THAT VERDICT PRODUCED? (Record, Rule, Human Review)
  if (recordId) {
    html += `
      <div class="kci-evidence-box">
        <div class="evidence-box-head">
          <span class="ev-source-title">식별된 KCI 공식 레코드</span>
          <a class="kci-portal-link" href="${escapeHtml(kciUrl)}" target="_blank" rel="noopener">
            KCI 식별: ${escapeHtml(recordId)} <span class="ext-arrow">↗</span>
          </a>
        </div>
        <div class="ev-citation-title">${escapeHtml(finding.input?.title || CANONICAL_KCI_DRIFT.input.title)}</div>
      </div>`;
  }

  // Crossref Corroboration for NOT_FOUND_IN_KCI
  if (finding.crossref_corroboration) {
    const cr = finding.crossref_corroboration;
    html += `
      <div class="crossref-corroboration-box">
        <div class="cr-head">
          <span class="cr-tag">Crossref 독립 DOI 교차확인 [QUALIFIED]</span>
          <span class="cr-doi">${escapeHtml(cr.doi)}</span>
        </div>
        <div class="cr-container">${escapeHtml(cr.container)}</div>
        <div class="cr-interpretation">
          <strong>설계 원칙:</strong> ${escapeHtml(cr.interpretation)}
        </div>
      </div>`;
  }

  // Human Review Callout
  if (finding.human_review_badge) {
    html += `
      <div class="human-review-box tone-${tone}">
        <div class="review-head">
          <span class="review-label">연구자 최종 검토 신호 (Human Review)</span>
          <strong class="review-badge">${escapeHtml(finding.human_review_badge)}</strong>
        </div>
        <p class="review-detail">${escapeHtml(finding.human_review_callout || '')}</p>
      </div>`;
  }

  // 4. HOW WAS THE EVIDENCE OBTAINED? (VERIFICATION PATH)
  html += `
    <div class="verification-path-box">
      <div class="vpath-header">
        <div class="vpath-title-group">
          <span class="vpath-title">검증 경로 (Verification Path)</span>
          <span class="vpath-active-tag">Steps 1–3 실제 판정 생성 경로</span>
        </div>
        <span class="vpath-sub">한국어 목적 중심 단계별 추적</span>
      </div>

      <div class="vpath-list">
        ${path.map(p => {
          const isOpt = p.is_optional;
          let icon = '✓';
          let cls = isOpt ? 'is-optional-item' : 'is-active-item';

          if (p.status === 'warn') { icon = '!'; cls += ' is-warn'; }
          else if (p.status === 'fail') { icon = '✕'; cls += ' is-fail'; }
          else if (p.status === 'notfound') { icon = '!'; cls += ' is-notfound'; }
          else if (p.status === 'corroborated') { icon = '✓'; cls += ' is-corroborated'; }
          else if (p.status === 'unexecuted') { icon = '○'; cls += ' is-unexecuted'; }
          else if (p.status === 'skip') { icon = '-'; cls += ' is-skip'; }
          else { cls += ' is-ok'; }

          return `
            <div class="vpath-item ${cls}">
              <div class="vpath-item-left">
                <span class="vpath-icon">${icon}</span>
                <div class="vpath-names">
                  <span class="vpath-name">${escapeHtml(p.name)}</span>
                  <span class="vpath-api">${escapeHtml(p.api)}</span>
                </div>
              </div>
              <div class="vpath-item-right">
                <span class="vpath-detail-badge ${cls}">${escapeHtml(p.detail)}</span>
                ${isOpt ? '<span class="vpath-opt-tag">선택적</span>' : '<span class="vpath-core-tag">핵심</span>'}
              </div>
            </div>`;
        }).join('')}
      </div>
    </div>`;

  // 5. Technical Details Accordion (SHA-256 snapshot and JSON)
  html += `
    <details class="tech-accordion">
      <summary>
        <span>상세 기술 근거 및 SHA-256 스냅샷 보기</span>
        <span class="summary-hint">규칙 ID · 해시 · 원본 JSON</span>
      </summary>
      <div class="accordion-content">
        <dl class="tech-kv-grid">
          <div><dt>rule_id</dt><dd>${escapeHtml(finding.rule_id || 'REF-META-002')}</dd></div>
          <div><dt>rule_version</dt><dd>${escapeHtml(finding.rule_version || '1.0')}</dd></div>
          <div><dt>source_system</dt><dd>${isFrozenSnapshot ? 'KCI OAI-PMH Frozen Snapshot' : 'NRF KCI Open API'}</dd></div>
          <div><dt>source_record_id</dt><dd>${escapeHtml(recordId || '(없음)')}</dd></div>
          <div><dt>content_sha256</dt><dd class="hash-text">${escapeHtml(finding.evidence?.[0]?.normalized_content_sha256 || '2222222222222222222222222222222222222222222222222222222222222222')}</dd></div>
        </dl>
        <div class="raw-json-bar">
          <span>원본 계약 JSON</span>
          <button class="btn btn-ghost btn-sm btn-copy-kci-json" type="button">JSON 복사</button>
        </div>
        <pre class="json-code"><code>${escapeHtml(JSON.stringify(finding, null, 2))}</code></pre>
      </div>
    </details>`;

  targetElement.innerHTML = html;

  targetElement.querySelector('.btn-copy-kci-json')?.addEventListener('click', async (e) => {
    try {
      await navigator.clipboard.writeText(JSON.stringify(finding, null, 2));
      const btn = e.currentTarget;
      if (btn) {
        btn.textContent = '복사 완료!';
        setTimeout(() => { btn.textContent = 'JSON 복사'; }, 1500);
      }
    } catch {
      // ignore
    }
  });
}

async function handleLiveAudit(event) {
  event?.preventDefault();

  const citation = {
    title: el.liveTitle.value.trim(),
  };
  if (!citation.title) return;

  const authors = el.liveAuthors.value.split(',').map(s => s.trim()).filter(Boolean);
  if (authors.length) citation.authors = authors;
  if (el.liveYear.value.trim()) citation.publication_year = el.liveYear.value.trim();
  if (el.liveDoi.value.trim()) citation.doi = el.liveDoi.value.trim();

  el.btnExecuteLiveAudit.disabled = true;
  el.btnExecuteLiveAudit.innerHTML = '<span class="spinner"></span> KCI Open API 조회 중…';
  el.liveApiStatus.className = 'live-api-status is-pending';
  el.liveStatusMsg.textContent = '한국연구재단 KCI articleSearch 및 articleDetail 호출 중…';
  el.oaiFallbackBox.hidden = true;

  try {
    const res = await fetch('/api/audit/citation', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(citation),
    });
    const result = await res.json();
    if (!res.ok) throw new Error(result.error || '조회 실패');

    // Enrich verification path dynamically
    const isDrift = result.status === 'METADATA_DRIFT';
    const isVerified = result.status === 'VERIFIED';
    const isNotFound = result.status === 'NOT_FOUND_IN_KCI';
    const recordId = result.evidence?.[0]?.source_record_id;

    result.human_review_badge = isDrift ? '서지정보 확인 권장' : (isVerified ? '필요 시 원문 확인' : (isNotFound ? '색인 범위 확인 권장' : '사람 검토 필요'));
    result.human_review_callout = isDrift
      ? 'KCI 공식 레코드와 출판연도가 다릅니다. 출판본(2024)과 프리프린트(2023)의 차이인지 확인하세요.'
      : (isVerified ? 'KCI 공식 서지정보와 직접 일치합니다.' : (isNotFound ? 'KCI에서 미발견되었습니다. 해외 논문은 Crossref 독립 DOI를 교차확인하세요.' : 'KCI 근거를 직접 확인하세요.'));

    result.verification_path = [
      { step: 1, is_optional: false, name: '1. 후보 탐색', api: 'KCI articleSearch', status: isNotFound ? 'notfound' : 'ok', detail: isNotFound ? '! 후보 레코드 0건 (No Data)' : `✓ 후보 레코드 발견 (${result.evidence?.length || 1}건)` },
      { step: 2, is_optional: false, name: '2. 실제 레코드 고정', api: 'KCI articleDetail', status: recordId ? 'ok' : 'skip', detail: recordId ? `✓ ${recordId}` : '- 대상 식별자 부재' },
      { step: 3, is_optional: false, name: '3. 필드 정합성 검증', api: 'Title · Author · Year · DOI', status: isDrift ? 'warn' : (isVerified ? 'ok' : 'skip'), detail: isDrift ? '! Year 불일치' : (isVerified ? '✓ 서지정보 일치' : '- 대조 미실행') },
      { step: 4, is_optional: true, name: '4. 참고문헌 근거', api: 'Reference Evidence', status: 'unexecuted', detail: '○ 이번 판정에는 미사용' },
      { step: 5, is_optional: true, name: '5. 외부 교차확인', api: 'External Corroboration', status: 'unexecuted', detail: '○ 이번 판정에는 불필요' },
    ];

    state.currentKciFinding = result;
    renderKciResult(result);

    el.liveApiStatus.className = 'live-api-status is-success';
    el.liveStatusMsg.textContent = `조회 완료: ${result.status || result.system_state} (규칙: ${result.rule_id || result.operation || ''})`;
  } catch (err) {
    el.liveApiStatus.className = 'live-api-status is-error';
    el.liveStatusMsg.textContent = `조회 실패: ${err.message}. KCI_UNAVAILABLE 장애 격리 상태입니다.`;
    el.oaiFallbackBox.hidden = false;
    renderKciResult(PRESET_SYSTEM_FAILURE);
  } finally {
    el.btnExecuteLiveAudit.disabled = false;
    el.btnExecuteLiveAudit.innerHTML = '<span class="btn-icon">⚡</span> KCI 실시간 검증 실행';
  }
}

/* ------------------------------------------------------------------ SECTION 2A: BIBLIOGRAPHY BATCH AUDIT */

function switchAuditMode(mode) {
  state.auditMode = mode;
  const isBatch = mode === 'batch';
  el.tabModeBatch?.classList.toggle('is-active', isBatch);
  el.tabModeBatch?.setAttribute('aria-selected', isBatch ? 'true' : 'false');
  el.tabModeSingle?.classList.toggle('is-active', !isBatch);
  el.tabModeSingle?.setAttribute('aria-selected', !isBatch ? 'true' : 'false');

  if (el.batchWorkspace) el.batchWorkspace.hidden = !isBatch;
  if (el.singleWorkspace) el.singleWorkspace.hidden = isBatch;

  if (el.modeDescText) {
    if (isBatch) {
      el.modeDescText.textContent = '논문 전체의 참고문헌 목록을 한 번에 붙여넣어 구문 분석 및 KCI 다중 서지 무결성을 일괄 검증합니다.';
    } else {
      el.modeDescText.textContent = '개별 인용 서지정보를 직접 입력하거나 프리셋을 선택하여 KCI 공식 레코드와의 1:1 대조 및 검증 경로를 심층 분석합니다.';
    }
  }
}

function parseBibliographyLine(rawLine, index) {
  let text = rawLine.trim();
  if (!text) return null;

  // Extract leading citation numbering like [1], (1), 1., 1)
  text = text.replace(/^(\[\d+\]|\(\d+\)|\d+\.|\d+\))\s*/, '').trim();

  // Extract DOI if present
  let doi = '';
  const doiMatch = text.match(/\b(10\.\d{4,9}\/[-._;()/:A-Za-z0-9]+)\b/i);
  if (doiMatch) {
    doi = doiMatch[1].replace(/[.,;)]+$/, '');
    text = text.replace(doiMatch[0], '').trim();
  }

  // Extract 4-digit publication year (19xx or 20xx)
  let year = '';
  const yearMatch = text.match(/\b(19\d\d|20\d\d)\b/);
  if (yearMatch) {
    year = yearMatch[1];
    text = text.replace(new RegExp(`[,\\s\\(]*\\b${year}\\b[,\\s\\)]*`), ' ').trim();
  }

  // Extract Title: check quotes first ("...", “...”, 『...』, 「...」)
  let title = '';
  let authors = '';
  const quoteMatch = text.match(/["“『「]([^"”』」]+)["”』」]/);
  if (quoteMatch) {
    title = quoteMatch[1].trim();
    const parts = text.split(quoteMatch[0]);
    authors = (parts[0] || parts[1] || '').replace(/^[,\s.-]+|[,\s.-]+$/g, '').trim();
  } else {
    // If no quotes, split by comma or period
    const parts = text.split(/[,.]/).map(s => s.trim()).filter(Boolean);
    if (parts.length >= 2) {
      authors = parts[0];
      title = parts.slice(1).join(', ').trim();
    } else if (parts.length === 1) {
      title = parts[0];
    }
  }

  title = title.replace(/^[,\s.-]+|[,\s.-]+$/g, '').trim();
  authors = authors.replace(/^[,\s.-]+|[,\s.-]+$/g, '').trim();

  // Determine parse status
  // Principle: UNPARSED must never be treated as NOT_FOUND_IN_KCI
  let parseStatus = 'READY';
  if (!title || title.length < 3) {
    parseStatus = 'UNPARSED';
  } else if (!authors && !year && !doi) {
    parseStatus = 'NEEDS_REVIEW';
  }

  return {
    index: index + 1,
    raw: rawLine.trim(),
    title,
    authors: authors ? [authors] : [],
    year,
    doi,
    parseStatus,
  };
}

function parseBibliographyText(rawText) {
  const lines = rawText.split('\n').map(l => l.trim()).filter(Boolean);
  const items = [];
  lines.forEach((line, idx) => {
    const parsed = parseBibliographyLine(line, idx);
    if (parsed) items.push(parsed);
  });
  return items;
}

async function handleAnalyzeBatch() {
  const text = el.batchInputText?.value.trim();
  if (!text) {
    alert('참고문헌 목록을 붙여넣으세요.');
    return;
  }

  // Try backend reference parser first for highest accuracy
  try {
    const res = await fetch('/api/references/parse', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ text }),
    });
    if (res.ok) {
      const data = await res.json();
      if (Array.isArray(data.rows) && data.rows.length) {
        state.parsedCitations = data.rows.map((r, i) => ({
          index: r.index || i + 1,
          raw: r.raw || '',
          title: r.citation?.title || '',
          authors: Array.isArray(r.citation?.authors) ? r.citation.authors : (r.citation?.authors ? [r.citation.authors] : []),
          year: r.citation?.publication_year || '',
          doi: r.citation?.doi || '',
          parseStatus: r.parse_status || 'READY',
        }));
        if (el.batchParseCard) el.batchParseCard.hidden = false;
        if (el.batchResultsWrapper) el.batchResultsWrapper.hidden = true;
        if (el.batchProgressCard) el.batchProgressCard.hidden = true;
        renderParsePreviewTable();
        el.batchParseCard?.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
        return;
      }
    }
  } catch {
    // fallback to local parser
  }

  state.parsedCitations = parseBibliographyText(text);
  if (!state.parsedCitations.length) {
    alert('유효한 참고문헌 행을 찾지 못했습니다.');
    return;
  }

  if (el.batchParseCard) el.batchParseCard.hidden = false;
  if (el.batchResultsWrapper) el.batchResultsWrapper.hidden = true;
  if (el.batchProgressCard) el.batchProgressCard.hidden = true;

  renderParsePreviewTable();
  el.batchParseCard?.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
}

function renderParsePreviewTable() {
  const items = state.parsedCitations;
  const readyCount = items.filter(c => c.parseStatus === 'READY').length;
  const reviewCount = items.filter(c => c.parseStatus === 'NEEDS_REVIEW').length;
  const unparsedCount = items.filter(c => c.parseStatus === 'UNPARSED').length;

  if (el.parseStatusSummary) {
    el.parseStatusSummary.innerHTML = `
      <span class="summary-pill ready">READY ${readyCount}건</span>
      <span class="summary-pill review">NEEDS_REVIEW ${reviewCount}건</span>
      <span class="summary-pill unparsed">UNPARSED ${unparsedCount}건</span>
    `;
  }

  const validCount = readyCount + reviewCount;
  if (el.btnExecuteBatchAudit) {
    el.btnExecuteBatchAudit.innerHTML = `<span class="btn-icon">⚡</span> KCI에서 ${validCount}개 검증 실행`;
  }

  if (!el.parseTableBody) return;

  el.parseTableBody.innerHTML = items.map((c, i) => {
    const statusClass = c.parseStatus.toLowerCase();
    const statusLabel = c.parseStatus === 'READY' ? 'READY (준비)' : (c.parseStatus === 'NEEDS_REVIEW' ? 'NEEDS_REVIEW (보강 권장)' : 'UNPARSED (수동 입력 필요)');

    return `
      <tr data-index="${i}">
        <td class="col-idx"><strong>[${c.index}]</strong></td>
        <td>
          <input type="text" class="parse-cell-input title-input" data-idx="${i}" data-field="title" value="${escapeHtml(c.title)}" placeholder="논문 제목 입력...">
        </td>
        <td>
          <input type="text" class="parse-cell-input" data-idx="${i}" data-field="authors" value="${escapeHtml(c.authors.join(', '))}" placeholder="저자명">
        </td>
        <td>
          <input type="text" class="parse-cell-input" data-idx="${i}" data-field="year" value="${escapeHtml(c.year)}" placeholder="연도">
        </td>
        <td>
          <input type="text" class="parse-cell-input" data-idx="${i}" data-field="doi" value="${escapeHtml(c.doi)}" placeholder="10.xxxx/...">
        </td>
        <td>
          <span class="parse-status-badge ${statusClass}">${escapeHtml(statusLabel)}</span>
        </td>
      </tr>
    `;
  }).join('');

  // Wire up inline edit events
  el.parseTableBody.querySelectorAll('.parse-cell-input').forEach(input => {
    input.addEventListener('input', e => {
      const idx = parseInt(e.target.dataset.idx, 10);
      const field = e.target.dataset.field;
      updateParsedCitation(idx, field, e.target.value);
    });
  });
}

function updateParsedCitation(index, field, value) {
  const item = state.parsedCitations[index];
  if (!item) return;

  if (field === 'title') {
    item.title = value.trim();
  } else if (field === 'authors') {
    item.authors = value.split(',').map(s => s.trim()).filter(Boolean);
  } else if (field === 'year') {
    item.year = value.trim();
  } else if (field === 'doi') {
    item.doi = value.trim();
  }

  // Re-evaluate parseStatus
  if (!item.title || item.title.length < 3) {
    item.parseStatus = 'UNPARSED';
  } else if (!item.authors.length && !item.year && !item.doi) {
    item.parseStatus = 'NEEDS_REVIEW';
  } else {
    item.parseStatus = 'READY';
  }

  // Update badge in DOM without losing focus
  const row = el.parseTableBody?.querySelector(`tr[data-index="${index}"]`);
  if (row) {
    const badge = row.querySelector('.parse-status-badge');
    if (badge) {
      badge.className = `parse-status-badge ${item.parseStatus.toLowerCase()}`;
      badge.textContent = item.parseStatus === 'READY' ? 'READY (준비)' : (item.parseStatus === 'NEEDS_REVIEW' ? 'NEEDS_REVIEW (보강 권장)' : 'UNPARSED (수동 입력 필요)');
    }
  }

  const readyCount = state.parsedCitations.filter(c => c.parseStatus === 'READY').length;
  const reviewCount = state.parsedCitations.filter(c => c.parseStatus === 'NEEDS_REVIEW').length;
  const unparsedCount = state.parsedCitations.filter(c => c.parseStatus === 'UNPARSED').length;

  if (el.parseStatusSummary) {
    el.parseStatusSummary.innerHTML = `
      <span class="summary-pill ready">READY ${readyCount}건</span>
      <span class="summary-pill review">NEEDS_REVIEW ${reviewCount}건</span>
      <span class="summary-pill unparsed">UNPARSED ${unparsedCount}건</span>
    `;
  }
  if (el.btnExecuteBatchAudit) {
    el.btnExecuteBatchAudit.innerHTML = `<span class="btn-icon">⚡</span> KCI에서 ${readyCount + reviewCount}개 검증 실행`;
  }
}

async function executeBatchAudit() {
  const items = state.parsedCitations;
  if (!items.length) return;

  const execMode = el.radioDemoKci?.checked ? 'DEMO' : 'LIVE';
  state.batchExecMode = execMode;
  state.batchSystemErrorCount = 0;
  state.batchFindings = [];

  if (el.batchParseCard) el.batchParseCard.hidden = true;
  if (el.batchProgressCard) el.batchProgressCard.hidden = false;
  if (el.batchResultsWrapper) el.batchResultsWrapper.hidden = true;

  const total = items.length;

  for (let i = 0; i < total; i++) {
    const item = items[i];
    if (el.progressCountText) {
      el.progressCountText.textContent = `KCI 검증 중 ${i + 1} / ${total} (${item.title.slice(0, 24)}...)`;
    }
    if (el.progressFill) {
      el.progressFill.style.width = `${Math.round(((i + 1) / total) * 100)}%`;
    }

    if (item.parseStatus === 'UNPARSED') {
      // Principle: UNPARSED must never be treated as NOT_FOUND_IN_KCI
      const unparsedFinding = {
        contract_version: 'trustverify-citation-finding-v1',
        kind: 'PARSER_NOTICE',
        finding_id: `batch-unparsed-${i + 1}`,
        track: 'CITATION_INTEGRITY',
        status: 'UNPARSED_CITATION',
        rule_id: 'PARSE-UNPARSED',
        rule_version: '1.0',
        input: {
          citation_id: `batch-citation-${i + 1}`,
          title: item.title || '(제목 미추출)',
          authors: item.authors,
          publication_year: item.year,
          doi: item.doi,
          raw: item.raw,
        },
        evidence: [],
        field_comparisons: [],
        reason: '구문 분석 단계에서 필수 서지정보(제목)가 식별되지 않았습니다. KCI 조회 대상에서 제외되었으며, NOT_FOUND_IN_KCI(색인 미발견)가 아닙니다.',
        human_review_required: true,
        human_review_badge: '서지형식 재입력 권장',
        human_review_callout: '참고문헌 서지형식이 비표준적이어서 제목을 추출하지 못했습니다. 수동으로 서지정보를 입력하여 검증하세요.',
        verification_path: [
          { step: 1, is_optional: false, name: '1. 서지 구문분석', api: 'Local Parser', status: 'fail', detail: '✕ 제목 추출 실패' },
          { step: 2, is_optional: false, name: '2. 후보 탐색', api: 'KCI articleSearch', status: 'skip', detail: '- 미발송 (오검색 방지)' },
          { step: 3, is_optional: false, name: '3. 필드 정합성 검증', api: 'Title · Author · Year · DOI', status: 'skip', detail: '- 대조 미실행' },
          { step: 4, is_optional: true, name: '4. 참고문헌 근거', api: 'Reference Evidence', status: 'unexecuted', detail: '○ 미실행' },
          { step: 5, is_optional: true, name: '5. 외부 교차확인', api: 'External Corroboration', status: 'unexecuted', detail: '○ 미실행' },
        ],
      };
      state.batchFindings.push(unparsedFinding);
      continue;
    }

    if (execMode === 'DEMO') {
      // Simulate slight responsive feel
      await new Promise(r => setTimeout(r, 120));
      const demoFinding = DEMO_BATCH_FIXTURES[i % DEMO_BATCH_FIXTURES.length];
      const cloned = JSON.parse(JSON.stringify(demoFinding));
      cloned.batch_item_index = i + 1;
      cloned.input = {
        citation_id: `batch-citation-${i + 1}`,
        title: item.title,
        authors: item.authors,
        publication_year: item.year,
        doi: item.doi,
      };
      state.batchFindings.push(cloned);
    } else {
      // LIVE KCI Open API Call
      try {
        const payload = { title: item.title };
        if (item.authors.length) payload.authors = item.authors;
        if (item.year) payload.publication_year = item.year;
        if (item.doi) payload.doi = item.doi;

        const res = await fetch('/api/audit/citation', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload),
        });
        const result = await res.json();

        if (!res.ok) {
          throw new Error(result.error || `HTTP ${res.status}`);
        }

        const isDrift = result.status === 'METADATA_DRIFT';
        const isVerified = result.status === 'VERIFIED';
        const isNotFound = result.status === 'NOT_FOUND_IN_KCI';
        const recordId = result.evidence?.[0]?.source_record_id;

        result.human_review_badge = isDrift ? '서지정보 확인 권장' : (isVerified ? '원문 보존 확인' : (isNotFound ? '색인 범위 확인 권장' : '연구자 검토 필요'));
        result.human_review_callout = isDrift
          ? 'KCI 공식 레코드와 출판연도가 다릅니다. 출판본과 프리프린트의 차이인지 확인하세요.'
          : (isVerified ? 'KCI 공식 서지정보와 직접 일치합니다.' : (isNotFound ? 'KCI에서 미발견되었습니다. 해외 논문은 Crossref 독립 DOI를 교차확인하세요.' : 'KCI 근거를 직접 확인하세요.'));

        result.verification_path = [
          { step: 1, is_optional: false, name: '1. 후보 탐색', api: 'KCI articleSearch', status: isNotFound ? 'notfound' : 'ok', detail: isNotFound ? '! 후보 레코드 0건 (No Data)' : `✓ 후보 레코드 발견 (${result.evidence?.length || 1}건)` },
          { step: 2, is_optional: false, name: '2. 실제 레코드 고정', api: 'KCI articleDetail', status: recordId ? 'ok' : 'skip', detail: recordId ? `✓ ${recordId}` : '- 대상 식별자 부재' },
          { step: 3, is_optional: false, name: '3. 필드 정합성 검증', api: 'Title · Author · Year · DOI', status: isDrift ? 'warn' : (isVerified ? 'ok' : 'skip'), detail: isDrift ? '! 서지 불일치' : (isVerified ? '✓ 4대 서지필드 일치' : '- 대조 미실행') },
          { step: 4, is_optional: true, name: '4. 참고문헌 근거', api: 'Reference Evidence', status: 'unexecuted', detail: '○ 이번 판정에는 미사용' },
          { step: 5, is_optional: true, name: '5. 외부 교차확인', api: 'External Corroboration', status: 'unexecuted', detail: '○ 이번 판정에는 불필요' },
        ];

        result.batch_item_index = i + 1;
        state.batchFindings.push(result);
      } catch (err) {
        state.batchSystemErrorCount++;
        const sysFailureFinding = {
          contract_version: 'trustverify-system-failure-v1',
          kind: 'SYSTEM_FAILURE',
          failure_id: `batch-sysfail-${i + 1}`,
          system_state: 'KCI_UNAVAILABLE',
          operation: 'articleSearch',
          batch_item_index: i + 1,
          input: {
            citation_id: `batch-citation-${i + 1}`,
            title: item.title,
            authors: item.authors,
            publication_year: item.year,
            doi: item.doi,
          },
          reason: `조회 실패: ${err.message}. KCI_UNAVAILABLE 장애 격리 상태입니다 (인용 결함 아님).`,
          retry_recommended: true,
          research_finding_emitted: false,
          verification_path: [
            { step: 1, is_optional: false, name: '1. 후보 탐색', api: 'KCI articleSearch', status: 'fail', detail: '✕ 통신 장애 (503)' },
            { step: 2, is_optional: false, name: '2. 실제 레코드 고정', api: 'KCI articleDetail', status: 'skip', detail: '- 중단' },
            { step: 3, is_optional: false, name: '3. 필드 정합성 검증', api: 'Title · Author · Year · DOI', status: 'skip', detail: '- 판정 보류' },
            { step: 4, is_optional: true, name: '4. 참고문헌 근거', api: 'Reference Evidence', status: 'unexecuted', detail: '○ 미실행' },
            { step: 5, is_optional: true, name: '5. 외부 교차확인', api: 'External Corroboration', status: 'unexecuted', detail: '○ 미실행' },
          ],
        };
        state.batchFindings.push(sysFailureFinding);
      }
    }
  }

  // Finish batch execution
  if (el.batchProgressCard) el.batchProgressCard.hidden = true;
  if (el.batchResultsWrapper) el.batchResultsWrapper.hidden = false;

  renderBatchSummary();
  renderBatchResultsTable();

  // Find index of first METADATA_DRIFT item to showcase problem citation immediately
  const driftIdx = state.batchFindings.findIndex(f => f.status === 'METADATA_DRIFT');
  selectBatchRow(driftIdx >= 0 ? driftIdx : 0);

  el.batchResultsWrapper?.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
}

function renderBatchSummary() {
  const findings = state.batchFindings;
  const total = findings.length;

  const verified = findings.filter(f => f.status === 'VERIFIED').length;
  const drift = findings.filter(f => f.status === 'METADATA_DRIFT').length;
  const review = findings.filter(f => f.status === 'REVIEW_REQUIRED' || f.status === 'UNPARSED_CITATION').length;
  const notfound = findings.filter(f => f.status === 'NOT_FOUND_IN_KCI').length;
  const sysErrors = findings.filter(f => f.kind === 'SYSTEM_FAILURE').length;

  if (el.summaryTotalTitle) el.summaryTotalTitle.textContent = `총 ${total}개 참고문헌 검증 완료`;
  if (el.countVerified) el.countVerified.textContent = String(verified);
  if (el.countDrift) el.countDrift.textContent = String(drift);
  if (el.countReview) el.countReview.textContent = String(review);
  if (el.countNotFound) el.countNotFound.textContent = String(notfound);

  if (el.sysStatusText) {
    if (sysErrors > 0) {
      el.sysStatusText.innerHTML = `<span class="sys-error-highlight">시스템 연결 오류 ${sysErrors}건</span> (KCI API 장애 격리됨 · 인용 결함과 분리)`;
    } else {
      el.sysStatusText.textContent = '시스템 오류 0건 (NRF KCI API 정상 통신)';
    }
  }

  // Update filter pill counts
  if (el.filterCountAll) el.filterCountAll.textContent = String(total);
  if (el.filterCountVerified) el.filterCountVerified.textContent = String(verified);
  if (el.filterCountDrift) el.filterCountDrift.textContent = String(drift);
  if (el.filterCountReview) el.filterCountReview.textContent = String(review);
  if (el.filterCountNotFound) el.filterCountNotFound.textContent = String(notfound);
  if (el.filterCountSystem) el.filterCountSystem.textContent = String(sysErrors);
}

function getProblemFieldLabel(f) {
  if (f.kind === 'SYSTEM_FAILURE') return '시스템 연결 장애';
  if (f.status === 'VERIFIED') return '-';
  if (f.status === 'NOT_FOUND_IN_KCI') return '0건 (No Data)';
  if (f.status === 'UNPARSED_CITATION') return '제목 미추출';

  if (f.field_comparisons?.length) {
    const mismatches = f.field_comparisons.filter(fc => fc.result === 'MISMATCH');
    if (mismatches.length) {
      return mismatches.map(fc => `${fc.label || fc.field}: ${fc.input_value} → ${fc.evidence_value}`).join(' · ');
    }
  }
  if (f.status === 'METADATA_DRIFT') return '연도/서지 불일치';
  if (f.status === 'REVIEW_REQUIRED') return '후보 다수 / 유사도 미달';
  return '-';
}

function getRecordIdLabel(f) {
  if (f.evidence?.[0]?.source_record_id) {
    return f.evidence[0].source_record_id;
  }
  if (f.crossref_corroboration?.status === 'FOUND_IN_CROSSREF') {
    return 'Crossref 확인';
  }
  return '-';
}

function renderBatchResultsTable() {
  const filter = state.batchFilter;
  const q = state.batchSearchQuery.toLowerCase().trim();

  const filtered = state.batchFindings.map((f, originalIndex) => ({ f, originalIndex })).filter(({ f }) => {
    // Status filter
    if (filter === 'SYSTEM_FAILURE') {
      if (f.kind !== 'SYSTEM_FAILURE') return false;
    } else if (filter === 'REVIEW_REQUIRED') {
      if (f.status !== 'REVIEW_REQUIRED' && f.status !== 'UNPARSED_CITATION') return false;
    } else if (filter !== 'ALL') {
      if (f.status !== filter) return false;
    }

    // Search query filter
    if (q) {
      const title = (f.input?.title || '').toLowerCase();
      const authors = (Array.isArray(f.input?.authors) ? f.input.authors.join(' ') : (f.input?.authors || '')).toLowerCase();
      const doi = (f.input?.doi || '').toLowerCase();
      if (!title.includes(q) && !authors.includes(q) && !doi.includes(q)) return false;
    }

    return true;
  });

  if (!el.resultsTableBody) return;

  if (!filtered.length) {
    el.resultsTableBody.innerHTML = `
      <tr>
        <td colspan="5" style="text-align:center; padding: 2rem; color: var(--text-muted);">
          조건에 일치하는 참고문헌 결과가 없습니다.
        </td>
      </tr>
    `;
    return;
  }

  el.resultsTableBody.innerHTML = filtered.map(({ f, originalIndex }) => {
    const isSelected = originalIndex === state.selectedBatchIndex;
    const isSystem = f.kind === 'SYSTEM_FAILURE';
    const status = isSystem ? 'SYSTEM_FAILURE' : f.status;
    const statusClass = status.toLowerCase();

    const title = f.input?.title || '(제목 없음)';
    const authorsStr = Array.isArray(f.input?.authors) ? f.input.authors.join(', ') : (f.input?.authors || '');
    const yearStr = f.input?.publication_year ? ` (${f.input.publication_year})` : '';
    const authorYearSub = authorsStr || yearStr ? `${escapeHtml(authorsStr)}${escapeHtml(yearStr)}` : '';

    const problemField = getProblemFieldLabel(f);
    const recordLabel = getRecordIdLabel(f);

    let statusDisplay = escapeHtml(status);
    if (status === 'VERIFIED') statusDisplay = 'VERIFIED';
    else if (status === 'METADATA_DRIFT') statusDisplay = 'METADATA_DRIFT';
    else if (status === 'REVIEW_REQUIRED') statusDisplay = 'REVIEW_REQUIRED';
    else if (status === 'NOT_FOUND_IN_KCI') statusDisplay = 'NOT_FOUND';
    else if (status === 'SYSTEM_FAILURE') statusDisplay = 'KCI_UNAVAILABLE';
    else if (status === 'UNPARSED_CITATION') statusDisplay = 'UNPARSED';

    return `
      <tr class="result-row ${isSelected ? 'is-selected' : ''}" data-index="${originalIndex}">
        <td class="col-idx"><strong>[${originalIndex + 1}]</strong></td>
        <td class="col-title-cell">
          <div class="table-ref-title">${escapeHtml(title)}</div>
          ${authorYearSub ? `<div class="table-ref-sub">${authorYearSub}</div>` : ''}
        </td>
        <td>
          <span class="status-badge-cell ${statusClass}">${statusDisplay}</span>
        </td>
        <td>
          <span class="problem-field-cell ${problemField !== '-' ? 'is-problem' : ''}">${escapeHtml(problemField)}</span>
        </td>
        <td class="col-record-cell">
          ${recordLabel !== '-' ? `<span class="record-id-badge">${escapeHtml(recordLabel)}</span>` : '<span class="text-muted">-</span>'}
        </td>
      </tr>
    `;
  }).join('');

  // Attach click listener to rows
  el.resultsTableBody.querySelectorAll('.result-row').forEach(row => {
    row.addEventListener('click', () => {
      const idx = parseInt(row.dataset.index, 10);
      selectBatchRow(idx);
    });
  });
}

function selectBatchRow(index) {
  state.selectedBatchIndex = index;
  const finding = state.batchFindings[index];
  if (!finding) return;

  // Highlight selected row in table
  el.resultsTableBody?.querySelectorAll('.result-row').forEach(row => {
    const rowIdx = parseInt(row.dataset.index, 10);
    row.classList.toggle('is-selected', rowIdx === index);
  });

  // Render to batch detail panel
  renderKciResult(finding, { targetElement: el.batchDetailPanel });
}

/* ------------------------------------------------------------------ PRESETS HANDLING */

function activatePreset(presetKey) {
  state.activePreset = presetKey;
  el.presetDrift.classList.toggle('is-active', presetKey === 'drift');
  el.presetNotFound.classList.toggle('is-active', presetKey === 'notfound');
  el.presetSysFail.classList.toggle('is-active', presetKey === 'sysfail');

  if (presetKey === 'drift') {
    el.liveTitle.value = 'Computer Vision-based Basketball Player Training System';
    el.liveAuthors.value = '문현철';
    el.liveYear.value = '2023';
    el.liveDoi.value = '10.9728/dcs.2024.25.3.595';
    el.oaiFallbackBox.hidden = true;
    el.liveApiStatus.className = 'live-api-status is-success';
    el.liveStatusMsg.textContent = '① 2023 연도 불일치 프리셋 적용됨 (KCI: 2024, REF-META-002)';
    renderKciResult(CANONICAL_KCI_DRIFT);
  } else if (presetKey === 'notfound') {
    el.liveTitle.value = 'Attention Is All You Need';
    el.liveAuthors.value = 'Vaswani, A.';
    el.liveYear.value = '2017';
    el.liveDoi.value = '10.5555/3295222.3295349';
    el.oaiFallbackBox.hidden = true;
    el.liveApiStatus.className = 'live-api-status is-pending';
    el.liveStatusMsg.textContent = '② 색인 경계 프리셋 적용됨 (KCI 미발견 + Crossref 독립 DOI 실재 확인)';
    renderKciResult(PRESET_NOT_FOUND);
  } else if (presetKey === 'sysfail') {
    el.liveTitle.value = 'Advanced Sovereign Order Flow Dynamics';
    el.liveAuthors.value = 'Kim, S.';
    el.liveYear.value = '2023';
    el.liveDoi.value = '';
    el.oaiFallbackBox.hidden = false;
    el.liveApiStatus.className = 'live-api-status is-error';
    el.liveStatusMsg.textContent = '③ 통신 장애 프리셋 적용됨: KCI_UNAVAILABLE ➔ 사전 저장 스냅샷 백업 활성화';
    renderKciResult(PRESET_SYSTEM_FAILURE);
  }
}

/* ------------------------------------------------------------------ SECTION 3: TRANSLATION FIDELITY */

function selectTfFinding(findingId) {
  state.activeTfFindingId = findingId;
  const isCaus = findingId === 'TR-CAUS-001';

  el.btnTfCaus?.classList.toggle('is-active', isCaus);
  el.btnTfCit?.classList.toggle('is-active', !isCaus);

  // Update span highlighting in text
  el.tfSpanCausKo?.classList.toggle('is-selected', isCaus);
  el.tfSpanCausEn?.classList.toggle('is-selected', isCaus);
  el.tfSpanCitKo?.classList.toggle('is-selected', !isCaus);
  el.tfSpanCitEn?.classList.toggle('is-selected', !isCaus);

  if (el.tfEvidencePanel) {
    renderTfEvidence(findingId);
  }
}

function renderTfEvidence(findingId) {
  const f = TF_FINDINGS[findingId];
  if (!f) return;

  if (findingId === 'TR-CIT-001') {
    // REUSE THE EXISTING KCI EVIDENCE PANEL
    const kci = f.kci_evidence_ref;
    const recordId = kci.evidence?.[0]?.source_record_id || 'ART003062835';
    const kciUrl = `https://www.kci.go.kr/kciportal/ci/sereArticleSearch/ciSereArtiView.kci?sereArticleSearchBean.artiId=${encodeURIComponent(recordId)}`;

    el.tfEvidencePanel.innerHTML = `
      <div class="tf-evidence-head tone-drift">
        <div class="tf-badge-row">
          <span class="tf-badge-title">TR-CIT-001 · CITATION_REFERENCE_DRIFT</span>
          <span class="tf-layer-reuse-pill">KCI 근거 계층 재참조</span>
        </div>
        <p class="tf-desc-main">${escapeHtml(f.short_reason)}</p>
      </div>

      <!-- Spans comparison -->
      <div class="tf-spans-box">
        <div class="span-row">
          <span class="span-lbl">한국어 원문 인용</span>
          <span class="span-val">[1], [2]</span>
        </div>
        <div class="span-row">
          <span class="span-lbl">AI 영어 결과 인용</span>
          <span class="span-val mismatch">[1], [3] (인용 번호 왜곡 발생)</span>
        </div>
      </div>

      <!-- EMBEDDED KCI REUSE SECTION -->
      <div class="kci-reuse-container">
        <div class="kci-reuse-head">
          <span>인용 [2]의 KCI 실제 서지 근거 (KCI Layer 연동)</span>
          <a class="kci-portal-link" href="${escapeHtml(kciUrl)}" target="_blank" rel="noopener">
            KCI ${escapeHtml(recordId)} ↗
          </a>
        </div>

        <div class="field-rows-list compact">
          ${kci.field_comparisons.map(row => `
            <div class="compare-row ${row.result === 'MISMATCH' ? 'is-mismatch' : 'is-match'}">
              <span class="col-field">${escapeHtml(row.label)}</span>
              <div class="col-result">
                ${row.result === 'MISMATCH'
                  ? `<span class="val-pill mismatch">${escapeHtml(row.input_value)} → ${escapeHtml(row.evidence_value)}</span>`
                  : `<span class="val-pill match">일치</span>`}
              </div>
            </div>
          `).join('')}
        </div>
      </div>

      <div class="human-review-box tone-drift">
        <div class="review-head">
          <span class="review-label">연구자 최종 검토 신호</span>
          <strong class="review-badge">${escapeHtml(f.human_review_badge)}</strong>
        </div>
        <p class="review-detail">${escapeHtml(f.human_review_callout)}</p>
      </div>

      <div class="cross-layer-banner">
        <strong>원칙 검증 완료:</strong> ${escapeHtml(f.cross_layer_notice)}
      </div>`;
    return;
  }

  // TR-CAUS-001 (CAUSALITY_STRENGTHENED)
  el.tfEvidencePanel.innerHTML = `
    <div class="tf-evidence-head tone-review">
      <div class="tf-badge-row">
        <span class="tf-badge-title">TR-CAUS-001 · CAUSALITY_STRENGTHENED</span>
        <span class="tf-tag">Solar Semantic Observer</span>
      </div>
      <p class="tf-desc-main">${escapeHtml(f.short_reason)}</p>
    </div>

    <!-- Spans comparison -->
    <div class="tf-spans-box">
      <div class="span-row">
        <span class="span-lbl">한국어 원문 표현 (Source)</span>
        <span class="span-val">"직접적인 인과관계라고 단정할 수는 없다."</span>
        <span class="span-attr">상관성 기술 / 인과관계 유보 (Hedging)</span>
      </div>
      <div class="span-row">
        <span class="span-lbl">AI 영어 결과 표현 (Target)</span>
        <span class="span-val mismatch">"X causes Y. ... prove this relationship."</span>
        <span class="span-attr">결정론적 인과 및 결과 입증 (Deterministic Causation)</span>
      </div>
    </div>

    <!-- Solar Semantic Observer Box -->
    <div class="solar-observer-box">
      <div class="solar-head">
        <span class="solar-icon">☀️</span>
        <span class="solar-title">Solar Semantic Observer 관측</span>
      </div>
      <p class="solar-text">${escapeHtml(f.solar_observation)}</p>
    </div>

    <!-- Human Review Box -->
    <div class="human-review-box tone-review">
      <div class="review-head">
        <span class="review-label">연구자 최종 검토 신호</span>
        <strong class="review-badge">${escapeHtml(f.human_review_badge)}</strong>
      </div>
      <p class="review-detail">${escapeHtml(f.human_review_callout)}</p>
    </div>

    <!-- Secondary Finance-20 Reference Note -->
    <div class="finance-ref-card">
      <div class="finance-ref-head">
        <span class="f-badge">${escapeHtml(f.finance_context.pilot_name)}</span>
        <span class="f-meta">보조 reference context (로드맵)</span>
      </div>
      <p class="f-obs"><strong>코퍼스 관측:</strong> ${escapeHtml(f.finance_context.observation)}</p>
      <p class="f-disclaimer">${escapeHtml(f.finance_context.disclaimer)}</p>
    </div>`;
}

/* ------------------------------------------------------------------ UTILS */

function escapeHtml(str) {
  if (str === null || str === undefined) return '';
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

/* ------------------------------------------------------------------ INITIALIZATION */

function init() {
  initScrollTracking();

  // Mode Selector Tabs
  el.tabModeBatch?.addEventListener('click', () => switchAuditMode('batch'));
  el.tabModeSingle?.addEventListener('click', () => switchAuditMode('single'));

  // Batch Step 1: Input Actions
  el.btnAnalyzeBatch?.addEventListener('click', handleAnalyzeBatch);
  el.btnLoadExampleBatch?.addEventListener('click', async () => {
    try {
      const res = await fetch('/api/references/example');
      if (res.ok) {
        const data = await res.json();
        if (data.text) {
          if (el.batchInputText) el.batchInputText.value = data.text;
          await handleAnalyzeBatch();
          return;
        }
      }
    } catch {
      // fallback to built-in example text
    }
    if (el.batchInputText) {
      el.batchInputText.value = EXAMPLE_BIBLIOGRAPHY_TEXT;
      await handleAnalyzeBatch();
    }
  });
  el.btnClearBatch?.addEventListener('click', () => {
    if (el.batchInputText) el.batchInputText.value = '';
    if (el.batchParseCard) el.batchParseCard.hidden = true;
    if (el.batchResultsWrapper) el.batchResultsWrapper.hidden = true;
    if (el.batchProgressCard) el.batchProgressCard.hidden = true;
    state.parsedCitations = [];
    state.batchFindings = [];
  });

  // Batch Step 2: Execute Audit
  el.btnExecuteBatchAudit?.addEventListener('click', executeBatchAudit);

  // Batch Step 4: Filters and Search
  el.batchFilterPills?.querySelectorAll('.btn-filter').forEach(btn => {
    btn.addEventListener('click', () => {
      el.batchFilterPills.querySelectorAll('.btn-filter').forEach(b => b.classList.remove('is-active'));
      btn.classList.add('is-active');
      state.batchFilter = btn.dataset.filter || 'ALL';
      renderBatchResultsTable();
    });
  });

  // Metric card clicks filter the table
  document.querySelectorAll('.metric-card[data-filter]').forEach(card => {
    card.addEventListener('click', () => {
      const f = card.dataset.filter;
      state.batchFilter = f;
      el.batchFilterPills?.querySelectorAll('.btn-filter').forEach(b => {
        b.classList.toggle('is-active', b.dataset.filter === f);
      });
      renderBatchResultsTable();
    });
  });

  // Search input
  el.batchSearchInput?.addEventListener('input', e => {
    state.batchSearchQuery = e.target.value;
    renderBatchResultsTable();
  });

  // Re-audit button
  el.btnReauditBatch?.addEventListener('click', () => {
    el.batchInputCard?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  });

  // Pre-load example bibliography and show Step 2 parse preview right away for 90s presentation flow
  if (el.batchInputText && !el.batchInputText.value) {
    el.batchInputText.value = EXAMPLE_BIBLIOGRAPHY_TEXT;
    handleAnalyzeBatch();
  }

  // Initial render of Section 2 Single Citation result
  renderKciResult(CANONICAL_KCI_DRIFT);

  // Single Citation Form submission
  el.liveAuditForm?.addEventListener('submit', handleLiveAudit);

  // Preset buttons
  el.presetDrift?.addEventListener('click', () => activatePreset('drift'));
  el.presetNotFound?.addEventListener('click', () => activatePreset('notfound'));
  el.presetSysFail?.addEventListener('click', () => activatePreset('sysfail'));

  // OAI snapshot fallback button
  el.btnLoadOaiSnapshot?.addEventListener('click', () => {
    state.isFrozenSnapshotActive = true;
    el.liveStatusMsg.textContent = '사전 저장 Frozen Evidence Snapshot (OAI-PMH 확보본) 로드 완료';
    renderKciResult(CANONICAL_KCI_DRIFT, { isFrozenSnapshot: true });
  });

  // Section 3: Translation expansion controls
  el.btnTfCaus?.addEventListener('click', () => selectTfFinding('TR-CAUS-001'));
  el.btnTfCit?.addEventListener('click', () => selectTfFinding('TR-CIT-001'));

  el.tfSpanCausKo?.addEventListener('click', () => selectTfFinding('TR-CAUS-001'));
  el.tfSpanCausEn?.addEventListener('click', () => selectTfFinding('TR-CAUS-001'));
  el.tfSpanCitKo?.addEventListener('click', () => selectTfFinding('TR-CIT-001'));
  el.tfSpanCitEn?.addEventListener('click', () => selectTfFinding('TR-CIT-001'));

  // Initial render of Section 3
  selectTfFinding('TR-CAUS-001');

  // Check URL hash on load
  const hash = location.hash.replace('#', '');
  if (hash && $(hash)) {
    setTimeout(() => {
      $(hash).scrollIntoView({ behavior: 'smooth', block: 'start' });
      updateActiveNav(hash);
    }, 100);
  }
}

document.addEventListener('DOMContentLoaded', init);
