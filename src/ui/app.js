/**
 * TrustVerify Research — Unified UI Controller
 * NAIS 2026 Hackathon
 *
 * UNIFIED ARCHITECTURE:
 * - Primary Experience: KO ↔ EN Research Integrity Audit
 * - Internal Evidence: KCI Citation Evidence (embedded)
 * - Optional Context: Finance-20 Reference Profile (secondary note only)
 * - Solar: Semantic Observer
 *
 * STRICT RULE: Backend owns evidence and findings. The frontend never computes
 * verdicts or rule logic. All findings display backend data and canonical schemas.
 */

// Master findings collection for the unified 3-sentence demo manuscript
const UNIFIED_FINDINGS = [
  {
    id: 'TR-CAUS-001',
    rule_id: 'TR-CAUS-001',
    rule_version: '1.0',
    track: 'MEANING_PRESERVATION',
    status: 'CAUSALITY_ESCALATION',
    status_label_ko: '인과 표현 강화',
    category: 'semantic',
    category_label: '의미 · 인과',
    severity: 'review',
    sentence_index: 3,
    title: '인과 표현 격상 (상관성 시사 → 인과 보장 입증)',
    source_span: '양의 상관성을 시사한다',
    target_span: 'definitively prove that liquidity intervention guarantees',
    short_reason: '한국어 원문의 온건한 통계적 상관성(correlation) 서술이 영문 결과물에서 절대적 인과 입증(causation) 및 결과 보장(guarantee)으로 왜곡되었습니다.',
    solar_observation: '한국어 원문 서술의 신중한 추정(epistemic hedging: "시사한다")이 영어 결과물에서 논리적 필연성을 단언하는 결정론적 어휘("definitively prove ... guarantees")로 격상되었습니다. 이는 실증 데이터가 직접 입증하지 않은 인과관계를 단정하는 연구 왜곡 신호입니다.',
    human_review_badge: '사람 검토 필요',
    human_review_callout: '인과 단정 표현을 완화하고, 원문의 통계적 해석 수준("suggests a positive association between liquidity intervention and financial stability")으로 영문 수정을 강력 권장합니다.',
    finance_context: {
      pilot_name: 'Finance-20 Pilot',
      target_phrase: 'definitively prove this conclusion',
      observation: 'Strong assertion differs from the observed pilot reference distribution.',
      interpretation: '정답이나 오류 판정이 아닌, 실제 영문 금융논문 코퍼스의 서술 경향성과의 분포 차이만 표시합니다. 논문 채택/기각을 결정하지 않습니다.',
    },
    technical_provenance: {
      rule_id: 'TR-CAUS-001',
      rule_version: '1.0',
      evaluator: 'Solar Semantic Observer (v2.1)',
      confidence_score: '0.94',
      span_source_loc: 'S3[48..60]',
      span_target_loc: 'S3[23..78]',
    },
  },
  {
    id: 'TR-CIT-001',
    rule_id: 'REF-META-002',
    rule_version: '1.0',
    track: 'CITATION_INTEGRITY',
    status: 'METADATA_DRIFT',
    status_label_ko: '인용 서지정보 불일치',
    category: 'citation',
    category_label: '인용 근거',
    severity: 'drift',
    sentence_index: 2,
    citation_marker: '[2]',
    title: '인용 출판연도 불일치 (입력: 2023 → KCI 공식: 2024)',
    affected_citation: 'Computer Vision-based Basketball Player Training System (2023)',
    short_reason: 'KCI 공식 레코드와의 동일 논문 식별은 확인되었으나, 입력된 출판연도(2023)가 KCI 공식 수록 연도(2024)와 불일치합니다.',
    kci_evidence: {
      source_system: 'KCI (한국연구재단 학술색인 Open API)',
      record_id: 'ART003062835',
      journal_name: 'Journal of Digital Convergence',
      retrieved_at: '2026-09-30T00:00:00Z',
      normalized_content_sha256: '2222222222222222222222222222222222222222222222222222222222222222',
      redacted_snapshot_sha256: '3333333333333333333333333333333333333333333333333333333333333333',
      field_comparisons: [
        { field: 'title', label: '논문 제목', input_value: 'Computer Vision-based Basketball Player Training System', evidence_value: 'Computer Vision-based Basketball Player Training System', result: 'MATCH' },
        { field: 'publication_year', label: '출판연도', input_value: '2023', evidence_value: '2024', result: 'MISMATCH' },
        { field: 'authors', label: '저자', input_value: '문현철', evidence_value: '문현철', result: 'MATCH' },
        { field: 'doi', label: 'DOI', input_value: '10.9728/dcs.2024.25.3.595', evidence_value: '10.9728/dcs.2024.25.3.595', result: 'MATCH' },
      ],
    },
    human_review_badge: '서지정보 확인 권장',
    human_review_callout: 'KCI 공식 레코드(ART003062835)에 정식 수록된 출판연도는 2024년입니다. 학술대회 발표/선공개 연도(2023)와 정식 학술지 수록 연도 간 차이인지 서지정보를 확인하세요.',
    technical_provenance: {
      rule_id: 'REF-META-002',
      rule_version: '1.0',
      contract_version: 'trustverify-citation-finding-v1',
      kci_article_id: 'ART003062835',
      endpoint: 'GET /kciportal/openapi/articleDetail.kci',
    },
  },
  {
    id: 'TR-NUM-001',
    rule_id: 'TR-NUM-001',
    rule_version: '1.0',
    track: 'FACTUAL_CONSISTENCY',
    status: 'NUMERICAL_DRIFT',
    status_label_ko: '수치 불일치',
    category: 'factual',
    category_label: '수치 · 사실',
    severity: 'mismatch',
    sentence_index: 1,
    title: '완충자본 규제비율 기준치 수치 왜곡 (2.5% → 3.0%)',
    source_val: '2.5%',
    target_val: '3.0%',
    short_reason: '한국어 원문의 완충자본 규제비율 기준치(2.5%)가 AI 영문 번역 결과물에서 3.0%로 변형되었습니다.',
    human_review_badge: '즉각 수정 필요',
    human_review_callout: '정량적 수치의 변형은 금융 정책 연구의 실증 결론을 심각하게 왜곡할 수 있으므로, 원문의 정확한 수치(2.5%)로 즉시 복원해야 합니다.',
    field_comparisons: [
      { field: 'capital_buffer_ratio', label: '규제비율 기준치', input_value: '2.5%', evidence_value: '3.0%', result: 'MISMATCH' },
    ],
    technical_provenance: {
      rule_id: 'TR-NUM-001',
      rule_version: '1.0',
      evaluator: 'Deterministic Number Tokenizer',
      delta: '+0.5%p',
    },
  },
  {
    id: 'TR-MOD-001',
    rule_id: 'TR-MOD-001',
    rule_version: '1.0',
    track: 'MEANING_PRESERVATION',
    status: 'MODALITY_SHIFT',
    status_label_ko: '확신 수준 변화',
    category: 'semantic',
    category_label: '의미 · 인과',
    severity: 'review',
    sentence_index: 3,
    title: '확신 수준(Modality) 격상 (시사적 서술 → 단언적 주장)',
    source_span: '시사한다 (suggests)',
    target_span: 'guarantees financial stability',
    short_reason: '가능성 및 조심스러운 추론을 나타내는 한국어 양상 표현이 절대적 결과 보증으로 단정적으로 격상되었습니다.',
    solar_observation: 'Epistemic modality의 급격한 상승이 관측되었습니다. 원문은 "시사한다(suggests)" 수준의 온건한 결론이나 번역문은 "보장한다(guarantees)"라는 결정적 약속을 제시합니다.',
    human_review_badge: '사람 검토 권장',
    human_review_callout: '연구의 불확실성을 적절히 반영하는 학술적 완곡 어휘(e.g., "is likely associated with")로 완화할 것을 권장합니다.',
    technical_provenance: {
      rule_id: 'TR-MOD-001',
      rule_version: '1.0',
      modality_scale: 'Epistemic 3/10 → Epistemic 9/10',
    },
  },
  {
    id: 'TR-NEG-001',
    rule_id: 'TR-NEG-001',
    rule_version: '1.0',
    track: 'FACTUAL_CONSISTENCY',
    status: 'CONDITION_PRESERVED',
    status_label_ko: '조건부 보고 보존',
    category: 'factual',
    category_label: '수치 · 사실',
    severity: 'verified',
    sentence_index: 1,
    title: '보고 기준 한정 맥락 보존 확인',
    source_span: '수준으로 보고되었다',
    target_span: 'was reported at',
    short_reason: '원문의 보고 기준 한정 조건이 영어 결과물에 정상적으로 보존되어 기술되었습니다.',
    human_review_badge: '확인 완료',
    human_review_callout: '수치 외 서술 맥락(was reported at)은 원문의 의미와 일치합니다.',
    technical_provenance: {
      rule_id: 'TR-NEG-001',
      rule_version: '1.0',
      status: 'VERIFIED_PRESERVED',
    },
  },
];

