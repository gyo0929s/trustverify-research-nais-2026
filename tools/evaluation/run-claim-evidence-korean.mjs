// Korean Claim–Evidence qualification (K1, K2) against LIVE KCI. Existing adapter and engines unchanged.
// Per paper: articleDetail -> citation from canonical metadata -> Citation Integrity -> trace (control, perturbation).
// Usage: node --env-file-if-exists=.env.local tools/evaluation/run-claim-evidence-korean.mjs <output.json>
import { createHash } from 'node:crypto';
import { writeFile } from 'node:fs/promises';
import { canonicalJson, createKciAdapter } from '../../src/kci/adapter.js';
import { createCitationAuditService } from '../../src/citation/audit.js';
import { createFrozenEvidenceAdapter } from '../../src/citation/frozen-evidence.js';
import { alignClaimWithEvidence, sanitizeAbstractEvidence } from '../../src/claim-evidence/align.js';
import { traceDraftCitation } from '../../src/claim-evidence/trace.js';
import { recordingAdapter, sanitizeRecord } from './sanitize.mjs';

const outputPath = process.argv[2];
if (!outputPath) throw new Error('output path required');
const sha256 = value => createHash('sha256').update(canonicalJson(value), 'utf8').digest('hex');

// Fixed before execution (claims exactly as specified; all CONTROLLED_PERTURBATION provenance).
const CASES = [
  {
    case_id: 'K1', article_id: 'ART001298965', topic: '행동경제학 · 투자자보호',
    control: '인간이 가지는 인지적인 한계와 편향들에 대한 고려를 충분히 한 법제는 자본시장을 발전시키는 법제가 될 것이다 [1].',
    perturbation: '인간이 가지는 인지적인 한계와 편향들에 대한 고려를 충분히 한 법제를 도입하면 자본시장은 반드시 발전한다 [1].',
  },
  {
    case_id: 'K2', article_id: 'ART003117733', topic: 'ESG 지속가능성 공시',
    control: '투자자문사가 투자 프로세스에 포함하는 ESG 요인 정보를 정확하게 공시하지 않거나 ESG 투자방침이나 절차에 미비가 있는 경우, 미국 SEC가 제재금을 부과한 사례가 있다 [1].',
    perturbation: '투자자문사가 투자 프로세스에 포함하는 ESG 요인 정보를 정확하게 공시하지 않거나 ESG 투자방침이나 절차에 미비가 있으면 미국 SEC는 반드시 제재금을 부과한다 [1].',
  },
];

const live = createKciAdapter();
const results = [];
for (const testCase of CASES) {
  const detail = await live.articleDetail(testCase.article_id);
  if (detail.state !== 'KCI_OK') { results.push({ ...testCase, detail_state: detail.state }); continue; }
  const record = detail.records[0];
  const metadata = sanitizeRecord(record);
  const citation = {
    title: record.titles.find(title => title.lang === 'original')?.value ?? record.titles[0].value,
    authors: record.authors.map(author => author.name),
    publication_year: record.publication_year,
    ...(record.doi_normalized ? { doi: record.doi_normalized } : {}),
  };
  const recorder = recordingAdapter(live);
  const finding = await createCitationAuditService({ kciAdapter: recorder }).auditCitation(citation);
  const citationEvidence = recorder.traces[0] ?? null;
  const abstractEvidence = sanitizeAbstractEvidence(record);

  // Bibliography row [1] from canonical metadata; the trace re-runs Citation Integrity over the captured evidence.
  const m = metadata;
  const reference = `[1] ${citation.authors.join(', ')} (${m.publication_year}). ${citation.title}. ${m.journal}, ${m.volume}(${m.issue}), ${m.first_page}-${m.last_page}.${m.doi_normalized ? ` https://doi.org/${m.doi_normalized}` : ''}`;
  const frozen = {
    items: citationEvidence ? [{ input: citation, evidence_hash: sha256(citationEvidence) }] : [],
    evidence: citationEvidence ? { [sha256(citationEvidence)]: citationEvidence } : {},
    abstract_evidence: { [testCase.article_id]: abstractEvidence },
  };
  const adapter = createFrozenEvidenceAdapter(frozen);
  const deps = { auditService: createCitationAuditService({ kciAdapter: adapter }), covers: c => adapter.covers(c), abstractEvidenceFor: id => frozen.abstract_evidence[id] ?? null };
  const traces = {};
  for (const variant of ['control', 'perturbation']) {
    const trace = await traceDraftCitation({ draftText: testCase[variant], references: [reference], evidenceMode: 'FROZEN_EVIDENCE' }, deps);
    const detailFinding = trace.citing_claim ? alignClaimWithEvidence({ citingClaim: trace.citing_claim, evidence: abstractEvidence }) : null;
    traces[variant] = { trace, grounding: detailFinding?.grounding ?? null, observed: detailFinding?.observed ?? null };
  }
  results.push({
    ...testCase, detail_state: detail.state, metadata, citation, reference,
    citation_integrity_live: {
      kind: finding.kind, status: finding.status ?? null, system_state: finding.system_state ?? null, rule_id: finding.rule_id ?? null,
      article_id: finding.evidence?.[0]?.source_record_id ?? null, finding_id: finding.finding_id ?? finding.failure_id,
      field_comparisons: (finding.field_comparisons ?? []).map(({ field, result }) => ({ field, result })),
    },
    frozen, traces,
  });
}
await writeFile(outputPath, JSON.stringify(results, null, 2));
console.log('written', outputPath);
