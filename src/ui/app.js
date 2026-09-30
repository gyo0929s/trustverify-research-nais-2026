/**
 * TrustVerify Research — UI Controller
 * Polish & refinement for 90-second hackathon demo.
 * Renders backend findings only. The frontend never computes verdicts or field results:
 * status, system_state, field_comparisons and reason are displayed exactly as returned.
 * Contracts: schemas/citation-finding.schema.json (RESEARCH_FINDING),
 *            schemas/system-failure.schema.json (SYSTEM_FAILURE)
 */

// Korean-first display labels for backend status codes (labels only, no decision logic).
const STATUS_LABELS = {
  VERIFIED: {
    ko: '검증됨',
    code: 'VERIFIED',
    tone: 'verified',
    reviewBadge: '필요 시 원문 확인',
    meaning: '입력한 인용 서지정보가 KCI 공식 레코드와 일치합니다.',
  },
  METADATA_DRIFT: {
    ko: '정보 불일치',
    code: 'METADATA_DRIFT',
    tone: 'drift',
    reviewBadge: '서지정보 확인 권장',
    meaning: '동일 논문으로 확인되었으나, 출판연도 등 일부 서지정보가 KCI 레코드와 다릅니다.',
  },
  REVIEW_REQUIRED: {
    ko: '추가 검토 필요',
    code: 'REVIEW_REQUIRED',
    tone: 'review',
    reviewBadge: '사람 검토 필요',
    meaning: 'KCI 근거만으로는 특정 논문으로 확정할 수 없어 연구자의 직접 확인이 필요합니다.',
  },
  CHIMERA: {
    ko: '혼합 인용 의심',
    code: 'CHIMERA',
    tone: 'review',
    reviewBadge: '사람 검토 필요',
    meaning: '서로 다른 복수 논문의 서지정보가 하나의 인용으로 결합되었을 가능성이 있습니다.',
  },
  NOT_FOUND_IN_KCI: {
    ko: 'KCI에서 미발견',
    code: 'NOT_FOUND_IN_KCI',
    tone: 'notfound',
    reviewBadge: '색인 범위 확인 권장',
    meaning: 'KCI 검색 결과가 0건입니다. 가짜 논문이라는 뜻이 아니며, KCI 색인 범위 제한을 의미합니다.',
  },
};

const SYSTEM_LABELS = {
  KCI_UNAVAILABLE: 'KCI 연결 오류',
  KCI_AUTH_FAILED: 'KCI 인증 오류',
  KCI_INVALID_RESPONSE: 'KCI 응답 오류',
  KCI_PARSE_FAILED: 'KCI 응답 해석 오류',
};
const SYSTEM_MEANING = 'KCI Open API 통신 문제로 조회를 완료하지 못했습니다. 인용 오류가 아니며, 이 인용에 대해서는 어떤 판정도 내리지 않았습니다.';

const FIELD_LABELS = {
  title: '제목',
  authors: '저자',
  publication_year: '연도',
  doi: 'DOI',
  record_identity: '레코드 식별',
};

const RESULT_LABELS = {
  MATCH: ['일치', 'ok'],
  MISMATCH: ['불일치', 'warn'],
  UNKNOWN: ['확인 불가', 'muted'],
  MULTI_RECORD: ['복수 레코드 충돌', 'warn'],
  NOT_FOUND: ['미발견', 'muted'],
  INVALID: ['형식 오류', 'warn'],
};

const FILTERS = [
  { key: 'all', label: '전체', match: () => true },
  { key: 'VERIFIED', label: '검증됨', match: f => f.status === 'VERIFIED' },
  { key: 'METADATA_DRIFT', label: '정보 불일치', match: f => f.status === 'METADATA_DRIFT' },
  { key: 'REVIEW', label: '추가 검토', match: f => f.status === 'REVIEW_REQUIRED' || f.status === 'CHIMERA' },
  { key: 'NOT_FOUND_IN_KCI', label: 'KCI 미발견', match: f => f.status === 'NOT_FOUND_IN_KCI' },
  { key: 'SYSTEM_FAILURE', label: '시스템 오류', match: f => f.kind === 'SYSTEM_FAILURE' },
];

// Pre-fill example specifically supports the 30-second metadata drift story (2023 vs KCI 2024).
const EXAMPLE_CITATION = {
  title: 'Computer Vision-based Basketball Player Training System',
  publication_year: '2023',
};

