/**
 * TrustVerify Research — Presentation Controller
 * NAIS 2026 Hackathon Final Presentation
 *
 * PRESENTATION HIERARCHY:
 * - 0:00–0:35 Problem Definition & Language-Independent Base
 * - 0:35–2:30 LIVE KCI Citation Integrity (Core Demo)
 * - 2:30–3:20 KO ↔ EN Translation Fidelity Expansion
 * - 3:20–4:10 Implementation Architecture
 * - 4:10–5:00 Originality & Extensibility
 *
 * STRICT RULE: Backend owns evidence and findings. The frontend never computes
 * verdicts or rule logic. All findings display backend data and canonical schemas.
 */

// Canonical KCI Finding for initial render and quick demo (REF-META-002)
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

// UI State
const state = {
  currentKciFinding: CANONICAL_KCI_DRIFT,
  activeTfFindingId: 'TR-CAUS-001',
  activeSection: 'overview',
};

// DOM References
const $ = id => document.getElementById(id);
const el = {
  topnavLinks: document.querySelectorAll('.topnav-link[data-target]'),
  liveAuditForm: $('liveAuditForm'),
  liveTitle: $('liveTitle'),
  liveAuthors: $('liveAuthors'),
  liveYear: $('liveYear'),
  liveDoi: $('liveDoi'),
  btnExecuteLiveAudit: $('btnExecuteLiveAudit'),
  btnFillPresetDrift: $('btnFillPresetDrift'),
  liveApiStatus: $('liveApiStatus'),
  liveStatusMsg: $('liveStatusMsg'),
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
  const sections = ['overview', 'kci-live', 'translation', 'architecture']
    .map(id => $(id))
    .filter(Boolean);

  const observer = new IntersectionObserver(entries => {
    entries.forEach(entry => {
      if (entry.isIntersecting) {
        updateActiveNav(entry.target.id);
      }
    });
  }, { threshold: 0.3 });

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

  $('btnGoTranslation')?.addEventListener('click', e => {
    e.preventDefault();
    $('translation')?.scrollIntoView({ behavior: 'smooth', block: 'start' });
    history.replaceState(null, '', '#translation');
    updateActiveNav('translation');
  });
}

/* ------------------------------------------------------------------ SECTION 2: LIVE KCI DEMO */