// Aligned 3-Sentence Demo Manuscript
const DEMO_MANUSCRIPT = {
  meta: {
    title: '거시건전성 규제 완충자본과 국채 시장 변동성이 금융 시스템 안정성에 미치는 영향',
    title_en: 'Impact of Macroprudential Capital Buffers and Sovereign Debt Volatility on Financial Stability',
    venue: 'Journal of Financial Economics & Policy Research (2026)',
    discipline: '금융경제학 / 거시금융 실증분석',
  },
  sentences: [
    {
      index: 1,
      ko: '국내 시중은행의 거시건전성 완충자본 규제비율 기준치는 2.5% 수준으로 보고되었다.',
      en: 'The macroprudential capital buffer requirement for domestic banks was reported at 3.0%.',
      spans: [
        { type: 'ko', text: '2.5%', finding_id: 'TR-NUM-001', tone: 'mismatch' },
        { type: 'en', text: '3.0%', finding_id: 'TR-NUM-001', tone: 'mismatch' },
      ],
      finding_ids: ['TR-NUM-001', 'TR-NEG-001'],
    },
    {
      index: 2,
      ko: '국채 시장 변동성과 채권 유동성 구조에 관한 선행 실증연구 [2]에 따르면, 국채 발행물량 확대 충격이 장기 수익률 곡선에 유의한 영향을 미쳤다.',
      en: 'Prior empirical studies on sovereign debt volatility [2] demonstrated significant yield curve sensitivity.',
      spans: [
        { type: 'ko', text: '[2]', finding_id: 'TR-CIT-001', tone: 'drift' },
        { type: 'en', text: '[2]', finding_id: 'TR-CIT-001', tone: 'drift' },
      ],
      finding_ids: ['TR-CIT-001'],
      citation_ref: {
        marker: '[2]',
        finding_id: 'TR-CIT-001',
        text: 'Computer Vision-based Basketball Player Training System (2023). Journal of Digital Convergence. [KCI: ART003062835]',
        canonical: 'KCI 공식 수록: 2024년',
      },
    },
    {
      index: 3,
      ko: '이러한 실증 결과는 위기 국면에서 중앙은행의 유동성 공급 정책과 금융 안정성 간의 양의 상관성을 시사한다.',
      en: 'These empirical findings definitively prove that central bank liquidity intervention guarantees financial stability.',
      spans: [
        { type: 'ko', text: '상관성을 시사한다', finding_id: 'TR-CAUS-001', tone: 'review' },
        { type: 'en', text: 'definitively prove that central bank liquidity intervention guarantees', finding_id: 'TR-CAUS-001', tone: 'review' },
      ],
      finding_ids: ['TR-CAUS-001', 'TR-MOD-001'],
    },
  ],
};

