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

// Fallback example (same real KCI-based list as GET /api/references/example; used only if that request fails)
const EXAMPLE_BIBLIOGRAPHY_TEXT = `1. 대운해 (2024). Exploring AI-Assisted Writing Instruction from the Perspective of Human-Computer Collaboration. 아시아연구, 27(4), 385-400. https://doi.org/10.21740/jas.2024.11.30.2.385
2. 김미엘, 김미선, 최은숙, 권호범, 박영석 (2024). Computer simulation on the role of interproximal contacts in occlusal force transmission. 구강회복응용과학지, 41(4), 267-275. https://doi.org/10.14368/jdras.2025.41.4.267
3. 장만, 신승수 (2024). Computer Vision-based Basketball Player Training System. 디지털콘텐츠학회논문지, 25(3), 595-605. https://doi.org/10.21740/jas.2024.11.30.2.385
4. 김미엘, 김미선, 최은숙, 신승수, 박영석 (2025). Computer simulation on the role of interproximal contacts in occlusal force transmission. 구강회복응용과학지, 41(4), 267-275. https://doi.org/10.14368/jdras.2025.41.4.267
5. 최승재 (2008). 금융시장에서의 금융소비자의 행동양태를 고려한 투자자보호규범의 설계에 대한 연구 ―소위 ‘행동경제학’적 관점을 반영하여. 증권법연구, 9(2), 227-270.`;

// UI State
const state = {
  ceP0: null,
  ceTraceContext: 'FINANCE_D4', // active trace preset context (see CE_TRACE_CONTEXTS) // Claim–Evidence P0: article + committed preset claims from GET /api/claim-evidence/p0 (no results)
  currentModule: 'citation', // 'citation' | 'claim-evidence' | 'agent-p0' | 'translation' | 'academic-reference'
  currentCitationView: 'batch', // 'batch' | 'single' | 'method'
  currentCeView: 'verify', // 'verify' | 'examples' | 'method'
  currentCeCase: 'D4', // 'D4' | 'D4-CONTRAST' | 'D2' | 'D3' | 'D1'
  currentCeCompareMode: 'default', // 'default' | 'compare'
  ceFinanceRuns: {}, // FINANCE_D4 preset responses received this session, keyed by marker (used only to compare [2] ↔ [1])
  currentAgentView: 'contract', // 'contract' | 'prompt' | 'reverify'
  currentArView: 'reference', // 'reference' | 'handoff' | 'vision'
  currentKciFinding: CANONICAL_KCI_DRIFT,
  activeTfFindingId: 'TR-CAUS-001',
  currentView: 'batch', // 'batch' | 'single' | 'method'
  activePreset: 'drift',
  isFrozenSnapshotActive: false,
  // Batch Audit State
  parsedCitations: [],
  batchFindings: [],
  batchSummary: null,
  batchFilter: 'ALL',
  batchSearchQuery: '',
  selectedBatchIndex: 1, // Default selected index (0-indexed: item 1 is METADATA_DRIFT)
  batchExecMode: 'LIVE', // 'LIVE' | 'DEMO'
  batchSystemErrorCount: 0,
};