// LIVE and DEMO entries are kept in separate lists and never shown together.
const state = {
  mode: 'LIVE',
  draft: null,
  demoLoaded: false,
  entries: { LIVE: [], DEMO: [] },
  selected: { LIVE: null, DEMO: 'fixture-finding-metadata-drift' },
  filter: 'all',
};

const $ = id => document.getElementById(id);
const el = {
  viewOverview: $('viewOverview'),
  viewCitation: $('viewCitation'),
  navLinks: document.querySelectorAll('.topnav-link[data-route]'),
  modeButtons: document.querySelectorAll('.mode-btn'),
  persistentModeBadge: $('persistentModeBadge'),
  persistentModeText: $('persistentModeText'),
  leftTitle: $('leftTitle'),
  leftHint: $('leftHint'),
  liveInputArea: $('liveInputArea'),
  auditForm: $('citationAuditForm'),
  auditTitle: $('auditTitle'),
  auditAuthors: $('auditAuthors'),
  auditYear: $('auditYear'),
  auditDoi: $('auditDoi'),
  auditSubmit: $('auditSubmit'),
  auditFeedback: $('auditFeedback'),
  btnLoadDemo: $('btnLoadDemo'),
  btnFillExample: $('btnFillExample'),
  submittedList: $('submittedList'),
  draftContainer: $('draftContentContainer'),
  resultsOriginBadge: $('resultsOriginBadge'),
  summaryStrip: $('summaryStrip'),
  findingsContainer: $('findingsListContainer'),
  evidenceContainer: $('evidenceDetailContainer'),
};

const findingOf = entry => entry?.finding ?? entry;
const displayOf = entry => entry?.display ?? {};
const itemIdOf = entry => {
  const finding = findingOf(entry);
  return finding?.finding_id || finding?.failure_id;
};
const currentEntries = () => state.entries[state.mode];
const selectedEntry = () => currentEntries().find(entry => itemIdOf(entry) === state.selected[state.mode]);

/* ------------------------------------------------------------------ routing */

function applyRoute() {
  const hash = location.hash || '#/';
  const isCitation = hash.startsWith('#/citation');
  el.viewOverview.hidden = isCitation;
  el.viewCitation.hidden = !isCitation;
  document.body.classList.toggle('is-workspace', isCitation);
  el.navLinks.forEach(link => link.classList.toggle('is-active', link.dataset.route === (isCitation ? 'citation' : 'overview')));
  if (isCitation) setMode(hash === '#/citation/demo' ? 'DEMO' : 'LIVE', { updateHash: false });
  window.scrollTo(0, 0);
}

async function setMode(mode, { updateHash = true } = {}) {
  state.mode = mode;
  state.filter = 'all';
  if (updateHash) {
    const target = mode === 'DEMO' ? '#/citation/demo' : '#/citation';
    if (location.hash !== target) history.replaceState(null, '', target);
  }
  if (mode === 'DEMO' && !state.demoLoaded) await loadDemoCases();
  renderAll();
}

/* ------------------------------------------------------------------ data */

async function loadDemoCases() {
  try {
    const [draftRes, findingsRes] = await Promise.all([fetch('/api/draft'), fetch('/api/findings')]);
    if (!findingsRes.ok) throw new Error('demo unavailable');
    const data = await findingsRes.json();
    state.entries.DEMO = data.findings || [];
    if (draftRes.ok) state.draft = await draftRes.json();
    if (!state.entries.DEMO.some(entry => itemIdOf(entry) === state.selected.DEMO)) {
      state.selected.DEMO = itemIdOf(state.entries.DEMO[0]);
    }
    state.demoLoaded = true;
  } catch {
    state.entries.DEMO = [];
    state.demoLoadError = true;
  }
}

