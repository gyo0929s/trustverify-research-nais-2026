import { createHash } from 'node:crypto';
import { canonicalJson } from '../kci/adapter.js';
import {
  CLAIM_RULES, CONTRACT_VERSION, GROUNDING, INSUFFICIENCY_REASONS, PROCESSING_VERSION, RECORD_RELEVANCE, SIGNALS, STATUSES, TRACK,
} from './contract.js';
import { directionOf, levelOf, markerWords } from './markers.js';

/**
 * Claim–Evidence Alignment P0: deterministic, abstract-only.
 * 1. Evidence sufficiency gate: ground the citing sentence in exactly one abstract sentence.
 * 2. Compare expression dimensions between that span and the citing sentence.
 * 3. The status comes only from these rules; no external observer can change it.
 */
const sha256 = value => createHash('sha256').update(canonicalJson(value), 'utf8').digest('hex');
const digestId = (prefix, value) => `${prefix}-${sha256(value).slice(0, 16)}`;

const STOPWORDS = new Set(('a an the and or but of in on at to for from by with as is are was were be been being this that these those it its '
  + 'their there which who whom whose than then also into onto over under between within about such each most more other '
  + 'we our they them he she his her study studies paper article finding findings result results research author authors '
  + 'purpose method methods material materials conclusion conclusions introduction background objective aim aimed').split(/\s+/u));

function stem(word) {
  if (!/^[a-z]+$/u.test(word)) return word;
  if (word.length > 4 && word.endsWith('ies')) return `${word.slice(0, -3)}y`;
  if (word.length > 5 && word.endsWith('ing')) return word.slice(0, -3);
  if (word.length > 4 && word.endsWith('ed')) return word.slice(0, -2);
  if (word.length > 3 && word.endsWith('s') && !word.endsWith('ss')) return word.slice(0, -1);
  return word;
}

// Content anchors: normalized words that are not stopwords and not expression markers.
export function anchorsOf(text) {
  const normalized = text.normalize('NFKC').toLowerCase();
  const markers = markerWords(normalized);
  const anchors = new Set();
  for (const word of normalized.match(/[\p{L}\p{N}]+/gu) ?? []) {
    if (STOPWORDS.has(word) || markers.has(word)) continue;
    if (/^[a-z]+$/u.test(word) && word.length < 3) continue;
    anchors.add(stem(word));
  }
  return anchors;
}

