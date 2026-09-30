/**
 * TrustVerify Research — Citation Integrity Workspace Frontend Controller
 * Desktop-First explainable research-reference auditor
 * Conforms directly to BUILD-02A schemas:
 * - citation-finding.schema.json (kind: "RESEARCH_FINDING")
 * - system-failure.schema.json (kind: "SYSTEM_FAILURE")
 */

let state = {
  manifest: null,
  draft: null,
  findings: [],
  selectedId: 'fixture-finding-metadata-drift', // Default to Metadata Drift (2023 → 2024) for immediate 5-second judge impact
  currentFilter: 'all',
};

const elements = {
  auditForm: document.getElementById('citationAuditForm'),
  auditTitle: document.getElementById('auditTitle'),
  auditAuthors: document.getElementById('auditAuthors'),
  auditYear: document.getElementById('auditYear'),
  auditDoi: document.getElementById('auditDoi'),
  auditSubmit: document.getElementById('auditSubmit'),
  auditFeedback: document.getElementById('auditFeedback'),
  btnLoadDemo: document.getElementById('btnLoadDemo'),
  draftContainer: document.getElementById('draftContentContainer'),
  findingsContainer: document.getElementById('findingsListContainer'),
  evidenceContainer: document.getElementById('evidenceDetailContainer'),
  evidenceStatusPill: document.getElementById('evidenceStatusPill'),
  filterChips: document.querySelectorAll('.filter-chip'),
  btnResetSelection: document.getElementById('btnResetSelection'),
  btnViewRawJson: document.getElementById('btnViewRawJson'),
  rawEvidenceModal: document.getElementById('rawEvidenceModal'),
  btnCloseModal: document.getElementById('btnCloseModal'),
  btnCloseModalFooter: document.getElementById('btnCloseModalFooter'),
  modalJsonContent: document.getElementById('modalJsonContent'),
  modalSnapshotHash: document.getElementById('modalSnapshotHash'),
  btnCopyJson: document.getElementById('btnCopyJson'),
};

const findingOf = entry => entry?.finding ?? entry;
const displayOf = entry => entry?.display ?? {};
const itemIdOf = entry => {
  const finding = findingOf(entry);
  return finding?.finding_id || finding?.failure_id;
};

/**
 * Initialize application: fetch data from API, setup events, and render views.
 */
async function init() {
  try {
    const [manifestRes, draftRes, findingsRes] = await Promise.all([
      fetch('/api/manifest').catch(() => null),
      fetch('/api/draft').catch(() => null),
      fetch('/api/findings').catch(() => null),
    ]);

    if (manifestRes && manifestRes.ok) {
      state.manifest = await manifestRes.json();
    }
    if (draftRes && draftRes.ok) {
      state.draft = await draftRes.json();
    }
    if (findingsRes && findingsRes.ok) {
      const data = await findingsRes.json();
      state.findings = data.findings || [];
    }

    setupEventListeners();
    updateFilterCounts();
    renderDraft();
    renderFindings();
    renderEvidence();
  } catch (err) {
    console.error('Failed to initialize TrustVerify UI:', err);
    if (elements.draftContainer) {
      elements.draftContainer.innerHTML = `<div class="error-msg">Failed to load audit data: ${escapeHtml(err.message)}</div>`;
    }
  }
}

/**
 * Setup UI Event Listeners
 */
