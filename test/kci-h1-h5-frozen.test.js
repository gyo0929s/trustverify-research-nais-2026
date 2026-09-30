import test from 'node:test';
import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { readFile } from 'node:fs/promises';
import { canonicalJson } from '../src/kci/adapter.js';
import { createCitationAuditService } from '../src/citation/audit.js';
import { createFrozenEvidenceAdapter } from '../src/citation/frozen-evidence.js';

// Freezes the H1–H5 adversarial behavior observed live on 2026-10-01
// (artifacts/evaluation/kci-adversarial-h1-h5). Fully offline; the live network is blocked.
const frozen = JSON.parse(await readFile(
  new URL('../artifacts/evaluation/kci-adversarial-h1-h5/H1-H5-results.json', import.meta.url), 'utf8',
));
const sha256 = value => createHash('sha256').update(canonicalJson(value), 'utf8').digest('hex');

async function replay(input) {
  const realFetch = globalThis.fetch;
  globalThis.fetch = () => { throw new Error('Live network access is forbidden in this regression test'); };
  try {
    return await createCitationAuditService({ kciAdapter: createFrozenEvidenceAdapter(frozen) }).auditCitation(input);
  } finally { globalThis.fetch = realFetch; }
}

test('H1–H5 set has one control and four distinct failure modes', () => {
  assert.deepEqual(frozen.items.map(item => item.case_id), ['H1', 'H2', 'H3', 'H4', 'H5']);
  const modes = frozen.items.map(item => item.failure_mode);
  assert.equal(new Set(modes).size, 5);
  assert.equal(frozen.items.filter(item => item.input_mutation.startsWith('none')).length, 1);
  // No record serves as both the control and a mutation.
  const control = frozen.items.find(item => item.case_id === 'H1').base_record_id;
  assert.ok(frozen.items.filter(item => item.case_id !== 'H1').every(item => item.base_record_id !== control));
});

test('H3 swaps in a real DOI from another qualified KCI record, not a syntactic mutation', () => {
  const h3 = frozen.items.find(item => item.case_id === 'H3');
  const donor = frozen.record_confirmations[h3.donor_record_id];
  assert.equal(donor.detail_state, 'KCI_OK');
  assert.equal(h3.input.doi, donor.record.doi_normalized);
  assert.notEqual(h3.input.doi, frozen.record_confirmations[h3.base_record_id].record.doi_normalized);
});

test('H4 inserts a real author of another qualified KCI record', () => {
  const h4 = frozen.items.find(item => item.case_id === 'H4');
  const donorAuthors = frozen.record_confirmations[h4.donor_record_id].record.authors.map(author => author.name);
  const baseAuthors = frozen.record_confirmations[h4.base_record_id].record.authors.map(author => author.name);
  const inserted = h4.input.authors.filter(name => !baseAuthors.includes(name));
  assert.equal(inserted.length, 1);
  assert.ok(donorAuthors.includes(inserted[0]));
});

for (const expected of frozen.items) {
  test(`${expected.case_id} ${expected.failure_mode} replays offline to the observed ${expected.observed_status} / ${expected.rule_id}`, async () => {
    assert.equal(sha256(frozen.evidence[expected.evidence_hash]), expected.evidence_hash);
    assert.equal(sha256(expected.input), expected.input_hash);
    const finding = await replay(expected.input);
    assert.equal(finding.status, expected.observed_status);
    assert.equal(finding.rule_id, expected.rule_id);
    assert.equal(finding.finding_id, expected.finding_id);
    assert.deepEqual(
      finding.field_comparisons.map(({ field, result }) => ({ field, result })),
      expected.field_comparisons.map(({ field, result }) => ({ field, result })),
    );
  });
}

test('H1–H5 frozen evidence carries no credential and no URL except the bibliographic DOI', () => {
  const serialized = JSON.stringify(frozen.evidence) + JSON.stringify(frozen.record_confirmations);
  assert.equal(/key=|authorization|public_url|\[REDACTED\]|open\.kci\.go\.kr|kciportal/i.test(serialized), false);
  const urls = serialized.match(/https?:\/\/[^"\s]+/g) ?? [];
  assert.ok(urls.every(url => url.startsWith('http://dx.doi.org/')));
});
