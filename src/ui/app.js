/**
 * TrustVerify Research — UI controller
 * Renders backend findings only. The frontend never computes verdicts or field results:
 * status, system_state, field_comparisons and reason are displayed exactly as returned.
 * Contracts: schemas/citation-finding.schema.json (RESEARCH_FINDING),
 *            schemas/system-failure.schema.json (SYSTEM_FAILURE)
 */

// Korean display labels for backend status codes (labels only, no decision logic).
const STATUS_LABELS = {
  VERIFIED: {
    ko: '검증됨', tone: 'verified',
    meaning: '입력한 인용 정보가 KCI 레코드와 일치합니다.',
  },
  METADATA_DRIFT: {
    ko: '정보 불일치', tone: 'drift',
    meaning: '같은 논문으로 확인되었지만, 일부 서지정보(연도·저자·DOI 등)가 KCI 레코드와 다릅니다.',
  },
  REVIEW_REQUIRED: {
    ko: '추가 검토 필요', tone: 'review',
    meaning: 'KCI 근거만으로는 하나의 논문으로 확정할 수 없어 사람의 확인이 필요합니다.',
  },
  CHIMERA: {
    ko: '혼합 인용 의심', tone: 'review',
    meaning: '하나의 인용에 서로 다른 KCI 레코드의 정보가 섞여 있을 수 있습니다.',
  },
  NOT_FOUND_IN_KCI: {
    ko: 'KCI에서 미발견', tone: 'notfound',
    meaning: 'KCI는 정상 응답했지만 일치하는 레코드가 0건입니다. 가짜 논문이라는 뜻이 아니라 KCI 색인에서 찾지 못했다는 뜻입니다.',
  },
};

const SYSTEM_LABELS = {
  KCI_UNAVAILABLE: 'KCI 연결 오류',
  KCI_AUTH_FAILED: 'KCI 인증 오류',
  KCI_INVALID_RESPONSE: 'KCI 응답 오류',
  KCI_PARSE_FAILED: 'KCI 응답 해석 오류',
};
const SYSTEM_MEANING = '시스템 문제로 KCI 조회를 완료하지 못했습니다. 인용 오류가 아니며, 이 인용에 대해서는 어떤 판정도 내리지 않았습니다.';

