# Layer 3 — Claim–Evidence Alignment (P0, abstract-only)

TrustVerify checks citations in three layers:

Citation Existence → Metadata Integrity → **Claim–Evidence Alignment**

Layer 3 asks one narrow question: for a paper that has already been identified as a real KCI record, does the citing sentence written by the researcher change the expression strength or meaning direction of what the paper's public KCI abstract says?

It is a separate track (`CLAIM_EVIDENCE_ALIGNMENT`) and never changes a Citation Integrity result.

## What this does and does not check

1. **It checks alignment with the currently available KCI abstract, not full-paper scientific truth.** It does not decide whether a claim or a study is correct, and it is not hallucination detection.
2. **`INSUFFICIENT_EVIDENCE`** means: "현재 확보된 공개 근거만으로 확인할 수 없음." Not finding grounded evidence in the abstract does not mean the citation is wrong.
3. **`POTENTIAL_CLAIM_SHIFT`** means: "표현 강도 또는 의미 방향 차이가 관측되어 사람 검토 필요." It is a signal for human review, not a verdict that the claim is false.
4. **`CONSISTENT_WITH_EVIDENCE`** means: within the observed abstract evidence, the monitored dimensions are preserved. It is not a guarantee that the claim is true or complete.

No other statuses exist in P0. There is no score, probability, or trust rating.

## Evidence

- Source: the existing KCI `articleDetail` response for an already-qualified article ID: title, abstract, keywords.
- Sanitized and frozen: `record_id`, `title`, `abstracts` (language + text), `keywords`. No API key, request URL, `public_url`, source paths, or timestamps. `evidence_hash = sha256(canonicalJson(evidence))`.
- Not used: PDF, OCR, full text, Crossref, OpenAlex, Semantic Scholar, `referenceSearch`, web scraping, RAG, embeddings, or any new external API.
- The abstract whose script matches the citing sentence (Korean vs non-Korean) is used.

## Method (deterministic)

### 1. Evidence sufficiency gate — rule `CE-GROUND-001`

The engine first tries to ground the citing sentence in exactly one abstract sentence:

- Split the abstract into sentences.
- Extract content anchors from each text: NFKC, lowercase, split into words, drop stopwords, generic academic words (study, results, findings, …), and expression marker words, then apply light suffix stripping (`-s`, `-ed`, `-ing`, `-ies`).
- A sentence is a candidate only if it shares **at least 3 anchors** with the citing sentence **and** those cover **at least 60%** of the citing sentence's anchors.
- The best candidate is the one with the most shared anchors. If two candidates tie exactly, the span is ambiguous.

If no candidate passes, or the best is ambiguous, the status is `INSUFFICIENT_EVIDENCE`, and no expression comparison is attempted. A claim with strong shift words can therefore never become `POTENTIAL_CLAIM_SHIFT` without grounded evidence.

Since processing version `claim-evidence-p0-1.1`, every `INSUFFICIENT_EVIDENCE` finding also carries an `insufficiency_reason`. It explains the status and never changes it:

| `insufficiency_reason` | When |
| --- | --- |
| `NO_PUBLIC_ABSTRACT_EVIDENCE` | The record has no usable abstract in the citing sentence's script. |
| `NO_RELEVANT_EVIDENCE_IN_REFERENCED_RECORD` | The claim shares **fewer than 2** content anchors with the whole record (title, all abstracts, and keywords). The cited paper may be real and valid, but it shows no relevant evidence for this claim. |
| `CLAIM_NOT_GROUNDED_IN_ABSTRACT` | The record is topically related (2 or more shared anchors), but no single abstract sentence meets the grounding thresholds. |
| `AMBIGUOUS_EVIDENCE_SPAN` | Two abstract sentences ground the claim equally. |

None of these is a verdict about the reference. `NO_RELEVANT_EVIDENCE_IN_REFERENCED_RECORD` marks a candidate mismatch that a human should check, not an automatic finding of miscitation. There is no `WRONG_REFERENCE`, `FAKE_REFERENCE`, or hallucination status.

### 2. Expression comparison — rules `CE-SHIFT-001` / `CE-CONSIST-001`

The grounded span and the citing sentence are each classified on five dimensions using explicit English and Korean marker lists (`src/claim-evidence/markers.js`):

| Dimension | Levels | Signal when |
| --- | --- | --- |
| Causality | LIMITED (e.g. "cannot establish causation") · CAUSAL · ASSOCIATION · NONE | citing is CAUSAL and evidence is not → `CAUSALITY_STRENGTHENED` |
| Modality | NECESSITY · POSSIBILITY · NONE | citing is NECESSITY and evidence is not, or evidence POSSIBILITY → citing none → `MODALITY_STRENGTHENED` |
| Certainty | STRONG · HEDGE · UNMARKED | citing is STRONG and evidence is not, or evidence HEDGE → citing unmarked → `CERTAINTY_STRENGTHENED` |
| Negation | NEGATED · AFFIRMED | the two differ → `NEGATION_CHANGED` |
| Direction | UP · DOWN (each span may mention either) | each side has exactly one direction and they differ → `DIRECTION_CHANGED` |

Any signal gives `POTENTIAL_CLAIM_SHIFT` (`CE-SHIFT-001`). A grounded span with no signal gives `CONSISTENT_WITH_EVIDENCE` (`CE-CONSIST-001`). The absence of shift markers alone never produces `CONSISTENT_WITH_EVIDENCE`; grounding is required first.

