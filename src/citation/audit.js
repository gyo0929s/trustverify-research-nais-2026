import { createHash } from 'node:crypto';
import { canonicalJson } from '../kci/adapter.js';
import {
  compareAuthors,
  compareDoi,
  normalizeCitationInput,
  normalizeText,
  normalizeYear,
  titleMatches,
} from './normalize.js';

export const CITATION_RULES = Object.freeze({
  EXACT_IDENTITY: Object.freeze({ id: 'REF-ID-001', version: '1.0' }),
  INSUFFICIENT_IDENTITY: Object.freeze({ id: 'REF-ID-002', version: '1.0' }),
  METADATA_AGREES: Object.freeze({ id: 'REF-META-001', version: '1.0' }),
  METADATA_DIFFERS: Object.freeze({ id: 'REF-META-002', version: '1.0' }),
  ZERO_RESULTS: Object.freeze({ id: 'REF-SEARCH-001', version: '1.0' }),
});

const SYSTEM_STATES = new Set([
  'KCI_UNAVAILABLE',
  'KCI_AUTH_FAILED',
  'KCI_INVALID_RESPONSE',
  'KCI_PARSE_FAILED',
]);

const digestId = (prefix, value) => `${prefix}-${createHash('sha256')
  .update(canonicalJson(value), 'utf8').digest('hex').slice(0, 16)}`;

function baseFinding(input, status, rule, evidence, fieldComparisons, reason, limitations) {
  return {
    contract_version: 'trustverify-citation-finding-v1',
    kind: 'RESEARCH_FINDING',
    finding_id: digestId('finding', { input, status, rule, evidence: evidence.map(item => item.evidence_id) }),
    track: 'CITATION_INTEGRITY',
    status,
    rule_id: rule.id,
    rule_version: rule.version,
    input,
    evidence,
    field_comparisons: fieldComparisons,
    reason,
    limitations,
    human_review_required: true,
  };
}

function systemFailure(operation, response) {
  const state = SYSTEM_STATES.has(response?.state) ? response.state : 'KCI_INVALID_RESPONSE';
  const messages = Array.isArray(response?.messages)
    ? response.messages.filter(message => typeof message === 'string')
    : [];
  return {
    contract_version: 'trustverify-system-failure-v1',
    kind: 'SYSTEM_FAILURE',
    failure_id: digestId('failure', { operation, state, messages }),
    track: 'CITATION_INTEGRITY',
    system_state: state,
    operation,
    messages,
    reason: `KCI could not provide valid evidence for ${operation}.`,
    retry_recommended: state === 'KCI_UNAVAILABLE',
    research_finding_emitted: false,
  };
}

function recordEvidence(record, index = 0) {
  return {
    evidence_id: `kci-record-${index + 1}-${record.source_record_id}`,
    evidence_type: 'KCI_RECORD',
    source_system: 'KCI',
    source_record_id: record.source_record_id,
    retrieved_at: record.retrieved_at ?? null,
    normalized_content_sha256: record.normalized_content_sha256 ?? null,
    redacted_snapshot_sha256: record.redacted_snapshot_sha256 ?? null,
    data: {
      titles: record.titles,
      authors: record.authors,
      publication_year: record.publication_year,
      doi_raw: record.doi_raw,
      doi_normalized: record.doi_normalized,
      journal: record.journal,
      publisher: record.publisher,
      volume: record.volume,
      issue: record.issue,
      issn: record.issn,
      public_url: record.public_url,
    },
  };
}

function searchEvidence(response) {
  return {
    evidence_id: 'kci-search-zero',
    evidence_type: 'KCI_SEARCH_RESULT',
    source_system: 'KCI',
    source_record_id: null,
    retrieved_at: response.retrieved_at ?? null,
    normalized_content_sha256: null,
    redacted_snapshot_sha256: response.redacted_snapshot_sha256 ?? null,
    data: {
      runtime_state: response.state,
      messages: response.messages,
      record_count: response.records.length,
      total: response.total,
    },
  };
}

function reviewFinding(input, records, reason) {
  return baseFinding(
    input,
    'REVIEW_REQUIRED',
    CITATION_RULES.INSUFFICIENT_IDENTITY,
    records.map(recordEvidence),
    [],
    reason,
    ['No closest-candidate or semantic match was selected.', 'A human must resolve citation identity.'],
  );
}