async function submitLiveAudit(event) {
  event.preventDefault();
  const citation = { title: el.auditTitle.value.trim() };
  if (!citation.title) return;
  const authors = el.auditAuthors.value.split(',').map(value => value.trim()).filter(Boolean);
  if (authors.length) citation.authors = authors;
  if (el.auditYear.value.trim()) citation.publication_year = el.auditYear.value.trim();
  if (el.auditDoi.value.trim()) citation.doi = el.auditDoi.value.trim();

  el.auditSubmit.disabled = true;
  el.auditSubmit.textContent = 'KCI 조회 중…';
  setFeedback('KCI에 조회하고 공개 규칙을 적용하는 중입니다…', 'pending');
  try {
    const response = await fetch('/api/audit/citation', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(citation),
    });
    const result = await response.json();
    if (!response.ok || (!result.finding_id && !result.failure_id)) throw new Error('audit failed');

    const entry = {
      finding: result,
      display: { evidence_mode: 'LIVE', submitted: citation, submitted_at: new Date().toISOString() },
    };
    const resultId = itemIdOf(entry);
    state.entries.LIVE = [entry, ...state.entries.LIVE.filter(existing => itemIdOf(existing) !== resultId)];
    state.selected.LIVE = resultId;
    state.filter = 'all';
    if (result.kind === 'SYSTEM_FAILURE') {
      setFeedback(`${SYSTEM_LABELS[result.system_state] || 'KCI 시스템 오류'} — 인용 판정이 아닌 시스템 문제입니다.`, 'error');
    } else {
      setFeedback(`조회 완료 · ${STATUS_LABELS[result.status]?.ko || result.status}`, 'live');
    }
    renderAll();
  } catch {
    setFeedback('검증 요청을 완료하지 못했습니다. 서버 상태를 확인하거나 “데모 보기”로 예시 데이터를 확인하세요.', 'error');
  } finally {
    el.auditSubmit.disabled = false;
    el.auditSubmit.textContent = 'KCI에서 검증';
  }
}

function setFeedback(message, tone) {
  el.auditFeedback.textContent = message;
  el.auditFeedback.className = `audit-feedback ${message ? `is-${tone}` : ''}`;
}

function select(itemId) {
  if (!itemId) return;
  state.selected[state.mode] = itemId;
  renderAll();
  const card = el.findingsContainer.querySelector(`[data-item-id="${CSS.escape(itemId)}"]`);
  card?.scrollIntoView({ block: 'nearest', behavior: 'smooth' });
}

/* ------------------------------------------------------------------ rendering */

function renderAll() {
  const isLive = state.mode === 'LIVE';
  el.modeButtons.forEach(btn => {
    const active = btn.dataset.mode === state.mode;
    btn.classList.toggle('is-active', active);
    btn.setAttribute('aria-selected', String(active));
  });

  // Persistent mode indicator near workspace title
  if (el.persistentModeBadge) {
    el.persistentModeBadge.className = `persistent-mode-badge ${isLive ? 'live' : 'demo'}`;
    el.persistentModeText.textContent = isLive ? 'LIVE KCI · 실제 조회 모드' : 'DEMO · 예시 데이터 모드';
  }

  el.liveInputArea.hidden = !isLive;
  el.draftContainer.hidden = isLive;
  el.leftTitle.textContent = isLive ? '검증 대상 인용 (직접 입력)' : '연구 초안 (예시 원고)';
  el.leftHint.textContent = isLive ? '논문 제목을 입력하고 KCI 조회를 실행하세요' : '인용 번호 [1]~[5]를 누르면 결과가 연결됩니다';
  el.resultsOriginBadge.className = `origin-badge ${isLive ? 'live' : 'demo'}`;
  el.resultsOriginBadge.innerHTML = originBadgeText(state.mode);

  if (isLive) renderSubmittedList(); else renderDraft();
  renderSummary();
  renderFindings();
  renderEvidence();
}

function originBadgeText(mode) {
  return mode === 'LIVE'
    ? '<strong>LIVE KCI</strong><span>실제 KCI 조회 결과</span>'
    : '<strong>DEMO</strong><span>예시 데이터</span>';
}

function statusView(item) {
  if (item.kind === 'SYSTEM_FAILURE') {
    return {
      ko: SYSTEM_LABELS[item.system_state] || 'KCI 연결 오류',
      code: item.system_state,
      tone: 'system',
      reviewBadge: '재시도 필요',
      meaning: SYSTEM_MEANING,
    };
  }
  const label = STATUS_LABELS[item.status] || {
    ko: item.status,
    code: item.status,
    tone: 'review',
    reviewBadge: '사람 검토 필요',
    meaning: '',
  };
  return { ...label, code: item.status };
}

function statusBadge(item, size = '') {
  const view = statusView(item);
  return `<span class="status-badge tone-${view.tone} ${size}">
    <span class="status-ko">${escapeHtml(view.ko)}</span>
    <span class="status-code">${escapeHtml(view.code)}</span>
  </span>`;
}

function citationTitleOf(entry) {
  const item = findingOf(entry);
  const display = displayOf(entry);
  const input = item.input || display.submitted;
  if (input?.title) return { title: input.title, year: input.publication_year, authors: input.authors, doi: input.doi };
  if (item.kind === 'SYSTEM_FAILURE') return { title: display.citation_marker ? `예시 인용 ${display.citation_marker} KCI 조회 시도` : 'KCI 조회 시도', year: null };
  return { title: '(제목 없음)', year: null };
}

