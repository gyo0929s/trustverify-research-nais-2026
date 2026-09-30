import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { classifyKciResponse } from '../src/kci/adapter.js';
import { createCitationAuditService } from '../src/citation/audit.js';
import { normalizeText } from '../src/citation/normalize.js';

const loadFixture = async name => JSON.parse((await readFile(
  new URL(`../artifacts/api-qualification/kci/${name}.redacted.json`, import.meta.url),
  'utf8',
)).replace(/^\uFEFF/, '')).response_xml;

const searchXml = await loadFixture('success-search');
const detailXml = await loadFixture('success-detail');
const zeroXml = await loadFixture('zero-result');
const search = classifyKciResponse({ body: searchXml, operation: 'articleSearch' });
const detail = classifyKciResponse({ body: detailXml, operation: 'articleDetail', expectedId: 'ART003062835' });
const zero = classifyKciResponse({ body: zeroXml, operation: 'articleSearch' });
const citation = {
  title: 'Computer Vision-based Basketball Player Training System',
  authors: ['Man Zhang', 'Seung-Soon Shin'],
  publication_year: '2024',
  doi: '10.9728/dcs.2024.25.3.595',
};

function serviceWith({ searchResult = search, detailResult = detail } = {}) {
  return createCitationAuditService({
    kciAdapter: {
      async articleSearch() { return structuredClone(searchResult); },
      async articleDetail() { return structuredClone(detailResult); },
    },
  });
}

test('VERIFIED: exact multilingual title identity and supplied metadata agree', async () => {
  const result = await serviceWith().auditCitation(citation);
  assert.equal(result.kind, 'RESEARCH_FINDING');
  assert.equal(result.status, 'VERIFIED');
  assert.equal(result.rule_id, 'REF-META-001');
  assert.ok(result.field_comparisons.every(comparison => comparison.result === 'MATCH'));
  assert.equal(result.evidence[0].source_record_id, 'ART003062835');
});

test('METADATA_DRIFT: coherent record with an intentionally wrong supplied year', async () => {
  const result = await serviceWith().auditCitation({ ...citation, publication_year: '2023' });
  assert.equal(result.status, 'METADATA_DRIFT');
  assert.equal(result.rule_id, 'REF-META-002');
  assert.equal(result.field_comparisons.find(item => item.field === 'publication_year').result, 'MISMATCH');
});

test('NOT_FOUND_IN_KCI: only the validated zero state produces the finding', async () => {
  const result = await serviceWith({ searchResult: zero }).auditCitation({ title: 'No such fixture title' });
  assert.equal(result.status, 'NOT_FOUND_IN_KCI');
  assert.equal(result.rule_id, 'REF-SEARCH-001');
  assert.equal(result.evidence[0].data.runtime_state, 'KCI_ZERO_RESULTS');
});

test('REVIEW_REQUIRED: multiple exact-title candidates are never resolved by proximity', async () => {
  const ambiguous = structuredClone(search);
  ambiguous.records[1].titles = structuredClone(ambiguous.records[0].titles);
  const result = await serviceWith({ searchResult: ambiguous }).auditCitation(citation);
  assert.equal(result.status, 'REVIEW_REQUIRED');
  assert.equal(result.rule_id, 'REF-ID-002');
  assert.equal(result.evidence.length, 2);
});

test('REVIEW_REQUIRED: search candidates without exact normalized title identity', async () => {
  const result = await serviceWith().auditCitation({ title: 'A different but plausible title' });
  assert.equal(result.status, 'REVIEW_REQUIRED');
  assert.equal(result.rule_id, 'REF-ID-002');
  assert.equal(result.field_comparisons.length, 0);
});

test('SYSTEM_FAILURE: unavailable KCI remains separate from research findings', async () => {
  const result = await serviceWith({
    searchResult: {
      state: 'KCI_UNAVAILABLE', messages: [], records: [], total: null,
      eligible_for_citation_comparison: false, eligible_for_not_found_in_kci: false,
    },
  }).auditCitation(citation);
  assert.equal(result.kind, 'SYSTEM_FAILURE');
  assert.equal(result.system_state, 'KCI_UNAVAILABLE');
  assert.equal(result.research_finding_emitted, false);
  assert.equal(Object.hasOwn(result, 'status'), false);
});

test('inconsistent KCI_OK detail becomes system failure, never VERIFIED', async () => {
  const inconsistent = structuredClone(detail);
  inconsistent.records[0].source_record_id = 'ART999999999';
  const result = await serviceWith({ detailResult: inconsistent }).auditCitation(citation);
  assert.equal(result.kind, 'SYSTEM_FAILURE');
  assert.equal(result.system_state, 'KCI_INVALID_RESPONSE');
  assert.equal(Object.hasOwn(result, 'status'), false);
});

test('missing KCI field is UNKNOWN, never MISMATCH', async () => {
  const missingDoi = structuredClone(detail);
  missingDoi.records[0].doi_raw = '';
  missingDoi.records[0].doi_normalized = null;
  const result = await serviceWith({ detailResult: missingDoi }).auditCitation(citation);
  assert.equal(result.status, 'REVIEW_REQUIRED');
  assert.equal(result.field_comparisons.find(item => item.field === 'doi').result, 'UNKNOWN');
  assert.equal(result.field_comparisons.some(item => item.result === 'MISMATCH'), false);
});

test('KCI verified=Y has no influence on TrustVerify status', async () => {
  const withoutObservedVerified = structuredClone(detail);
  assert.equal(Object.hasOwn(withoutObservedVerified.records[0], 'verified'), false);
  const result = await serviceWith({ detailResult: withoutObservedVerified })
    .auditCitation({ ...citation, publication_year: '2023' });
  assert.equal(result.status, 'METADATA_DRIFT');
});

test('runtime audit never emits CHIMERA', async () => {
  const outcomes = await Promise.all([
    serviceWith().auditCitation(citation),
    serviceWith().auditCitation({ ...citation, publication_year: '2023' }),
    serviceWith({ searchResult: zero }).auditCitation({ title: 'No such fixture title' }),
    serviceWith().auditCitation({ title: 'A different but plausible title' }),
  ]);
  assert.equal(outcomes.some(outcome => outcome.status === 'CHIMERA'), false);
});

test('normalization is deterministic and preserves meaningful words', () => {
  assert.equal(normalizeText('  COMPUTER\u00a0Vision-based  Basketball '), 'computer vision-based basketball');
  assert.notEqual(normalizeText('causal effect'), normalizeText('effect'));
});

test('only title is required; missing optional fields are not compared', async () => {
  const result = await serviceWith().auditCitation({ title: citation.title });
  assert.equal(result.status, 'VERIFIED');
  assert.deepEqual(result.field_comparisons.map(item => item.field), ['title']);
});

test('ambiguous author comparison is UNKNOWN instead of mismatch', async () => {
  const result = await serviceWith().auditCitation({ title: citation.title, authors: ['M. Zhang', 'S. Shin'] });
  assert.equal(result.status, 'REVIEW_REQUIRED');
  assert.equal(result.field_comparisons.find(item => item.field === 'authors').result, 'UNKNOWN');
});