// DOM References
const $ = id => document.getElementById(id);
const el = {
  // Extension Rail & Workspaces
  extensionRail: $('extensionRail'),
  railBtnCitation: $('railBtnCitation'),
  railBtnClaimEvidence: $('railBtnClaimEvidence'),
  railBtnAgent: $('railBtnAgent'),
  railBtnTranslation: $('railBtnTranslation'),
  railBtnAcademicRef: $('railBtnAcademicRef'),
  railActiveTagCitation: $('railActiveTagCitation'),
  railActiveTagCe: $('railActiveTagCe'),
  railActiveTagAgent: $('railActiveTagAgent'),
  railActiveTagTf: $('railActiveTagTf'),
  railActiveTagAr: $('railActiveTagAr'),
  workspaceCitation: $('workspaceCitation'),
  workspaceClaimEvidence: $('workspaceClaimEvidence'),
  workspaceAgentP0: $('workspaceAgentP0'),
  workspaceTranslation: $('workspaceTranslation'),
  workspaceAcademicRef: $('workspaceAcademicRef'),
  btnBackToCitationFromCe: $('btnBackToCitationFromCe'),
  btnBackToCitationFromCeExamples: $('btnBackToCitationFromCeExamples'),
  btnBackToCitationFromCeMethod: $('btnBackToCitationFromCeMethod'),
  btnBackToCitationFromAgent: $('btnBackToCitationFromAgent'),
  btnBackToCitationFromAgentPrompt: $('btnBackToCitationFromAgentPrompt'),
  btnBackToCitationFromAgentReverify: $('btnBackToCitationFromAgentReverify'),
  btnBackToCitationFromTf: $('btnBackToCitationFromTf'),
  btnBackToCitationFromAr: $('btnBackToCitationFromAr'),
  btnBackToCitationFromArHandoff: $('btnBackToCitationFromArHandoff'),
  btnBackToCitationFromArVision: $('btnBackToCitationFromArVision'),

  // Context-Aware Top Navigation Blocks
  topnavCitation: $('topnavCitation'),
  topnavClaimEvidence: $('topnavClaimEvidence'),
  topnavAgent: $('topnavAgent'),
  topnavAcademicRef: $('topnavAcademicRef'),
  topnavExpansion: $('topnavExpansion'),
  topnavModuleName: $('topnavModuleName'),

  // TrustVerify Agent P0 Navigation Tabs & View Panels
  navTabAgentContract: $('navTabAgentContract'),
  navTabAgentPrompt: $('navTabAgentPrompt'),
  navTabAgentReverify: $('navTabAgentReverify'),
  agentViewContract: $('agentViewContract'),
  agentViewPrompt: $('agentViewPrompt'),
  agentViewReverify: $('agentViewReverify'),

  // Academic Reference Navigation Tabs & View Panels
  navTabArReference: $('navTabArReference'),
  navTabArHandoff: $('navTabArHandoff'),
  navTabArVision: $('navTabArVision'),
  arViewReference: $('arViewReference'),
  arViewHandoff: $('arViewHandoff'),
  arViewVision: $('arViewVision'),

  // Citation Integrity Navigation Tabs & View Panels
  navTabBatch: $('navTabBatch'),
  navTabSingle: $('navTabSingle'),
  navTabMethod: $('navTabMethod'),
  viewBatch: $('viewBatch'),
  viewSingle: $('viewSingle'),
  viewMethod: $('viewMethod'),

  // Claim-Evidence Navigation Tabs & View Panels
  navTabCeVerify: $('navTabCeVerify'),
  navTabCeExamples: $('navTabCeExamples'),
  navTabCeMethod: $('navTabCeMethod'),
  ceCompareNavBanner: $('ceCompareNavBanner'),
  btnCeNavDefault: $('btnCeNavDefault'),
  btnCeNavContrast: $('btnCeNavContrast'),
  ceViewVerify: $('ceViewVerify'),
  ceViewCompare: $('ceViewCompare'),
  btnCeBackToDefault: $('btnCeBackToDefault'),
  ceViewExamples: $('ceViewExamples'),
  ceViewMethod: $('ceViewMethod'),
  ceVerifyInputText: $('ceVerifyInputText'),
  btnExecuteCeVerify: $('btnExecuteCeVerify'),
  btnLoadCeD4: $('btnLoadCeD4'),
  btnLoadCeExample: $('btnLoadCeExample'),
  btnLoadCeInsufficient: $('btnLoadCeInsufficient'),
  btnLoadCeK2: $('btnLoadCeK2'),
  btnLoadCeK2Control: $('btnLoadCeK2Control'),
  ceVerifyReferences: $('ceVerifyReferences'),
  ceInputSentenceNote: $('ceInputSentenceNote'),
  ceResolutionCard: $('ceResolutionCard'),
  ceReservedResults: $('ceReservedResults'),
  ceSelectedPaperId: $('ceSelectedPaperId'),
  ceSelectedPaperStatus: $('ceSelectedPaperStatus'),
  ceSelectedPaperTitle: $('ceSelectedPaperTitle'),
  ceSelectedPaperMeta: $('ceSelectedPaperMeta'),
  ceResultModeTag: $('ceResultModeTag'),
  ceVerifyResultBody: $('ceVerifyResultBody'),

  // Evaluation Examples Case Selector & Panels
  btnCaseD4: $('btnCaseD4'),
  btnCaseD4Contrast: $('btnCaseD4Contrast'),
  btnCaseD2: $('btnCaseD2'),
  btnCaseD3: $('btnCaseD3'),
  btnCaseD1: $('btnCaseD1'),
  ceCaseDetailD4: $('ceCaseDetailD4'),
  ceCaseDetailD4Contrast: $('ceCaseDetailD4Contrast'),
  ceCaseDetailD2: $('ceCaseDetailD2'),
  ceCaseDetailD3: $('ceCaseDetailD3'),
  ceCaseDetailD1: $('ceCaseDetailD1'),
  btnSwitchToContrast: $('btnSwitchToContrast'),
  btnSwitchToD4: $('btnSwitchToD4'),

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

/* ------------------------------------------------------------------ WORKSPACE MODULE ROUTING (EXTENSION RAIL) */

function switchWorkspaceModule(moduleName, targetSubView) {
  state.currentModule = moduleName;
  const isCitation = moduleName === 'citation';
  const isClaimEvidence = moduleName === 'claim-evidence';
  const isAgent = moduleName === 'agent-p0';
  const isTranslation = moduleName === 'translation';
  const isAcademicRef = moduleName === 'academic-reference';

  el.railBtnCitation?.classList.toggle('is-active', isCitation);
  el.railBtnClaimEvidence?.classList.toggle('is-active', isClaimEvidence);
  el.railBtnAgent?.classList.toggle('is-active', isAgent);
  el.railBtnTranslation?.classList.toggle('is-active', isTranslation);
  el.railBtnAcademicRef?.classList.toggle('is-active', isAcademicRef);

  if (el.railActiveTagCitation) el.railActiveTagCitation.hidden = !isCitation;
  if (el.railActiveTagCe) el.railActiveTagCe.hidden = !isClaimEvidence;
  if (el.railActiveTagAgent) el.railActiveTagAgent.hidden = !isAgent;
  if (el.railActiveTagTf) el.railActiveTagTf.hidden = !isTranslation;
  if (el.railActiveTagAr) el.railActiveTagAr.hidden = !isAcademicRef;

  if (el.workspaceCitation) el.workspaceCitation.hidden = !isCitation;
  if (el.workspaceClaimEvidence) el.workspaceClaimEvidence.hidden = !isClaimEvidence;
  if (el.workspaceAgentP0) el.workspaceAgentP0.hidden = !isAgent;
  if (el.workspaceTranslation) el.workspaceTranslation.hidden = !isTranslation;
  if (el.workspaceAcademicRef) el.workspaceAcademicRef.hidden = !isAcademicRef;

  if (el.topnavCitation) el.topnavCitation.hidden = !isCitation;
  if (el.topnavClaimEvidence) el.topnavClaimEvidence.hidden = !isClaimEvidence;
  if (el.topnavAgent) el.topnavAgent.hidden = !isAgent;
  if (el.topnavAcademicRef) el.topnavAcademicRef.hidden = !isAcademicRef;
  if (el.topnavExpansion) el.topnavExpansion.hidden = !isTranslation;

  if (isTranslation && el.topnavModuleName) {
    el.topnavModuleName.textContent = '번역 충실도 (Translation Fidelity · 확장 연구)';
  }

  if (isCitation) {
    if (targetSubView) switchCitationView(targetSubView);
    else switchCitationView(state.currentCitationView || 'batch');
  } else if (isClaimEvidence) {
    if (targetSubView) switchCeView(targetSubView);
    else switchCeView(state.currentCeView || 'verify');
  } else if (isAgent) {
    if (targetSubView) switchAgentView(targetSubView);
    else switchAgentView(state.currentAgentView || 'contract');
  } else if (isAcademicRef) {
    if (targetSubView) switchArView(targetSubView);
    else switchArView(state.currentArView || 'reference');
  }

  window.scrollTo({ top: 0, behavior: 'smooth' });
}

/* ------------------------------------------------------------------ TRUSTVERIFY AGENT P0 VIEW ROUTING */

function switchAgentView(viewName) {
  state.currentAgentView = viewName;
  const isContract = viewName === 'contract';
  const isPrompt = viewName === 'prompt';
  const isReverify = viewName === 'reverify';

  el.navTabAgentContract?.classList.toggle('is-active', isContract);
  el.navTabAgentPrompt?.classList.toggle('is-active', isPrompt);
  el.navTabAgentReverify?.classList.toggle('is-active', isReverify);

  if (el.agentViewContract) el.agentViewContract.hidden = !isContract;
  if (el.agentViewPrompt) el.agentViewPrompt.hidden = !isPrompt;
  if (el.agentViewReverify) el.agentViewReverify.hidden = !isReverify;

  window.scrollTo({ top: 0, behavior: 'smooth' });
}

/* ------------------------------------------------------------------ ACADEMIC REFERENCE VIEW ROUTING */

function switchArView(viewName) {
  state.currentArView = viewName;
  const isReference = viewName === 'reference';
  const isHandoff = viewName === 'handoff';
  const isVision = viewName === 'vision';

  el.navTabArReference?.classList.toggle('is-active', isReference);
  el.navTabArHandoff?.classList.toggle('is-active', isHandoff);
  el.navTabArVision?.classList.toggle('is-active', isVision);

  if (el.arViewReference) el.arViewReference.hidden = !isReference;
  if (el.arViewHandoff) el.arViewHandoff.hidden = !isHandoff;
  if (el.arViewVision) el.arViewVision.hidden = !isVision;

  window.scrollTo({ top: 0, behavior: 'smooth' });
}

/* ------------------------------------------------------------------ CITATION INTEGRITY VIEW ROUTING */

function switchCitationView(viewName) {
  state.currentCitationView = viewName;
  state.currentView = viewName;
  const isBatch = viewName === 'batch';
  const isSingle = viewName === 'single';
  const isMethod = viewName === 'method';

  el.navTabBatch?.classList.toggle('is-active', isBatch);
  el.navTabSingle?.classList.toggle('is-active', isSingle);
  el.navTabMethod?.classList.toggle('is-active', isMethod);

  if (el.viewBatch) el.viewBatch.hidden = !isBatch;
  if (el.viewSingle) el.viewSingle.hidden = !isSingle;
  if (el.viewMethod) el.viewMethod.hidden = !isMethod;

  window.scrollTo({ top: 0, behavior: 'smooth' });
}

/* ------------------------------------------------------------------ CLAIM-EVIDENCE VIEW ROUTING */

function switchCeView(viewName) {
  state.currentCeView = viewName;
  const isVerify = viewName === 'verify';
  const isExamples = viewName === 'examples';
  const isMethod = viewName === 'method';

  el.navTabCeVerify?.classList.toggle('is-active', isVerify);
  el.navTabCeExamples?.classList.toggle('is-active', isExamples);
  el.navTabCeMethod?.classList.toggle('is-active', isMethod);

  if (el.ceViewVerify) el.ceViewVerify.hidden = !isVerify;
  if (el.ceViewExamples) el.ceViewExamples.hidden = !isExamples;
  if (el.ceViewMethod) el.ceViewMethod.hidden = !isMethod;

  window.scrollTo({ top: 0, behavior: 'smooth' });
}

function switchCeCase(caseId) {
  state.currentCeCase = caseId;
  const isD1 = caseId === 'D1';
  const isD2 = caseId === 'D2';
  const isD3 = caseId === 'D3';
  const isD4 = caseId === 'D4';
  const isD4Contrast = caseId === 'D4-CONTRAST';

  el.btnCaseD1?.classList.toggle('is-active', isD1);
  el.btnCaseD2?.classList.toggle('is-active', isD2);
  el.btnCaseD3?.classList.toggle('is-active', isD3);
  el.btnCaseD4?.classList.toggle('is-active', isD4);
  el.btnCaseD4Contrast?.classList.toggle('is-active', isD4Contrast);

  if (el.ceCaseDetailD1) el.ceCaseDetailD1.hidden = !isD1;
  if (el.ceCaseDetailD2) el.ceCaseDetailD2.hidden = !isD2;
  if (el.ceCaseDetailD3) el.ceCaseDetailD3.hidden = !isD3;
  if (el.ceCaseDetailD4) el.ceCaseDetailD4.hidden = !isD4;
  if (el.ceCaseDetailD4Contrast) el.ceCaseDetailD4Contrast.hidden = !isD4Contrast;
}

function switchMainView(viewName) {
  if (state.currentModule !== 'citation') {
    switchWorkspaceModule('citation', viewName);
  } else {
    switchCitationView(viewName);
  }
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

  const recordId = finding.evidence?.[0]?.source_record_id || null;
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
        <span class="rule-tag">${finding.rule_id
          ? `규칙: ${escapeHtml(finding.rule_id)} (v${escapeHtml(finding.rule_version || '1.0')})`
          : (finding.operation ? `실패 단계: ${escapeHtml(finding.operation)}` : '규칙 미적용 (판정 아님)')}</span>
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
            const isMatch = row.result === 'MATCH';
            // Only MATCH is shown as 일치; UNKNOWN or any other result is never presented as a match.
            return `
              <div class="compare-row ${isMismatch || !isMatch ? 'is-mismatch' : 'is-match'}">
                <span class="col-field">${escapeHtml(row.label || BATCH_FIELD_LABELS[row.field] || row.field)}</span>
                <div class="col-result">
                  ${isMismatch
                    ? `<span class="val-pill mismatch">${escapeHtml(formatBatchValue(row.input_value))} <span class="arr">→</span> ${escapeHtml(formatBatchValue(row.evidence_value))} (MISMATCH)</span>`
                    : isMatch
                      ? `<span class="val-pill match"><svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><polyline points="20 6 9 17 4 12"/></svg> 일치 (${escapeHtml(formatBatchValue(row.input_value))})</span>`
                      : `<span class="val-pill mismatch">${escapeHtml(formatBatchValue(row.input_value))} <span class="arr">·</span> KCI: ${escapeHtml(formatBatchValue(row.evidence_value))} (${escapeHtml(row.result)} · 확인 불가)</span>`}
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
          <div><dt>rule_id</dt><dd>${escapeHtml(finding.rule_id || '(없음)')}</dd></div>
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

function switchAuditMode(mode) {
  switchMainView(mode);
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
        // Backend parser rows are flat (title, authors, publication_year, doi); r.citation kept for compatibility.
        state.parsedCitations = data.rows.map((r, i) => {
          const fields = r.citation ?? r;
          return {
            index: r.index || i + 1,
            rowId: r.row_id || `ref-${i + 1}`,
            raw: r.raw || '',
            title: fields.title || '',
            authors: Array.isArray(fields.authors) ? fields.authors : (fields.authors ? [fields.authors] : []),
            year: fields.publication_year || '',
            doi: fields.doi || '',
            parseStatus: r.parse_status || 'UNPARSED',
            parseIssues: Array.isArray(r.issues) ? r.issues : [],
          };
        });
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

  // Only READY rows are sent to KCI; NEEDS_REVIEW / UNPARSED rows are listed but not audited.
  if (el.btnExecuteBatchAudit) {
    el.btnExecuteBatchAudit.innerHTML = `<span class="btn-icon">⚡</span> KCI에서 ${readyCount}개 검증 실행`;
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
    el.btnExecuteBatchAudit.innerHTML = `<span class="btn-icon">⚡</span> KCI에서 ${readyCount}개 검증 실행`;
  }
}

const BATCH_FIELD_LABELS = { title: '제목', authors: '저자', publication_year: '연도', doi: 'DOI' };
const fieldList = comparisons => comparisons.map(c => BATCH_FIELD_LABELS[c.field] || c.field).join(', ');
const OPTIONAL_STAGES = [
  { step: 4, is_optional: true, name: '4. 참고문헌 근거', api: 'Reference Evidence', status: 'unexecuted', detail: '○ 미실행 (선택 단계)' },
  { step: 5, is_optional: true, name: '5. 외부 교차확인', api: 'External Corroboration', status: 'unexecuted', detail: '○ 미실행 (선택 단계)' },
];

// Verification path built only from facts in the returned finding (which steps ran, which fields differed).
function deriveVerificationPath(f) {
  const step = (n, api, status, detail) => ({ step: n, is_optional: false, name: ['', '1. 후보 탐색', '2. 실제 레코드 고정', '3. 필드 정합성 검증'][n], api, status, detail });
  const s1 = (status, detail) => step(1, 'KCI articleSearch', status, detail);
  const s2 = (status, detail) => step(2, 'KCI articleDetail', status, detail);
  const s3 = (status, detail) => step(3, 'Title · Author · Year · DOI', status, detail);
  if (f.kind === 'SYSTEM_FAILURE') {
    const atDetail = f.operation === 'articleDetail';
    return [
      atDetail ? s1('ok', '✓ 후보 레코드 발견') : s1('fail', `✕ ${f.system_state}`),
      atDetail ? s2('fail', `✕ ${f.system_state}`) : s2('skip', '- 중단'),
      s3('skip', '- 판정 보류 (인용 결함 아님)'),
      ...OPTIONAL_STAGES,
    ];
  }
  if (f.status === 'NOT_FOUND_IN_KCI') {
    return [s1('notfound', '! 후보 레코드 0건 (No Data)'), s2('skip', '- 대상 식별자 부재'), s3('skip', '- 대조 미실행'), ...OPTIONAL_STAGES];
  }
  const comparisons = f.field_comparisons || [];
  if (!comparisons.length) {
    const candidates = (f.evidence || []).length;
    return [
      s1('warn', `! 후보 ${candidates}건 · 단일 레코드 식별 불가`),
      s2('skip', '- 레코드 미고정 (보수적 식별 규칙)'),
      s3('skip', '- 대조 미실행'),
      ...OPTIONAL_STAGES,
    ];
  }
  const recordId = f.evidence?.[0]?.source_record_id;
  const mismatched = comparisons.filter(c => c.result === 'MISMATCH');
  const unknown = comparisons.filter(c => c.result === 'UNKNOWN');
  const s3Result = mismatched.length
    ? s3('warn', `! ${fieldList(mismatched)} 불일치`)
    : unknown.length ? s3('warn', `? ${fieldList(unknown)} 확인 불가`) : s3('ok', `✓ 입력한 ${comparisons.length}개 필드 일치`);
  return [s1('ok', '✓ 후보 레코드 발견'), s2('ok', `✓ ${recordId}`), s3Result, ...OPTIONAL_STAGES];
}

// Display text only; human_review_required itself is left exactly as the engine returned it.
function describeHumanReview(f) {
  if (f.kind === 'SYSTEM_FAILURE') return ['재시도 필요', '시스템 문제로 KCI 조회를 완료하지 못했습니다. 인용 결함이 아니며 어떤 판정도 내리지 않았습니다.'];
  const comparisons = f.field_comparisons || [];
  const mismatched = comparisons.filter(c => c.result === 'MISMATCH');
  const unknown = comparisons.filter(c => c.result === 'UNKNOWN');
  if (f.status === 'VERIFIED') return ['일치 확인', `입력한 ${comparisons.length}개 필드가 KCI 레코드와 일치합니다.`];
  if (f.status === 'METADATA_DRIFT') return ['서지정보 확인 권장', `KCI 레코드와 다른 필드: ${fieldList(mismatched)}. 원문 서지정보를 확인하세요.`];
  if (f.status === 'NOT_FOUND_IN_KCI') return ['색인 범위 확인 권장', 'KCI 색인에서 찾지 못했습니다. 가짜 논문이라는 뜻은 아닙니다.'];
  if (unknown.length) return ['연구자 검토 필요', `${fieldList(unknown)} 항목은 결정적으로 비교할 수 없어 사람의 확인이 필요합니다.`];
  return ['연구자 검토 필요', 'KCI 후보를 하나의 레코드로 확정할 수 없어 사람의 확인이 필요합니다.'];
}

// Rows that produced no finding become labeled notices: no rule, no verdict, never a KCI status.
const BATCH_NOTICES = {
  UNPARSED: { kind: 'PARSER_NOTICE', status: 'UNPARSED_CITATION', reason: '구문 분석 단계에서 제목을 식별하지 못해 KCI 조회 대상에서 제외했습니다. NOT_FOUND_IN_KCI(색인 미발견)가 아닙니다.', badge: '서지형식 재입력 권장', path: ['✕ 제목 추출 실패', '- 미발송'] },
  NEEDS_REVIEW: { kind: 'PARSER_NOTICE', status: 'PARSE_NEEDS_REVIEW', reason: '구문 분석 결과가 모호하여(예: 저자 이니셜, 연도 후보 다수) KCI에 보내지 않았습니다. 표에서 필드를 확인·수정한 뒤 다시 실행하세요.', badge: '추출 필드 확인 필요', path: ['! 추출 필드 확인 필요', '- 미발송'] },
  INVALID_INPUT: { kind: 'PARSER_NOTICE', status: 'INPUT_INVALID', reason: '입력값이 단일 인용 검증 형식을 통과하지 못했습니다. KCI 장애가 아니며 인용 판정도 아닙니다.', badge: '입력 수정 필요', path: ['✕ 입력 형식 오류', '- 미발송'] },
  NO_FROZEN_EVIDENCE: { kind: 'BATCH_NOTICE', status: 'NO_FROZEN_EVIDENCE', reason: 'FROZEN EVIDENCE 모드에는 이 인용에 대해 저장된 KCI 근거가 없어 결과를 만들지 않았습니다. LIVE KCI로 실행하세요.', badge: 'LIVE 실행 필요', path: ['- 저장된 근거 없음', '- 미실행'] },
  ROW_ERROR: { kind: 'BATCH_NOTICE', status: 'ROW_ERROR', reason: '이 행을 처리하는 중 서버 내부 오류가 발생했습니다. 다른 행의 결과에는 영향이 없습니다.', badge: '다시 실행 필요', path: ['✕ 처리 오류', '- 중단'] },
};

function batchNotice(item, noticeKey) {
  const notice = BATCH_NOTICES[noticeKey];
  return {
    kind: notice.kind,
    status: notice.status,
    notice_id: `batch-${noticeKey.toLowerCase()}-${item.index}`,
    rule_id: null,
    batch_item_index: item.index,
    input: { ...item.input, raw: state.parsedCitations[item.index - 1]?.raw },
    evidence: [],
    field_comparisons: [],
    reason: notice.reason,
    human_review_badge: notice.badge,
    human_review_callout: notice.reason,
    verification_path: [
      { step: 1, is_optional: false, name: '1. 서지 구문분석 / 입력 확인', api: 'Reference Parser', status: 'fail', detail: notice.path[0] },
      { step: 2, is_optional: false, name: '2. 후보 탐색', api: 'KCI articleSearch', status: 'skip', detail: notice.path[1] },
      { step: 3, is_optional: false, name: '3. 필드 정합성 검증', api: 'Title · Author · Year · DOI', status: 'skip', detail: '- 대조 미실행' },
      ...OPTIONAL_STAGES,
    ],
  };
}

function toBatchFinding(item, evidenceMode) {
  if (item.outcome === 'AUDITED' && item.finding) {
    const finding = JSON.parse(JSON.stringify(item.finding));
    const [badge, callout] = describeHumanReview(finding);
    finding.batch_item_index = item.index;
    finding.evidence_mode = evidenceMode;
    finding.verification_path = deriveVerificationPath(finding);
    finding.human_review_badge = badge;
    finding.human_review_callout = callout;
    return finding;
  }
  if (item.outcome === 'NOT_AUDITED') return batchNotice(item, item.parse_status === 'UNPARSED' ? 'UNPARSED' : 'NEEDS_REVIEW');
  if (item.outcome === 'NO_FROZEN_EVIDENCE') return batchNotice(item, 'NO_FROZEN_EVIDENCE');
  if (item.outcome === 'INVALID_INPUT') return batchNotice(item, 'INVALID_INPUT');
  return batchNotice(item, 'ROW_ERROR');
}

async function executeBatchAudit() {
  const items = state.parsedCitations;
  if (!items.length) return;

  // DEMO = FROZEN EVIDENCE: live-observed KCI evidence replayed through the same audit engine, labeled as such.
  const execMode = el.radioDemoKci?.checked ? 'FROZEN_EVIDENCE' : 'LIVE';
  state.batchExecMode = execMode;
  state.batchSystemErrorCount = 0;
  state.batchFindings = [];

  if (el.batchParseCard) el.batchParseCard.hidden = true;
  if (el.batchProgressCard) el.batchProgressCard.hidden = false;
  if (el.batchResultsWrapper) el.batchResultsWrapper.hidden = true;

  const readyCount = items.filter(c => c.parseStatus === 'READY').length;
  if (el.progressCountText) {
    el.progressCountText.textContent = `${execMode === 'LIVE' ? 'LIVE KCI' : 'FROZEN EVIDENCE'} 검증 중 · READY ${readyCount}건 순차 처리 (전체 ${items.length}행)`;
  }
  if (el.progressFill) el.progressFill.style.width = '60%';

  let data;
  try {
    const res = await fetch('/api/audit/citations', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        evidence_mode: execMode,
        references: items.map(c => ({
          row_id: c.rowId || `ref-${c.index}`,
          parse_status: c.parseStatus,
          title: c.title,
          authors: c.authors,
          publication_year: c.year,
          doi: c.doi,
        })),
      }),
    });
    data = await res.json().catch(() => ({}));
    if (!res.ok) {
      const error = new Error(data.error || `HTTP ${res.status}`);
      error.httpStatus = res.status;
      throw error;
    }
  } catch (err) {
    // A rejected request (e.g. more than 20 rows) is not a KCI outage and produces no citation results.
    if (el.batchProgressCard) el.batchProgressCard.hidden = true;
    if (el.batchParseCard) el.batchParseCard.hidden = false;
    const label = err.httpStatus && err.httpStatus < 500 ? '요청 형식 오류' : '서버 처리 오류';
    alert(`${label}: ${err.message}\nKCI 장애로 분류하지 않았으며, 인용 판정도 생성되지 않았습니다. (한 번에 최대 20개)`);
    return;
  }

  if (el.progressFill) el.progressFill.style.width = '100%';
  state.batchFindings = data.items.map(item => toBatchFinding(item, data.evidence_mode));
  state.batchSummary = data.summary;
  state.batchSystemErrorCount = data.summary.system_failure;

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
  // Counts come from the backend batch summary, which is derived from the returned row results only.
  const summary = state.batchSummary;
  if (!summary) return;
  const total = summary.total;
  const verified = summary.status_counts.VERIFIED;
  const drift = summary.status_counts.METADATA_DRIFT;
  const review = summary.status_counts.REVIEW_REQUIRED;
  const notfound = summary.status_counts.NOT_FOUND_IN_KCI;
  const sysErrors = summary.system_failure;
  const notAudited = summary.not_audited.UNPARSED + summary.not_audited.NEEDS_REVIEW + summary.not_audited.NO_FROZEN_EVIDENCE;
  const audited = total - notAudited - summary.row_errors;
  const modeLabel = state.batchExecMode === 'FROZEN_EVIDENCE' ? 'FROZEN EVIDENCE 재생' : 'LIVE KCI';

  if (el.summaryTotalTitle) el.summaryTotalTitle.textContent = `총 ${total}개 참고문헌 · ${modeLabel} 조회 ${audited}건`;
  if (el.countVerified) el.countVerified.textContent = String(verified);
  if (el.countDrift) el.countDrift.textContent = String(drift);
  if (el.countReview) el.countReview.textContent = String(review);
  if (el.countNotFound) el.countNotFound.textContent = String(notfound);

  if (el.sysStatusText) {
    const notes = [];
    if (summary.not_audited.UNPARSED) notes.push(`구문 미해석 ${summary.not_audited.UNPARSED}건`);
    if (summary.not_audited.NEEDS_REVIEW) notes.push(`추출 필드 확인 필요 ${summary.not_audited.NEEDS_REVIEW}건`);
    if (summary.not_audited.NO_FROZEN_EVIDENCE) notes.push(`저장 근거 없음 ${summary.not_audited.NO_FROZEN_EVIDENCE}건`);
    if (summary.row_errors) notes.push(`입력·처리 오류 ${summary.row_errors}건`);
    const notAuditedText = notes.length ? ` · KCI 미조회: ${escapeHtml(notes.join(', '))} (인용 판정 아님)` : '';
    if (sysErrors > 0) {
      el.sysStatusText.innerHTML = `<span class="sys-error-highlight">KCI 시스템 오류 ${sysErrors}건</span> (인용 결함과 분리)${notAuditedText}`;
    } else {
      el.sysStatusText.innerHTML = `KCI 시스템 오류 0건 · ${escapeHtml(modeLabel)}${notAuditedText}`;
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

function formatBatchValue(value) {
  if (value === null || value === undefined || value === '') return '(없음)';
  if (Array.isArray(value)) return value.map(formatBatchValue).join(', ');
  if (typeof value === 'object') {
    if ('doi_normalized' in value || 'doi_raw' in value) return value.doi_normalized || value.doi_raw || '(없음)';
    if ('name' in value) return value.english_name ? `${value.name} (${value.english_name})` : value.name;
    return JSON.stringify(value);
  }
  return String(value);
}

function getProblemFieldLabel(f) {
  if (f.kind === 'SYSTEM_FAILURE') return `KCI 시스템 오류 (${f.system_state})`;
  if (f.kind === 'PARSER_NOTICE' || f.kind === 'BATCH_NOTICE') return f.human_review_badge || '-';
  if (f.status === 'VERIFIED') return '-';
  if (f.status === 'NOT_FOUND_IN_KCI') return 'KCI 0건 (No Data)';

  const comparisons = f.field_comparisons || [];
  const mismatches = comparisons.filter(fc => fc.result === 'MISMATCH');
  if (mismatches.length) {
    return mismatches.map(fc => `${BATCH_FIELD_LABELS[fc.field] || fc.field}: ${formatBatchValue(fc.input_value)} → ${formatBatchValue(fc.evidence_value)}`).join(' · ');
  }
  const unknown = comparisons.filter(fc => fc.result === 'UNKNOWN');
  if (unknown.length) return `${fieldList(unknown)} 확인 불가`;
  if (f.status === 'REVIEW_REQUIRED') return '단일 KCI 레코드로 식별되지 않음';
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
      if (f.status !== 'REVIEW_REQUIRED') return false;
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
    else if (status === 'SYSTEM_FAILURE') statusDisplay = escapeHtml(f.system_state);
    else if (status === 'UNPARSED_CITATION') statusDisplay = 'UNPARSED';
    else if (status === 'PARSE_NEEDS_REVIEW') statusDisplay = 'NEEDS_REVIEW (미조회)';
    else if (status === 'INPUT_INVALID') statusDisplay = 'INPUT_INVALID (미조회)';
    else if (status === 'NO_FROZEN_EVIDENCE') statusDisplay = 'NO_FROZEN_EVIDENCE';
    else if (status === 'ROW_ERROR') statusDisplay = 'ROW_ERROR';

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

/* ------------------------------------------------------------------ CLAIM–EVIDENCE P0 (LAYER 3) */

// Display labels only. The status and signals themselves come from POST /api/claim-evidence/align.
const CE_STATUS_LABELS = {
  CONSISTENT_WITH_EVIDENCE: { ko: '공개 근거 범위에서 정합', badge: 'badge-consistent' },
  POTENTIAL_CLAIM_SHIFT: { ko: '주장 강도 변화 가능성', badge: 'badge-shift' },
  INSUFFICIENT_EVIDENCE: { ko: '현재 공개 근거만으로 판단 불충분', badge: 'badge-insufficient' },
};
const CE_SIGNAL_DIMENSION = {
  CAUSALITY_STRENGTHENED: 'causality',
  MODALITY_STRENGTHENED: 'modality',
  CERTAINTY_STRENGTHENED: 'certainty',
  NEGATION_CHANGED: 'negation',
  DIRECTION_CHANGED: 'direction',
};
const CE_SIGNAL_EXPLANATION = {
  CAUSALITY_STRENGTHENED: '인용 문장이 현재 확보된 KCI 초록 근거보다 더 강한 인과 표현을 사용합니다.',
  MODALITY_STRENGTHENED: '인용 문장이 현재 확보된 KCI 초록 근거보다 더 강한 양태(가능성 → 필연) 표현을 사용합니다.',
  CERTAINTY_STRENGTHENED: '인용 문장이 현재 확보된 KCI 초록 근거보다 더 강한 확신 표현을 사용합니다.',
  NEGATION_CHANGED: '인용 문장과 KCI 초록 근거의 부정 표현이 서로 다릅니다.',
  DIRECTION_CHANGED: '인용 문장과 KCI 초록 근거의 효과 방향 표현이 서로 다릅니다.',
};

const FINANCE_D4_BIBLIOGRAPHY_ROWS = [
  '[1] 김예빈, 조두연 (2023). 텍스트 마이닝에 기반한 통화정책 기조가 한국 주식시장 및 부동산시장에 미치는 영향에 대한 분석. 국제금융연구, 13(1), 5-31. https://doi.org/10.34251/ifadoi.13.1.202305.001',
  '[2] 이보형, 홍우형 (2019). 금융위기 전후 부동산시장과 주식시장의 상호영향에 관한 연구. 신용카드리뷰, 13(3), 14-31. https://doi.org/10.35348/ccr.2019.13.3.002',
];
const FINANCE_D4_DRAFT_SENTENCE = 'The estimation results suggest that equity prices fall in response to a contractionary, hawkish monetary policy shock [2].';
const FINANCE_D4_CONTRAST_SENTENCE = 'The estimation results suggest that equity prices fall in response to a contractionary, hawkish monetary policy shock [1].';
// K2 (ESG disclosure) — values copied from artifacts/evaluation/claim-evidence-korean/korean-cases.json (tested to match).
const KOREAN_K2_REFERENCE = "[1] 이형기 (2024). 금융상품의 지속 가능성 공시기준에 관한 연구. 무역금융보험연구, 25(4), 3-24. https://doi.org/10.22875/jiti.2024.25.4.001";
const KOREAN_K2_PERTURBATION_SENTENCE = "투자자문사가 투자 프로세스에 포함하는 ESG 요인 정보를 정확하게 공시하지 않거나 ESG 투자방침이나 절차에 미비가 있으면 미국 SEC는 반드시 제재금을 부과한다 [1].";
const KOREAN_K2_CONTROL_SENTENCE = "투자자문사가 투자 프로세스에 포함하는 ESG 요인 정보를 정확하게 공시하지 않거나 ESG 투자방침이나 절차에 미비가 있는 경우, 미국 SEC가 제재금을 부과한 사례가 있다 [1].";

// Trace contexts: which frozen evidence set and bibliography a preset uses. Results always come from the backend.
const CE_TRACE_CONTEXTS = {
  FINANCE_D4: { scenario: 'FINANCE_D4', references: FINANCE_D4_BIBLIOGRAPHY_ROWS },
  KOREAN_K2: { scenario: 'KOREAN_P0', references: [KOREAN_K2_REFERENCE] },
};

const CE_TRACE_STATUS = {
  CONSISTENT_WITH_EVIDENCE: { ko: '공개 근거 범위에서 정합', badge: 'badge-consistent' },
  POTENTIAL_CLAIM_SHIFT: { ko: '주장 강도 변화 가능성', badge: 'badge-shift' },
  INSUFFICIENT_EVIDENCE: { ko: '현재 공개 근거만으로 판단 불충분', badge: 'badge-insufficient' },
};
const CE_SHIFT_TEXT = '실제 KCI 초록 근거와 비교해 표현 강도 변화가 관측되었습니다.';
const CE_INSUFFICIENT_TEXT = '현재 확보된 KCI 공개 초록 범위에서 이 문장을 뒷받침하는 충분한 근거를 특정하지 못했습니다.';

// Bibliography rows exactly as the user typed them (one per non-empty line). Linking happens on the backend.
function ceReferenceRows() {
  return String(el.ceVerifyReferences?.value ?? '').split(/\r?\n/u).map(line => line.trim()).filter(Boolean);
}

// Pre-verification state: user input only. The system resolution card stays hidden and no record ID or verdict is shown.
function showPendingReference(draftText) {
  const marker = String(draftText ?? '').match(/\[\s*(\d{1,3})\s*\]/u);
  if (el.ceResolutionCard) el.ceResolutionCard.hidden = true;
  if (el.ceSelectedPaperId) el.ceSelectedPaperId.textContent = marker ? `검증 대기 · 인용 [${marker[1]}]` : '검증 대기 · 인용 번호 없음';
  if (el.ceSelectedPaperStatus) el.ceSelectedPaperStatus.innerHTML = '<span class="source-status roadmap">검증 전</span>';
  if (el.ceSelectedPaperTitle) el.ceSelectedPaperTitle.textContent = '';
  if (el.ceSelectedPaperMeta) el.ceSelectedPaperMeta.textContent = '';
  if (el.ceVerifyResultBody) el.ceVerifyResultBody.innerHTML = '';
  if (el.ceResultModeTag) el.ceResultModeTag.textContent = '인용 문장과 참고문헌 목록을 확인하고 [인용 내용 검증]을 누르세요';
}

const LINKING_FAILURE_LABELS = {
  MARKER_UNRESOLVED: '인용 번호를 연결할 수 없음',
  MULTIPLE_MARKERS_UNSUPPORTED: '현재 P0에서는 복수 인용번호 검토 필요',
  REFERENCE_INDEX_OUT_OF_RANGE: '참고문헌 번호 범위를 벗어남',
  REFERENCE_PARSE_REVIEW: '참고문헌 구조 확인 필요',
};

async function loadClaimEvidenceP0() {
  try {
    const res = await fetch('/api/claim-evidence/p0');
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    state.ceP0 = await res.json();
    if (el.ceVerifyInputText && !el.ceVerifyInputText.value.trim()) {
      el.ceVerifyInputText.value = FINANCE_D4_DRAFT_SENTENCE;
    }
    if (el.ceVerifyReferences && !el.ceVerifyReferences.value.trim()) {
      el.ceVerifyReferences.value = CE_TRACE_CONTEXTS.FINANCE_D4.references.join('\n');
    }
    showPendingReference(el.ceVerifyInputText?.value);
  } catch {
    if (el.ceSelectedPaperId) el.ceSelectedPaperId.textContent = 'KCI ID: 근거를 불러오지 못했습니다';
  }
}

function fillCePreset(caseId) {
  const traced = {
    D4: ['FINANCE_D4', FINANCE_D4_DRAFT_SENTENCE],
    'D4-CONTRAST': ['FINANCE_D4', FINANCE_D4_CONTRAST_SENTENCE],
    'K2-PERTURBATION': ['KOREAN_K2', KOREAN_K2_PERTURBATION_SENTENCE],
    'K2-CONTROL': ['KOREAN_K2', KOREAN_K2_CONTROL_SENTENCE],
  }[caseId];
  if (traced && el.ceVerifyInputText) {
    [state.ceTraceContext, el.ceVerifyInputText.value] = traced;
    if (el.ceVerifyReferences) el.ceVerifyReferences.value = CE_TRACE_CONTEXTS[state.ceTraceContext].references.join('\n');
    if (el.ceInputSentenceNote) el.ceInputSentenceNote.hidden = state.ceTraceContext !== 'FINANCE_D4';
    showPendingReference(el.ceVerifyInputText.value);
    return;
  }
  const preset = state.ceP0?.presets.find(item => item.case_id === caseId);
  if (preset && el.ceVerifyInputText) el.ceVerifyInputText.value = preset.citing_claim;
}

async function executeCeVerify(triggerBtn) {
  const citingClaim = el.ceVerifyInputText?.value.trim();
  if (!citingClaim) {
    alert('검증할 인용 문장을 입력하세요.');
    return;
  }
  if (/\[\d+\]/.test(citingClaim)) {
    await executeCeTrace(citingClaim, triggerBtn || el.btnExecuteCeVerify);
    return;
  }
  // The align path has no reference linking, so there is no system resolution to show.
  if (el.ceResolutionCard) el.ceResolutionCard.hidden = true;
  const activeBtn = triggerBtn || el.btnExecuteCeVerify;
  const originalText = activeBtn ? activeBtn.textContent : '';
  if (activeBtn) activeBtn.textContent = '검증 중...';
  if (el.btnExecuteCeVerify) el.btnExecuteCeVerify.disabled = true;
  if (el.btnLoadCeD4) el.btnLoadCeD4.disabled = true;
  if (el.ceVerifyResultBody) el.ceVerifyResultBody.innerHTML = '<p class="ce-slot-text">검증 중...</p>';
  try {
    const res = await fetch('/api/claim-evidence/align', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ citing_claim: citingClaim }),
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) throw new Error(data.error || `HTTP ${res.status}`);
    renderCeResult(data.finding, data.evidence_mode);
  } catch (err) {
    if (el.ceVerifyResultBody) {
      el.ceVerifyResultBody.innerHTML = '<p class="ce-slot-text" style="color:var(--danger);font-weight:700;padding:16px;text-align:center;">검증 요청 실패 — 연구 판정이 아닙니다.</p>';
    }
  } finally {
    if (activeBtn) activeBtn.textContent = originalText;
    if (el.btnExecuteCeVerify) el.btnExecuteCeVerify.disabled = false;
    if (el.btnLoadCeD4) el.btnLoadCeD4.disabled = false;
  }
}

// Trace progress. There is one backend request: while it is in flight every step shows 진행. Only after the response
// arrives is each step marked, from the returned fields (linking, citation_integrity, claim_evidence). Nothing is simulated.
const CE_TRACE_STEPS = [
  ['marker', '① 인용 마커 확인'],
  ['reference', '② 참고문헌 연결'],
  ['evidence', '③ 검증된 KCI 근거 불러오기'],
  ['grounding', '④ 근거 문장 찾기 (Grounding Gate)'],
  ['result', '⑤ 검증 결과 생성'],
];
const CE_STEP_LABELS = { run: '진행', done: '완료', stop: '중단', skip: '미실행', error: '요청 실패' };
const CE_CONTRAST_PROGRESS_NOTE = ['문장은 그대로 유지', '[2] → [1] 근거 source만 변경'];
const ceReducedMotion = () => window.matchMedia?.('(prefers-reduced-motion: reduce)').matches ?? false;
const ceDelay = ms => new Promise(resolve => setTimeout(resolve, ceReducedMotion() ? 0 : ms));

function renderCeTraceProgress(note) {
  return `
    <div class="ce-trace-progress" aria-live="polite">
      <div class="ce-trace-progress-head"><span class="ce-spinner" aria-hidden="true"></span><span id="ceTraceProgressTitle">검증된 KCI 근거를 확인하고 있습니다...</span></div>
      ${note ? `<div class="ce-trace-progress-note">${note.map(line => `<span>${escapeHtml(line)}</span>`).join('')}</div>` : ''}
      <ol class="ce-trace-steps">
        ${CE_TRACE_STEPS.map(([key, label]) => `
          <li class="ce-trace-step is-run" data-ce-step="${key}">
            <span class="ce-trace-step-label">${label}</span>
            <span class="ce-trace-step-state">${CE_STEP_LABELS.run}</span>
            <span class="ce-trace-step-detail"></span>
          </li>`).join('')}
      </ol>
    </div>`;
}

// Per-step outcome read from the backend response only.
function ceTraceStepStates(data) {
  const linking = data.linking || {};
  const markerOk = Boolean(linking.state) && linking.state !== 'MARKER_UNRESOLVED' && linking.state !== 'MULTIPLE_MARKERS_UNSUPPORTED';
  const refOk = linking.state === 'RESOLVED';
  const ci = data.citation_integrity || {};
  const ce = data.claim_evidence || {};
  const ceRan = ce.state === 'RUN';
  return {
    marker: markerOk ? ['done', linking.marker] : ['stop', linking.state],
    reference: !markerOk ? ['skip', ''] : refOk ? ['done', `참고문헌 #${linking.row_index}`] : ['stop', linking.state],
    evidence: !refOk ? ['skip', ''] : ceRan ? ['done', ci.article_id] : ['stop', ci.state || ci.status || ci.system_state || ce.reason],
    grounding: !ceRan ? ['skip', '근거 미확보'] : ['done', ce.grounding?.grounded === true ? 'PASS' : 'FAIL'],
    result: ['done', ceRan ? ce.status : (ce.reason || linking.state)],
  };
}