function renderSubmittedList() {
  const entries = state.entries.LIVE;
  if (!entries.length) {
    el.submittedList.innerHTML = '';
    return;
  }
  el.submittedList.innerHTML = `
    <div class="list-label">이번 세션에서 검증한 인용 (${entries.length})</div>
    ${entries.map(entry => {
      const id = itemIdOf(entry);
      const { title, year } = citationTitleOf(entry);
      return `<button class="submitted-item ${id === state.selected.LIVE ? 'is-selected' : ''}" data-item-id="${escapeHtml(id)}">
        <span class="submitted-title">${escapeHtml(title)}${year ? ` <span class="muted">(${escapeHtml(year)})</span>` : ''}</span>
        ${statusBadge(findingOf(entry), 'sm')}
      </button>`;
    }).join('')}`;
  el.submittedList.querySelectorAll('.submitted-item').forEach(btn => btn.addEventListener('click', () => select(btn.dataset.itemId)));
}

function renderDraft() {
  if (state.demoLoadError && !state.entries.DEMO.length) {
    el.draftContainer.innerHTML = '<div class="empty-state"><div class="empty-title">예시 데이터를 불러오지 못했습니다.</div></div>';
    return;
  }
  if (!state.draft) {
    el.draftContainer.innerHTML = '';
    return;
  }
  const { meta, sections } = state.draft;
  let html = `
    <div class="demo-notice">
      <span class="demo-notice-tag">DEMO</span>
      <span>인용 검증 시연을 위한 가상 연구 초안입니다. 실제 연구 부정이 아닙니다.</span>
    </div>
    <h3 class="ms-title">${escapeHtml(meta.title)}</h3>
    <p class="ms-meta">${escapeHtml(meta.target_venue)} · ${escapeHtml(meta.date)}</p>`;

  sections.forEach(sec => {
    html += `<div class="ms-section"><h4 class="ms-heading">${escapeHtml(sec.heading)}</h4>`;
    (sec.paragraphs || []).forEach(p => {
      html += `<p class="ms-paragraph">${escapeHtml(p.text)}`;
      if (p.citation_ref) {
        const entry = state.entries.DEMO.find(item => itemIdOf(item) === p.citation_ref);
        const marker = p.marker || displayOf(entry).citation_marker || '[?]';
        const tone = entry ? statusView(findingOf(entry)).tone : 'review';
        const selected = p.citation_ref === state.selected.DEMO ? 'is-selected' : '';
        html += ` <button class="cite-pill tone-${tone} ${selected}" data-item-id="${escapeHtml(p.citation_ref)}" aria-label="${escapeHtml(marker)} 근거 보기">${escapeHtml(marker)}</button>`;
      }
      if (p.text_after) html += escapeHtml(p.text_after);
      html += '</p>';
    });
    if (sec.reference_items) {
      html += '<ol class="ms-refs">';
      sec.reference_items.forEach(ref => {
        const selected = ref.finding_id === state.selected.DEMO ? 'is-selected' : '';
        html += `<li><button class="ms-ref ${selected}" data-item-id="${escapeHtml(ref.finding_id)}"><span class="ms-ref-marker">${escapeHtml(ref.marker)}</span><span>${escapeHtml(ref.text)}</span></button></li>`;
      });
      html += '</ol>';
    }
    html += '</div>';
  });

  el.draftContainer.innerHTML = html;
  el.draftContainer.querySelectorAll('[data-item-id]').forEach(node => node.addEventListener('click', () => select(node.dataset.itemId)));
}

function renderSummary() {
  const entries = currentEntries();
  if (!entries.length) {
    el.summaryStrip.innerHTML = '';
    el.summaryStrip.hidden = true;
    return;
  }
  el.summaryStrip.hidden = false;
  el.summaryStrip.innerHTML = FILTERS.map(filter => {
    const count = entries.filter(entry => filter.match(findingOf(entry))).length;
    if (filter.key !== 'all' && count === 0) return '';
    const active = state.filter === filter.key;
    return `<button class="filter-chip ${filter.key === 'SYSTEM_FAILURE' ? 'is-system' : ''} ${active ? 'is-active' : ''}" role="tab" aria-selected="${active}" data-filter="${filter.key}">${filter.label}<span class="chip-count">${count}</span></button>`;
  }).join('');
  el.summaryStrip.querySelectorAll('.filter-chip').forEach(chip => chip.addEventListener('click', () => {
    state.filter = chip.dataset.filter;
    renderSummary();
    renderFindings();
  }));
}