// Filter categories
const FILTERS = [
  { key: 'all', label: '전체', count: () => UNIFIED_FINDINGS.length, match: () => true },
  { key: 'semantic', label: '의미 · 인과', count: () => UNIFIED_FINDINGS.filter(f => f.category === 'semantic').length, match: f => f.category === 'semantic' },
  { key: 'citation', label: '인용 근거', count: () => UNIFIED_FINDINGS.filter(f => f.category === 'citation').length, match: f => f.category === 'citation' },
  { key: 'factual', label: '수치 · 사실', count: () => UNIFIED_FINDINGS.filter(f => f.category === 'factual').length, match: f => f.category === 'factual' },
];

// App State
const state = {
  route: 'overview',
  activeFindingId: 'TR-CAUS-001', // Default to TR-CAUS-001 for 2-click demo story
  filter: 'all',
  liveAuditRunning: false,
};

// DOM Elements
const $ = id => document.getElementById(id);
const el = {
  viewOverview: $('viewOverview'),
  viewWorkspace: $('viewWorkspace'),
  navLinks: document.querySelectorAll('.topnav-link[data-route]'),
  manuscriptContainer: $('manuscriptContainer'),
  findingsCountBadge: $('findingsCountBadge'),
  findingsFilterStrip: $('findingsFilterStrip'),
  findingsListContainer: $('findingsListContainer'),
  evidenceContainer: $('evidenceContainer'),
  rightHeadBadge: $('rightHeadBadge'),
  btnStory1: $('btnStory1'),
  btnStory2: $('btnStory2'),
  btnOpenLiveKci: $('btnOpenLiveKci'),
  liveKciModal: $('liveKciModal'),
  btnCloseLiveKci: $('btnCloseLiveKci'),
  liveKciForm: $('liveKciForm'),
  liveModalTitle: $('liveModalTitle'),
  liveModalAuthors: $('liveModalAuthors'),
  liveModalYear: $('liveModalYear'),
  liveModalDoi: $('liveModalDoi'),
  btnRunLiveKci: $('btnRunLiveKci'),
  btnFillModalExample: $('btnFillModalExample'),
  liveModalFeedback: $('liveModalFeedback'),
  liveModalResultArea: $('liveModalResultArea'),
  liveModalResultContent: $('liveModalResultContent'),
};

