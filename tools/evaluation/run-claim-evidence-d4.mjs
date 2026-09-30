// D4 — valid but unrelated reference. End-to-end against LIVE KCI with the existing engines unchanged:
// bibliography -> Citation Integrity (batch) -> draft marker resolution -> KCI abstract -> Claim–Evidence gate.
// Writes a sanitized observation file only. Usage:
//   node --env-file-if-exists=.env.local tools/evaluation/run-claim-evidence-d4.mjs <output.json>
import { createHash } from 'node:crypto';
import { writeFile } from 'node:fs/promises';
import { canonicalJson, createKciAdapter } from '../../src/kci/adapter.js';
import { createCitationAuditService } from '../../src/citation/audit.js';
import { createCitationBatchService } from '../../src/citation/batch.js';
import { parseReferenceList } from '../../src/citation/reference-parser.js';
import { alignClaimWithEvidence, sanitizeAbstractEvidence } from '../../src/claim-evidence/align.js';
import { resolveCitationMarker } from '../../src/claim-evidence/draft.js';
import { recordingAdapter } from './sanitize.mjs';

const outputPath = process.argv[2];
if (!outputPath) throw new Error('output path required');
const sha256 = value => createHash('sha256').update(canonicalJson(value), 'utf8').digest('hex');

// Fixed before execution. Both rows are exact, uncorrupted citations of real, already-qualified KCI records.
const BIBLIOGRAPHY = [
  '[1] 김미엘, 김미선, 최은숙, 권호범, 박영석 (2025). Computer simulation on the role of interproximal contacts in occlusal force transmission. 구강회복응용과학지, 41(4), 267-275. https://doi.org/10.14368/jdras.2025.41.4.267',
  '[2] 장만, 신승수 (2024). Computer Vision-based Basketball Player Training System. 디지털콘텐츠학회논문지, 25(3), 595-605. https://doi.org/10.9728/dcs.2024.25.3.595',
].join('\n');
const CLAIM = 'The simulation results suggest a limit in the load-sharing capacity of interproximal contacts, as most additional load was dissipated locally at the first molar';
const DRAFTS = [
  { case_id: 'D4', provenance: 'CONTROLLED_PERTURBATION', design: 'Claim grounded in ART003267604 cites [2], a real, valid but unrelated KCI record (ART003062835).', draft_sentence: `${CLAIM} [2].` },
  { case_id: 'D4-CONTRAST', provenance: 'CONTROLLED_PERTURBATION', design: 'Identical sentence citing [1], the record the claim is actually grounded in. Isolates the reference as the only difference.', draft_sentence: `${CLAIM} [1].` },
];

// Keeps each articleDetail record (with abstract) for Claim–Evidence; recordingAdapter keeps sanitized citation evidence.
const detailRecords = new Map();
const live = createKciAdapter();
const capturing = {
  articleSearch: input => live.articleSearch(input),
  async articleDetail(id) {
    const response = await live.articleDetail(id);
    if (response.state === 'KCI_OK' && response.records?.[0]) detailRecords.set(id, response.records[0]);
    return response;
  },
};
const recorder = recordingAdapter(capturing);
const { rows } = parseReferenceList(BIBLIOGRAPHY);
const batch = await createCitationBatchService({ auditService: createCitationAuditService({ kciAdapter: recorder }) }).auditBatch({ references: rows });

let traceIndex = 0;
const citationRows = batch.items.map(item => {
  const evidence = item.outcome === 'AUDITED' ? recorder.traces[traceIndex++] : null;
  return {
    index: item.index,
    raw: rows[item.index - 1].raw,
    parse_status: item.parse_status,
    input: item.input,
    input_hash: sha256(item.input),
    outcome: item.outcome,
    observed_status: item.finding?.status ?? null,
    system_state: item.finding?.system_state ?? null,
    rule_id: item.finding?.rule_id ?? null,
    finding_id: item.finding?.finding_id ?? item.finding?.failure_id ?? null,
    kci_record_id: item.finding?.evidence?.[0]?.source_record_id ?? null,
    field_comparisons: (item.finding?.field_comparisons ?? []).map(({ field, result }) => ({ field, result })),
    frozen_evidence: evidence,
    evidence_hash: evidence ? sha256(evidence) : null,
  };
});

const abstractEvidence = {};
const cases = DRAFTS.map(draft => {
  const resolution = resolveCitationMarker(draft.draft_sentence, rows);
  const citation = resolution.resolved ? citationRows[resolution.row.index - 1] : null;
  // Layer 3 runs only when Citation Integrity identified a coherent KCI record for the cited row.
  const identified = citation && ['VERIFIED', 'METADATA_DRIFT'].includes(citation.observed_status) && citation.kci_record_id;
  let finding = null;
  if (identified) {
    const evidence = sanitizeAbstractEvidence(detailRecords.get(citation.kci_record_id));
    abstractEvidence[citation.kci_record_id] = evidence;
    finding = alignClaimWithEvidence({ citingClaim: resolution.citing_claim, evidence });
  }
  return {
    ...draft,
    marker: resolution.marker ?? null,
    resolved_by: resolution.resolved_by ?? null,
    resolved_row_index: resolution.row?.index ?? null,
    citing_claim: resolution.citing_claim ?? null,
    citation_integrity: citation ? { status: citation.observed_status, rule_id: citation.rule_id, kci_record_id: citation.kci_record_id } : null,
    claim_evidence: finding ? {
      status: finding.status, signal: finding.signal, rule_id: finding.rule_id, rule_version: finding.rule_version,
      insufficiency_reason: finding.insufficiency_reason, evidence_span: finding.evidence_span, grounding: finding.grounding,
      why: finding.why, human_review_required: finding.human_review_required, evidence_hash: finding.evidence_hash,
      finding_id: finding.finding_id, processing_version: finding.processing_version,
    } : null,
  };
});

await writeFile(outputPath, JSON.stringify({ bibliography: BIBLIOGRAPHY, citation_rows: citationRows, abstract_evidence: abstractEvidence, cases }, null, 2));
console.log('written', outputPath);