function renderFindings() {
  const entries = currentEntries();
  if (!entries.length) {
    el.findingsContainer.innerHTML = state.mode === 'LIVE'
      ? `<div class="empty-state">
          <div class="empty-title">아직 검증한 인용이 없습니다</div>
          <p class="empty-text">왼쪽에 논문 제목을 입력하고 <strong>KCI에서 검증</strong>을 누르거나,<br><strong>예시 채우기</strong>를 통해 30초 데모를 즉시 실행할 수 있습니다.</p>
          <div class="empty-actions">
            <button class="btn btn-secondary" data-action="fill-example">예시 채우기</button>
            <button class="btn btn-ghost" data-action="demo">데모 보기 →</button>
          </div>
        </div>`
      : '<div class="empty-state"><div class="empty-title">예시 결과가 없습니다</div></div>';
    el.findingsContainer.querySelector('[data-action="fill-example"]')?.addEventListener('click', () => {
      el.auditTitle.value = EXAMPLE_CITATION.title;
      el.auditYear.value = EXAMPLE_CITATION.publication_year;
      el.auditTitle.focus();
    });
    el.findingsContainer.querySelector('[data-action="demo"]')?.addEventListener('click', () => setMode('DEMO'));
    return;
  }

  const filter = FILTERS.find(f => f.key === state.filter) || FILTERS[0];
  const visible = entries.filter(entry => filter.match(findingOf(entry)));
  const research = visible.filter(entry => findingOf(entry).kind !== 'SYSTEM_FAILURE');
  const system = visible.filter(entry => findingOf(entry).kind === 'SYSTEM_FAILURE');

  let html = research.map(renderFindingCard).join('');
  if (system.length) {
    html += `<div class="system-divider"><span>⚠️ 시스템 연결 상태 · 인용 판정 아님</span></div>`;
    html += system.map(renderFindingCard).join('');
  }
  el.findingsContainer.innerHTML = html;
  el.findingsContainer.querySelectorAll('.result-card').forEach(card => {
    card.addEventListener('click', () => select(card.dataset.itemId));
    card.addEventListener('keydown', event => {
      if (event.key === 'Enter' || event.key === ' ') { event.preventDefault(); select(card.dataset.itemId); }
    });
  });
}

function renderFindingCard(entry) {
  const item = findingOf(entry);
  const display = displayOf(entry);
  const id = itemIdOf(entry);
  const isSystem = item.kind === 'SYSTEM_FAILURE';
  const { title, year } = citationTitleOf(entry);
  const recordId = item.evidence?.[0]?.source_record_id;
  const selected = id === state.selected[state.mode] ? 'is-selected' : '';
  const marker = display.citation_marker ? `<span class="card-marker">${escapeHtml(display.citation_marker)}</span>` : '';
  const view = statusView(item);

  return `
    <article class="result-card ${isSystem ? 'is-system' : `tone-${view.tone}`} ${selected}" data-item-id="${escapeHtml(id)}" role="button" tabindex="0">
      <div class="card-top">
        ${statusBadge(item)}
        ${marker}
      </div>
      <div class="card-title">${escapeHtml(title)}${year ? ` <span class="muted">(${escapeHtml(year)})</span>` : ''}</div>
      <div class="card-meaning">${escapeHtml(view.meaning)}</div>
      <div class="card-foot">
        ${isSystem
          ? `<span class="foot-record">상태: ${escapeHtml(item.system_state)}</span><span class="foot-review">${escapeHtml(view.reviewBadge)}</span>`
          : `<span class="foot-record">${recordId ? `KCI 레코드: ${escapeHtml(recordId)}` : 'KCI 레코드 없음'}</span><span class="foot-review">${escapeHtml(view.reviewBadge)}</span>`}
      </div>
    </article>`;
}

/**
 * Render Right Panel: 왜 이렇게 판정했나요?
 * Strict visual hierarchy:
 * 1. Finding status
 * 2. affected citation
 * 3. field comparison
 * 4. short reason
 * 5. KCI record
 * 6. human review
 * 7. Everything technical inside <details> (상세 근거 보기)
 */