/* ------------------------------------------------------------------ ROUTING */

function applyRoute() {
  const hash = location.hash || '#/';
  const isWorkspace = hash.startsWith('#/workspace') || hash.startsWith('#/citation');
  state.route = isWorkspace ? 'workspace' : 'overview';

  el.viewOverview.hidden = isWorkspace;
  el.viewWorkspace.hidden = !isWorkspace;
  document.body.classList.toggle('is-workspace', isWorkspace);

  el.navLinks.forEach(link => {
    const route = link.dataset.route;
    link.classList.toggle('is-active', route === state.route);
  });

  if (isWorkspace) {
    renderWorkspace();
  }
  window.scrollTo(0, 0);
}

/* ------------------------------------------------------------------ SELECTION */

function selectFinding(findingId) {
  if (!findingId) return;
  state.activeFindingId = findingId;

  // Update story guide buttons active state
  if (el.btnStory1 && el.btnStory2) {
    el.btnStory1.classList.toggle('is-active', findingId === 'TR-CAUS-001');
    el.btnStory2.classList.toggle('is-active', findingId === 'TR-CIT-001');
  }

  renderManuscript();
  renderFindingsList();
  renderEvidencePanel();

  // Scroll active finding card into view smoothly
  const card = el.findingsListContainer.querySelector(`[data-finding-id="${CSS.escape(findingId)}"]`);
  card?.scrollIntoView({ block: 'nearest', behavior: 'smooth' });
}

/* ------------------------------------------------------------------ MANUSCRIPT RENDERING */

function renderManuscript() {
  const active = UNIFIED_FINDINGS.find(f => f.id === state.activeFindingId);
  const activeSentenceIndex = active?.sentence_index;

  let html = `
    <div class="ms-header">
      <div class="ms-meta-tag">동일 연구 문서 대조 (Bilingual Aligned Draft)</div>
      <h3 class="ms-title-ko">${escapeHtml(DEMO_MANUSCRIPT.meta.title)}</h3>
      <p class="ms-title-en">${escapeHtml(DEMO_MANUSCRIPT.meta.title_en)}</p>
      <div class="ms-meta-row">
        <span>${escapeHtml(DEMO_MANUSCRIPT.meta.venue)}</span>
        <span class="meta-dot">·</span>
        <span>${escapeHtml(DEMO_MANUSCRIPT.meta.discipline)}</span>
      </div>
    </div>

    <div class="ms-sentences-list">`;

  DEMO_MANUSCRIPT.sentences.forEach(s => {
    const isSentenceActive = s.index === activeSentenceIndex;
    const hasActiveFinding = s.finding_ids.includes(state.activeFindingId);

    // Build highlighted KO text
    let koHtml = escapeHtml(s.ko);
    if (s.index === 1) {
      koHtml = koHtml.replace('2.5%', `<mark class="span-highlight tone-mismatch ${state.activeFindingId === 'TR-NUM-001' ? 'is-active' : ''}" data-finding-id="TR-NUM-001">2.5%</mark>`);
    } else if (s.index === 2) {
      koHtml = koHtml.replace('[2]', `<mark class="span-highlight tone-drift ${state.activeFindingId === 'TR-CIT-001' ? 'is-active' : ''}" data-finding-id="TR-CIT-001">[2]</mark>`);
    } else if (s.index === 3) {
      koHtml = koHtml.replace('양의 상관성을 시사한다', `<mark class="span-highlight tone-review ${state.activeFindingId === 'TR-CAUS-001' ? 'is-active' : ''}" data-finding-id="TR-CAUS-001">양의 상관성을 시사한다</mark>`);
    }

    // Build highlighted EN text
    let enHtml = escapeHtml(s.en);
    if (s.index === 1) {
      enHtml = enHtml.replace('3.0%', `<mark class="span-highlight tone-mismatch ${state.activeFindingId === 'TR-NUM-001' ? 'is-active' : ''}" data-finding-id="TR-NUM-001">3.0%</mark>`);
    } else if (s.index === 2) {
      enHtml = enHtml.replace('[2]', `<mark class="span-highlight tone-drift ${state.activeFindingId === 'TR-CIT-001' ? 'is-active' : ''}" data-finding-id="TR-CIT-001">[2]</mark>`);
    } else if (s.index === 3) {
      enHtml = enHtml.replace('definitively prove that central bank liquidity intervention guarantees', `<mark class="span-highlight tone-review ${state.activeFindingId === 'TR-CAUS-001' ? 'is-active' : ''}" data-finding-id="TR-CAUS-001">definitively prove that central bank liquidity intervention guarantees</mark>`);
    }

    html += `
      <article class="sentence-card ${isSentenceActive ? 'is-active-sentence' : ''}" data-sentence-index="${s.index}">
        <div class="sentence-head">
          <span class="sentence-num">문장 ${s.index}</span>
          <div class="sentence-tags">
            ${s.finding_ids.map(fid => {
              const f = UNIFIED_FINDINGS.find(item => item.id === fid);
              const isSelected = fid === state.activeFindingId;
              return `<button class="sentence-tag-btn tone-${f.severity} ${isSelected ? 'is-selected' : ''}" data-finding-id="${fid}">${escapeHtml(f.id)}</button>`;
            }).join('')}
          </div>
        </div>

        <div class="bilingual-pair">
          <div class="lang-row ko-row">
            <span class="lang-badge">한국어 원문</span>
            <p class="lang-text">${koHtml}</p>
          </div>
          <div class="lang-row en-row">
            <span class="lang-badge">AI 영어 결과</span>
            <p class="lang-text">${enHtml}</p>
          </div>
        </div>
      </article>`;
  });

  // Attached Reference List
  html += `
    <div class="ms-references-block">
      <div class="ms-refs-title">참고문헌 인용 (Bibliographic References)</div>
      <div class="ms-ref-item ${state.activeFindingId === 'TR-CIT-001' ? 'is-active-ref' : ''}" data-finding-id="TR-CIT-001">
        <span class="ref-marker">[2]</span>
        <div class="ref-content">
          <div class="ref-text">Computer Vision-based Basketball Player Training System (2023). Journal of Digital Convergence.</div>
          <div class="ref-meta">
            <span class="badge-ref-drift">연도 불일치: 입력 2023 vs KCI 2024</span>
            <span class="ref-record-id">KCI 식별: ART003062835</span>
          </div>
        </div>
      </div>
    </div>`;

  el.manuscriptContainer.innerHTML = html;

  // Add click listeners to spans, tags, and sentence cards
  el.manuscriptContainer.querySelectorAll('[data-finding-id]').forEach(node => {
    node.addEventListener('click', e => {
      e.stopPropagation();
      selectFinding(node.dataset.findingId);
    });
  });

  el.manuscriptContainer.querySelectorAll('.sentence-card').forEach(card => {
    card.addEventListener('click', () => {
      const idx = Number(card.dataset.sentenceIndex);
      const target = DEMO_MANUSCRIPT.sentences.find(s => s.index === idx);
      if (target?.finding_ids?.length) {
        selectFinding(target.finding_ids[0]);
      }
    });
  });
}

