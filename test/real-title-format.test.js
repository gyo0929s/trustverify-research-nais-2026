import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { createCitationAuditService } from '../src/citation/audit.js';
import { normalizeText } from '../src/citation/normalize.js';

// REAL-TITLE-FORMAT-001: frozen real-world robustness case. Fully offline, static title pair only.
// Current identity normalization does not fold quotation-mark variants or adjacent whitespace,
// so this pins REVIEW_REQUIRED / REF-ID-002. Do not change this expectation to VERIFIED until
// title-normalization-v1.1 passes its activation criteria (docs/CITATION_AUDIT_RULES.md).
const fixture = JSON.parse(await readFile(
  new URL('./fixtures/kci/real-title-format-001.json', import.meta.url), 'utf8',
));

function offlineAdapter({ detailResult } = {}) {
  const calls = { search: 0, detail: 0 };
  return {
    calls,
    async articleSearch() {
      calls.search += 1;
      return {
        state: 'KCI_OK',
        messages: [],
        total: fixture.observed_search_total,
        records: [{
          source_record_id: fixture.source_record_id,
          titles: structuredClone(fixture.kci_titles),
          ...structuredClone(fixture.kci_metadata),
          authors: fixture.kci_metadata.authors.map(name => ({ name })),
        }],
      };
    },
    async articleDetail() {
      calls.detail += 1;
      if (!detailResult) throw new Error('articleDetail must not be called for this case');
      return structuredClone(detailResult);
    },
  };
}

async function withNetworkBlocked(run) {
  const realFetch = globalThis.fetch;
  globalThis.fetch = () => { throw new Error('Live network access is forbidden in this regression test'); };
  try { return await run(); } finally { globalThis.fetch = realFetch; }
}

test('REAL-TITLE-FORMAT-001: fixture is static and carries no credential or URL', () => {
  const serialized = JSON.stringify(fixture);
  assert.equal(fixture.case_id, 'REAL-TITLE-FORMAT-001');
  assert.equal(/https?:\/\/|key=|\[REDACTED\]/i.test(serialized), false);
  assert.ok(fixture.pdf_title.includes('‘') && fixture.pdf_title.includes('’'));
  assert.ok(fixture.kci_titles[0].value.includes('＂'));
});

test('REAL-TITLE-FORMAT-001: current normalization keeps PDF and KCI titles distinct (known gap)', () => {
  assert.notEqual(normalizeText(fixture.pdf_title), normalizeText(fixture.kci_titles[0].value));
});

test('REAL-TITLE-FORMAT-001: PDF title variant currently yields REVIEW_REQUIRED / REF-ID-002', async () => {
  const adapter = offlineAdapter();
  const result = await withNetworkBlocked(() => createCitationAuditService({ kciAdapter: adapter })
    .auditCitation({ title: fixture.pdf_title, authors: ['최승재'], publication_year: '2008' }));

  assert.equal(result.kind, fixture.expected_current.kind);
  assert.equal(result.status, fixture.expected_current.status);
  assert.equal(result.rule_id, fixture.expected_current.rule_id);
  assert.notEqual(result.status, 'VERIFIED');
  assert.deepEqual(result.evidence.map(item => item.source_record_id), [fixture.source_record_id]);
  assert.deepEqual(result.field_comparisons, []);
  assert.equal(result.human_review_required, true);
  assert.equal(adapter.calls.search, 1);
  assert.equal(adapter.calls.detail, 0);
});

test('REAL-TITLE-FORMAT-001 control: the KCI canonical title string passes identity and reaches articleDetail', async () => {
  const adapter = offlineAdapter({ detailResult: { state: 'KCI_UNAVAILABLE', messages: [], records: [], total: null } });
  const result = await withNetworkBlocked(() => createCitationAuditService({ kciAdapter: adapter })
    .auditCitation({ title: fixture.kci_titles[0].value }));

  assert.equal(adapter.calls.detail, 1);
  assert.equal(result.kind, 'SYSTEM_FAILURE');
  assert.equal(result.operation, 'articleDetail');
});
