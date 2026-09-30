// Runs the 6-item demo bibliography through parser -> batch orchestration -> existing single audit,
// against LIVE KCI. Writes a sanitized observation file only; nothing here decides a status.
// Usage: node --env-file-if-exists=.env.local tools/evaluation/run-batch-demo.mjs <output.json>
import { createHash } from 'node:crypto';
import { readFile, writeFile } from 'node:fs/promises';
import { canonicalJson, createKciAdapter } from '../../src/kci/adapter.js';
import { createCitationAuditService } from '../../src/citation/audit.js';
import { createCitationBatchService } from '../../src/citation/batch.js';
import { parseReferenceList } from '../../src/citation/reference-parser.js';
import { recordingAdapter } from './sanitize.mjs';

const outputPath = process.argv[2];
if (!outputPath) throw new Error('output path required');
const sha256 = value => createHash('sha256').update(canonicalJson(value), 'utf8').digest('hex');

const text = await readFile(new URL('../../test/fixtures/batch/demo-bibliography.txt', import.meta.url), 'utf8');
const { rows } = parseReferenceList(text);
const adapter = recordingAdapter(createKciAdapter());
const batch = await createCitationBatchService({ auditService: createCitationAuditService({ kciAdapter: adapter }) })
  .auditBatch({ references: rows });

// Each audited row issued exactly one articleSearch, in order, so traces align with audited rows.
let traceIndex = 0;
const items = batch.items.map(item => {
  const evidence = item.outcome === 'AUDITED' ? adapter.traces[traceIndex++] : null;
  const finding = item.finding;
  return {
    index: item.index,
    row_id: item.row_id,
    raw: rows[item.index - 1].raw,
    parse_status: item.parse_status,
    input: item.input,
    input_hash: sha256(item.input),
    outcome: item.outcome,
    execution_mode: 'LIVE',
    kind: finding?.kind ?? null,
    observed_status: finding?.status ?? null,
    system_state: finding?.system_state ?? null,
    rule_id: finding?.rule_id ?? null,
    finding_id: finding?.finding_id ?? finding?.failure_id ?? null,
    kci_record_ids: (finding?.evidence ?? []).map(entry => entry.source_record_id),
    field_comparisons: (finding?.field_comparisons ?? []).map(({ field, result }) => ({ field, result })),
    search_state: evidence?.search?.state ?? null,
    detail_state: evidence?.detail?.state ?? null,
    frozen_evidence: evidence,
    evidence_hash: evidence ? sha256(evidence) : null,
  };
});
if (traceIndex !== adapter.traces.length) throw new Error('trace alignment failed');

await writeFile(outputPath, JSON.stringify({ summary: batch.summary, items }, null, 2));
console.log('written', outputPath);