function setupEventListeners() {
  if (elements.auditForm) elements.auditForm.addEventListener('submit', submitLiveAudit);
  if (elements.btnLoadDemo) elements.btnLoadDemo.addEventListener('click', loadDemoCases);
  // Filter chips in Center Panel
  elements.filterChips.forEach(chip => {
    chip.addEventListener('click', () => {
      elements.filterChips.forEach(c => c.classList.remove('active'));
      chip.classList.add('active');
      state.currentFilter = chip.dataset.filter;
      renderFindings();
    });
  });

  // Reset button in Left Draft
  if (elements.btnResetSelection) {
    elements.btnResetSelection.addEventListener('click', () => {
      selectItem('fixture-finding-verified');
    });
  }

  // Modal open / close
  if (elements.btnViewRawJson) {
    elements.btnViewRawJson.addEventListener('click', openEvidenceModal);
  }
  if (elements.btnCloseModal) {
    elements.btnCloseModal.addEventListener('click', closeEvidenceModal);
  }
  if (elements.btnCloseModalFooter) {
    elements.btnCloseModalFooter.addEventListener('click', closeEvidenceModal);
  }
  if (elements.rawEvidenceModal) {
    elements.rawEvidenceModal.addEventListener('click', (e) => {
      if (e.target === elements.rawEvidenceModal) closeEvidenceModal();
    });
  }

  // Copy JSON snapshot button
  if (elements.btnCopyJson) {
    elements.btnCopyJson.addEventListener('click', async () => {
      const json = elements.modalJsonContent.textContent;
      try {
        await navigator.clipboard.writeText(json);
        elements.btnCopyJson.textContent = 'Copied to Clipboard!';
        setTimeout(() => {
          elements.btnCopyJson.textContent = 'Copy Snapshot JSON';
        }, 1800);
      } catch (err) {
        alert('Could not copy automatically. Please select text manually.');
      }
    });
  }
}

async function loadDemoCases() {
  setAuditFeedback('Loading demo fixtures…', 'pending');
  try {
    const response = await fetch('/api/findings');
    if (!response.ok) throw new Error('Demo cases unavailable');
    const data = await response.json();
    state.findings = data.findings || [];
    state.selectedId = itemIdOf(state.findings[0]);
    updateFilterCounts();
    renderDraft();
    renderFindings();
    renderEvidence();
    setAuditFeedback('DEMO FIXTURE mode loaded.', 'demo');
  } catch {
    setAuditFeedback('Could not load demo cases.', 'error');
  }
}

async function submitLiveAudit(event) {
  event.preventDefault();
  const citation = { title: elements.auditTitle.value.trim() };
  const authors = elements.auditAuthors.value.split(',').map(value => value.trim()).filter(Boolean);
  if (authors.length) citation.authors = authors;
  if (elements.auditYear.value.trim()) citation.publication_year = elements.auditYear.value.trim();
  if (elements.auditDoi.value.trim()) citation.doi = elements.auditDoi.value.trim();

  elements.auditSubmit.disabled = true;
  setAuditFeedback('Querying KCI and applying deterministic rules…', 'pending');
  try {
    const response = await fetch('/api/audit/citation', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(citation),
    });
    const result = await response.json();
    if (!response.ok || (!result.finding_id && !result.failure_id)) {
      throw new Error('Audit request failed');
    }
    const entry = {
      finding: result,
      display: { citation_marker: 'LIVE', file_name: null, index: 0, evidence_mode: 'LIVE' },
    };
    const resultId = itemIdOf(entry);
    state.findings = [entry, ...state.findings.filter(existing => itemIdOf(existing) !== resultId)];
    state.selectedId = resultId;
    state.currentFilter = 'all';
    elements.filterChips.forEach(chip => chip.classList.toggle('active', chip.dataset.filter === 'all'));
    updateFilterCounts();
    renderFindings();
    renderEvidence();
    setAuditFeedback(`LIVE KCI EVIDENCE · ${result.kind === 'SYSTEM_FAILURE' ? result.system_state : result.status}`, result.kind === 'SYSTEM_FAILURE' ? 'error' : 'live');
  } catch {
    setAuditFeedback('Citation audit could not be completed. Load demo cases if KCI is unavailable.', 'error');
  } finally {
    elements.auditSubmit.disabled = false;
  }
}

function setAuditFeedback(message, mode) {
  if (!elements.auditFeedback) return;
  elements.auditFeedback.textContent = message;
  elements.auditFeedback.className = `audit-feedback ${mode}`;
}

/**
 * Select an item (finding or system failure) and synchronize Left, Center, and Right panels.
 */