function compareFields(input, record, evidenceId) {
  const comparisons = [];
  const add = (field, inputValue, evidenceValue, result) => comparisons.push({
    field,
    input_value: inputValue,
    evidence_value: evidenceValue,
    result,
    evidence_ids: [evidenceId],
  });

  const matchingTitle = record.titles.find(title => normalizeText(title.value) === normalizeText(input.title));
  add('title', input.title, matchingTitle?.value ?? record.titles.map(title => title.value), matchingTitle ? 'MATCH' : 'UNKNOWN');

  if (Object.hasOwn(input, 'authors')) {
    add(
      'authors',
      input.authors,
      record.authors.map(author => ({ name: author.name, english_name: author.english_name })),
      compareAuthors(input.authors, record.authors),
    );
  }
  if (Object.hasOwn(input, 'publication_year')) {
    const suppliedYear = normalizeYear(input.publication_year);
    const evidenceYear = normalizeYear(record.publication_year);
    add('publication_year', input.publication_year, record.publication_year,
      evidenceYear === null ? 'UNKNOWN' : suppliedYear === evidenceYear ? 'MATCH' : 'MISMATCH');
  }
  if (Object.hasOwn(input, 'doi')) {
    add('doi', input.doi, { doi_raw: record.doi_raw, doi_normalized: record.doi_normalized }, compareDoi(input.doi, record.doi_raw));
  }
  return comparisons;
}

export function createCitationAuditService({ kciAdapter }) {
  if (!kciAdapter || typeof kciAdapter.articleSearch !== 'function'
    || typeof kciAdapter.articleDetail !== 'function') {
    throw new TypeError('KCI adapter is required');
  }

  return Object.freeze({
    async auditCitation(rawInput) {
      const input = normalizeCitationInput(rawInput);
      const search = await kciAdapter.articleSearch({ title: input.title });

      if (search?.state === 'KCI_ZERO_RESULTS') {
        return baseFinding(
          input,
          'NOT_FOUND_IN_KCI',
          CITATION_RULES.ZERO_RESULTS,
          [searchEvidence(search)],
          [],
          'A validated KCI search returned the recognized zero-result envelope.',
          ['This means only that the citation was not found in KCI for this query.', 'It does not prove that a paper is fake or nonexistent elsewhere.'],
        );
      }
      if (search?.state !== 'KCI_OK') return systemFailure('articleSearch', search);
      if (!Array.isArray(search.records)) {
        return systemFailure('articleSearch', { state: 'KCI_INVALID_RESPONSE', messages: [] });
      }

      const validSearchRecords = search.records.filter(record => record
        && typeof record.source_record_id === 'string' && Array.isArray(record.titles));
      if (validSearchRecords.length !== search.records.length) {
        return systemFailure('articleSearch', { state: 'KCI_INVALID_RESPONSE', messages: [] });
      }
      const exactCandidates = validSearchRecords.filter(record => titleMatches(record, input.title));
      if (exactCandidates.length !== 1) {
        const reason = exactCandidates.length > 1
          ? 'Multiple KCI candidates have the same exact normalized title; identity is ambiguous.'
          : 'KCI returned candidates, but none has exact normalized title identity.';
        return reviewFinding(input, exactCandidates.length ? exactCandidates : validSearchRecords, reason);
      }

      const candidateId = exactCandidates[0].source_record_id;
      const detail = await kciAdapter.articleDetail(candidateId);
      if (detail?.state !== 'KCI_OK') return systemFailure('articleDetail', detail);
      if (!Array.isArray(detail.records) || detail.records.length !== 1
        || detail.records[0].source_record_id !== candidateId) {
        return systemFailure('articleDetail', { state: 'KCI_INVALID_RESPONSE', messages: [] });
      }

      const record = detail.records[0];
      if (!titleMatches(record, input.title)) {
        return reviewFinding(input, [record], 'The detail record no longer establishes exact normalized title identity.');
      }

      const evidence = recordEvidence(record);
      const comparisons = compareFields(input, record, evidence.evidence_id);
      if (comparisons.some(comparison => comparison.result === 'UNKNOWN')) {
        return baseFinding(
          input,
          'REVIEW_REQUIRED',
          CITATION_RULES.INSUFFICIENT_IDENTITY,
          [evidence],
          comparisons,
          'One coherent KCI record was identified, but at least one supplied field lacks deterministic comparable evidence.',
          ['Unknown comparisons are not treated as mismatches.', 'A human must review incomplete or ambiguous metadata.'],
        );
      }
      if (comparisons.some(comparison => comparison.result === 'MISMATCH')) {
        return baseFinding(
          input,
          'METADATA_DRIFT',
          CITATION_RULES.METADATA_DIFFERS,
          [evidence],
          comparisons,
          'One coherent KCI record was identified, but at least one supplied comparable metadata field differs.',
          ['The result describes bibliographic metadata only and does not evaluate scientific truth.'],
        );
      }
      return baseFinding(
        input,
        'VERIFIED',
        CITATION_RULES.METADATA_AGREES,
        [evidence],
        comparisons,
        'The supplied bibliographic metadata is consistent with one coherent KCI record under the current rules.',
        ['VERIFIED does not verify scientific truth, manuscript quality, peer-review validity, or publication acceptance.'],
      );
    },
  });
}