function setCeTraceStep(key, stepState, detail) {
  const step = el.ceVerifyResultBody?.querySelector(`[data-ce-step="${key}"]`);
  if (!step) return;
  step.className = `ce-trace-step is-${stepState}`;
  step.querySelector('.ce-trace-step-state').textContent = CE_STEP_LABELS[stepState];
  step.querySelector('.ce-trace-step-detail').textContent = detail ?? '';
}

async function revealCeTraceSteps(data) {
  const states = ceTraceStepStates(data);
  for (const [key] of CE_TRACE_STEPS) {
    setCeTraceStep(key, ...states[key]);
    await ceDelay(160);
  }
  await ceDelay(220);
}

function scrollCeResultsIntoView() {
  el.ceReservedResults?.scrollIntoView({ behavior: ceReducedMotion() ? 'auto' : 'smooth', block: 'start' });
}

async function executeCeTrace(draftText, triggerBtn, progressNote = null) {
  const references = ceReferenceRows();
  if (references.length === 0) {
    alert('참고문헌 목록을 입력하세요.');
    return;
  }
  const activeBtn = triggerBtn || el.btnExecuteCeVerify;
  const originalHtml = activeBtn ? activeBtn.innerHTML : '';
  if (activeBtn) {
    activeBtn.textContent = '검증 중...';
    activeBtn.classList.add('is-busy');
  }
  if (el.btnExecuteCeVerify) el.btnExecuteCeVerify.disabled = true;
  if (el.btnLoadCeD4) el.btnLoadCeD4.disabled = true;
  if (el.ceResolutionCard) el.ceResolutionCard.hidden = true;
  if (el.ceResultModeTag) el.ceResultModeTag.textContent = '검증 진행 중';
  if (el.ceVerifyResultBody) {
    el.ceVerifyResultBody.classList.remove('ce-reveal');
    el.ceVerifyResultBody.innerHTML = renderCeTraceProgress(progressNote);
  }
  scrollCeResultsIntoView();
  try {
    const res = await fetch('/api/claim-evidence/trace', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        draft_text: draftText,
        references,
        evidence_mode: 'FROZEN_EVIDENCE',
        scenario: (CE_TRACE_CONTEXTS[state.ceTraceContext] ?? CE_TRACE_CONTEXTS.FINANCE_D4).scenario,
      }),
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) throw new Error(data.error || `HTTP ${res.status}`);
    await revealCeTraceSteps(data);
    renderCeTraceResult(data);
    if (el.ceVerifyResultBody) {
      void el.ceVerifyResultBody.offsetWidth; // restart the reveal animation
      el.ceVerifyResultBody.classList.add('ce-reveal');
    }
    scrollCeResultsIntoView();
  } catch (err) {
    for (const [key] of CE_TRACE_STEPS) setCeTraceStep(key, 'error', '');
    const title = el.ceVerifyResultBody?.querySelector('#ceTraceProgressTitle');
    if (title) title.textContent = '검증 요청이 완료되지 않았습니다.';
    el.ceVerifyResultBody?.querySelector('.ce-spinner')?.remove();
    if (el.ceResultModeTag) el.ceResultModeTag.textContent = '검증 요청 실패';
    el.ceVerifyResultBody?.insertAdjacentHTML('beforeend', '<p class="ce-slot-text" style="color:var(--danger);font-weight:700;padding:16px;text-align:center;">검증 요청 실패 — 연구 판정이 아닙니다.</p>');
  } finally {
    if (activeBtn) {
      activeBtn.innerHTML = originalHtml;
      activeBtn.classList.remove('is-busy');
    }
    if (el.btnExecuteCeVerify) el.btnExecuteCeVerify.disabled = false;
    if (el.btnLoadCeD4) el.btnLoadCeD4.disabled = false;
  }
}

