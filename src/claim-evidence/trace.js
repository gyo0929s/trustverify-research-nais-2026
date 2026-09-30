import { parseReferenceList, PARSE_STATES } from '../citation/reference-parser.js';
import { alignClaimWithEvidence } from './align.js';
import { resolveCitationMarker } from './draft.js';

/**
 * Minimal draft → reference → KCI → claim trace (P0). Pure orchestration with no verdict logic:
 * marker resolution, then the existing single-citation audit, then the existing Claim–Evidence engine.
 * Linking failures stop the trace before KCI and are never KCI or evidence statuses.
 */
export const TRACE_CONTRACT_VERSION = 'trustverify-draft-citation-trace-v1';
export const MAX_TRACE_REFERENCES = 20;

export const LINKING_STATES = Object.freeze({
  RESOLVED: 'RESOLVED',
  MARKER_UNRESOLVED: 'MARKER_UNRESOLVED', // no numeric [n] marker (missing or malformed)
  MULTIPLE_MARKERS_UNSUPPORTED: 'MULTIPLE_MARKERS_UNSUPPORTED', // P0 supports one marker per sentence
  REFERENCE_INDEX_OUT_OF_RANGE: 'REFERENCE_INDEX_OUT_OF_RANGE', // [n] has no bibliography row n
  REFERENCE_PARSE_REVIEW: 'REFERENCE_PARSE_REVIEW', // row n exists but did not parse as READY
});

const LINKING_FROM_RESOLUTION = {
  NO_MARKER: LINKING_STATES.MARKER_UNRESOLVED,
  MULTIPLE_MARKERS: LINKING_STATES.MULTIPLE_MARKERS_UNSUPPORTED,
  MARKER_NOT_IN_BIBLIOGRAPHY: LINKING_STATES.REFERENCE_INDEX_OUT_OF_RANGE,
};

// Claim–Evidence runs only when Citation Integrity established one coherent KCI record.
const IDENTIFIED_STATUSES = new Set(['VERIFIED', 'METADATA_DRIFT']);

const citationFields = row => Object.fromEntries(Object.entries({
  title: row.title, authors: row.authors, publication_year: row.publication_year, doi: row.doi,
}).filter(([, value]) => value !== null && !(Array.isArray(value) && value.length === 0)));

/**
 * draftText: one sentence with one numeric marker. references: bibliography entries (strings).
 * deps: { auditService, abstractEvidenceFor(recordId), covers?(citation) } supplied by the caller.
 */
export async function traceDraftCitation({ draftText, references, evidenceMode }, { auditService, abstractEvidenceFor, covers = null }) {
  if (typeof draftText !== 'string' || !draftText.trim()) throw new TypeError('draft_text must be a non-empty string');
  if (!Array.isArray(references) || references.length === 0 || references.length > MAX_TRACE_REFERENCES
    || references.some(reference => typeof reference !== 'string' || !reference.trim())) {
    throw new TypeError(`references must be 1–${MAX_TRACE_REFERENCES} non-empty strings`);
  }
  const { rows } = parseReferenceList(references.join('\n'));
  const base = { contract_version: TRACE_CONTRACT_VERSION, evidence_mode: evidenceMode, draft_text: draftText.trim() };
  const stopped = linking => ({ ...base, linking, citing_claim: null, citation_integrity: null, claim_evidence: null });

  // 1. Link the marker to a bibliography row. Nothing below runs unless this resolves.
  const resolution = resolveCitationMarker(draftText, rows);
  if (!resolution.resolved) {
    return stopped({ state: LINKING_FROM_RESOLUTION[resolution.reason], marker: resolution.marker ?? null, markers: resolution.markers ?? null });
  }
  const { row } = resolution;
  const linking = { state: LINKING_STATES.RESOLVED, marker: resolution.marker, resolved_by: resolution.resolved_by, row_index: row.index, reference_raw: row.raw };
  if (row.parse_status !== PARSE_STATES.READY) {
    return stopped({ ...linking, state: LINKING_STATES.REFERENCE_PARSE_REVIEW, parse_status: row.parse_status, parse_issues: row.issues });
  }

  // 2. Existing single-citation audit on the resolved row only.
  const citation = citationFields(row);
  if (covers && !covers(citation)) {
    return { ...base, linking, citing_claim: resolution.citing_claim, citation_integrity: { state: 'NO_FROZEN_EVIDENCE' }, claim_evidence: { state: 'NOT_RUN', reason: 'NO_COHERENT_KCI_RECORD' } };
  }
  const finding = await auditService.auditCitation(citation);
  const recordId = finding.kind === 'RESEARCH_FINDING' ? finding.evidence?.[0]?.source_record_id ?? null : null;
  const citationIntegrity = {
    kind: finding.kind,
    status: finding.status ?? null,
    system_state: finding.system_state ?? null,
    rule_id: finding.rule_id ?? null,
    article_id: recordId,
    field_comparisons: (finding.field_comparisons ?? []).map(({ field, result }) => ({ field, result })),
    finding_id: finding.finding_id ?? finding.failure_id,
  };

  // 3. Existing Claim–Evidence engine on that record's KCI abstract evidence.
  const identified = finding.kind === 'RESEARCH_FINDING' && IDENTIFIED_STATUSES.has(finding.status) && recordId;
  const evidence = identified ? abstractEvidenceFor(recordId) : null;
  if (!identified || !evidence) {
    return {
      ...base, linking, citing_claim: resolution.citing_claim, citation_integrity: citationIntegrity,
      claim_evidence: { state: 'NOT_RUN', reason: identified ? 'NO_ABSTRACT_EVIDENCE_AVAILABLE' : 'NO_COHERENT_KCI_RECORD' },
    };
  }
  const alignment = alignClaimWithEvidence({ citingClaim: resolution.citing_claim, evidence });
  return {
    ...base,
    linking,
    citing_claim: resolution.citing_claim,
    citation_integrity: citationIntegrity,
    claim_evidence: {
      state: 'RUN',
      status: alignment.status,
      signal: alignment.signal,
      insufficiency_reason: alignment.insufficiency_reason,
      rule_id: alignment.rule_id,
      rule_version: alignment.rule_version,
      evidence_span: alignment.evidence_span,
      evidence_hash: alignment.evidence_hash,
      why: alignment.why,
      human_review_required: alignment.human_review_required,
      human_review_reason: alignment.human_review_reason,
      finding_id: alignment.finding_id,
      processing_version: alignment.processing_version,
    },
  };
}