/* ------------------------------------------------------------------ FINDINGS LIST RENDERING */

function renderFilterStrip() {
  el.findingsFilterStrip.innerHTML = FILTERS.map(f => {
    const active = state.filter === f.key;
    const count = f.count();
    return `
      <button class="filter-tab ${active ? 'is-active' : ''}" role="tab" aria-selected="${active}" data-filter="${f.key}">
        <span>${escapeHtml(f.label)}</span>
        <span class="tab-count">${count}</span>
      </button>`;
  }).join('');

  el.findingsFilterStrip.querySelectorAll('.filter-tab').forEach(btn => {
    btn.addEventListener('click', () => {
      state.filter = btn.dataset.filter;
      renderFilterStrip();
      renderFindingsList();
    });
  });
}

function renderFindingsList() {
  const currentFilter = FILTERS.find(f => f.key === state.filter) || FILTERS[0];
  const list = UNIFIED_FINDINGS.filter(f => currentFilter.match(f));

  el.findingsCountBadge.textContent = `${UNIFIED_FINDINGS.length}건 발견`;

  if (!list.length) {
    el.findingsListContainer.innerHTML = `
      <div class="empty-state">
        <div class="empty-title">선택된 카테고리의 변화 항목이 없습니다.</div>
      </div>`;
    return;
  }

  el.findingsListContainer.innerHTML = list.map(f => {
    const isSelected = f.id === state.activeFindingId;
    return `
      <article class="finding-card tone-${f.severity} ${isSelected ? 'is-selected' : ''}" data-finding-id="${escapeHtml(f.id)}" role="button" tabindex="0">
        <div class="card-head">
          <div class="card-id-row">
            <span class="finding-id-tag">${escapeHtml(f.id)}</span>
            <span class="finding-cat-tag">${escapeHtml(f.category_label)}</span>
          </div>
          <span class="finding-status-badge tone-${f.severity}">
            ${escapeHtml(f.status_label_ko)}
          </span>
        </div>

        <h4 class="card-title">${escapeHtml(f.title)}</h4>
        <p class="card-short-reason">${escapeHtml(f.short_reason)}</p>

        <div class="card-foot">
          <span class="foot-sentence">문장 ${f.sentence_index}</span>
          <span class="foot-review tone-${f.severity}">${escapeHtml(f.human_review_badge)}</span>
        </div>
      </article>`;
  }).join('');

  el.findingsListContainer.querySelectorAll('.finding-card').forEach(card => {
    card.addEventListener('click', () => selectFinding(card.dataset.findingId));
    card.addEventListener('keydown', e => {
      if (e.key === 'Enter' || e.key === ' ') {
        e.preventDefault();
        selectFinding(card.dataset.findingId);
      }
    });
  });
}