/**
 * Two-stage verification logic panel (presentation only). Every value comes from the returned finding:
 * grounding.grounded / shared_anchors / best_shared_anchors / citing_anchor_count / coverage / thresholds,
 * status and signals. Nothing is recomputed here.
 */
function renderCeLogicPanel(ce) {
  const g = ce.grounding;
  if (!g) return '';
  const grounded = g.grounded === true;
  const shared = grounded ? g.shared_anchors : g.best_shared_anchors;
  const sharedCount = Array.isArray(shared) ? shared.length : null;
  const total = g.citing_anchor_count;
  const t = g.thresholds || {};
  const coverageText = typeof g.coverage === 'number' ? `${Math.round(g.coverage * 100)}%` : null;
  const stage2Ran = grounded;
  const stage2Pass = stage2Ran && ce.status === 'CONSISTENT_WITH_EVIDENCE';
  const stage2Shift = stage2Ran && ce.status === 'POTENTIAL_CLAIM_SHIFT';
  const stage2Text = !stage2Ran
    ? '근거 문장 미확정 → 표현 변화 판정 미실행'
    : stage2Pass
      ? '확신 · 방향 · 인과 · 양태 변화 없음'
      : `표현 변화 관측: ${(ce.signals || []).join(', ')}`;
  const stage2Badge = !stage2Ran ? '미실행' : stage2Pass ? 'PASS' : stage2Shift ? '변화 관측' : escapeHtml(ce.status);
  return `
    <section class="ce-logic-panel" aria-label="TrustVerify 검증 로직">
      <div class="ce-logic-head">
        <strong class="ce-logic-title">🔎 TrustVerify 검증 로직</strong>
        <span class="ce-logic-sub">근거를 먼저 고정하고, 그 다음에만 표현 변화를 확인합니다.</span>
      </div>
      <p class="ce-logic-principle">근거를 찾기 전에 의미를 판단하지 않습니다.</p>
      <div class="ce-logic-stages">
        <div class="ce-logic-stage ${grounded ? 'is-pass' : 'is-fail'} ce-logic-stage-primary">
          <div class="ce-logic-stage-head">
            <span class="ce-logic-step">① 근거 문장 찾기</span>
            <span class="ce-logic-badge">${grounded ? 'PASS' : 'FAIL'}</span>
          </div>
          <div class="ce-logic-criteria">
            <div class="ce-logic-criterion">
              <span class="ce-logic-criterion-label">기준 1 · 공유 내용어</span>
              <span class="ce-logic-criterion-rule">≥ ${escapeHtml(t.MIN_SHARED_ANCHORS)}</span>
              <span class="ce-logic-criterion-observed">현재 ${escapeHtml(ce._marker || '')} · 공유 내용어 <strong>${sharedCount ?? '-'} / ${escapeHtml(total ?? '-')}</strong></span>
            </div>
            <div class="ce-logic-criterion">
              <span class="ce-logic-criterion-label">기준 2 · 인용 핵심어 커버리지</span>
              <span class="ce-logic-criterion-rule">≥ ${escapeHtml(Math.round((t.MIN_COVERAGE ?? 0) * 100))}%</span>
              <span class="ce-logic-criterion-observed">${coverageText
                ? `인용 핵심어 커버리지 <strong>${coverageText}</strong>`
                : '근거 문장 후보 미확정 · 엔진 커버리지 값 없음'}</span>
            </div>
          </div>
          <div class="ce-logic-outcome">${grounded
            ? `→ 근거 문장 확정 (초록 문장 #${escapeHtml(ce.evidence_span?.sentence_index ?? '-')})`
            : '→ 기준 미달 → INSUFFICIENT_EVIDENCE'}</div>
          <div class="ce-logic-rule">두 기준을 모두 충족하는 초록 문장이 있어야 근거로 확정합니다. <code>${escapeHtml(ce.rule_id === 'CE-GROUND-001' ? 'CE-GROUND-001' : 'Grounding Gate')}</code></div>
        </div>
        <div class="ce-logic-arrow" aria-hidden="true">➔</div>
        <div class="ce-logic-stage ${!stage2Ran ? 'is-muted' : stage2Pass ? 'is-pass' : 'is-shift'} ce-logic-stage-secondary">
          <div class="ce-logic-stage-head">
            <span class="ce-logic-step">② 표현 변화 확인</span>
            <span class="ce-logic-badge">${stage2Badge}</span>
          </div>
          <div class="ce-logic-outcome">${escapeHtml(stage2Text)}</div>
          ${!stage2Ran
            ? '<div class="ce-logic-note">근거가 고정되지 않으면 표현 의미를 추측하지 않습니다.</div>'
            : `<div class="ce-logic-outcome">→ ${escapeHtml(ce.status)}</div>`}
          <div class="ce-logic-examples">
            <span class="ce-logic-examples-label">근거가 확인된 경우에만 보는 표현 예시 (이번 결과 아님)</span>
            <span class="ce-logic-example"><code>suggest → prove</code> 확신 강도 강화</span>
            <span class="ce-logic-example"><code>may → definitely</code> 가능성 → 강한 확신/필연 표현</span>
          </div>
        </div>
      </div>
    </section>`;
}

function renderCeTraceResult(data) {
  if (!el.ceVerifyResultBody || !data) return;
  if (el.ceResolutionCard) el.ceResolutionCard.hidden = false;
  if (el.ceSelectedPaperMeta) el.ceSelectedPaperMeta.textContent = '';

  if (el.ceResultModeTag) {
    el.ceResultModeTag.textContent = '검증 완료 · 검증된 KCI 근거 재현 (모드 상세는 기술 상세 참조)';
  }

  // 1. Linking Failure Check
  if (data.linking?.state !== 'RESOLVED') {
    const stateKey = data.linking?.state;
    const label = LINKING_FAILURE_LABELS[stateKey] || stateKey;
    let desc = '인용 마커를 참고문헌 목록에 연결할 수 없습니다.';
    if (stateKey === 'MARKER_UNRESOLVED') {
      desc = '인용문에서 [1], [2]와 같은 단일 번호 인용 마커를 찾지 못했습니다. 본 단계는 단일 마커 기반 연계 단계입니다.';
    } else if (stateKey === 'MULTIPLE_MARKERS_UNSUPPORTED') {
      desc = '인용문에서 복수의 인용 마커가 감지되었습니다. 현재 P0에서는 단일 인용 마커 단위의 추적을 지원합니다.';
    } else if (stateKey === 'REFERENCE_INDEX_OUT_OF_RANGE') {
      desc = `인용 마커 ${data.linking?.marker || ''}에 해당하는 참고문헌 번호가 참고문헌 목록에 존재하지 않습니다.`;
    } else if (stateKey === 'REFERENCE_PARSE_REVIEW') {
      desc = '해당 참고문헌 항목의 구조 분석(서지 정보 추출) 검토가 필요합니다.';
    }

    if (el.ceSelectedPaperId) el.ceSelectedPaperId.textContent = 'KCI ID: (마커 미연결)';
    if (el.ceSelectedPaperTitle) el.ceSelectedPaperTitle.textContent = '참고문헌 연결 단계 미달';
    if (el.ceSelectedPaperStatus) el.ceSelectedPaperStatus.innerHTML = '';

    el.ceVerifyResultBody.innerHTML = `
      <div class="ce-linking-failure-card">
        <div class="linking-fail-head">
          <span class="linking-fail-tag">${escapeHtml(stateKey)}</span>
          <span class="linking-fail-title">${escapeHtml(label)}</span>
        </div>
        <p class="linking-fail-msg">${escapeHtml(desc)}</p>
        <div class="linking-fail-meta">
          <span>인용 마커: ${escapeHtml(data.linking?.marker || '(없음)')}</span>
          <span>처리 상태: 연계 전 중단 (KCI 조회 미수행)</span>
        </div>
        <p class="ce-caution-note">※ 참고문헌 연계 단계의 사전 검토 신호이며, KCI 조회나 논문 판정 오류가 아닙니다.</p>
      </div>`;
    return;
  }

  // 1b. Claim–Evidence not run: no coherent KCI record (or no frozen evidence). No claim status exists to show.
  if (!data.claim_evidence || data.claim_evidence.state !== 'RUN') {
    const ci = data.citation_integrity || {};
    const ciLabel = ci.status || ci.system_state || ci.state || '-';
    if (el.ceSelectedPaperId) el.ceSelectedPaperId.textContent = ci.article_id ? `KCI ID: ${ci.article_id}` : 'KCI ID: (확정되지 않음)';
    if (el.ceSelectedPaperTitle) el.ceSelectedPaperTitle.textContent = ci.article_title || '';
    if (el.ceSelectedPaperStatus) el.ceSelectedPaperStatus.innerHTML = `<span class="source-status roadmap">Citation Integrity: ${escapeHtml(ciLabel)}</span>`;
    if (el.ceSelectedPaperMeta) el.ceSelectedPaperMeta.textContent = `인용 ${data.linking.marker} → 참고문헌 #${data.linking.row_index}`;
    const noFrozen = ci.state === 'NO_FROZEN_EVIDENCE';
    el.ceVerifyResultBody.innerHTML = `
      <div class="ce-linking-failure-card">
        <div class="linking-fail-head">
          <span class="linking-fail-tag">CLAIM_EVIDENCE_NOT_RUN</span>
          <span class="linking-fail-title">Citation Integrity: ${escapeHtml(ciLabel)}</span>
        </div>
        <p class="linking-fail-msg">${noFrozen
          ? '이 참고문헌은 현재 발표 모드의 고정 근거(Frozen KCI Evidence)에 없습니다. KCI 레코드 연결과 판정을 자동으로 수행하지 않았습니다.'
          : '하나의 KCI 레코드가 확정되지 않아 Claim–Evidence 대조를 실행하지 않았습니다.'}</p>
        <p class="ce-caution-note">※ 인용 문장에 대한 판정이 아닙니다.</p>
      </div>`;
    return;
  }

  // 2. Linking Resolved: Update Reference Context Header directly from endpoint response
  if (el.ceSelectedPaperId) el.ceSelectedPaperId.textContent = `KCI ID: ${escapeHtml(data.citation_integrity.article_id)}`;
  if (el.ceSelectedPaperTitle) el.ceSelectedPaperTitle.textContent = data.citation_integrity.article_title || '';
  if (el.ceSelectedPaperMeta) el.ceSelectedPaperMeta.textContent = `인용 ${data.linking.marker} → 참고문헌 #${data.linking.row_index} → ${data.citation_integrity.article_id} · 백엔드 검증 결과`;
  if (el.ceSelectedPaperStatus) {
    el.ceSelectedPaperStatus.innerHTML = `
      <span class="${data.citation_integrity.status === 'VERIFIED' ? 'ce-badge-integrity-verified' : 'source-status roadmap'}" style="display:inline-flex;align-items:center;gap:4px;font-family:var(--mono);font-size:11px;font-weight:800;${data.citation_integrity.status === 'VERIFIED' ? 'color:var(--verified);background:var(--verified-soft);border:1px solid var(--verified-border);' : ''}padding:2px 8px;border-radius:4px;">
        ${data.citation_integrity.status === 'VERIFIED' ? '✓ ' : ''}Citation Integrity: ${escapeHtml(data.citation_integrity.status)} (${escapeHtml(data.citation_integrity.rule_id || '-')})
      </span>`;
  }

  // 3. Render 3-Area Main View
  const ce = data.claim_evidence;
  if (data.scenario === 'FINANCE_D4' && [FINANCE_D4_DRAFT_SENTENCE, FINANCE_D4_CONTRAST_SENTENCE].includes(data.draft_text)) {
    const anchors = ce.grounding?.grounded ? ce.grounding.shared_anchors : ce.grounding?.best_shared_anchors;
    state.ceFinanceRuns[data.linking.marker] = {
      marker: data.linking.marker,
      article_id: data.citation_integrity.article_id,
      article_title: data.citation_integrity.article_title,
      ci_status: data.citation_integrity.status,
      ce_status: ce.status,
      shared_count: Array.isArray(anchors) ? anchors.length : null,
      citing_anchor_count: ce.grounding?.citing_anchor_count ?? null,
    };
  }
  const isInsufficient = ce.status === 'INSUFFICIENT_EVIDENCE';
  const isShift = ce.status === 'POTENTIAL_CLAIM_SHIFT';
  const ceStatusView = CE_TRACE_STATUS[ce.status] ?? { ko: ce.status, badge: 'badge-insufficient' };
  const ceStatusKo = ceStatusView.ko;
  const ceBadgeClass = ceStatusView.badge;
  const ceExplanationKo = isInsufficient
    ? CE_INSUFFICIENT_TEXT
    : isShift
      ? `${CE_SHIFT_TEXT} (${(ce.signal ? [ce.signal] : []).join(', ')})`
      : (ce.why || '특정된 초록 근거 문장 범위에서 인과성·양태·확실성·부정·방향 표현이 보존되었습니다.');
  const ciIsVerified = data.citation_integrity.status === 'VERIFIED';
  const isFinanceContrast = data.scenario === 'FINANCE_D4';

  let evidenceSpanHtml = '';
  if (ce.evidence_span) {
    evidenceSpanHtml = `
      <div class="ce-grounded-span" style="margin-top:6px;">
        <span class="ce-span-badge">KCI 공개 초록 근거 · 문장 #${escapeHtml(ce.evidence_span.sentence_index)}</span>
        <p class="ce-span-text">"${escapeHtml(ce.evidence_span.text)}"</p>
      </div>`;
  } else {
    evidenceSpanHtml = `
      <div class="ce-grounded-span empty-span" style="margin-top:6px;background:#f8fafc;border:1px dashed var(--border);">
        <span class="ce-span-badge" style="background:#cbd5e1;color:#475569;">공개 초록 대조</span>
        <p class="ce-span-text" style="color:var(--text-3);font-style:italic;">충분한 근거 문장을 특정하지 못함 <span style="font-size:11px;">(No sufficiently grounded evidence span)</span></p>
      </div>`;
  }

  el.ceVerifyResultBody.innerHTML = `
    <!-- Top Two Questions Banner -->
    <div class="ce-two-question-banner" style="margin-bottom:14px;">
      <div class="ce-q-item">
        <span class="ce-q-label">질문 1. 실제 논문인가?</span>
        <span class="ce-q-answer">
          <strong class="status-badge-inline ${ciIsVerified ? 'verified' : ''}">${escapeHtml(data.citation_integrity.status)}</strong>
          <span style="font-family:var(--mono);font-size:12px;color:var(--text-3);">(${escapeHtml(data.citation_integrity.rule_id || '-')})</span>
        </span>
      </div>
      <div class="ce-q-divider">➔</div>
      <div class="ce-q-item">
        <span class="ce-q-label">질문 2. 이 논문이 지금 문장의 근거인가?</span>
        <span class="ce-q-answer">
          <strong class="ce-status-badge ${ceBadgeClass}">${escapeHtml(ce.status)}</strong>
          <span style="font-size:13px;font-weight:700;color:var(--text);">${escapeHtml(ceStatusKo)}</span>
        </span>
      </div>
    </div>

    <!-- 3 Main Areas -->
    <div class="ce-three-col-layout" style="margin-bottom:14px;">
      <!-- 1. 본문 문장 -->
      <div class="ce-col">
        <div class="ce-col-label">
          <span class="ce-col-tag">1. 본문 문장</span>
          <span class="ce-col-sub" style="font-family:var(--mono);font-weight:800;color:var(--primary);">${escapeHtml(data.linking.marker)}</span>
        </div>
        <div class="ce-statement-box">
          <p class="ce-statement-text">"${escapeHtml(data.draft_text)}"</p>
          ${isFinanceContrast ? '<p class="ce-statement-note">발표용 통제 인용 문장(영문) · 실제 KCI 공개 초록 기반 검증</p>' : ''}
          <div style="margin-top:10px;font-size:12px;color:var(--text-3);display:flex;align-items:center;gap:6px;">
            <span>인용 마커:</span>
            <strong style="font-family:var(--mono);color:var(--primary);background:var(--primary-soft);padding:1px 6px;border-radius:3px;">${escapeHtml(data.linking.marker)}</strong>
            <span>➔ 참고문헌 #${data.linking.row_index} 연결</span>
          </div>
        </div>
      </div>

      <!-- 2. 연결된 실제 KCI 논문 / 공개 초록 -->
      <div class="ce-col">
        <div class="ce-col-label">
          <span class="ce-col-tag">2. 연결된 실제 KCI 논문 / 공개 초록</span>
          <span class="ce-col-sub">${escapeHtml(data.citation_integrity.article_id)}</span>
        </div>
        <div class="ce-evidence-box">
          <div style="margin-bottom:8px;padding-bottom:8px;border-bottom:1px solid var(--border);">
            <strong style="font-size:13px;color:var(--text);display:block;line-height:1.45;">
              ${escapeHtml(data.citation_integrity.article_title || '')}
            </strong>
            <div style="margin-top:4px;display:flex;align-items:center;gap:8px;">
              <span class="source-status ${ciIsVerified ? 'qualified' : 'roadmap'}" style="font-size:11px;">Citation: ${escapeHtml(data.citation_integrity.status)}</span>
              <span style="font-family:var(--mono);font-size:11px;color:var(--text-3);">${escapeHtml(data.citation_integrity.article_id)}</span>
            </div>
          </div>
          ${evidenceSpanHtml}
        </div>
      </div>

      <!-- 3. 관측 결과 -->
      <div class="ce-col">
        <div class="ce-col-label">
          <span class="ce-col-tag">3. 관측 결과</span>
        </div>
        <div class="ce-result-box">
          <div class="ce-result-status-row">
            <span class="ce-status-ko">${escapeHtml(ceStatusKo)}</span>
          </div>
          <div class="ce-result-status-row">
            <span class="ce-status-badge ${ceBadgeClass}">${escapeHtml(ce.status)}</span>
            ${ce.human_review_required ? '<span class="ce-action-badge">사람 검토 필요</span>' : '<span class="ce-action-badge verified">공개 근거 범위 내 표현 보존</span>'}
          </div>
          ${isShift && ce.signal ? `<div class="ce-signals-list" style="margin-top:6px;"><span class="ce-signal-badge">${escapeHtml(ce.signal)}</span></div>` : ''}
          <div class="ce-why-box" style="margin-top:8px;">
            <p style="margin:0;font-size:13px;line-height:1.5;">${escapeHtml(ceExplanationKo)}</p>
          </div>
        </div>
      </div>
    </div>

    <!-- Two-stage verification logic (rendered from backend grounding) -->
    ${renderCeLogicPanel({ ...ce, _marker: data.linking?.marker })}

    <!-- Same-sentence contrast: offered only after a returned result (finance D4 scenario only) -->
    ${renderCeContrastBlock(data, ce)}

    <!-- Technical Provenance Details (Collapsed) -->
    <details class="ce-provenance-details" style="margin-top:12px;">
      <summary class="ce-provenance-summary"><span>⚙️ 기술 상세 (Provenance &amp; Grounding Details)</span></summary>
      <div class="ce-provenance-body">
        <div class="ce-prov-grid">
          <div class="ce-prov-item"><span class="cp-k">Scenario</span><code class="cp-v">${escapeHtml(data.scenario || 'FINANCE_D4')}</code></div>
          <div class="ce-prov-item"><span class="cp-k">Article ID</span><code class="cp-v">${escapeHtml(data.citation_integrity.article_id)}</code></div>
          <div class="ce-prov-item"><span class="cp-k">Citation Rule ID</span><code class="cp-v">${escapeHtml(data.citation_integrity.rule_id || '-')}</code></div>
          <div class="ce-prov-item"><span class="cp-k">Claim Rule ID</span><code class="cp-v">${escapeHtml(ce.rule_id)} (v${escapeHtml(ce.rule_version || '1.0')})</code></div>
          <div class="ce-prov-item"><span class="cp-k">Insufficiency Reason</span><code class="cp-v">${escapeHtml(ce.insufficiency_reason || 'NONE')}</code></div>
          <div class="ce-prov-item full-width"><span class="cp-k">Grounding Anchors</span><code class="cp-v">${escapeHtml(JSON.stringify(ce.grounding?.grounded ? ce.grounding.shared_anchors : ce.grounding?.best_shared_anchors ?? []))} / ${escapeHtml(ce.grounding?.citing_anchor_count ?? '-')}</code></div>
          <div class="ce-prov-item"><span class="cp-k">Evidence Hash</span><code class="cp-v">${escapeHtml(ce.evidence_hash || '-')}</code></div>
          <div class="ce-prov-item full-width"><span class="cp-k">Citation Finding ID</span><code class="cp-v">${escapeHtml(data.citation_integrity.finding_id)}</code></div>
          <div class="ce-prov-item full-width"><span class="cp-k">Claim Finding ID</span><code class="cp-v">${escapeHtml(ce.finding_id)}</code></div>
          <div class="ce-prov-item full-width"><span class="cp-k">Execution Mode</span><span class="cp-v">FROZEN_EVIDENCE (검증된 KCI 근거 재생) · Deterministic Contract</span></div>
          <div class="ce-prov-item full-width"><span class="cp-k">Human Review Reason</span><span class="cp-v">${escapeHtml(ce.human_review_reason || '없음 (공개 근거 범위에서 표현 보존)')}</span></div>
          <div class="ce-prov-item full-width"><span class="cp-k">Processing Version</span><code class="cp-v">${escapeHtml(ce.processing_version || '-')}</code></div>
        </div>
      </div>
    </details>`;

  // Bind the post-result contrast actions: only the sentence's marker changes; the bibliography stays as entered.
  const btnContrastInline = document.getElementById('btnTraceContrastInline');
  btnContrastInline?.addEventListener('click', () => {
    state.ceTraceContext = 'FINANCE_D4';
    if (el.ceVerifyInputText) el.ceVerifyInputText.value = FINANCE_D4_CONTRAST_SENTENCE;
    el.btnLoadCeD4?.classList.remove('is-active');
    executeCeTrace(FINANCE_D4_CONTRAST_SENTENCE, btnContrastInline, CE_CONTRAST_PROGRESS_NOTE);
  });
  const btnD4Inline = document.getElementById('btnTraceD4Inline');
  btnD4Inline?.addEventListener('click', () => {
    state.ceTraceContext = 'FINANCE_D4';
    if (el.ceVerifyInputText) el.ceVerifyInputText.value = FINANCE_D4_DRAFT_SENTENCE;
    el.btnLoadCeD4?.classList.add('is-active');
    executeCeTrace(FINANCE_D4_DRAFT_SENTENCE, btnD4Inline);
  });
}