function renderEvidence() {
  const entry = selectedEntry();
  const item = findingOf(entry);
  if (!item) {
    el.evidenceContainer.innerHTML = `<div class="empty-state">
      <div class="empty-title">결과를 선택하세요</div>
      <p class="empty-text">가운데 결과 카드를 누르면 판정 이유와 KCI 근거가 여기에 표시됩니다.</p>
    </div>`;
    return;
  }

  const mode = displayOf(entry).evidence_mode === 'LIVE' ? 'LIVE' : 'DEMO';
  const view = statusView(item);
  const isSystem = item.kind === 'SYSTEM_FAILURE';
  const { title, year, doi } = citationTitleOf(entry);

  // 1. Finding Status Header
  let html = `
    <div class="ev-head tone-${view.tone}">
      <div class="ev-head-row">
        ${statusBadge(item, 'lg')}
        <span class="origin-badge ${mode.toLowerCase()}">${originBadgeText(mode)}</span>
      </div>
      <p class="ev-meaning">${escapeHtml(view.meaning)}</p>
    </div>

    <!-- 2. Affected Citation -->
    <div class="ev-block">
      <div class="ev-label">검증 대상 인용</div>
      <div class="ev-citation">
        <div class="ev-cite-title">${escapeHtml(title)}${year ? ` <span class="muted">(${escapeHtml(year)})</span>` : ''}</div>
        ${doi ? `<div class="ev-cite-meta"><span class="meta-label">DOI:</span> ${escapeHtml(doi)}</div>` : ''}
      </div>
    </div>`;

  // SYSTEM FAILURE STATE
  if (isSystem) {
    html += `
      <div class="callout callout-system">
        <strong>⚠️ 시스템 연결 오류 — 인용 결함이 아닙니다.</strong>
        KCI Open API 조회가 <code>${escapeHtml(item.operation)}</code> 단계에서 완료되지 않았습니다. 외부 서비스 연결이 복구되기 전까지 이 인용은 가짜 논문이나 인용 오류로 판정하지 않습니다.
        ${item.retry_recommended ? '<div class="callout-action">잠시 후 다시 시도하세요. (재시도 필요)</div>' : ''}
      </div>

      <div class="ev-block">
        <div class="ev-label">시스템 진단 사유</div>
        <p class="ev-reason">${escapeHtml(item.reason)}</p>
      </div>

      <div class="ev-block">
        <div class="ev-label">사람 검토 신호</div>
        <div class="callout callout-system" style="margin-bottom:0;">
          <strong>재시도 필요</strong>
          외부 KCI 서비스 통신 일시 장애입니다. 논문 서지정보 자체의 오류가 아니므로 연결 정상화 후 재시도하세요.
        </div>
      </div>`;
  } else {
    // 3. Compact Field Comparison (Scannable, highlights only changed values)
    html += renderFieldComparisonCompact(item);

    // 4. Short Reason
    html += `
      <div class="ev-block">
        <div class="ev-label">판정 이유</div>
        <p class="ev-reason">${escapeHtml(item.reason)}</p>
      </div>`;

    // 5. KCI Record
    html += renderRecordIds(item);

    // 6. Human Review
    html += renderHumanReviewCallout(item);
  }

  // 7. Technical Details (inside <details class="provenance">)
  html += renderProvenance(item);
  el.evidenceContainer.innerHTML = html;

  const copyBtn = el.evidenceContainer.querySelector('[data-action="copy-json"]');
  copyBtn?.addEventListener('click', async () => {
    try {
      await navigator.clipboard.writeText(JSON.stringify(item, null, 2));
      copyBtn.textContent = '복사됨';
    } catch {
      copyBtn.textContent = '복사 실패 — 직접 선택하세요';
    }
    setTimeout(() => { copyBtn.textContent = 'JSON 복사'; }, 1600);
  });
}

/**
 * Renders compact, scannable field comparisons.
 * Highlights changed values prominently (e.g. 2023 → 2024).
 */