const FIELD_LABELS = {
  title: '제목', authors: '저자', publication_year: '연도', doi: 'DOI', record_identity: '레코드 식별',
};
const RESULT_LABELS = {
  MATCH: ['일치', 'ok'],
  MISMATCH: ['불일치', 'warn'],
  UNKNOWN: ['확인 불가', 'muted'],
  MULTI_RECORD: ['복수 레코드', 'warn'],
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

const EXAMPLE_CITATION = {
  title: 'Computer Vision-based Basketball Player Training System',
  publication_year: '2024',
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
  el.liveInputArea.hidden = !isLive;
  el.draftContainer.hidden = isLive;
  el.leftTitle.textContent = isLive ? '연구 초안 · 입력 인용' : '연구 초안';
  el.leftHint.textContent = isLive ? '검증할 인용 1건을 입력하세요' : '인용 번호를 누르면 결과가 연결됩니다';
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
    return { ko: SYSTEM_LABELS[item.system_state] || 'KCI 시스템 오류', code: item.system_state, tone: 'system', meaning: SYSTEM_MEANING };
  }
  const label = STATUS_LABELS[item.status] || { ko: item.status, tone: 'review', meaning: '' };
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
  if (input?.title) return { title: input.title, year: input.publication_year };
  if (item.kind === 'SYSTEM_FAILURE') return { title: display.citation_marker ? `예시 인용 ${display.citation_marker} 조회 시도` : 'KCI 조회 시도', year: null };
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
    <div class="demo-notice">예시 원고입니다. 실제 연구물이 아닙니다.</div>
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
          <p class="empty-text">왼쪽에 논문 제목을 입력하고 <strong>KCI에서 검증</strong>을 누르세요.<br>예시 결과를 먼저 보려면 데모를 여세요.</p>
          <button class="btn btn-ghost" data-action="demo">데모 보기</button>
        </div>`
      : '<div class="empty-state"><div class="empty-title">예시 결과가 없습니다</div></div>';
    el.findingsContainer.querySelector('[data-action="demo"]')?.addEventListener('click', () => setMode('DEMO'));
    return;
  }

  const filter = FILTERS.find(f => f.key === state.filter) || FILTERS[0];
  const visible = entries.filter(entry => filter.match(findingOf(entry)));
  const research = visible.filter(entry => findingOf(entry).kind !== 'SYSTEM_FAILURE');
  const system = visible.filter(entry => findingOf(entry).kind === 'SYSTEM_FAILURE');

  let html = research.map(renderFindingCard).join('');
  if (system.length) {
    html += `<div class="system-divider"><span>시스템 상태 · 인용 판정 아님</span></div>`;
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
  return `
    <article class="result-card ${isSystem ? 'is-system' : `tone-${statusView(item).tone}`} ${selected}" data-item-id="${escapeHtml(id)}" role="button" tabindex="0">
      <div class="card-top">${statusBadge(item)}${marker}</div>
      <div class="card-title">${escapeHtml(title)}${year ? ` <span class="muted">(${escapeHtml(year)})</span>` : ''}</div>
      <div class="card-meaning">${escapeHtml(statusView(item).meaning)}</div>
      <div class="card-foot">
        ${isSystem
          ? `<span>재시도 ${item.retry_recommended ? '권장' : '불필요'}</span>`
          : `<span>${recordId ? `KCI ${escapeHtml(recordId)}` : 'KCI 레코드 없음'}</span><span>${item.human_review_required ? '사람 검토 권장' : '추가 조치 불필요'}</span>`}
      </div>
    </article>`;
}

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
  const { title, year } = citationTitleOf(entry);

  let html = `
    <div class="ev-head tone-${view.tone}">
      <div class="ev-head-row">
        ${statusBadge(item, 'lg')}
        <span class="origin-badge ${mode.toLowerCase()}">${originBadgeText(mode)}</span>
      </div>
      <p class="ev-meaning">${escapeHtml(view.meaning)}</p>
    </div>

    <div class="ev-block">
      <div class="ev-label">대상 인용</div>
      <div class="ev-citation">${escapeHtml(title)}${year ? ` <span class="muted">(${escapeHtml(year)})</span>` : ''}</div>
    </div>

    <div class="ev-block">
      <div class="ev-label">판정 이유 <span class="muted">· 시스템 원문</span></div>
      <p class="ev-reason">${escapeHtml(item.reason)}</p>
    </div>`;

  if (isSystem) {
    html += `
      <div class="callout callout-system">
        <strong>인용 오류가 아닙니다.</strong>
        KCI 조회가 ${escapeHtml(item.operation)} 단계에서 완료되지 않았습니다. 연결이 복구되기 전까지 이 인용은 검증도, 반박도 하지 않습니다.
        ${item.retry_recommended ? '<div class="callout-action">잠시 후 다시 시도하세요.</div>' : ''}
      </div>`;
  } else {
    html += renderComparisonTable(item);
    html += renderRecordIds(item);
    html += item.human_review_required
      ? '<div class="callout callout-review"><strong>사람 검토 권장</strong> 원문 PDF나 KCI 상세 페이지에서 저자·연도·서지정보를 직접 확인하세요.</div>'
      : '<div class="callout callout-ok"><strong>추가 조치 불필요</strong> 서지정보가 KCI 레코드와 일치합니다. 일반적인 검토 수준이면 충분합니다.</div>';
  }

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

function renderComparisonTable(item) {
  const rows = item.field_comparisons || [];
  if (!rows.length) return '';
  return `
    <div class="ev-block">
      <div class="ev-label">항목별 비교</div>
      <table class="compare-table">
        <thead><tr><th>항목</th><th>입력한 값</th><th>KCI 기록</th><th>결과</th></tr></thead>
        <tbody>
          ${rows.map(row => {
            const [label, tone] = RESULT_LABELS[row.result] || [row.result, 'muted'];
            return `<tr class="${tone === 'warn' ? 'row-warn' : ''}">
              <th scope="row">${escapeHtml(FIELD_LABELS[row.field] || row.field)}</th>
              <td>${escapeHtml(formatValue(row.input_value))}</td>
              <td>${escapeHtml(formatValue(row.evidence_value))}</td>
              <td><span class="result-tag rt-${tone}" title="${escapeHtml(row.result)}">${escapeHtml(label)}</span></td>
            </tr>`;
          }).join('')}
        </tbody>
      </table>
    </div>`;
}

function renderRecordIds(item) {
  const records = (item.evidence || []).filter(ev => ev.source_record_id);
  return `
    <div class="ev-block">
      <div class="ev-label">KCI 레코드</div>
      ${records.length
        ? `<div class="record-list">${records.map(ev => {
            const url = `https://www.kci.go.kr/kciportal/ci/sereArticleSearch/ciSereArtiView.kci?sereArticleSearchBean.artiId=${encodeURIComponent(ev.source_record_id)}`;
            return /^ART\d+$/.test(ev.source_record_id)
              ? `<a class="record-id" href="${escapeHtml(url)}" target="_blank" rel="noopener">${escapeHtml(ev.source_record_id)} ↗</a>`
              : `<span class="record-id">${escapeHtml(ev.source_record_id)}</span>`;
          }).join('')}</div>`
        : '<div class="muted">일치하는 KCI 레코드 없음</div>'}
    </div>`;
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
      <summary>상세 근거 보기 <span class="muted">규칙 · 타임스탬프 · 해시 · 원본 JSON</span></summary>
      <div class="prov-body">
        <dl class="prov-grid">${rows.map(([key, value]) => `<div><dt>${key}</dt><dd>${escapeHtml(value)}</dd></div>`).join('')}</dl>
        ${evidenceHtml ? `<div class="prov-sub">근거 스냅샷</div>${evidenceHtml}` : ''}
        ${item.limitations?.length ? `<div class="prov-sub">한계</div><ul class="prov-list">${item.limitations.map(lim => `<li>${escapeHtml(lim)}</li>`).join('')}</ul>` : ''}
        ${item.fixture_notice ? `<div class="prov-sub">예시 데이터 안내</div><p class="prov-note">${escapeHtml(item.fixture_notice)}</p>` : ''}
        <div class="prov-sub prov-sub-row">원본 JSON <button class="btn btn-ghost btn-sm" type="button" data-action="copy-json">JSON 복사</button></div>
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