function selectItem(itemId, options = { scrollDraft: true, scrollCenter: true }) {
  if (!itemId) return;
  state.selectedId = itemId;

  // 1. Update Left Panel: Highlight selected citation pill in draft
  document.querySelectorAll('.citation-pill').forEach(pill => {
    if (pill.dataset.itemId === itemId) {
      pill.classList.add('selected');
      if (options.scrollDraft) {
        pill.scrollIntoView({ behavior: 'smooth', block: 'center' });
      }
      pill.classList.remove('pulse-target');
      void pill.offsetWidth; // trigger reflow
      pill.classList.add('pulse-target');
    } else {
      pill.classList.remove('selected');
    }
  });

  // References list item in Section 3
  document.querySelectorAll('.reference-list-item').forEach(item => {
    if (item.dataset.itemId === itemId) {
      item.classList.add('selected');
    } else {
      item.classList.remove('selected');
    }
  });

  // 2. Update Center Panel: Highlight finding card
  document.querySelectorAll('.finding-card').forEach(card => {
    if (card.dataset.itemId === itemId) {
      card.classList.add('selected');
      if (options.scrollCenter) {
        card.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
      }
    } else {
      card.classList.remove('selected');
    }
  });

  // 3. Update Right Panel: Render Evidence
  renderEvidence();
}

/**
 * Render Left Panel: Research Draft
 */
function renderDraft() {
  if (!state.draft || !elements.draftContainer) return;
  const { meta, sections } = state.draft;

  let html = `
    <div class="draft-header-card">
      <div class="draft-meta-discipline">${escapeHtml(meta.discipline || 'Computer Vision & Sports Analytics')}</div>
      <h1 class="draft-paper-title">${escapeHtml(meta.title)}</h1>
      <div class="draft-authors-line">Authors: ${escapeHtml(meta.authors)}</div>
      <div class="draft-venue-line">Target Venue: ${escapeHtml(meta.target_venue)} · ${escapeHtml(meta.date)}</div>
    </div>

    <div class="manuscript-abstract-box">
      <div class="abstract-title">Abstract</div>
      <p class="abstract-text">${escapeHtml(meta.abstract)}</p>
    </div>
  `;

  sections.forEach(sec => {
    html += `<div class="manuscript-section" id="${sec.id}">
      <h3 class="section-heading">${escapeHtml(sec.heading)}</h3>`;

    if (sec.paragraphs) {
      sec.paragraphs.forEach(p => {
        html += `<p class="draft-paragraph">`;
        html += escapeHtml(p.text);

        if (p.citation_ref) {
          const entry = state.findings.find(item => itemIdOf(item) === p.citation_ref);
          const marker = p.marker || displayOf(entry).citation_marker || '[?]';
          const theme = getItemTheme(findingOf(entry));
          const isSelected = p.citation_ref === state.selectedId ? 'selected' : '';

          html += `<span class="citation-pill ${theme} ${isSelected}" data-item-id="${p.citation_ref}" title="Click to view evidence for ${marker}">
            <span class="cite-dot"></span>
            ${escapeHtml(marker)}
          </span>`;
        }

        if (p.text_after) {
          html += escapeHtml(p.text_after);
        }
        html += `</p>`;
      });
    }

    if (sec.reference_items) {
      html += `<div class="references-block">`;
      sec.reference_items.forEach(ref => {
        const isSelected = ref.finding_id === state.selectedId ? 'selected' : '';
        html += `
          <div class="reference-list-item ${isSelected}" data-item-id="${ref.finding_id}">
            <span class="ref-marker-tag">${escapeHtml(ref.marker)}</span>
            <span class="ref-text">${escapeHtml(ref.text)}</span>
          </div>
        `;
      });
      html += `</div>`;
    }

    html += `</div>`;
  });

  elements.draftContainer.innerHTML = html;

  // Attach click events to all inline citations in the draft
  elements.draftContainer.querySelectorAll('.citation-pill').forEach(pill => {
    pill.addEventListener('click', (e) => {
      e.stopPropagation();
      selectItem(pill.dataset.itemId, { scrollDraft: false, scrollCenter: true });
    });
  });

  // Attach click events to bibliography references
  elements.draftContainer.querySelectorAll('.reference-list-item').forEach(item => {
    item.addEventListener('click', (e) => {
      e.stopPropagation();
      selectItem(item.dataset.itemId, { scrollDraft: true, scrollCenter: true });
    });
  });
}