function renderFieldComparisonCompact(item) {
  let rows = [...(item.field_comparisons || [])];

  // If title was verified in record but not in explicit field_comparisons, include it for scanability
  if (item.input?.title && !rows.some(r => r.field === 'title')) {
    const evTitle = item.evidence?.[0]?.data?.title || item.evidence?.[0]?.data?.titles?.[0]?.value;
    if (evTitle && evTitle.toLowerCase().trim() === item.input.title.toLowerCase().trim()) {
      rows.unshift({ field: 'title', input_value: item.input.title, evidence_value: evTitle, result: 'MATCH' });
    }
  }

  // If DOI was verified in record but not in explicit field_comparisons, include it
  if (item.input?.doi && !rows.some(r => r.field === 'doi')) {
    const evDoi = item.evidence?.[0]?.data?.doi_normalized || item.evidence?.[0]?.data?.doi_raw || item.evidence?.[0]?.data?.doi;
    if (evDoi && evDoi.toLowerCase().includes(item.input.doi.toLowerCase())) {
      rows.push({ field: 'doi', input_value: item.input.doi, evidence_value: evDoi, result: 'MATCH' });
    }
  }

  if (!rows.length && item.status === 'NOT_FOUND_IN_KCI') {
    return `
      <div class="ev-block">
        <div class="ev-label">항목별 비교</div>
        <div class="compare-compact-card">
          <div class="compare-row is-notfound">
            <span class="compare-field-name">검색 결과</span>
            <span class="compare-field-diff"><span class="badge-diff notfound">KCI 레코드 0건 (No Data)</span></span>
          </div>
        </div>
      </div>`;
  }
  if (!rows.length) return '';

  return `
    <div class="ev-block">
      <div class="ev-label">항목별 비교 <span class="muted">· 불일치 항목만 강조</span></div>
      <div class="compare-compact-card">
        ${rows.map(row => {
          const fieldName = FIELD_LABELS[row.field] || row.field;
          const isMismatch = row.result === 'MISMATCH';
          const isMulti = row.result === 'MULTI_RECORD';
          const isMatch = row.result === 'MATCH';

          let valueDisplay = '';
          if (isMismatch) {
            valueDisplay = `<span class="badge-diff mismatch">${escapeHtml(formatValue(row.input_value))} <span class="diff-arrow">→</span> ${escapeHtml(formatValue(row.evidence_value))}</span>`;
          } else if (isMulti) {
            valueDisplay = `<span class="badge-diff multi">복수 레코드 충돌 (${escapeHtml(formatValue(row.evidence_value))})</span>`;
          } else if (isMatch) {
            valueDisplay = `<span class="badge-match"><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><polyline points="20 6 9 17 4 12"/></svg> 일치</span>`;
          } else {
            const [label] = RESULT_LABELS[row.result] || [row.result];
            valueDisplay = `<span class="badge-diff neutral">${escapeHtml(label)}</span>`;
          }

          return `
            <div class="compare-row ${isMismatch ? 'is-mismatch' : (isMatch ? 'is-match' : '')}">
              <span class="compare-field-name">${escapeHtml(fieldName)}</span>
              <span class="compare-field-diff">${valueDisplay}</span>
            </div>`;
        }).join('')}
      </div>
    </div>`;
}

function renderRecordIds(item) {
  const records = (item.evidence || []).filter(ev => ev.source_record_id);
  return `
    <div class="ev-block">
      <div class="ev-label">KCI 레코드 식별</div>
      ${records.length
        ? `<div class="record-list">${records.map(ev => {
            const url = `https://www.kci.go.kr/kciportal/ci/sereArticleSearch/ciSereArtiView.kci?sereArticleSearchBean.artiId=${encodeURIComponent(ev.source_record_id)}`;
            return /^ART\d+$/.test(ev.source_record_id)
              ? `<a class="record-id-link" href="${escapeHtml(url)}" target="_blank" rel="noopener">KCI ${escapeHtml(ev.source_record_id)} <span class="ext-icon">↗</span></a>`
              : `<span class="record-id-text">${escapeHtml(ev.source_record_id)}</span>`;
          }).join('')}</div>`
        : '<div class="record-none-muted">일치하는 KCI 레코드 없음 (0건)</div>'}
    </div>`;
}

function renderHumanReviewCallout(item) {
  if (item.status === 'VERIFIED') {
    return `
      <div class="ev-block">
        <div class="ev-label">사람 검토 신호</div>
        <div class="callout callout-ok">
          <strong>필요 시 원문 확인</strong>
          핵심 서지정보가 KCI 레코드와 일치합니다. 일반적인 학술 검토 수준이면 충분합니다.
        </div>
      </div>`;
  }
  if (item.status === 'METADATA_DRIFT') {
    return `
      <div class="ev-block">
        <div class="ev-label">사람 검토 신호</div>
        <div class="callout callout-drift">
          <strong>서지정보 확인 권장</strong>
          논문 식별은 확인되었으나 연도·저자 등 서지정보가 다릅니다. 출판본(학술지 수록 연도)과 프리프린트 연도 차이인지 직접 확인하세요.
        </div>
      </div>`;
  }
  if (item.status === 'CHIMERA' || item.status === 'REVIEW_REQUIRED') {
    return `
      <div class="ev-block">
        <div class="ev-label">사람 검토 신호</div>
        <div class="callout callout-review">
          <strong>사람 검토 필요</strong>
          하나의 레코드로 수렴하지 않거나 복수 논문의 정보가 섞인 의심 인용입니다. 연구자가 원래 인용하려던 실제 논문을 확인해야 합니다.
        </div>
      </div>`;
  }
  if (item.status === 'NOT_FOUND_IN_KCI') {
    return `
      <div class="ev-block">
        <div class="ev-label">사람 검토 신호</div>
        <div class="callout callout-notfound">
          <strong>색인 범위 확인 권장</strong>
          KCI에서 검색되지 않았습니다. 이것이 허위 인용을 의미하지는 않으므로, 해외 학술지(IEEE, SSRN, arXiv 등) 또는 타 색인 DB를 확인하세요.
        </div>
      </div>`;
  }
  return '';
}