// Same-sentence contrast (FINANCE_D4 presentation case). The CTA appears only once the [2] result has been returned;
// the side-by-side view uses only responses actually received in this session, never preset verdicts.
function renderCeContrastBlock(data, ce) {
  if (data.scenario !== 'FINANCE_D4') return '';
  if (data.draft_text === FINANCE_D4_DRAFT_SENTENCE && ce.status === 'INSUFFICIENT_EVIDENCE') {
    return `
    <div class="ce-contrast-action-box ce-contrast-cta">
      <div class="ce-contrast-cta-text">
        <strong>다음 단계 · 같은 문장을 올바른 근거 논문으로 비교</strong>
        <span>인용 문장은 그대로 두고, 연결된 논문만 실제 근거 source로 변경합니다.</span>
      </div>
      <button class="btn btn-primary" id="btnTraceContrastInline" type="button">↔ 같은 문장 · 올바른 근거로 비교</button>
    </div>`;
  }
  if (data.draft_text !== FINANCE_D4_CONTRAST_SENTENCE) return '';
  const before = state.ceFinanceRuns['[2]'];
  const after = state.ceFinanceRuns['[1]'];
  const column = (run, active) => `
        <div class="contrast-col ${active ? 'is-active-side target-binding' : ''}">
          <div class="contrast-col-head">
            <span class="contrast-tag ${active ? 'tag-target' : 'tag-current'}">${escapeHtml(run.marker)} 연결</span>
            <span class="contrast-paper-name">${escapeHtml(run.article_title || '')}</span>
          </div>
          <div class="contrast-col-body">
            <div class="c-row"><span class="c-k">KCI Record</span><code class="c-v">${escapeHtml(run.article_id)}</code></div>
            <div class="c-row"><span class="c-k">Citation Integrity</span><span class="source-status qualified">${escapeHtml(run.ci_status)}</span></div>
            <div class="c-row"><span class="c-k">공유 내용어</span><code class="c-v">${escapeHtml(run.shared_count ?? '-')} / ${escapeHtml(run.citing_anchor_count ?? '-')}</code></div>
            <div class="c-row"><span class="c-k">Claim Evidence</span><span class="ce-status-badge ${(CE_TRACE_STATUS[run.ce_status] ?? { badge: 'badge-insufficient' }).badge}">${escapeHtml(run.ce_status)}</span></div>
          </div>
        </div>`;
  return `
    <div class="ce-contrast-action-box">
      <div class="ce-contrast-head">
        <span class="contrast-icon">⚖️</span>
        <strong>문장은 그대로 유지 · [2] → [1] 근거 source만 변경</strong>
        <button class="btn btn-secondary btn-sm" id="btnTraceD4Inline" type="button">← 원래 사례 ([2]) 다시 보기</button>
      </div>
      ${before && after ? `
      <div class="ce-side-by-side-contrast" style="margin-top:8px;">
        ${column(before, false)}
        <div class="contrast-col-center">
          <span class="contrast-center-arr">↔</span>
          <span class="contrast-center-label">같은 문장 · 인용 연결만 변경</span>
          <span style="font-size:10.5px;color:var(--text-3);margin-top:4px;">(같은 엔진 · 같은 규칙)</span>
        </div>
        ${column(after, true)}
      </div>` : ''}
      <div class="ce-why-this-matters" style="margin-top:8px;padding:10px 14px;background:#ffffff;border:1px solid #bfdbfe;border-radius:6px;font-size:13px;line-height:1.5;color:var(--text);">
        💡 <strong>핵심 시사점:</strong> "참고문헌이 실제 논문이라는 사실과, 그 논문이 특정 문장의 근거라는 사실은 다릅니다."
      </div>
    </div>`;
}