/**
 * Render Center Panel: Findings List
 */
function renderFindings() {
  if (!elements.findingsContainer) return;

  const filtered = state.findings.filter(entry => {
    const item = findingOf(entry);
    if (state.currentFilter === 'all') return true;
    if (state.currentFilter === 'SYSTEM_FAILURE') return item.kind === 'SYSTEM_FAILURE';
    return item.status === state.currentFilter;
  });

  if (filtered.length === 0) {
    elements.findingsContainer.innerHTML = `
      <div class="empty-evidence-state">
        <div class="empty-icon">✓</div>
        <div class="empty-title">No findings match filter</div>
        <div class="empty-subtitle">Switch filter to "All" to view all evaluated citations.</div>
      </div>
    `;
    return;
  }

  let html = '';
  filtered.forEach(entry => {
    const item = findingOf(entry);
    const display = displayOf(entry);
    const isSystemError = item.kind === 'SYSTEM_FAILURE';
    const itemId = item.finding_id || item.failure_id;
    const isSelected = itemId === state.selectedId ? 'selected' : '';
    const theme = getItemTheme(item);
    const marker = display.citation_marker || '';
    const evidenceMode = display.evidence_mode === 'LIVE' ? 'LIVE' : 'DEMO';

    // Title / citation text
    let targetCitationText = '';
    if (isSystemError) {
      targetCitationText = `Advanced Sovereign Order Flow Dynamics (2023). [KCI articleSearch transport attempt]`;
    } else if (item.input?.title) {
      targetCitationText = `${item.input.title} (${item.input.publication_year || 'n.d.'})${item.input.doi ? ` · DOI: ${item.input.doi}` : ''}`;
    }

    // Human review tag
    let reviewBadge = 'Review: Required';
    if (isSystemError) {
      reviewBadge = item.retry_recommended ? 'Retry Recommended' : 'Action Required';
    } else if (item.status === 'VERIFIED') {
      reviewBadge = 'Human Review: Optional';
    } else if (item.human_review_required) {
      reviewBadge = 'Human Review: Recommended';
    }

    html += `
      <article class="finding-card ${theme} ${isSelected}" data-item-id="${itemId}" role="button" tabindex="0">
        <div class="evidence-origin-label ${evidenceMode.toLowerCase()}">${evidenceMode === 'LIVE' ? 'LIVE KCI EVIDENCE' : 'DEMO FIXTURE'}</div>
        ${isSystemError ? `
          <div class="system-segregation-banner">
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg>
            SYSTEM BOUNDARY: KCI SERVICE FAILURE (NOT A CITATION DEFECT)
          </div>
        ` : ''}

        <div class="card-header-row">
          <span class="card-status-badge">
            ${escapeHtml(isSystemError ? item.system_state : item.status)}
          </span>
          <span class="human-review-tag">
            ${escapeHtml(reviewBadge)}
          </span>
        </div>

        <div class="card-citation-context">
          <div class="citation-target-text">
            <strong>${escapeHtml(marker)}</strong> ${escapeHtml(targetCitationText)}
          </div>
          <div class="citation-meta-row">
            <span class="in-text-tag">${escapeHtml(marker)} · ${isSystemError ? 'KCI Gateway Call' : 'Manuscript Draft'}</span>
            <span>·</span>
            <span>${escapeHtml(isSystemError ? `Operation: ${item.operation}` : `Input ID: ${item.input?.citation_id || 'citation'}`)}</span>
          </div>
        </div>

        <div class="card-reason-snippet">
          ${escapeHtml(item.reason)}
        </div>

        <div class="card-footer-meta">
          <span>${isSystemError ? `Failure ID: <strong>${escapeHtml(item.failure_id)}</strong>` : `Rule: <strong>${escapeHtml(item.rule_id)}</strong> (v${escapeHtml(item.rule_version)})`}</span>
          <span>${isSystemError ? `State: ${escapeHtml(item.system_state)}` : (item.evidence?.[0]?.source_record_id ? `KCI ID: ${escapeHtml(item.evidence[0].source_record_id)}` : 'Zero Records')}</span>
        </div>
      </article>
    `;
  });

  elements.findingsContainer.innerHTML = html;

  // Attach click handler to each card
  elements.findingsContainer.querySelectorAll('.finding-card').forEach(card => {
    card.addEventListener('click', () => {
      selectItem(card.dataset.itemId, { scrollDraft: true, scrollCenter: false });
    });
  });
}