export function splitSentences(text) {
  return text.normalize('NFKC').split(/(?<=[.!?])\s+(?=[\p{Lu}\p{Script=Hangul}"“(])/u).map(sentence => sentence.trim()).filter(Boolean);
}

const hasHangul = text => /\p{Script=Hangul}/u.test(text);

// Picks the abstract whose script matches the citing sentence (Korean vs non-Korean).
function abstractFor(evidence, citingClaim) {
  const wantKorean = hasHangul(citingClaim);
  return (evidence.abstracts ?? []).find(abstract => typeof abstract.value === 'string'
    && abstract.value.trim() && hasHangul(abstract.value) === wantKorean) ?? null;
}

/** Evidence sufficiency gate. Returns the grounded span or the reason it could not be grounded. */
export function groundClaim(citingClaim, abstract) {
  const citingAnchors = anchorsOf(citingClaim);
  const sentences = splitSentences(abstract.value);
  const candidates = sentences.map((sentence, index) => {
    const spanAnchors = anchorsOf(sentence);
    const shared = [...citingAnchors].filter(anchor => spanAnchors.has(anchor)).sort();
    return { index, sentence, shared, coverage: citingAnchors.size ? shared.length / citingAnchors.size : 0 };
  });
  const passing = candidates.filter(candidate => candidate.shared.length >= GROUNDING.MIN_SHARED_ANCHORS
    && candidate.coverage >= GROUNDING.MIN_COVERAGE)
    .sort((a, b) => b.shared.length - a.shared.length || b.coverage - a.coverage || a.index - b.index);
  const best = [...candidates].sort((a, b) => b.shared.length - a.shared.length || a.index - b.index)[0] ?? null;
  const base = { citing_anchor_count: citingAnchors.size, sentence_count: sentences.length, thresholds: { ...GROUNDING } };
  if (!passing.length) return { grounded: false, reason: 'NO_SENTENCE_MEETS_THRESHOLD', best_candidate: best, ...base };
  const [top, second] = passing;
  if (second && second.shared.length === top.shared.length && second.coverage === top.coverage) {
    return { grounded: false, reason: 'AMBIGUOUS_SPAN', best_candidate: top, ...base };
  }
  return { grounded: true, span: top, ...base };
}

/** Compares the monitored expression dimensions; returns observations and shift signals. */
export function compareExpression(spanText, citingClaim) {
  const source = spanText.normalize('NFKC');
  const citing = citingClaim.normalize('NFKC');
  const observed = {};
  const signals = [];
  for (const dimension of ['causality', 'modality', 'certainty', 'negation']) {
    const from = levelOf(dimension, source);
    const to = levelOf(dimension, citing);
    observed[dimension] = { evidence: from.level, citing: to.level, evidence_markers: from.markers, citing_markers: to.markers };
  }
  const direction = { from: directionOf(source), to: directionOf(citing) };
  observed.direction = { evidence: direction.from.levels, citing: direction.to.levels, evidence_markers: direction.from.markers, citing_markers: direction.to.markers };

  const { causality, modality, certainty, negation } = observed;
  if (causality.citing === 'CAUSAL' && causality.evidence !== 'CAUSAL') signals.push(SIGNALS.CAUSALITY_STRENGTHENED);
  if ((modality.citing === 'NECESSITY' && modality.evidence !== 'NECESSITY')
    || (modality.evidence === 'POSSIBILITY' && modality.citing === 'NONE')) signals.push(SIGNALS.MODALITY_STRENGTHENED);
  if ((certainty.citing === 'STRONG' && certainty.evidence !== 'STRONG')
    || (certainty.evidence === 'HEDGE' && certainty.citing === 'UNMARKED')) signals.push(SIGNALS.CERTAINTY_STRENGTHENED);
  if (negation.evidence !== negation.citing) signals.push(SIGNALS.NEGATION_CHANGED);
  const [evidenceDirection] = direction.from.levels;
  if (direction.from.levels.length === 1 && direction.to.levels.length === 1 && direction.to.levels[0] !== evidenceDirection) {
    signals.push(SIGNALS.DIRECTION_CHANGED);
  }
  return { observed, signals };
}

const WHY = {
  [STATUSES.INSUFFICIENT_EVIDENCE]: '현재 확보된 KCI 초록에서 이 인용 문장과 충분히 겹치는 근거 문장을 보수적으로 특정하지 못했습니다. 인용이 틀렸다는 뜻이 아닙니다.',
  [STATUSES.POTENTIAL_CLAIM_SHIFT]: '근거 문장과 비교해 인용 문장의 표현 강도 또는 의미 방향 차이가 관측되었습니다. 원문 맥락에서 사람이 검토해야 합니다.',
  [STATUSES.CONSISTENT_WITH_EVIDENCE]: '특정된 초록 근거 문장 범위에서 인과성·양태·확실성·부정·방향 표현이 보존되었습니다.',
};

// Reason-specific explanations for INSUFFICIENT_EVIDENCE. None of them says the reference or claim is wrong.
const INSUFFICIENCY_WHY = {
  [INSUFFICIENCY_REASONS.NO_PUBLIC_ABSTRACT_EVIDENCE]: '인용된 논문은 실제 KCI 레코드이지만, 이 인용 문장과 비교할 수 있는 공개 초록이 확보되지 않았습니다. 인용이 틀렸다는 뜻이 아닙니다.',
  [INSUFFICIENCY_REASONS.NO_RELEVANT_EVIDENCE_IN_REFERENCED_RECORD]: '인용된 논문은 실제 KCI 레코드이지만, 현재 확보된 초록·제목·키워드에는 이 인용 문장을 뒷받침할 관련 근거가 보이지 않습니다. 인용 대상이 맞는지 사람이 확인해야 하는 후보이며, 잘못된 인용이라는 자동 판정이 아닙니다.',
  [INSUFFICIENCY_REASONS.CLAIM_NOT_GROUNDED_IN_ABSTRACT]: '인용된 논문은 주제상 관련이 있지만, 현재 확보된 KCI 초록에는 이 인용 문장을 특정할 만큼 구체적인 근거 문장이 없습니다. 본문 확인이 필요하며, 인용이 틀렸다는 뜻이 아닙니다.',
  [INSUFFICIENCY_REASONS.AMBIGUOUS_EVIDENCE_SPAN]: '현재 확보된 KCI 초록에서 이 인용 문장에 똑같이 대응하는 근거 문장이 둘 이상이라 하나로 특정할 수 없습니다. 인용이 틀렸다는 뜻이 아닙니다.',
};

// Whole-record relevance: claim anchors shared with title + all abstracts + keywords.
function recordSharedAnchors(claim, evidence) {
  const recordText = [evidence.title ?? '', ...(evidence.abstracts ?? []).map(abstract => abstract.value ?? ''), ...(evidence.keywords ?? [])].join(' ');
  const recordAnchors = anchorsOf(recordText);
  return [...anchorsOf(claim)].filter(anchor => recordAnchors.has(anchor)).sort();
}

function insufficiencyReasonOf(grounding, recordShared) {
  if (grounding.reason === 'NO_MATCHING_ABSTRACT') return INSUFFICIENCY_REASONS.NO_PUBLIC_ABSTRACT_EVIDENCE;
  if (grounding.reason === 'AMBIGUOUS_SPAN') return INSUFFICIENCY_REASONS.AMBIGUOUS_EVIDENCE_SPAN;
  return recordShared.length < RECORD_RELEVANCE.MIN_SHARED_ANCHORS
    ? INSUFFICIENCY_REASONS.NO_RELEVANT_EVIDENCE_IN_REFERENCED_RECORD
    : INSUFFICIENCY_REASONS.CLAIM_NOT_GROUNDED_IN_ABSTRACT;
}

/**
 * Aligns one citing sentence with sanitized KCI abstract evidence.
 * evidence: { record_id, title, abstracts: [{ lang, value }], keywords?, evidence_hash }
 */
export function alignClaimWithEvidence({ citingClaim, evidence, observer = null }) {
  if (typeof citingClaim !== 'string' || !citingClaim.trim()) throw new TypeError('citingClaim must be a non-empty string');
  if (!evidence || typeof evidence.record_id !== 'string') throw new TypeError('evidence with record_id is required');
  const claim = citingClaim.trim();
  const abstract = abstractFor(evidence, claim);
  const grounding = abstract ? groundClaim(claim, abstract) : { grounded: false, reason: 'NO_MATCHING_ABSTRACT' };

  let status;
  let rule;
  let signals = [];
  let observed = null;
  if (!grounding.grounded) {
    status = STATUSES.INSUFFICIENT_EVIDENCE;
    rule = CLAIM_RULES.EVIDENCE_NOT_GROUNDED;
  } else {
    ({ observed, signals } = compareExpression(grounding.span.sentence, claim));
    status = signals.length ? STATUSES.POTENTIAL_CLAIM_SHIFT : STATUSES.CONSISTENT_WITH_EVIDENCE;
    rule = signals.length ? CLAIM_RULES.EXPRESSION_SHIFT : CLAIM_RULES.EXPRESSION_PRESERVED;
  }

  const evidenceSpan = grounding.grounded
    ? { text: grounding.span.sentence, sentence_index: grounding.span.index, abstract_lang: abstract.lang }
    : null;
  const recordShared = grounding.grounded ? null : recordSharedAnchors(claim, evidence);
  const insufficiencyReason = grounding.grounded ? null : insufficiencyReasonOf(grounding, recordShared);
  const finding = {
    contract_version: CONTRACT_VERSION,
    kind: 'CLAIM_EVIDENCE_FINDING',
    track: TRACK,
    status,
    signal: signals[0] ?? null,
    signals,
    rule_id: rule.id,
    rule_version: rule.version,
    citation_record_id: evidence.record_id,
    citing_claim: claim,
    evidence_span: evidenceSpan,
    evidence_source: { system: 'KCI', operation: 'articleDetail', field: 'abstract', record_id: evidence.record_id, abstract_lang: abstract?.lang ?? null },
    evidence_hash: evidence.evidence_hash ?? null,
    grounding: grounding.grounded
      ? { grounded: true, shared_anchors: grounding.span.shared, coverage: Number(grounding.span.coverage.toFixed(3)), citing_anchor_count: grounding.citing_anchor_count, thresholds: grounding.thresholds }
      : {
        grounded: false, reason: grounding.reason, best_shared_anchors: grounding.best_candidate?.shared ?? [], citing_anchor_count: grounding.citing_anchor_count ?? null,
        thresholds: grounding.thresholds ?? { ...GROUNDING },
        record_shared_anchors: recordShared, record_relevance_threshold: { ...RECORD_RELEVANCE },
      },
    insufficiency_reason: insufficiencyReason,
    observed,
    why: insufficiencyReason ? INSUFFICIENCY_WHY[insufficiencyReason] : WHY[status],
    uncertainty: [
      'Evidence is limited to the KCI abstract; the full text may qualify or extend these statements.',
      'Marker lexicons are explicit and incomplete; unlisted phrasings are not detected.',
      ...(status === STATUSES.INSUFFICIENT_EVIDENCE ? ['Not finding grounded evidence does not mean the citation is wrong.'] : []),
    ],
    human_review_required: status !== STATUSES.CONSISTENT_WITH_EVIDENCE,
    human_review_reason: status === STATUSES.POTENTIAL_CLAIM_SHIFT
      ? `인용 문장에서 ${signals.join(', ')} 신호가 관측되었습니다. 원문 표현 강도와 비교하세요.`
      : status === STATUSES.INSUFFICIENT_EVIDENCE
        ? '초록만으로는 근거를 특정할 수 없습니다. 본문에서 해당 주장을 직접 확인하세요.'
        : null,
    // Non-canonical observer slot. P0 has no observer implementation; it can never change status.
    observer: observer ?? { state: 'UNASSESSED' },
    processing_version: PROCESSING_VERSION,
  };
  finding.finding_id = digestId('claim', {
    citing_claim: claim, record_id: evidence.record_id, evidence_hash: finding.evidence_hash,
    status, rule: rule.id, rule_version: rule.version, signals, span_index: evidenceSpan?.sentence_index ?? null,
  });
  return finding;
}

/** Builds sanitized abstract evidence from an adapter articleDetail record (no URLs, keys, or timestamps). */
export function sanitizeAbstractEvidence(record) {
  const evidence = {
    record_id: record.source_record_id,
    title: record.titles?.find(title => title.lang === 'original')?.value ?? record.titles?.[0]?.value ?? null,
    abstracts: (record.abstracts ?? []).map(abstract => ({ lang: abstract.lang, value: abstract.value })),
    keywords: (record.keywords ?? []).map(keyword => keyword.value),
  };
  return { ...evidence, evidence_hash: sha256(evidence) };
}