function renderCeResult(finding, evidenceMode) {
  if (!el.ceVerifyResultBody || !finding) return;
  const label = CE_STATUS_LABELS[finding.status] ?? { ko: finding.status, badge: 'badge-insufficient' };
  const abstract = state.ceP0?.abstracts.find(item => item.lang === finding.evidence_source?.abstract_lang) ?? state.ceP0?.abstracts[0];
  if (el.ceResultModeTag) el.ceResultModeTag.textContent = `${evidenceMode === 'FROZEN_EVIDENCE' ? '검증된 KCI 근거 재현' : evidenceMode} · 결정론적 규칙 ${finding.rule_id}`;

  // Observed marker transitions for each signaled dimension, straight from finding.observed.
  const transitions = (finding.signals || []).map(signal => {
    const observed = finding.observed?.[CE_SIGNAL_DIMENSION[signal]];
    if (!observed) return '';
    const from = observed.evidence_markers?.length ? observed.evidence_markers.join(', ') : String(observed.evidence);
    const to = observed.citing_markers?.length ? observed.citing_markers.join(', ') : String(observed.citing);
    return `<div class="ce-obs-summary"><span class="ce-obs-val"><strong>${escapeHtml(from)}</strong> → <strong>${escapeHtml(to)}</strong></span></div>`;
  }).join('');

  let resultDetail = '';
  if (finding.status === 'POTENTIAL_CLAIM_SHIFT') {
    resultDetail = `
      ${transitions}
      <div class="ce-signals-list">${finding.signals.map(signal => `<span class="ce-signal-badge">${escapeHtml(signal)}</span>`).join('')}</div>
      <div class="ce-why-box"><p>${escapeHtml(finding.signals.map(signal => CE_SIGNAL_EXPLANATION[signal]).filter(Boolean).join(' '))}</p></div>`;
  } else if (finding.status === 'CONSISTENT_WITH_EVIDENCE') {
    resultDetail = `
      <div class="ce-why-box"><p>✓ 관련 evidence span 확보<br>✓ monitored dimensions에서 material shift 없음</p></div>`;
  } else {
    resultDetail = `
      <div class="ce-why-box"><p>현재 확보된 KCI 초록만으로 이 인용 문장을 충분히 확인할 수 없습니다.</p></div>`;
  }

  const evidenceBlock = finding.evidence_span
    ? `<div class="ce-grounded-span">
         <span class="ce-span-badge">KCI 공개 초록 근거 · 문장 #${escapeHtml(finding.evidence_span.sentence_index)}</span>
         <p class="ce-span-text">"${escapeHtml(finding.evidence_span.text)}"</p>
       </div>`
    : '<p class="ce-slot-text">현재 확보된 KCI 초록에서 이 인용 문장에 대응하는 근거 문장을 특정하지 못했습니다.</p>';

  const grounding = finding.grounding || {};
  const groundingText = grounding.grounded
    ? `공유 앵커 ${grounding.shared_anchors.length}/${grounding.citing_anchor_count} · coverage ${grounding.coverage} (기준: 앵커 ≥ ${grounding.thresholds.MIN_SHARED_ANCHORS}, coverage ≥ ${grounding.thresholds.MIN_COVERAGE})`
    : `근거 미확보 (${grounding.reason}) · 최대 공유 앵커 ${grounding.best_shared_anchors?.length ?? 0}/${grounding.citing_anchor_count ?? '-'} (기준: 앵커 ≥ ${grounding.thresholds?.MIN_SHARED_ANCHORS}, coverage ≥ ${grounding.thresholds?.MIN_COVERAGE})`;

  el.ceVerifyResultBody.innerHTML = `
    <div class="ce-three-col-layout">
      <div class="ce-col">
        <div class="ce-col-label"><span class="ce-col-tag">A. 내가 쓴 인용문</span></div>
        <div class="ce-statement-box"><p class="ce-statement-text">"${escapeHtml(finding.citing_claim)}"</p></div>
      </div>
      <div class="ce-col">
        <div class="ce-col-label"><span class="ce-col-tag">B. KCI 공개 초록 근거</span><span class="ce-col-sub">${escapeHtml(finding.citation_record_id)}</span></div>
        <div class="ce-evidence-box">
          ${evidenceBlock}
          ${abstract ? `<details class="ce-full-abstract-details"><summary class="ce-full-abstract-summary"><span>전체 초록 보기</span></summary><div class="ce-full-abstract-body">${escapeHtml(abstract.value)}</div></details>` : ''}
        </div>
      </div>
      <div class="ce-col">
        <div class="ce-col-label"><span class="ce-col-tag">C. 관측 결과</span></div>
        <div class="ce-result-box">
          <div class="ce-result-status-row">
            <span class="ce-status-ko">${escapeHtml(label.ko)}</span>
          </div>
          <div class="ce-result-status-row">
            <span class="ce-status-badge ${label.badge}">${escapeHtml(finding.status)}</span>
            ${finding.human_review_required ? '<span class="ce-action-badge">사람 검토 필요</span>' : ''}
          </div>
          ${resultDetail}
        </div>
      </div>
    </div>
    <details class="ce-provenance-details">
      <summary class="ce-provenance-summary"><span>⚙️ 기술 상세</span></summary>
      <div class="ce-provenance-body">
        <div class="ce-prov-grid">
          <div class="ce-prov-item"><span class="cp-k">Rule ID / Version</span><code class="cp-v">${escapeHtml(finding.rule_id)} (v${escapeHtml(finding.rule_version)})</code></div>
          <div class="ce-prov-item"><span class="cp-k">Evidence Hash</span><code class="cp-v" title="${escapeHtml(finding.evidence_hash)}">sha256:${escapeHtml(String(finding.evidence_hash).slice(0, 8))}…${escapeHtml(String(finding.evidence_hash).slice(-4))}</code></div>
          <div class="ce-prov-item"><span class="cp-k">Processing Version</span><code class="cp-v">${escapeHtml(finding.processing_version)}</code></div>
          <div class="ce-prov-item"><span class="cp-k">Finding ID</span><code class="cp-v">${escapeHtml(finding.finding_id)}</code></div>
          <div class="ce-prov-item full-width"><span class="cp-k">Evidence Grounding</span><span class="cp-v">${escapeHtml(groundingText)}</span></div>
          <div class="ce-prov-item full-width"><span class="cp-k">Human Review Reason</span><span class="cp-v">${escapeHtml(finding.human_review_reason || '없음 (공개 근거 범위에서 표현 보존)')}</span></div>
          <div class="ce-prov-item full-width"><span class="cp-k">Observer</span><span class="cp-v">${escapeHtml(finding.observer?.state || 'UNASSESSED')}</span></div>
          <div class="ce-prov-item full-width"><span class="cp-k">Scope</span><span class="cp-v">${escapeHtml((finding.uncertainty || []).join(' '))}</span></div>
        </div>
      </div>
    </details>`;
}