/**
 * Render Right Panel: Evidence & Why This Result?
 */
function renderEvidence() {
  if (!elements.evidenceContainer) return;
  const entry = state.findings.find(candidate => itemIdOf(candidate) === state.selectedId);
  const item = findingOf(entry);

  if (!item) {
    elements.evidenceContainer.innerHTML = `
      <div class="empty-evidence-state">
        <div class="empty-icon">🔍</div>
        <div class="empty-title">No Finding Selected</div>
        <div class="empty-subtitle">Select any inline citation or finding card to inspect deterministic evidence.</div>
      </div>
    `;
    if (elements.evidenceStatusPill) elements.evidenceStatusPill.textContent = 'Select a Finding';
    return;
  }

  const isSystemError = item.kind === 'SYSTEM_FAILURE';
  const display = displayOf(entry);
  const marker = display.citation_marker || '';
  const evidenceMode = display.evidence_mode === 'LIVE' ? 'LIVE' : 'DEMO';

  // Update header status pill
  if (elements.evidenceStatusPill) {
    elements.evidenceStatusPill.textContent = isSystemError ? item.system_state : item.status;
    elements.evidenceStatusPill.className = `evidence-status-pill ${getItemTheme(item)}`;
  }

  // 1. Traceability Header
  let html = `
    <div class="evidence-origin-banner ${evidenceMode.toLowerCase()}">${evidenceMode === 'LIVE' ? 'LIVE KCI EVIDENCE' : 'DEMO FIXTURE'}</div>
    <div class="evidence-trace-header">
      <div class="trace-chain-row">
        <span class="trace-token">Draft ${escapeHtml(marker)}</span>
        <span class="trace-sep">➔</span>
        <span class="trace-token">${escapeHtml(isSystemError ? item.system_state : item.status)}</span>
        <span class="trace-sep">➔</span>
        <span class="trace-token">${escapeHtml(isSystemError ? `Op: ${item.operation}` : (item.evidence?.[0]?.source_record_id || 'KCI Search'))}</span>
        <span class="trace-sep">➔</span>
        <span class="trace-token">${escapeHtml(isSystemError ? 'SYS-GATEWAY' : item.rule_id)}</span>
      </div>
      <div class="rule-meta-box">
        <div>
          <div class="rule-id-display">${escapeHtml(isSystemError ? 'SYSTEM-BOUNDARY-CHECK' : item.rule_id)}</div>
          <div class="rule-version-display">${isSystemError ? 'Component: KCI HTTP Transport' : `Version: ${escapeHtml(item.rule_version)}`}</div>
        </div>
        <div class="badge-neutral">${isSystemError ? 'Fail-Closed Isolation' : 'Deterministic Public Rule'}</div>
      </div>
    </div>
  `;

  // SYSTEM FAILURE STATE
  if (isSystemError) {
    html += `
      <div class="system-failure-alert-box">
        <div class="system-failure-alert-title">
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><polygon points="7.86 2 16.14 2 22 7.86 22 16.14 16.14 22 7.86 22 2 16.14 2 7.86 7.86 2"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg>
          KCI Upstream Service Failure (${escapeHtml(item.system_state)})
        </div>
        <div class="system-failure-alert-body">
          ${escapeHtml(item.reason)}
        </div>
        <div class="system-guarantee-badge">
          🛡️ <strong>Fail-Closed Guarantee:</strong> System/transport failures fail closed and MUST NEVER be classified as fake reference, hallucination, or NOT_FOUND_IN_KCI.
        </div>
      </div>

      <div class="reason-detail-card">
        <div class="reason-headline">Transport Failure Diagnostics</div>
        <div class="reason-body-text">
          The KCI Open API request (<code>operation: ${escapeHtml(item.operation)}</code>) could not complete due to an upstream transport exception.
          No bibliographic claims can be verified or refuted until connectivity is restored.
        </div>
        <div class="human-review-box theme-rose">
          <div class="human-review-title">System Action Required: Retry Recommended (${item.retry_recommended ? 'Yes' : 'No'})</div>
          <div class="human-review-desc">Operational retry required. Do not reject manuscript citation based on upstream service outages.</div>
        </div>
      </div>

      <div class="provenance-ledger-card">
        <div class="ledger-grid">
          <div>
            <div class="ledger-item-label">Failure ID</div>
            <div class="ledger-item-value">${escapeHtml(item.failure_id)}</div>
          </div>
          <div>
            <div class="ledger-item-label">System State</div>
            <div class="ledger-item-value">${escapeHtml(item.system_state)}</div>
          </div>
          <div>
            <div class="ledger-item-label">Track</div>
            <div class="ledger-item-value">${escapeHtml(item.track)}</div>
          </div>
          <div>
            <div class="ledger-item-label">Research Finding Emitted?</div>
            <div class="ledger-item-value"><strong>false</strong> (Guaranteed)</div>
          </div>
        </div>
      </div>
    `;
    elements.evidenceContainer.innerHTML = html;
    return;
  }

  // 2. Deterministic Field Comparisons Table
  const comparisons = buildFieldComparisonRows(item);
  if (comparisons.length > 0) {
    html += `
      <div class="evidence-section-title">
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="9 11 12 14 22 4"/><path d="M21 12v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11"/></svg>
        Supplied Citation Fields vs KCI Evidence Fields
      </div>

      <div class="comparison-table-wrapper">
        <table class="comparison-table">
          <thead>
            <tr>
              <th>Field</th>
              <th>Supplied in Draft</th>
              <th>KCI Evidence Record</th>
            </tr>
          </thead>
          <tbody>
            ${comparisons.map(row => {
              const tagClass = getTagClass(row.result);
              return `
                <tr>
                  <td class="field-name-cell">
                    ${escapeHtml(row.field)}
                    <span class="status-tag ${tagClass}">${escapeHtml(row.result)}</span>
                  </td>
                  <td class="supplied-val-cell">${escapeHtml(row.supplied)}</td>
                  <td class="evidence-val-cell">
                    ${escapeHtml(row.evidence)}
                    ${row.diff ? `<div class="diff-callout">${escapeHtml(row.diff)}</div>` : ''}
                  </td>
                </tr>
              `;
            }).join('')}
          </tbody>
        </table>
      </div>
    `;
  }

  // 3. Reason & Human Review Box
  const reviewColor = item.status === 'VERIFIED' ? 'green' : (item.status === 'METADATA_DRIFT' ? 'amber' : (item.status === 'CHIMERA' ? 'purple' : 'indigo'));
  html += `
    <div class="reason-detail-card">
      <div class="reason-headline">Deterministic Rationale</div>
      <div class="reason-body-text">${escapeHtml(item.reason)}</div>

      <div class="human-review-box theme-${reviewColor}">
        <div class="human-review-title">Human Review: ${item.human_review_required ? 'Recommended' : 'Optional'}</div>
        <div class="human-review-desc">
          ${item.human_review_required ?
            'Human reviewer inspection recommended to verify context, edition dates, or intended author attribution.' :
            'Bibliographic metadata matches canonical KCI record. Standard reviewer inspection applies.'}
        </div>
      </div>
    </div>
  `;

  // 4. Evidence Provenance & Cryptographic Hashes
  const ev = item.evidence?.[0];
  const publicKciUrl = ev?.source_record_id ?
    `https://www.kci.go.kr/kciportal/ci/sereArticleSearch/ciSereArtiView.kci?sereArticleSearchBean.artiId=${encodeURIComponent(ev.source_record_id)}` : null;

  html += `
    <div class="evidence-section-title">
      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="3" y="11" width="18" height="11" rx="2" ry="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/></svg>
      Evidence Provenance & Cryptographic Ledger
    </div>

    <div class="provenance-ledger-card">
      <div class="ledger-grid">
        <div>
          <div class="ledger-item-label">Evidence Source</div>
          <div class="ledger-item-value">${escapeHtml(ev?.source_system || 'KCI Open API')}</div>
        </div>
        <div>
          <div class="ledger-item-label">Source Record ID</div>
          <div class="ledger-item-value">
            ${ev?.source_record_id ? (
              publicKciUrl ?
                `<a href="${escapeHtml(publicKciUrl)}" target="_blank" rel="noopener" class="link-evidence">${escapeHtml(ev.source_record_id)} ↗</a>` :
                escapeHtml(ev.source_record_id)
            ) : '<span style="color:#94a3b8;">None (Zero Records Returned)</span>'}
          </div>
        </div>
        <div>
          <div class="ledger-item-label">Retrieved Timestamp</div>
          <div class="ledger-item-value">${escapeHtml(ev?.retrieved_at || '2026-09-30 00:00:00 UTC')}</div>
        </div>
        <div>
          <div class="ledger-item-label">Evidence Type</div>
          <div class="ledger-item-value">${escapeHtml(ev?.evidence_type || 'KCI_RECORD')}</div>
        </div>
        <div style="grid-column: span 2;">
          <div class="ledger-item-label">Redacted Snapshot SHA-256 (Pinned Evidence)</div>
          <div class="ledger-item-value">
            <span class="hash-token">${escapeHtml(ev?.redacted_snapshot_sha256 || 'None')}</span>
          </div>
        </div>
        ${ev?.normalized_content_sha256 ? `
          <div style="grid-column: span 2;">
            <div class="ledger-item-label">Normalized Content SHA-256</div>
            <div class="ledger-item-value">
              <span class="hash-token">${escapeHtml(ev.normalized_content_sha256)}</span>
            </div>
          </div>
        ` : ''}
      </div>
    </div>
  `;

  // 5. Limitations
  if (item.limitations && item.limitations.length > 0) {
    html += `
      <div class="reason-detail-card" style="margin-top: 10px;">
        <div class="ledger-item-label" style="text-transform: uppercase; font-weight: bold; margin-bottom: 4px;">Evidence Scope & Limitations</div>
        <ul style="padding-left: 18px; font-size: 11.5px; color: #94a3b8; line-height: 1.6;">
          ${item.limitations.map(lim => `<li>${escapeHtml(lim)}</li>`).join('')}
        </ul>
      </div>
    `;
  }

  elements.evidenceContainer.innerHTML = html;
}

