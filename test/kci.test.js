import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile, mkdtemp, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { createHash } from 'node:crypto';
import { classifyKciResponse, createKciAdapter, persistRedactedSnapshot, normalizeDoi, canonicalJson, KCI_STATES } from '../src/kci/adapter.js';

const fixtures = {};
for (const name of ['success-search', 'success-detail', 'zero-result', 'invalid-request']) {
  fixtures[name] = JSON.parse((await readFile(new URL(`../artifacts/api-qualification/kci/${name}.redacted.json`, import.meta.url), 'utf8')).replace(/^\uFEFF/, '')).response_xml;
}
const classify = (body, extra = {}) => classifyKciResponse({ body, operation: 'articleSearch', ...extra });
const detail = extra => classify(fixtures['success-detail'], { operation: 'articleDetail', expectedId: 'ART003062835', ...extra });
const changeResult = contents => fixtures['zero-result'].replace(/<result>.*?<\/result>/s, `<result>${contents}</result>`);
function failure(result, state = 'KCI_INVALID_RESPONSE') {
  assert.equal(result.state, state);
  assert.equal(result.eligible_for_citation_comparison, false);
  assert.equal(result.eligible_for_not_found_in_kci, false);
  assert.deepEqual(result.records, []);
  assert.equal(Object.hasOwn(result, 'finding'), false);
}

test('positive search: pagination total, multilingual titles, source-order authors and DOI', () => {
  const r = classify(fixtures['success-search']);
  assert.equal(r.state, 'KCI_OK');
  assert.equal(r.total, 2814);
  assert.equal(r.records.length, 3);
  assert.equal(r.eligible_for_citation_comparison, true);
  assert.equal(r.eligible_for_not_found_in_kci, false);
  const first = r.records[0];
  assert.equal(first.source_record_id, 'ART003062835');
  assert.deepEqual(first.titles.map(t => t.lang), ['original', 'foreign', 'english']);
  assert.deepEqual(first.authors.map(a => a.name), ['장만', '신승수']);
  assert.match(first.authors[0].affiliations[0].value, /Tongmyong University/);
  assert.equal(first.authors[0].english_name, 'Man Zhang');
  assert.equal(first.doi_raw, 'http://dx.doi.org/10.9728/dcs.2024.25.3.595');
  assert.equal(first.doi_normalized, '10.9728/dcs.2024.25.3.595');
  assert.equal(first.issn, null);
  assert.equal(first.authors[0].orcid, null);
  assert.equal(r.records[2].authors[0].orcid, '0000-0002-3280-6821');
});

test('positive detail normalizes observed fields and provenance', () => {
  const r = detail();
  assert.equal(r.state, 'KCI_OK');
  const a = r.records[0];
  assert.equal(a.source_system, 'KCI');
  assert.equal(a.journal_id, '001943');
  assert.equal(a.issn, '1598-2009');
  assert.equal(a.publication_year, '2024');
  assert.equal(a.publication_month, '03');
  assert.equal(a.volume, '25');
  assert.equal(a.issue, '3');
  assert.equal(a.first_page, '595');
  assert.equal(a.last_page, '605');
  assert.equal(a.authors[0].name, '장만');
  assert.equal(a.authors[1].english_name, 'Seung-Soon Shin');
  assert.match(a.authors[0].affiliations[0].source_path, /institution\[1\]$/);
  assert.equal(a.abstracts.length, 2);
  assert.equal(a.keywords.length, 10);
  assert.match(a.public_url, /ART003062835$/);
  assert.equal(a.normalizer_version, 'kci-normalizer-v1');
  assert.equal(Object.hasOwn(a, 'publication_day'), false);
  assert.equal(Object.hasOwn(a, 'full_text'), false);
});

test('valid zero without total alone enables not-found eligibility', () => {
  const r = classify(fixtures['zero-result']);
  assert.equal(r.state, 'KCI_ZERO_RESULTS');
  assert.equal(r.total, null);
  assert.deepEqual(r.messages, ['No Data']);
  assert.equal(r.eligible_for_not_found_in_kci, true);
  assert.equal(r.eligible_for_citation_comparison, false);
});

test('invalid request preserves both messages as an array, never a finding', () => {
  const r = classify(fixtures['invalid-request'], { operation: 'articleDetail' });
  failure(r);
  assert.deepEqual(r.messages, ['필수 요청 파라미터가 없음 => id', '검색 조건이 없습니다.']);
});