function init() {
  // Extension Rail Module Switching
  el.railBtnCitation?.addEventListener('click', () => {
    location.hash = 'batch';
    switchWorkspaceModule('citation', 'batch');
  });
  el.railBtnClaimEvidence?.addEventListener('click', () => {
    location.hash = 'ce-verify';
    switchWorkspaceModule('claim-evidence', 'verify');
  });
  el.railBtnAgent?.addEventListener('click', () => {
    location.hash = 'agent-p0';
    switchWorkspaceModule('agent-p0', 'contract');
  });
  el.railBtnTranslation?.addEventListener('click', () => {
    location.hash = 'translation';
    switchWorkspaceModule('translation');
  });
  el.railBtnAcademicRef?.addEventListener('click', () => {
    location.hash = 'ar-reference';
    switchWorkspaceModule('academic-reference', 'reference');
  });

  el.btnBackToCitationFromCe?.addEventListener('click', () => {
    location.hash = 'batch';
    switchWorkspaceModule('citation', 'batch');
  });
  el.btnBackToCitationFromCeExamples?.addEventListener('click', () => {
    location.hash = 'batch';
    switchWorkspaceModule('citation', 'batch');
  });
  el.btnBackToCitationFromCeMethod?.addEventListener('click', () => {
    location.hash = 'batch';
    switchWorkspaceModule('citation', 'batch');
  });
  el.btnBackToCitationFromAgent?.addEventListener('click', () => {
    location.hash = 'batch';
    switchWorkspaceModule('citation', 'batch');
  });
  el.btnBackToCitationFromAgentPrompt?.addEventListener('click', () => {
    location.hash = 'batch';
    switchWorkspaceModule('citation', 'batch');
  });
  el.btnBackToCitationFromAgentReverify?.addEventListener('click', () => {
    location.hash = 'batch';
    switchWorkspaceModule('citation', 'batch');
  });
  el.btnBackToCitationFromTf?.addEventListener('click', () => {
    location.hash = 'batch';
    switchWorkspaceModule('citation', 'batch');
  });
  el.btnBackToCitationFromAr?.addEventListener('click', () => {
    location.hash = 'batch';
    switchWorkspaceModule('citation', 'batch');
  });
  el.btnBackToCitationFromArHandoff?.addEventListener('click', () => {
    location.hash = 'batch';
    switchWorkspaceModule('citation', 'batch');
  });
  el.btnBackToCitationFromArVision?.addEventListener('click', () => {
    location.hash = 'batch';
    switchWorkspaceModule('citation', 'batch');
  });

  // Top Navigation Tabs (Academic Reference & Vision)
  el.navTabArReference?.addEventListener('click', () => {
    location.hash = 'ar-reference';
    switchArView('reference');
  });
  el.navTabArHandoff?.addEventListener('click', () => {
    location.hash = 'ar-handoff';
    switchArView('handoff');
  });
  el.navTabArVision?.addEventListener('click', () => {
    location.hash = 'ar-vision';
    switchArView('vision');
  });

  // Domain selector pill interactions in Tab 1
  document.querySelectorAll('.ar-domain-pill').forEach(pill => {
    pill.addEventListener('click', () => {
      document.querySelectorAll('.ar-domain-pill').forEach(p => p.classList.remove('is-active'));
      pill.classList.add('is-active');
    });
  });

  // Top Navigation Tabs (TrustVerify Agent P0)
  el.navTabAgentContract?.addEventListener('click', () => {
    location.hash = 'agent-contract';
    switchAgentView('contract');
  });
  el.navTabAgentPrompt?.addEventListener('click', () => {
    location.hash = 'agent-prompt';
    switchAgentView('prompt');
  });
  el.navTabAgentReverify?.addEventListener('click', () => {
    location.hash = 'agent-reverify';
    switchAgentView('reverify');
  });

  // Top Navigation Tabs (Citation Integrity)
  el.navTabBatch?.addEventListener('click', () => {
    location.hash = 'batch';
    switchCitationView('batch');
  });
  el.navTabSingle?.addEventListener('click', () => {
    location.hash = 'single';
    switchCitationView('single');
  });
  el.navTabMethod?.addEventListener('click', () => {
    location.hash = 'method';
    switchCitationView('method');
  });

  // Top Navigation Tabs (Claim–Evidence Alignment)
  el.navTabCeVerify?.addEventListener('click', () => {
    location.hash = 'ce-verify';
    switchCeView('verify');
  });
  el.navTabCeExamples?.addEventListener('click', () => {
    location.hash = 'ce-examples';
    switchCeView('examples');
  });
  el.navTabCeMethod?.addEventListener('click', () => {
    location.hash = 'ce-method';
    switchCeView('method');
  });

  // Claim-Evidence Input Actions: presets only fill committed claims; results always come from the backend.
  el.btnLoadCeD4?.addEventListener('click', async () => {
    el.btnLoadCeD4.classList.add('is-active');
    fillCePreset('D4');
    await executeCeTrace(FINANCE_D4_DRAFT_SENTENCE, el.btnLoadCeD4);
  });
  el.btnLoadCeExample?.addEventListener('click', () => {
    el.btnLoadCeD4?.classList.remove('is-active');
    fillCePreset('C1');
    el.ceVerifyInputText?.scrollIntoView({ behavior: 'smooth', block: 'center' });
  });
  el.btnLoadCeInsufficient?.addEventListener('click', () => {
    el.btnLoadCeD4?.classList.remove('is-active');
    fillCePreset('I1');
    el.ceVerifyInputText?.scrollIntoView({ behavior: 'smooth', block: 'center' });
  });
  const setPresetActive = active => [el.btnLoadCeD4, el.btnLoadCeK2, el.btnLoadCeK2Control]
    .forEach(button => button?.classList.toggle('is-active', button === active));
  el.btnLoadCeK2?.addEventListener('click', async () => {
    setPresetActive(el.btnLoadCeK2);
    fillCePreset('K2-PERTURBATION');
    el.ceVerifyResultBody?.scrollIntoView({ behavior: 'smooth', block: 'start' });
    await executeCeTrace(KOREAN_K2_PERTURBATION_SENTENCE, el.btnLoadCeK2);
  });
  el.btnLoadCeK2Control?.addEventListener('click', async () => {
    setPresetActive(el.btnLoadCeK2Control);
    fillCePreset('K2-CONTROL');
    el.ceVerifyResultBody?.scrollIntoView({ behavior: 'smooth', block: 'start' });
    await executeCeTrace(KOREAN_K2_CONTROL_SENTENCE, el.btnLoadCeK2Control);
  });
  // Editing the sentence invalidates any previous result display for the reference card.
  el.ceVerifyInputText?.addEventListener('input', () => showPendingReference(el.ceVerifyInputText.value));
  el.ceVerifyReferences?.addEventListener('input', () => showPendingReference(el.ceVerifyInputText?.value));
  el.btnExecuteCeVerify?.addEventListener('click', () => executeCeVerify(el.btnExecuteCeVerify));
  loadClaimEvidenceP0();

  // Claim-Evidence Evaluation Case Selector
  el.btnCaseD1?.addEventListener('click', () => switchCeCase('D1'));
  el.btnCaseD2?.addEventListener('click', () => switchCeCase('D2'));
  el.btnCaseD3?.addEventListener('click', () => switchCeCase('D3'));
  el.btnCaseD4?.addEventListener('click', () => switchCeCase('D4'));
  el.btnCaseD4Contrast?.addEventListener('click', () => switchCeCase('D4-CONTRAST'));
  el.btnSwitchToContrast?.addEventListener('click', () => switchCeCase('D4-CONTRAST'));
  el.btnSwitchToD4?.addEventListener('click', () => switchCeCase('D4'));

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
    state.batchSummary = null;
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

  // Client-side Hash Routing
  window.addEventListener('hashchange', handleHashRouting);
  handleHashRouting();
}