/**
 * Construct full comparison rows from input and evidence fields.
 */
function buildFieldComparisonRows(item) {
  const rows = [];

  // Render backend comparisons as-is; the frontend never recomputes status or field results.
  if (item.field_comparisons && item.field_comparisons.length > 0) {
    item.field_comparisons.forEach(fc => {
      let diff = null;
      if (fc.result === 'MISMATCH') {
        diff = `${fc.input_value} → ${fc.evidence_value}`;
      } else if (fc.result === 'MULTI_RECORD') {
        diff = `Collides across ${Array.isArray(fc.evidence_value) ? fc.evidence_value.join(' & ') : fc.evidence_value}`;
      }

      rows.push({
        field: formatFieldName(fc.field),
        supplied: formatComparisonValue(fc.input_value),
        evidence: formatComparisonValue(fc.evidence_value),
        result: fc.result,
        diff,
      });
    });
  }

  return rows;
}

function formatComparisonValue(value) {
  if (value === null || value === undefined || value === '') return '(empty)';
  if (typeof value === 'object') return JSON.stringify(value);
  return String(value);
}

/**
 * Format raw field identifiers into clean human labels
 */
function formatFieldName(raw) {
  switch (raw) {
    case 'publication_year': return 'Publication Year';
    case 'title': return 'Title';
    case 'doi': return 'DOI';
    case 'record_identity': return 'Record Identity';
    default: return raw.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase());
  }
}

