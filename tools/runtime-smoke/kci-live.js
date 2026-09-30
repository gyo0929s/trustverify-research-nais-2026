import { mkdir, writeFile } from 'node:fs/promises';
import { performance } from 'node:perf_hooks';
import { classifyKciResponse, createKciAdapter } from '../../src/kci/adapter.js';

const apiKey = process.env.KCI_API_KEY;
if (typeof apiKey !== 'string' || !apiKey.trim()) {
  throw new Error('KCI_API_KEY is required');
}

const adapter = createKciAdapter({ apiKey });
const outputPath = new URL('../../artifacts/runtime-smoke/kci/2026-09-30-summary.json', import.meta.url);

async function timed(call) {
  const started = performance.now();
  const response = await call();
  return { response, latency_ms: Math.round(performance.now() - started) };
}

function safeDiagnostics(name, expectedState, timedResponse) {
  const { response, latency_ms } = timedResponse;
  const first = response.records[0] ?? null;
  const serializedRecord = first === null ? null : JSON.stringify(first);
  const secretAbsent = !JSON.stringify(response).includes(apiKey)
    && (serializedRecord === null || !serializedRecord.includes(apiKey));

  return {
    request: name,
    expected_state: expectedState,
    state: response.state,
    latency_ms,
    record_count: response.records.length,
    total: response.total,
    source_record_id: first?.source_record_id ?? null,
    normalized_content_sha256: first?.normalized_content_sha256 ?? null,
    redacted_snapshot_sha256: response.redacted_snapshot_sha256 ?? null,
    secret_absent_from_adapter_output: secretAbsent,
    normalized_record_serializable: first === null ? null : serializedRecord !== null,
    eligible_for_citation_comparison: response.eligible_for_citation_comparison,
    eligible_for_not_found_in_kci: response.eligible_for_not_found_in_kci,
  };
}

const positive = await timed(() => adapter.articleSearch({ title: '컴퓨터', displayCount: 3 }));
if (positive.response.state !== 'KCI_OK' || positive.response.records.length === 0) {
  throw new Error(`Live search failed closed with state ${positive.response.state}`);
}

const sourceRecordId = positive.response.records[0].source_record_id;
const detail = await timed(() => adapter.articleDetail(sourceRecordId));
if (detail.response.state !== 'KCI_OK'
  || detail.response.records.length !== 1
  || detail.response.records[0].source_record_id !== sourceRecordId) {
  throw new Error(`Live detail failed closed with state ${detail.response.state}`);
}

const zero = await timed(() => adapter.articleSearch({
  title: 'TrustVerifyRuntimeSmokeNoSuchTitle7f924d9e6a824bcaa5c12026',
  displayCount: 1,
}));
if (zero.response.state !== 'KCI_ZERO_RESULTS') {
  throw new Error(`Live zero search failed closed with state ${zero.response.state}`);
}

const searchDiagnostics = safeDiagnostics('articleSearch-positive', 'KCI_OK', positive);
const detailDiagnostics = safeDiagnostics('articleDetail', 'KCI_OK', detail);
const zeroDiagnostics = safeDiagnostics('articleSearch-zero', 'KCI_ZERO_RESULTS', zero);
const responses = [positive.response, detail.response, zero.response];
const syntheticTransportFailure = classifyKciResponse({
  operation: 'articleSearch',
  transportFailure: true,
});

const summary = {
  schema_version: 'kci-runtime-smoke-v1',
  run_date: '2026-09-30',
  implementation_under_test: 'src/kci/adapter.js',
  live_call_count: 3,
  requests: [searchDiagnostics, detailDiagnostics, zeroDiagnostics],
  checks: {
    search_detail_identity_match: detailDiagnostics.source_record_id === searchDiagnostics.source_record_id,
    zero_result_preserved: zeroDiagnostics.state === 'KCI_ZERO_RESULTS'
      && zeroDiagnostics.eligible_for_not_found_in_kci === true,
    no_research_finding_emitted: responses.every(response => !Object.hasOwn(response, 'finding')
      && !Object.hasOwn(response, 'status')),
    system_failure_not_eligible_for_not_found: syntheticTransportFailure.state === 'KCI_UNAVAILABLE'
      && syntheticTransportFailure.eligible_for_not_found_in_kci === false
      && !Object.hasOwn(syntheticTransportFailure, 'finding')
      && !Object.hasOwn(syntheticTransportFailure, 'status'),
    snapshots_redacted: [searchDiagnostics, detailDiagnostics, zeroDiagnostics]
      .every(item => item.secret_absent_from_adapter_output && item.redacted_snapshot_sha256 !== null),
    normalized_records_serializable: searchDiagnostics.normalized_record_serializable === true
      && detailDiagnostics.normalized_record_serializable === true,
  },
};

if (!Object.values(summary.checks).every(Boolean)) {
  throw new Error('Live smoke invariant failed');
}

await mkdir(new URL('../../artifacts/runtime-smoke/kci/', import.meta.url), { recursive: true });
await writeFile(outputPath, `${JSON.stringify(summary, null, 2)}\n`, { encoding: 'utf8', flag: 'wx' });
console.log('KCI live runtime smoke passed: 3 calls; safe derived summary written.');
