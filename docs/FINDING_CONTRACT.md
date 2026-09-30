# Explainable citation finding contract

BUILD-02A defines data contracts and synthetic UI fixtures only. It does not implement citation extraction, record matching, similarity thresholds, or status assignment.

Two JSON Schemas keep research conclusions separate from infrastructure failures:

- [citation-finding.schema.json](../schemas/citation-finding.schema.json) uses `kind: RESEARCH_FINDING` and one of `VERIFIED`, `METADATA_DRIFT`, `CHIMERA`, `REVIEW_REQUIRED`, or `NOT_FOUND_IN_KCI`.
- [system-failure.schema.json](../schemas/system-failure.schema.json) uses `kind: SYSTEM_FAILURE` and one of `KCI_UNAVAILABLE`, `KCI_AUTH_FAILED`, `KCI_INVALID_RESPONSE`, or `KCI_PARSE_FAILED`. It has no citation `status` field and requires `research_finding_emitted: false`.

The `kind` discriminator is the frontend boundary. Render a research finding only when `kind` is `RESEARCH_FINDING`. Render operational recovery information when it is `SYSTEM_FAILURE`. Do not infer one contract from fields belonging to the other.

Research findings carry a versioned rule, original structured input, evidence references, field-level comparisons, a reason, limitations, and an explicit human-review flag. Evidence IDs connect comparisons to their supporting records or successful zero-result search envelope. `NOT_FOUND_IN_KCI` requires KCI zero-result evidence; an empty evidence array or system failure is insufficient.

The fixtures in `test/fixtures/findings/verified.json`, `metadata-drift.json`, `chimera-review.json`, `not-found.json`, and `system-failure.json` are synthetic UI examples. Their `fixture` and `fixture_notice` fields prevent them from being presented as executed research findings. Repeated-digit hashes and `ART_FIXTURE_*` identifiers are deliberate placeholders. The CHIMERA fixture demonstrates shape only; conservative CHIMERA detection remains unimplemented.