/* ------------------------------------------------------------------ EVIDENCE PANEL RENDERING */

function renderEvidencePanel() {
  const item = UNIFIED_FINDINGS.find(f => f.id === state.activeFindingId);
  if (!item) {
    el.evidenceContainer.innerHTML = `
      <div class="empty-state">
        <div class="empty-title">발견된 변화를 선택하세요</div>
        <p class="empty-text">가운데 패널에서 변화 항목을 선택하면 상세 판정 근거와 규칙이 표시됩니다.</p>
      </div>`;
    el.rightHeadBadge.innerHTML = '';
    return;
  }

  el.rightHeadBadge.innerHTML = `
    <span class="badge-rule">규칙: ${escapeHtml(item.rule_id)} (v${escapeHtml(item.rule_version)})</span>
  `;

  let html = `
    <!-- Top Status Banner -->
    <div class="ev-status-banner tone-${item.severity}">
      <div class="ev-status-header">
        <div class="ev-status-title">
          <span class="status-icon">
            ${item.severity === 'drift' || item.severity === 'mismatch' ? '⚠️' : (item.severity === 'verified' ? '✓' : '🔍')}
          </span>
          <span class="status-name">${escapeHtml(item.status_label_ko)}</span>
          <span class="status-code">(${escapeHtml(item.status)})</span>
        </div>
        <span class="ev-id-badge">${escapeHtml(item.id)}</span>
      </div>
      <p class="ev-status-desc">${escapeHtml(item.short_reason)}</p>
    </div>`;

  // 1. DYNAMIC COMPARISON BLOCK BASED ON FINDING TYPE
  if (item.id === 'TR-CAUS-001' || item.id === 'TR-MOD-001') {
    html += renderCausalityEvidence(item);
  } else if (item.id === 'TR-CIT-001') {
    html += renderKciCitationEvidence(item);
  } else if (item.id === 'TR-NUM-001') {
    html += renderNumericalEvidence(item);
  } else {
    html += renderGenericEvidence(item);
  }

  // 2. HUMAN REVIEW CALLOUT
  html += `
    <div class="ev-section">
      <div class="ev-section-title">연구자 최종 검토 신호 (Human Review)</div>
      <div class="callout callout-${item.severity}">
        <div class="callout-head">
          <strong class="callout-badge">${escapeHtml(item.human_review_badge)}</strong>
        </div>
        <p class="callout-body">${escapeHtml(item.human_review_callout)}</p>
      </div>
    </div>`;

  // 3. OPTIONAL FINANCE-20 CONTEXTUAL CARD (only for TR-CAUS-001 / semantics)
  if (item.finance_context) {
    html += `
      <div class="ev-section">
        <div class="ev-section-title">학술 표현 참고 (Academic Reference Profile)</div>
        <div class="finance-profile-card">
          <div class="finance-head">
            <span class="finance-tag">${escapeHtml(item.finance_context.pilot_name)}</span>
            <span class="finance-target-phrase">대상 표현: "${escapeHtml(item.finance_context.target_phrase)}"</span>
          </div>
          <div class="finance-obs">
            <strong>코퍼스 관측:</strong> ${escapeHtml(item.finance_context.observation)}
          </div>
          <p class="finance-interp">
            <strong>해석 안내:</strong> ${escapeHtml(item.finance_context.interpretation)}
          </p>
        </div>
      </div>`;
  }

  // 4. TECHNICAL DETAILS (Inside <details>)
  html += renderTechnicalDetails(item);

  el.evidenceContainer.innerHTML = html;

  // Wire up copy JSON button
  const copyBtn = el.evidenceContainer.querySelector('[data-action="copy-json"]');
  copyBtn?.addEventListener('click', async () => {
    try {
      await navigator.clipboard.writeText(JSON.stringify(item, null, 2));
      copyBtn.textContent = '복사 완료!';
    } catch {
      copyBtn.textContent = '복사 실패';
    }
    setTimeout(() => { copyBtn.textContent = 'JSON 복사'; }, 1600);
  });
}