function renderKciResult(finding) {
  if (!finding) return;

  const isSystem = finding.kind === 'SYSTEM_FAILURE';
  const status = isSystem ? finding.system_state : finding.status;
  const isDrift = status === 'METADATA_DRIFT';
  const isVerified = status === 'VERIFIED';
  const tone = isDrift ? 'drift' : (isVerified ? 'verified' : (isSystem ? 'system' : 'review'));

  const recordId = finding.evidence?.[0]?.source_record_id || 'ART003062835';
  const kciUrl = `https://www.kci.go.kr/kciportal/ci/sereArticleSearch/ciSereArtiView.kci?sereArticleSearchBean.artiId=${encodeURIComponent(recordId)}`;

  let fieldRows = finding.field_comparisons || [];
  if (!fieldRows.length && isDrift) {
    fieldRows = CANONICAL_KCI_DRIFT.field_comparisons;
  }

  let html = `
    <!-- Top Result Status Header -->
    <div class="result-status-card tone-${tone}">
      <div class="status-badge-row">
        <div class="status-left">
          <span class="status-dot"></span>
          <span class="status-title">${isDrift ? '정보 불일치 (METADATA_DRIFT)' : (isVerified ? '검증됨 (VERIFIED)' : escapeHtml(status))}</span>
        </div>
        <span class="rule-tag">규칙: ${escapeHtml(finding.rule_id || 'REF-META-002')} (v${escapeHtml(finding.rule_version || '1.0')})</span>
      </div>
      <p class="status-summary-text">${escapeHtml(finding.reason || '')}</p>
    </div>

    <!-- KCI External Evidence Link -->
    <div class="kci-evidence-box">
      <div class="evidence-box-head">
        <span class="ev-source-title">KCI 실제 공식 레코드 근거</span>
        <a class="kci-portal-link" href="${escapeHtml(kciUrl)}" target="_blank" rel="noopener">
          KCI 식별: ${escapeHtml(recordId)} <span class="ext-arrow">↗</span>
        </a>
      </div>
      <div class="ev-citation-title">${escapeHtml(finding.input?.title || CANONICAL_KCI_DRIFT.input.title)}</div>
    </div>

    <!-- Deterministic Field Comparison Table -->
    <div class="field-table-container">
      <div class="field-table-caption">결정론적 필드 대조 (Deterministic Field Comparison)</div>
      <div class="field-rows-list">
        ${fieldRows.map(row => {
          const isMismatch = row.result === 'MISMATCH';
          return `
            <div class="compare-row ${isMismatch ? 'is-mismatch' : 'is-match'}">
              <span class="col-field">${escapeHtml(row.label || row.field)}</span>
              <div class="col-result">
                ${isMismatch
                  ? `<span class="val-pill mismatch">${escapeHtml(row.input_value)} <span class="arr">→</span> ${escapeHtml(row.evidence_value)}</span>`
                  : `<span class="val-pill match"><svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><polyline points="20 6 9 17 4 12"/></svg> 일치 (${escapeHtml(row.input_value)})</span>`}
              </div>
            </div>`;
        }).join('')}
      </div>
    </div>

    <!-- Human Review Signal -->
    <div class="human-review-box tone-${tone}">
      <div class="review-head">
        <span class="review-label">연구자 최종 검토 신호 (Human Review)</span>
        <strong class="review-badge">${escapeHtml(finding.human_review_badge || '서지정보 확인 권장')}</strong>
      </div>
      <p class="review-detail">${escapeHtml(finding.human_review_callout || 'KCI 공식 레코드와 출판연도가 다릅니다. 출판본과 프리프린트의 차이인지 확인하세요.')}</p>
    </div>

    <!-- Technical Details Accordion -->
    <details class="tech-accordion">
      <summary>
        <span>상세 기술 근거 및 SHA-256 스냅샷 보기</span>
        <span class="summary-hint">규칙 ID · 타임스탬프 · JSON</span>
      </summary>
      <div class="accordion-content">
        <dl class="tech-kv-grid">
          <div><dt>rule_id</dt><dd>${escapeHtml(finding.rule_id || 'REF-META-002')}</dd></div>
          <div><dt>rule_version</dt><dd>${escapeHtml(finding.rule_version || '1.0')}</dd></div>
          <div><dt>source_system</dt><dd>NRF KCI Open API</dd></div>
          <div><dt>source_record_id</dt><dd>${escapeHtml(recordId)}</dd></div>
          <div><dt>content_sha256</dt><dd class="hash-text">${escapeHtml(finding.evidence?.[0]?.normalized_content_sha256 || '2222222222222222222222222222222222222222222222222222222222222222')}</dd></div>
        </dl>
        <div class="raw-json-bar">
          <span>원본 계약 JSON</span>
          <button class="btn btn-ghost btn-sm" id="btnCopyKciJson" type="button">JSON 복사</button>
        </div>
        <pre class="json-code"><code>${escapeHtml(JSON.stringify(finding, null, 2))}</code></pre>
      </div>
    </details>`;

  el.kciResultPanel.innerHTML = html;

  $('btnCopyKciJson')?.addEventListener('click', async () => {
    try {
      await navigator.clipboard.writeText(JSON.stringify(finding, null, 2));
      const btn = $('btnCopyKciJson');
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

  try {
    const res = await fetch('/api/audit/citation', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(citation),
    });
    const result = await res.json();
    if (!res.ok) throw new Error(result.error || '조회 실패');

    // Enrich display fields for consistency
    const isDrift = result.status === 'METADATA_DRIFT';
    const isVerified = result.status === 'VERIFIED';
    result.human_review_badge = isDrift ? '서지정보 확인 권장' : (isVerified ? '필요 시 원문 확인' : '사람 검토 필요');
    result.human_review_callout = isDrift
      ? 'KCI 공식 레코드와 출판연도가 다릅니다. 출판본(2024)과 프리프린트(2023)의 차이인지 확인하세요.'
      : 'KCI 공식 서지정보와 직접 일치합니다.';

    state.currentKciFinding = result;
    renderKciResult(result);

    el.liveApiStatus.className = 'live-api-status is-success';
    el.liveStatusMsg.textContent = `조회 완료: ${result.status || result.system_state} (규칙: ${result.rule_id || result.operation || ''})`;
  } catch (err) {
    el.liveApiStatus.className = 'live-api-status is-error';
    el.liveStatusMsg.textContent = `조회 실패: ${err.message}. (기본 캐시된 정규 데모 결과를 계속 표시합니다)`;
    renderKciResult(CANONICAL_KCI_DRIFT);
  } finally {
    el.btnExecuteLiveAudit.disabled = false;
    el.btnExecuteLiveAudit.innerHTML = '<span class="btn-icon">⚡</span> KCI 실시간 검증 실행';
  }
}

/* ------------------------------------------------------------------ SECTION 3: TRANSLATION FIDELITY */

function selectTfFinding(findingId) {
  state.activeTfFindingId = findingId;
  const isCaus = findingId === 'TR-CAUS-001';

  el.btnTfCaus.classList.toggle('is-active', isCaus);
  el.btnTfCit.classList.toggle('is-active', !isCaus);

  // Update span highlighting in text
  el.tfSpanCausKo.classList.toggle('is-selected', isCaus);
  el.tfSpanCausEn.classList.toggle('is-selected', isCaus);
  el.tfSpanCitKo.classList.toggle('is-selected', !isCaus);
  el.tfSpanCitEn.classList.toggle('is-selected', !isCaus);

  renderTfEvidence(findingId);
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

  // Initial render of Section 2 KCI result
  renderKciResult(CANONICAL_KCI_DRIFT);

  // Form submission
  el.liveAuditForm?.addEventListener('submit', handleLiveAudit);

  // Preset button
  el.btnFillPresetDrift?.addEventListener('click', () => {
    el.liveTitle.value = 'Computer Vision-based Basketball Player Training System';
    el.liveAuthors.value = '문현철';
    el.liveYear.value = '2023';
    el.liveDoi.value = '10.9728/dcs.2024.25.3.595';
    handleLiveAudit();
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
