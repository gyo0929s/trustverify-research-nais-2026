import test from 'node:test';
import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { readFile } from 'node:fs/promises';
import { canonicalJson } from '../src/kci/adapter.js';
import { createCitationAuditService } from '../src/citation/audit.js';

// Freezes the S1–S5 behavior observed live on 2026-10-01 (see artifacts/evaluation/kci-citation-integrity).
// Fully offline: replays sanitized frozen evidence; the live network is blocked.
const dir = new URL('../artifacts/evaluation/kci-citation-integrity/', import.meta.url);
const results = JSON.parse(await readFile(new URL('S1-S5-results.json', dir), 'utf8'));
const frozen = JSON.parse(await readFile(new URL('frozen-evidence.json', dir), 'utf8'));
const sha256 = value => createHash('sha256').update(canonicalJson(value), 'utf8').digest('hex');
const toRecord = record => ({ source_record_id: record.article_id, ...record });

function frozenAdapter(evidence) {
  return {
    async articleSearch() {
      return { state: evidence.search.state, messages: [], total: evidence.search.total, records: evidence.search.records.map(toRecord) };
    },
    async articleDetail() {
      if (!evidence.detail) throw new Error('articleDetail was not reached in the observed run');
      return { state: evidence.detail.state, messages: [], total: 1, records: evidence.detail.records.map(toRecord) };
    },
  };
}

test('S1–S5 frozen evidence carries no credential or URL other than bibliographic DOI', () => {
  const serialized = JSON.stringify(frozen.evidence);
  assert.equal(/key=|authorization|public_url|\[REDACTED\]|open\.kci\.go\.kr|kciportal/i.test(serialized), false);
  const urls = serialized.match(/https?:\/\/[^"\s]+/g) ?? [];
  assert.ok(urls.every(url => url.startsWith('http://dx.doi.org/')));
});

for (const expected of results.cases) {
  test(`${expected.case_id} replays offline to the observed ${expected.observed_status} / ${expected.rule_id}`, async () => {
    const evidence = frozen.evidence[expected.evidence_hash];
    assert.ok(evidence, 'frozen evidence present');
    assert.equal(sha256(evidence), expected.evidence_hash);
    assert.equal(sha256(expected.input), expected.input_hash);

    const realFetch = globalThis.fetch;
    globalThis.fetch = () => { throw new Error('Live network access is forbidden in this regression test'); };
    let finding;
    try {
      finding = await createCitationAuditService({ kciAdapter: frozenAdapter(evidence) }).auditCitation(expected.input);
    } finally { globalThis.fetch = realFetch; }

    assert.equal(finding.status, expected.observed_status);
    assert.equal(finding.rule_id, expected.rule_id);
    assert.equal(finding.finding_id, expected.finding_id);
    assert.deepEqual(finding.field_comparisons.map(({ field, result }) => ({ field, result })), expected.field_comparisons);
  });
}