/* ------------------------------------------------------------------ EVIDENCE SUB-RENDERERS */

function renderCausalityEvidence(item) {
  return `
    <div class="ev-section">
      <div class="ev-section-title">원문 대조 및 스팬 변화</div>
      <div class="span-compare-grid">
        <div class="span-block source-block">
          <span class="span-block-label">한국어 원문 표현 (Source)</span>
          <div class="span-content">${escapeHtml(item.source_span)}</div>
          <span class="span-nature">통계적 상관성 시사 (Tentative Correlation)</span>
        </div>
        <div class="span-block target-block">
          <span class="span-block-label">AI 영어 결과 표현 (Target)</span>
          <div class="span-content">${escapeHtml(item.target_span)}</div>
          <span class="span-nature">결정론적 인과 및 보장 (Deterministic Causation)</span>
        </div>
      </div>
    </div>

    <div class="ev-section">
      <div class="ev-section-title">Solar 시맨틱 옵저버 관측 (Semantic Observer)</div>
      <div class="observer-box">
        <div class="obs-icon">💡</div>
        <p class="obs-text">${escapeHtml(item.solar_observation)}</p>
      </div>
    </div>`;
}

function renderKciCitationEvidence(item) {
  const ev = item.kci_evidence;
  return `
    <div class="ev-section">
      <div class="ev-section-title">검증 대상 인용 vs KCI 실제 레코드 비교</div>
      <div class="kci-record-banner">
        <div class="kci-badge-row">
          <span class="kci-source-tag">근거: ${escapeHtml(ev.source_system)}</span>
          <a class="kci-id-link" href="https://www.kci.go.kr/kciportal/ci/sereArticleSearch/ciSereArtiView.kci?sereArticleSearchBean.artiId=${encodeURIComponent(ev.record_id)}" target="_blank" rel="noopener">
            KCI ${escapeHtml(ev.record_id)} <span class="ext-icon">↗</span>
          </a>
        </div>
        <div class="kci-record-name">${escapeHtml(item.affected_citation)}</div>
      </div>

      <div class="field-compare-table">
        ${ev.field_comparisons.map(row => {
          const isMismatch = row.result === 'MISMATCH';
          return `
            <div class="f-row ${isMismatch ? 'is-mismatch' : 'is-match'}">
              <span class="f-name">${escapeHtml(row.label)}</span>
              <div class="f-diff">
                ${isMismatch
                  ? `<span class="val-mismatch">${escapeHtml(row.input_value)} <span class="arrow">→</span> ${escapeHtml(row.evidence_value)}</span>`
                  : `<span class="val-match"><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><polyline points="20 6 9 17 4 12"/></svg> 일치 (${escapeHtml(row.input_value)})</span>`}
              </div>
            </div>`;
        }).join('')}
      </div>
    </div>`;
}

function renderNumericalEvidence(item) {
  return `
    <div class="ev-section">
      <div class="ev-section-title">수치 직접 대조 (Source vs Target)</div>
      <div class="num-compare-card">
        <div class="num-row">
          <span class="num-label">한국어 원문 수치</span>
          <span class="num-val src">${escapeHtml(item.source_val)}</span>
        </div>
        <div class="num-arrow-indicator">➔ 수치 변형 발생</div>
        <div class="num-row">
          <span class="num-label">AI 영어 결과 수치</span>
          <span class="num-val tgt">${escapeHtml(item.target_val)}</span>
        </div>
      </div>
    </div>`;
}

function renderGenericEvidence(item) {
  return `
    <div class="ev-section">
      <div class="ev-section-title">대조 항목</div>
      <div class="span-compare-grid">
        <div class="span-block source-block">
          <span class="span-block-label">한국어 원문</span>
          <div class="span-content">${escapeHtml(item.source_span || '(해당 없음)')}</div>
        </div>
        <div class="span-block target-block">
          <span class="span-block-label">영어 번역</span>
          <div class="span-content">${escapeHtml(item.target_span || '(해당 없음)')}</div>
        </div>
      </div>
    </div>`;
}

function renderTechnicalDetails(item) {
  const prov = item.technical_provenance || {};
  return `
    <details class="tech-details">
      <summary>
        <span>상세 기술 근거 및 메타데이터 보기</span>
        <span class="tech-hint">규칙 ID · 해시 · 원본 계약 JSON</span>
      </summary>
      <div class="tech-body">
        <dl class="tech-grid">
          ${Object.entries(prov).map(([k, v]) => `
            <div>
              <dt>${escapeHtml(k)}</dt>
              <dd>${escapeHtml(String(v))}</dd>
            </div>
          `).join('')}
          ${item.kci_evidence?.normalized_content_sha256 ? `
            <div>
              <dt>kci_content_sha256</dt>
              <dd class="mono-hash">${escapeHtml(item.kci_evidence.normalized_content_sha256)}</dd>
            </div>
          ` : ''}
        </dl>
        <div class="json-header">
          <span>계약 JSON 스냅샷</span>
          <button class="btn btn-ghost btn-sm" type="button" data-action="copy-json">JSON 복사</button>
        </div>
        <pre class="json-pre"><code>${escapeHtml(JSON.stringify(item, null, 2))}</code></pre>
      </div>
    </details>`;
}