test('missing positive total is not zero or success', () => failure(classify(fixtures['success-search'].replace('<total>2814</total>', ''))));
test('missing total and messages is invalid', () => failure(classify(changeResult(''))));
test('multiple and mixed resultMsg fail closed', () => {
  for (const messages of ['<resultMsg>No Data</resultMsg><resultMsg>error</resultMsg>', '<resultMsg>No Data</resultMsg><resultMsg>No Data</resultMsg>', '<resultMsg>unknown</resultMsg>']) failure(classify(changeResult(messages)));
});
test('positive records mixed with messages fail closed', () => failure(classify(fixtures['success-search'].replace('<total>2814</total>', '<total>2814</total><resultMsg>No Data</resultMsg>'))));
test('malformed XML and DTD fail without leaking input', () => {
  for (const body of ['<MetaData>', '<a/><b/>', '<!DOCTYPE a [<!ENTITY x SYSTEM "file:///private">]><a>&x;</a>', '<a>&unknown;</a>']) {
    const r = classify(body); failure(r, 'KCI_PARSE_FAILED'); assert.equal(r.redacted_snapshot, undefined);
  }
});
test('unknown envelopes and duplicate structural nodes fail closed', () => {
  for (const body of ['<unknown/>', '<MetaData><outputData/></MetaData>', fixtures['zero-result'].replace('</outputData>', '<result/></outputData>'), fixtures['zero-result'].replace('</result>', '<unexpected/></result>')]) failure(classify(body));
});
test('well-formed namespaces and wrong echoed query are invalid envelopes', () => {
  failure(classify(fixtures['zero-result'].replace('<MetaData>', '<MetaData xmlns="urn:unknown">')));
  failure(classify(fixtures['zero-result'], { expectedTitle: 'different query' }));
  failure(classify(fixtures['success-search'].replace('<record>', '<record>unexpected text')));
});
test('KCI verified=Y never emits TrustVerify VERIFIED', () => {
  const r = detail();
  assert.equal(r.state, 'KCI_OK');
  assert.equal(Object.hasOwn(r.records[0], 'verified'), false);
  assert.equal(Object.hasOwn(r.records[0], 'status'), false);
  assert.equal(Object.hasOwn(r, 'finding'), false);
});
test('reference refebibl-id never becomes an article identity', () => {
  assert.equal(detail().records.length, 1);
  failure(classify(fixtures['success-detail'].replace('article-id="ART003062835"', 'refebibl-id="REF070031837"'), { operation: 'articleDetail', expectedId: 'ART003062835' }));
});
test('detail must match the requested ID, and detail No Data is not search zero', () => {
  failure(detail({ expectedId: 'ART999999999' }));
  failure(classify(fixtures['zero-result'].replace('articleSearch', 'articleDetail'), { operation: 'articleDetail', expectedId: 'ART003062835' }));
  failure(classify(fixtures['zero-result'], { operation: 'articleDetail' }));
});
test('count contradictions, duplicates, and missing title are invalid', () => {
  for (const total of ['0', '-1', 'two', '1', '9007199254740992']) failure(classify(fixtures['success-search'].replace('<total>2814</total>', `<total>${total}</total>`)));
  failure(classify(fixtures['success-search'].replace('ART003141185', 'ART003062835')));
  failure(classify(fixtures['success-search'].replace(/<title-group>.*?<\/title-group>/s, '')));
  failure(classify(changeResult('<total>3</total><resultMsg>No Data</resultMsg>')));
  failure(classify(changeResult('<total>0</total>')));
});
test('documented auth messages are separate; mixed auth is invalid (synthetic)', () => {
  for (const message of ['등록되지 않은 key 입니다', '사용기간이 종료되었습니다.']) failure(classify(changeResult(`<resultMsg>${message}</resultMsg>`)), 'KCI_AUTH_FAILED');
  failure(classify(changeResult('<resultMsg>등록되지 않은 key 입니다</resultMsg><resultMsg>No Data</resultMsg>')));
});
test('HTTP failures cannot become successful zero or positive evidence', () => {
  failure(classify(fixtures['zero-result'], { status: 503 }), 'KCI_UNAVAILABLE');
  failure(classify(fixtures['success-search'], { status: 429 }), 'KCI_UNAVAILABLE');
  for (const status of [302, 400, 401, 403]) failure(classify(fixtures['zero-result'], { status }));
  failure(classify('not XML', { status: 503 }), 'KCI_PARSE_FAILED');
  failure(classify(null, { transportFailure: true }), 'KCI_UNAVAILABLE');
});
test('DOI derivation retains raw input and handles absence without inventing DOI', () => {
  assert.equal(normalizeDoi(' DOI:10.1234/ABC(X). '), '10.1234/abc(x).');
  assert.equal(normalizeDoi('https://doi.org/10.1234/ABC'), '10.1234/abc');
  for (const raw of [null, '', 'not a DOI']) assert.equal(normalizeDoi(raw), null);
  const r = classify(fixtures['success-search'].replace(/<doi>.*?<\/doi>/s, '<doi/>'));
  assert.equal(r.records[0].doi_raw, '');
  assert.equal(r.records[0].doi_normalized, null);
});
test('content hashes exclude timestamps and response position; metadata changes affect identity', () => {
  const a = detail({ retrievedAt: '2026-01-01T00:00:00Z' });
  const b = detail({ retrievedAt: '2026-02-01T00:00:00Z' });
  assert.equal(a.records[0].normalized_content_sha256, b.records[0].normalized_content_sha256);
  const c = classify(fixtures['success-detail'].replace('<pub-year>2024</pub-year>', '<pub-year>2023</pub-year>'), { operation: 'articleDetail', expectedId: 'ART003062835' });
  assert.notEqual(a.records[0].normalized_content_sha256, c.records[0].normalized_content_sha256);
  const original = classify(fixtures['success-search']);
  const firstRecord = fixtures['success-search'].match(/<record>.*?<\/record>/s)[0];
  const shifted = classify(fixtures['success-search'].replace(firstRecord, ''));
  assert.equal(original.records[1].normalized_content_sha256, shifted.records[0].normalized_content_sha256);
  assert.equal(canonicalJson({ b: 2, a: 1 }), canonicalJson({ a: 1, b: 2 }));
});
test('decoded credentials and authenticated URLs are redacted before return/persistence', async () => {
  const secret = 'test-secret-only-ABC';
  const encoded = [...secret].map(c => `&#${c.charCodeAt(0)};`).join('');
  const body = fixtures['zero-result'].replace('[REDACTED]', encoded).replace('</inputData>', `<echo>https://example.test/?key=${secret}</echo></inputData>`);
  const r = classify(body, { apiKey: secret });
  assert.equal(JSON.stringify(r).includes(secret), false);
  assert.equal(r.redacted_snapshot.includes('https://example.test/'), false);
  const dir = await mkdtemp(join(tmpdir(), 'kci-snapshot-'));
  try {
    const path = join(dir, 'snapshot.json');
    await persistRedactedSnapshot(path, r);
    const bytes = await readFile(path);
    assert.equal(createHash('sha256').update(bytes).digest('hex'), r.redacted_snapshot_sha256);
    await assert.rejects(persistRedactedSnapshot(path, r));
    await assert.rejects(persistRedactedSnapshot(join(dir, 'tampered'), { ...r, redacted_snapshot: 'tampered' }));
  } finally { await rm(dir, { recursive: true, force: true }); }
});
test('transport sends expected operations, disables redirects, and normalizes fixture responses', async () => {
  const calls = [];
  const adapter = createKciAdapter({ apiKey: 'synthetic-secret', fetchImpl: async (url, options) => {
    calls.push({ url, options });
    return new Response(url.searchParams.get('apiCode') === 'articleSearch' ? fixtures['success-search'] : fixtures['success-detail']);
  } });
  assert.equal((await adapter.articleSearch({ title: '컴퓨터' })).state, 'KCI_OK');
  assert.equal((await adapter.articleDetail('ART003062835')).state, 'KCI_OK');
  assert.equal(calls[0].url.hostname, 'open.kci.go.kr');
  assert.equal(calls[0].url.searchParams.get('title'), '컴퓨터');
  assert.equal(calls[1].url.searchParams.get('id'), 'ART003062835');
  assert.equal(calls[0].options.redirect, 'error');
});
test('transport exceptions and timeouts return system failures without secrets', async () => {
  const key = 'synthetic-test-key';
  const a = createKciAdapter({ apiKey: key, fetchImpl: async () => { throw new Error(`https://example.test/?key=${key}`); } });
  const result = await a.articleSearch({ title: 'test' });
  failure(result, 'KCI_UNAVAILABLE');
  assert.equal(JSON.stringify(result).includes(key), false);
  const b = createKciAdapter({ apiKey: key, timeoutMs: 10, fetchImpl: () => new Promise(() => {}) });
  failure(await b.articleSearch({ title: 'test' }), 'KCI_UNAVAILABLE');
});
test('oversized and invalid UTF-8 responses are bounded failures', async () => {
  const a = createKciAdapter({ apiKey: 'test-key', maxResponseBytes: 10, fetchImpl: async () => new Response(fixtures['zero-result']) });
  failure(await a.articleSearch({ title: 'test' }));
  const b = createKciAdapter({ apiKey: 'test-key', fetchImpl: async () => new Response(new Uint8Array([0xff])) });
  failure(await b.articleSearch({ title: 'test' }), 'KCI_PARSE_FAILED');
});
test('invalid local inputs never make network calls', async () => {
  let calls = 0;
  const adapter = createKciAdapter({ apiKey: 'test-key', fetchImpl: async () => { calls++; } });
  failure(await adapter.articleSearch({ title: '' }));
  failure(await adapter.articleSearch(null));
  failure(await adapter.articleSearch([]));
  failure(await adapter.articleSearch({ title: 'test', page: 0 }));
  failure(await adapter.articleDetail('REF070031837'));
  assert.equal(calls, 0);
  assert.throws(() => createKciAdapter({ apiKey: '' }), /credential required/);
  assert.equal(KCI_STATES.length, 6);
});