function handleHashRouting() {
  const hash = location.hash.replace('#', '').toLowerCase();
  if (hash === 'claim-evidence' || hash === 'viewclaimevidence' || hash === 'claim' || hash === 'layer3') {
    switchWorkspaceModule('claim-evidence', 'verify');
  } else if (hash === 'ce-verify') {
    switchWorkspaceModule('claim-evidence', 'verify');
  } else if (hash.startsWith('ce-examples')) {
    switchWorkspaceModule('claim-evidence', 'examples');
    if (hash.includes('contrast')) switchCeCase('D4-CONTRAST');
    else if (hash.includes('d1')) switchCeCase('D1');
    else if (hash.includes('d3')) switchCeCase('D3');
    else if (hash.includes('d4')) switchCeCase('D4');
    else switchCeCase('D2');
  } else if (hash === 'ce-method') {
    switchWorkspaceModule('claim-evidence', 'method');
  } else if (hash === 'translation' || hash === 'viewtranslation') {
    switchWorkspaceModule('translation');
  } else if (hash.startsWith('agent') || hash.startsWith('agent-p0')) {
    if (hash.includes('prompt')) {
      switchWorkspaceModule('agent-p0', 'prompt');
    } else if (hash.includes('reverify')) {
      switchWorkspaceModule('agent-p0', 'reverify');
    } else {
      switchWorkspaceModule('agent-p0', 'contract');
    }
  } else if (hash.startsWith('academic-reference') || hash.startsWith('ar-') || hash === 'finance-20' || hash === 'viewacademicref') {
    if (hash.includes('handoff')) {
      switchWorkspaceModule('academic-reference', 'handoff');
    } else if (hash.includes('vision')) {
      switchWorkspaceModule('academic-reference', 'vision');
    } else {
      switchWorkspaceModule('academic-reference', 'reference');
    }
  } else if (hash === 'single' || hash === 'viewsingle') {
    switchWorkspaceModule('citation', 'single');
  } else if (hash === 'method' || hash === 'viewmethod' || hash === 'test-evidence' || hash === 'architecture') {
    switchWorkspaceModule('citation', 'method');
  } else if (hash === 'batch' || hash === 'viewbatch') {
    switchWorkspaceModule('citation', 'batch');
  } else if (!hash) {
    switchWorkspaceModule('citation', 'batch');
  }
}

document.addEventListener('DOMContentLoaded', init);
