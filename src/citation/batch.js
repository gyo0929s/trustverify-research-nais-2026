import { PARSE_STATES } from './reference-parser.js';

/**
 * Thin batch orchestration over the existing single-citation audit service.
 * It adds no verdict logic: each READY row is passed to auditCitation unchanged, one at a time,
 * and the summary only counts what the audit returned.
 */
export const MAX_BATCH_SIZE = 20;
export const BATCH_CONTRACT_VERSION = 'trustverify-citation-batch-v1';

// Row outcomes describe what happened to a row, never the citation's status.
export const ROW_OUTCOMES = Object.freeze({
  AUDITED: 'AUDITED', // finding is the unchanged single-citation contract (research finding or system failure)
  NOT_AUDITED: 'NOT_AUDITED', // parse_status was not READY; KCI was never queried
  NO_FROZEN_EVIDENCE: 'NO_FROZEN_EVIDENCE', // FROZEN_EVIDENCE mode only: nothing frozen for this citation, so no result
  INVALID_INPUT: 'INVALID_INPUT', // the row failed single-citation input validation
  ROW_ERROR: 'ROW_ERROR', // unexpected error while auditing this row only
});

export class BatchRequestError extends Error {}

const RESEARCH_STATUSES = ['VERIFIED', 'METADATA_DRIFT', 'REVIEW_REQUIRED', 'NOT_FOUND_IN_KCI'];

// Keeps only the four citation fields the single audit accepts; empty values are omitted, not guessed.
function citationFrom(reference) {
  const citation = {};
  if (typeof reference.title === 'string') citation.title = reference.title.trim();
  if (Array.isArray(reference.authors)) {
    const authors = reference.authors.filter(author => typeof author === 'string' && author.trim()).map(author => author.trim());
    if (authors.length) citation.authors = authors;
  }
  if (typeof reference.publication_year === 'string' && reference.publication_year.trim()) citation.publication_year = reference.publication_year.trim();
  if (typeof reference.doi === 'string' && reference.doi.trim()) citation.doi = reference.doi.trim();
  return citation;
}

export function summarizeBatch(items) {
  const statusCounts = Object.fromEntries(RESEARCH_STATUSES.map(status => [status, 0]));
  const summary = {
    total: items.length,
    status_counts: statusCounts,
    other_research_status: 0,
    system_failure: 0,
    not_audited: { NEEDS_REVIEW: 0, UNPARSED: 0, NO_FROZEN_EVIDENCE: 0 },
    row_errors: 0,
  };
  for (const item of items) {
    if (item.outcome === ROW_OUTCOMES.NOT_AUDITED) summary.not_audited[item.parse_status] += 1;
    else if (item.outcome === ROW_OUTCOMES.NO_FROZEN_EVIDENCE) summary.not_audited.NO_FROZEN_EVIDENCE += 1;
    else if (item.outcome !== ROW_OUTCOMES.AUDITED) summary.row_errors += 1;
    else if (item.finding.kind === 'SYSTEM_FAILURE') summary.system_failure += 1;
    else if (Object.hasOwn(statusCounts, item.finding.status)) statusCounts[item.finding.status] += 1;
    else summary.other_research_status += 1;
  }
  return summary;
}

function validateRequest(request) {
  if (!request || typeof request !== 'object' || Array.isArray(request)) throw new BatchRequestError('Batch request must be an object');
  const { references } = request;
  if (!Array.isArray(references) || references.length === 0) throw new BatchRequestError('references must be a non-empty array');
  if (references.length > MAX_BATCH_SIZE) throw new BatchRequestError(`A batch may contain at most ${MAX_BATCH_SIZE} references`);
  for (const reference of references) {
    if (!reference || typeof reference !== 'object' || Array.isArray(reference)) throw new BatchRequestError('Each reference must be an object');
    if (!Object.values(PARSE_STATES).includes(reference.parse_status)) throw new BatchRequestError('Each reference needs a valid parse_status');
  }
  return references;
}

/**
 * evidenceMode labels where evidence came from ('LIVE' or 'FROZEN_EVIDENCE'); it never changes verdicts.
 * covers(citation), when given, marks rows without available evidence as NO_FROZEN_EVIDENCE instead of auditing them.
 */
export function createCitationBatchService({ auditService, evidenceMode = 'LIVE', covers = null }) {
  if (!auditService || typeof auditService.auditCitation !== 'function') throw new TypeError('Citation audit service is required');
  return Object.freeze({
    async auditBatch(request) {
      const references = validateRequest(request);
      const items = [];
      // Sequential on purpose: at most one citation (search + detail) in flight against KCI.
      for (const [position, reference] of references.entries()) {
        const citation = citationFrom(reference);
        const item = {
          index: position + 1,
          row_id: typeof reference.row_id === 'string' ? reference.row_id : null,
          parse_status: reference.parse_status,
          input: citation,
        };
        if (reference.parse_status !== PARSE_STATES.READY) {
          items.push({ ...item, outcome: ROW_OUTCOMES.NOT_AUDITED, finding: null });
          continue;
        }
        if (covers && !covers(citation)) {
          items.push({ ...item, outcome: ROW_OUTCOMES.NO_FROZEN_EVIDENCE, finding: null });
          continue;
        }
        try {
          items.push({ ...item, outcome: ROW_OUTCOMES.AUDITED, finding: await auditService.auditCitation(citation) });
        } catch (error) {
          items.push({ ...item, outcome: error instanceof TypeError ? ROW_OUTCOMES.INVALID_INPUT : ROW_OUTCOMES.ROW_ERROR, finding: null });
        }
      }
      return { contract_version: BATCH_CONTRACT_VERSION, evidence_mode: evidenceMode, count: items.length, items, summary: summarizeBatch(items) };
    },
  });
}