function renderProvenance(item) {
  const isSystem = item.kind === 'SYSTEM_FAILURE';
  const rows = isSystem
    ? [
      ['failure_id', item.failure_id],
      ['system_state', item.system_state],
      ['operation', item.operation],
      ['research_finding_emitted', String(item.research_finding_emitted)],
      ['retry_recommended', String(item.retry_recommended)],
    ]
    : [
      ['rule_id', item.rule_id],
      ['rule_version', item.rule_version],
      ['finding_id', item.finding_id],
    ];

  const evidenceHtml = (item.evidence || []).map(ev => `
    <dl class="prov-grid">
      ${[
        ['evidence_id', ev.evidence_id],
        ['source', `${ev.source_system || ''} · ${ev.evidence_type || ''}`],
        ['source_record_id', ev.source_record_id],
        ['retrieved_at', ev.retrieved_at],
        ['normalized_content_sha256', ev.normalized_content_sha256],
        ['redacted_snapshot_sha256', ev.redacted_snapshot_sha256],
      ].filter(([, value]) => value).map(([key, value]) => `<div><dt>${key}</dt><dd>${escapeHtml(value)}</dd></div>`).join('')}
    </dl>`).join('');

  return `
    <details class="provenance">
      <summary>상세 근거 보기 <span class="muted">규칙 ID · 타임스탬프 · SHA-256 해시 · 원본 JSON</span></summary>
      <div class="prov-body">
        <dl class="prov-grid">${rows.map(([key, value]) => `<div><dt>${key}</dt><dd>${escapeHtml(value)}</dd></div>`).join('')}</dl>
        ${evidenceHtml ? `<div class="prov-sub">근거 스냅샷</div>${evidenceHtml}` : ''}
        ${item.limitations?.length ? `<div class="prov-sub">검증 한계 및 경계</div><ul class="prov-list">${item.limitations.map(lim => `<li>${escapeHtml(lim)}</li>`).join('')}</ul>` : ''}
        ${item.fixture_notice ? `<div class="prov-sub">예시 데이터 안내</div><p class="prov-note">${escapeHtml(item.fixture_notice)}</p>` : ''}
        <div class="prov-sub prov-sub-row">원본 JSON 스냅샷 <button class="btn btn-ghost btn-sm" type="button" data-action="copy-json">JSON 복사</button></div>
        <pre class="json-view"><code>${escapeHtml(JSON.stringify(item, null, 2))}</code></pre>
      </div>
    </details>`;
}

function formatValue(value) {
  if (value === null || value === undefined || value === '') return '(없음)';
  if (Array.isArray(value)) return value.map(formatValue).join(', ');
  if (typeof value === 'object') return JSON.stringify(value);
  return String(value);
}

function escapeHtml(str) {
  if (str === null || str === undefined) return '';
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

/* ------------------------------------------------------------------ init */

function init() {
  el.auditForm.addEventListener('submit', submitLiveAudit);
  el.btnLoadDemo.addEventListener('click', () => setMode('DEMO'));
  el.btnFillExample.addEventListener('click', () => {
    el.auditTitle.value = EXAMPLE_CITATION.title;
    el.auditYear.value = EXAMPLE_CITATION.publication_year;
    el.auditAuthors.value = '';
    el.auditDoi.value = '';
    el.auditTitle.focus();
  });
  el.modeButtons.forEach(btn => btn.addEventListener('click', () => setMode(btn.dataset.mode)));
  window.addEventListener('hashchange', applyRoute);
  applyRoute();
}

document.addEventListener('DOMContentLoaded', init);