P0 monitors strengthening only. Weakening (for example "proves" → "suggests") is not signaled.

### Human review

`POTENTIAL_CLAIM_SHIFT` and `INSUFFICIENT_EVIDENCE` always set `human_review_required: true` with an explicit reason. `CONSISTENT_WITH_EVIDENCE` sets it to `false` within this track; its `uncertainty` field still states the abstract-only scope. Citation Integrity's own `human_review_required` behavior is unchanged.

### Observer (Solar)

There is no Solar observer implementation in this repository. P0 runs fully deterministically; every finding carries `observer: { state: "UNASSESSED" }`. If an observer annotation is supplied in future, it is recorded as non-canonical and cannot change the status (tested).

## Finding contract

`track`, `status`, `signal`, `signals`, `rule_id`, `rule_version`, `citation_record_id`, `citing_claim`, `evidence_span` (text, sentence index, abstract language), `evidence_source`, `evidence_hash`, `grounding` (shared anchors, coverage, thresholds, or the reason it failed plus whole-record shared anchors), `insufficiency_reason`, `observed` (per-dimension levels and markers), `why`, `uncertainty`, `human_review_required`, `human_review_reason`, `observer`, `processing_version`, `finding_id`.

Explainability chain: Observed → Evidence → Rule → Result → Human action.

## P0 cases

Evidence: ART003267604, "Computer simulation on the role of interproximal contacts in occlusal force transmission". Chosen because its abstract states results with explicit hedging ("These findings indicate … suggesting a limit in the load-sharing capacity of interproximal contacts"). The other qualified records' abstracts report performance numbers or program descriptions without hedged result claims.

| Case | Role | Citing sentence | Observed |
| --- | --- | --- | --- |
| C1 | Presentation | "The simulation results **suggest** a limit in the load-sharing capacity of interproximal contacts, as most additional load was dissipated locally at the first molar." | `CONSISTENT_WITH_EVIDENCE` · CE-CONSIST-001 |
| C2 | Presentation | Same sentence with **suggest → prove** | `POTENTIAL_CLAIM_SHIFT` · `CERTAINTY_STRENGTHENED` · CE-SHIFT-001 |
| I1 | Boundary test | "Interproximal contacts reduce the incidence of periodontal disease in elderly patients." | `INSUFFICIENT_EVIDENCE` · CE-GROUND-001 |

C1 and C2 ground in the same abstract sentence (#9, 11 of 12 anchors shared). I1's best sentence shares only 2 anchors; its record shares 4 anchors overall (interproximal, contact, periodontal, patient), so its reason is `CLAIM_NOT_GROUNDED_IN_ABSTRACT`. Frozen evidence and observations: `artifacts/evaluation/claim-evidence-p0/`. Offline tests: `test/claim-evidence.test.js`.

### D4 — valid but unrelated reference (end to end)

A common draft failure: the bibliography entry is a real, valid KCI paper, but it is not evidence for the sentence that cites it.

- Bibliography: `[1]` ART003267604 and `[2]` ART003062835 ("Computer Vision-based Basketball Player Training System"), both exact and uncorrupted.
- Draft sentence: the C1 claim (grounded in ART003267604) citing **[2]**.
- Pipeline: parse the bibliography → existing Citation Integrity batch audit → resolve `[2]` to row 2 by its printed number (`src/claim-evidence/draft.js`) → take the abstract of the record Citation Integrity identified → grounding gate.

| Case | Citation Integrity (cited row) | Claim–Evidence |
| --- | --- | --- |
| D4 (cites `[2]`) | `VERIFIED` · REF-META-001 · all fields MATCH | `INSUFFICIENT_EVIDENCE` · CE-GROUND-001 · `NO_RELEVANT_EVIDENCE_IN_REFERENCED_RECORD` (0 shared anchors with the whole record) |
| D4-CONTRAST (same sentence, cites `[1]`) | `VERIFIED` · REF-META-001 | `CONSISTENT_WITH_EVIDENCE` · CE-CONSIST-001 · sentence #9 |

The contrast shows the reference is the only difference. D4 is reported as "the cited paper is a real KCI record, but the currently available abstract does not provide sufficient evidence for this citing claim" and requires human review. Artifact: `artifacts/evaluation/claim-evidence-p0/d4-unrelated-reference.json`. Offline test: `test/claim-evidence-d4.test.js`.

Marker resolution handles exactly one numeric marker per sentence. A sentence with no marker, several different markers, or a number missing from the bibliography is not resolved, and the bibliography row is never guessed.

## Test provenance

- **Controlled perturbation.** C1, C2, I1, D4, and D4-CONTRAST use citing sentences deliberately constructed by the evaluator. They test rule sensitivity. They are not observed AI hallucinations and must not be described as such.
- **Naturalistic AI paraphrase.** Reserved: one unedited output from a named AI or paraphrase tool, with `tool_name`, `prompt`, `raw_output`, and a timestamp if available. It must be supplied or generated by the user; it is never fabricated. Status: `NOT_PROVIDED` (`cases.json` → `naturalistic_ai_paraphrase`).

## Known limitations

- Abstract-only: the full text may qualify or extend any abstract statement.
- Marker lists are explicit and incomplete; unlisted phrasings are not detected, and some listed words have other senses.
- Grounding uses word overlap with light stemming. Paraphrases with different vocabulary may be `INSUFFICIENT_EVIDENCE`. Korean grounding does not strip particles, so it is weaker than English.
- Only strengthening is monitored; weakening is not signaled.
- Evidence covers one KCI record in P0.
