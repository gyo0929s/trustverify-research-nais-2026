/**
 * Layer 3 — Claim–Evidence Alignment (P0, abstract-only) contract.
 * Separate track from Citation Integrity. It never judges truth, falsity, or hallucination:
 * it only reports whether a citing sentence preserves the expression strength and direction
 * of a grounded span in the cited paper's KCI abstract.
 */
export const TRACK = 'CLAIM_EVIDENCE_ALIGNMENT';
export const CONTRACT_VERSION = 'trustverify-claim-evidence-finding-v1';
// 1.1: INSUFFICIENT_EVIDENCE findings carry insufficiency_reason. Statuses, rules, and grounding are unchanged.
export const PROCESSING_VERSION = 'claim-evidence-p0-1.1';

export const STATUSES = Object.freeze({
  CONSISTENT_WITH_EVIDENCE: 'CONSISTENT_WITH_EVIDENCE',
  POTENTIAL_CLAIM_SHIFT: 'POTENTIAL_CLAIM_SHIFT',
  INSUFFICIENT_EVIDENCE: 'INSUFFICIENT_EVIDENCE',
});

export const SIGNALS = Object.freeze({
  CAUSALITY_STRENGTHENED: 'CAUSALITY_STRENGTHENED',
  MODALITY_STRENGTHENED: 'MODALITY_STRENGTHENED',
  CERTAINTY_STRENGTHENED: 'CERTAINTY_STRENGTHENED',
  NEGATION_CHANGED: 'NEGATION_CHANGED',
  DIRECTION_CHANGED: 'DIRECTION_CHANGED',
});

export const CLAIM_RULES = Object.freeze({
  EVIDENCE_NOT_GROUNDED: Object.freeze({ id: 'CE-GROUND-001', version: '1.0' }),
  EXPRESSION_SHIFT: Object.freeze({ id: 'CE-SHIFT-001', version: '1.0' }),
  EXPRESSION_PRESERVED: Object.freeze({ id: 'CE-CONSIST-001', version: '1.0' }),
});

// Why a claim is INSUFFICIENT_EVIDENCE. These explain the status; they are never verdicts about the reference.
export const INSUFFICIENCY_REASONS = Object.freeze({
  NO_PUBLIC_ABSTRACT_EVIDENCE: 'NO_PUBLIC_ABSTRACT_EVIDENCE', // no usable abstract in the claim's script
  NO_RELEVANT_EVIDENCE_IN_REFERENCED_RECORD: 'NO_RELEVANT_EVIDENCE_IN_REFERENCED_RECORD', // record shares almost nothing with the claim
  CLAIM_NOT_GROUNDED_IN_ABSTRACT: 'CLAIM_NOT_GROUNDED_IN_ABSTRACT', // record is related, but no abstract sentence grounds the claim
  AMBIGUOUS_EVIDENCE_SPAN: 'AMBIGUOUS_EVIDENCE_SPAN', // two abstract sentences ground the claim equally
});

// Record relevance: shared anchors between the claim and the whole record (title + abstracts + keywords).
export const RECORD_RELEVANCE = Object.freeze({ MIN_SHARED_ANCHORS: 2 });

// Evidence sufficiency gate thresholds (transparent, documented in docs/CLAIM_EVIDENCE_ALIGNMENT.md).
export const GROUNDING = Object.freeze({
  MIN_SHARED_ANCHORS: 3, // at least three shared content anchors with one abstract sentence
  MIN_COVERAGE: 0.6, // and at least 60% of the citing sentence's anchors appear in that sentence
});
