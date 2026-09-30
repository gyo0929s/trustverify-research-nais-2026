// Finance-domain D4 qualification (LIVE). Existing adapter and engines unchanged.
// Stage "qualify": articleDetail + Citation Integrity for both records, abstracts and anchor inventory.
// Usage: node --env-file-if-exists=.env.local tools/evaluation/run-claim-evidence-finance-d4.mjs qualify <output.json>
import { createHash } from 'node:crypto';
import { writeFile } from 'node:fs/promises';
import { canonicalJson, createKciAdapter } from '../../src/kci/adapter.js';
import { createCitationAuditService } from '../../src/citation/audit.js';
import { sanitizeAbstractEvidence } from '../../src/claim-evidence/align.js';
import { recordingAdapter, sanitizeRecord } from './sanitize.mjs';

const [stage, outputPath] = process.argv.slice(2);
if (stage !== 'qualify' || !outputPath) throw new Error('usage: qualify <output.json>');
const sha256 = value => createHash('sha256').update(canonicalJson(value), 'utf8').digest('hex');
const RECORD_IDS = { SOURCE_A: 'ART002961723', SOURCE_B: 'ART002510435' };

const live = createKciAdapter();
const out = {};
for (const [role, id] of Object.entries(RECORD_IDS)) {
  const detail = await live.articleDetail(id);
  if (detail.state !== 'KCI_OK') { out[role] = { article_id: id, detail_state: detail.state }; continue; }
  const record = detail.records[0];
  const meta = sanitizeRecord(record);
  // Citation built only from the qualified canonical metadata (original title, KCI author names in order, year, DOI).
  const citation = {
    title: record.titles.find(title => title.lang === 'original')?.value ?? record.titles[0].value,
    authors: record.authors.map(author => author.name),
    publication_year: record.publication_year,
    ...(record.doi_normalized ? { doi: record.doi_normalized } : {}),
  };
  const recorder = recordingAdapter(live);
  const finding = await createCitationAuditService({ kciAdapter: recorder }).auditCitation(citation);
  const citationEvidence = recorder.traces[0] ?? null;
  out[role] = {
    article_id: id,
    detail_state: detail.state,
    metadata: meta,
    citation,
    citation_integrity: {
      kind: finding.kind, status: finding.status ?? null, system_state: finding.system_state ?? null, rule_id: finding.rule_id ?? null,
      article_id: finding.evidence?.[0]?.source_record_id ?? null, finding_id: finding.finding_id ?? finding.failure_id,
      field_comparisons: (finding.field_comparisons ?? []).map(({ field, input_value, evidence_value, result }) => ({ field, input_value, evidence_value, result })),
      search_state: citationEvidence?.search?.state ?? null, detail_state: citationEvidence?.detail?.state ?? null,
    },
    citation_evidence: citationEvidence,
    citation_evidence_hash: citationEvidence ? sha256(citationEvidence) : null,
    abstract_evidence: sanitizeAbstractEvidence(record),
  };
}
await writeFile(outputPath, JSON.stringify(out, null, 2));
console.log('written', outputPath);