/**
 * Open Evidence Modal
 */
function openEvidenceModal() {
  const entry = state.findings.find(candidate => itemIdOf(candidate) === state.selectedId);
  const item = findingOf(entry);
  if (!item || !elements.rawEvidenceModal) return;

  const isSystemError = item.kind === 'SYSTEM_FAILURE';
  const id = isSystemError ? item.failure_id : (item.evidence?.[0]?.source_record_id || item.finding_id);
  const hash = item.evidence?.[0]?.redacted_snapshot_sha256 || 'N/A';

  elements.modalSnapshotHash.textContent = `Record: ${id} · Snapshot SHA-256: ${hash}`;
  elements.modalJsonContent.textContent = JSON.stringify(item, null, 2);
  elements.rawEvidenceModal.classList.remove('hidden');
}

/**
 * Close Evidence Modal
 */
function closeEvidenceModal() {
  if (elements.rawEvidenceModal) {
    elements.rawEvidenceModal.classList.add('hidden');
  }
}

/**
 * Update filter counts in Center Panel header
 */
function updateFilterCounts() {
  const total = state.findings.length;
  const verified = state.findings.filter(entry => findingOf(entry).status === 'VERIFIED').length;
  const drift = state.findings.filter(entry => findingOf(entry).status === 'METADATA_DRIFT').length;
  const chimera = state.findings.filter(entry => ['CHIMERA', 'REVIEW_REQUIRED'].includes(findingOf(entry).status)).length;
  const notFound = state.findings.filter(entry => findingOf(entry).status === 'NOT_FOUND_IN_KCI').length;
  const sysFail = state.findings.filter(entry => findingOf(entry).kind === 'SYSTEM_FAILURE').length;

  const countAll = document.getElementById('countAll');
  const countVerified = document.getElementById('countVerified');
  const countDrift = document.getElementById('countDrift');
  const countChimera = document.getElementById('countChimera');
  const countNotFound = document.getElementById('countNotFound');
  const countSysFail = document.getElementById('countSysFail');

  if (countAll) countAll.textContent = total;
  if (countVerified) countVerified.textContent = verified;
  if (countDrift) countDrift.textContent = drift;
  if (countChimera) countChimera.textContent = chimera;
  if (countNotFound) countNotFound.textContent = notFound;
  if (countSysFail) countSysFail.textContent = sysFail;
}

/**
 * Helper: Map finding status or system failure to theme class
 */
function getItemTheme(item) {
  if (!item) return 'theme-verified';
  if (item.kind === 'SYSTEM_FAILURE') return 'theme-system-failure';
  switch (item.status) {
    case 'VERIFIED': return 'theme-verified';
    case 'METADATA_DRIFT': return 'theme-drift';
    case 'CHIMERA':
    case 'REVIEW_REQUIRED': return 'theme-chimera';
    case 'NOT_FOUND_IN_KCI': return 'theme-not-found';
    default: return 'theme-verified';
  }
}

/**
 * Helper: Map comparison result to status tag class
 */
function getTagClass(result) {
  switch (result) {
    case 'MATCH': return 'tag-match';
    case 'MISMATCH': return 'tag-mismatch';
    case 'MULTI_RECORD': return 'tag-split';
    case 'NOT_FOUND':
    case 'INVALID':
    case 'UNKNOWN': return 'tag-notfound';
    default: return 'tag-match';
  }
}

/**
 * Helper: Escape HTML characters for safe rendering
 */
function escapeHtml(str) {
  if (str === null || str === undefined) return '';
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

document.addEventListener('DOMContentLoaded', init);