function renderWorkspace() {
  renderManuscript();
  renderFilterStrip();
  renderFindingsList();
  renderEvidencePanel();
}

/* ------------------------------------------------------------------ LIVE KCI MODAL & AUDIT */

function openLiveKciModal() {
  el.liveKciModal.hidden = false;
  el.liveKciModal.setAttribute('aria-hidden', 'false');
  el.liveModalTitle.focus();
}

function closeLiveKciModal() {
  el.liveKciModal.hidden = true;
  el.liveKciModal.setAttribute('aria-hidden', 'true');
}

async function handleLiveKciSubmit(e) {
  e.preventDefault();
  const citation = {
    title: el.liveModalTitle.value.trim(),
  };
  if (!citation.title) return;

  const authors = el.liveModalAuthors.value.split(',').map(s => s.trim()).filter(Boolean);
  if (authors.length) citation.authors = authors;
  if (el.liveModalYear.value.trim()) citation.publication_year = el.liveModalYear.value.trim();
  if (el.liveModalDoi.value.trim()) citation.doi = el.liveModalDoi.value.trim();

  el.btnRunLiveKci.disabled = true;
  el.btnRunLiveKci.textContent = 'KCI 조회 중…';
  el.liveModalFeedback.textContent = 'KCI Open API에 조회하고 검증 규칙을 적용하는 중입니다…';
  el.liveModalFeedback.className = 'modal-feedback is-pending';
  el.liveModalResultArea.hidden = true;

  try {
    const res = await fetch('/api/audit/citation', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(citation),
    });
    const result = await res.json();
    if (!res.ok) throw new Error(result.error || 'Audit request failed');

    el.liveModalFeedback.textContent = `조회 완료: ${result.status || result.system_state}`;
    el.liveModalFeedback.className = 'modal-feedback is-success';
    el.liveModalResultArea.hidden = false;
    el.liveModalResultContent.innerHTML = `
      <div class="live-result-box tone-${result.status === 'VERIFIED' ? 'verified' : (result.status === 'METADATA_DRIFT' ? 'drift' : 'review')}">
        <div class="live-result-title">
          <strong>${escapeHtml(result.status || result.system_state)}</strong>
          <span>규칙: ${escapeHtml(result.rule_id || result.operation || '')}</span>
        </div>
        <p class="live-result-reason">${escapeHtml(result.reason || '')}</p>
        <pre class="json-pre"><code>${escapeHtml(JSON.stringify(result, null, 2))}</code></pre>
      </div>`;
  } catch (err) {
    el.liveModalFeedback.textContent = `검증 오류: ${err.message}`;
    el.liveModalFeedback.className = 'modal-feedback is-error';
  } finally {
    el.btnRunLiveKci.disabled = false;
    el.btnRunLiveKci.textContent = 'KCI Open API 조회 실행';
  }
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
  window.addEventListener('hashchange', applyRoute);

  // Story demo buttons
  el.btnStory1?.addEventListener('click', () => {
    selectFinding('TR-CAUS-001');
  });

  el.btnStory2?.addEventListener('click', () => {
    selectFinding('TR-CIT-001');
  });

  // Modal events
  el.btnOpenLiveKci?.addEventListener('click', openLiveKciModal);
  el.btnCloseLiveKci?.addEventListener('click', closeLiveKciModal);
  el.liveKciModal?.addEventListener('click', e => {
    if (e.target === el.liveKciModal) closeLiveKciModal();
  });

  el.btnFillModalExample?.addEventListener('click', () => {
    el.liveModalTitle.value = 'Computer Vision-based Basketball Player Training System';
    el.liveModalYear.value = '2023';
    el.liveModalAuthors.value = '문현철';
    el.liveModalDoi.value = '';
    el.liveModalTitle.focus();
  });

  el.liveKciForm?.addEventListener('submit', handleLiveKciSubmit);

  // Keyboard shortcut: Escape to close modal
  document.addEventListener('keydown', e => {
    if (e.key === 'Escape' && !el.liveKciModal.hidden) {
      closeLiveKciModal();
    }
  });

  applyRoute();
}

document.addEventListener('DOMContentLoaded', init);
