# KCI Citation Integrity — adversarial bibliography stress set (H1–H5)

Observed on 2026-10-01 against LIVE KCI with the current deterministic engine (rule versions 1.0, title normalization v1.0). Cases were fixed before execution and results are recorded exactly as observed, then frozen. No rule was changed.

## Design

Only H1 is a normal citation. H2–H5 each test a different failure mode, and every mutation uses real data: a real KCI record, and where something is swapped in, a real value taken from another qualified KCI record.

| Case | Failure mode | Base record | Mutation |
| --- | --- | --- | --- |
| H1 | Valid control | ART003141185 | none |
| H2 | Year drift | ART003267604 | year 2025 → 2024 |
| H3 | Real DOI cross-swap | ART003062835 | DOI replaced with the real DOI of ART003141185 (`10.21740/jas.2024.11.30.2.385`); title, authors, year exact |
| H4 | Author chimera | ART003267604 | author 권호범 replaced with 신승수, a real author of ART003062835; title, year, DOI exact |
| H5 | Title / identity ambiguity | ART001298965 | title as printed in the PDF (REAL-TITLE-FORMAT-001: U+2018/U+2019 quotes and a space vs KCI's U+FF02, no space) |

Every base and donor record was confirmed live through `articleDetail` (`KCI_OK`) in the same run.

Only four qualified real records exist and H5 is pinned to ART001298965, so ART003267604 is reused by H2 and H4. They test different fields, and no record is used as both the control and a mutation.

## Observed results

| Case | Status | Rule | Title | Authors | Year | DOI |
| --- | --- | --- | --- | --- | --- | --- |
| H1 | `VERIFIED` | REF-META-001 | MATCH | MATCH | MATCH | MATCH |
| H2 | `METADATA_DRIFT` | REF-META-002 | MATCH | MATCH | **MISMATCH** | MATCH |
| H3 | `METADATA_DRIFT` | REF-META-002 | MATCH | MATCH | MATCH | **MISMATCH** |
| H4 | `REVIEW_REQUIRED` | REF-ID-002 | MATCH | **UNKNOWN** | MATCH | MATCH |
| H5 | `REVIEW_REQUIRED` | REF-ID-002 | — | — | — | — |

Summary: VERIFIED 1 · METADATA_DRIFT 2 · REVIEW_REQUIRED 2 · NOT_FOUND_IN_KCI 0 · system failures 0. No adversarial case was reported as `VERIFIED`.

## What each result means

- **H3** is not a syntax check. The swapped DOI is real and well-formed. It is flagged because it differs from the DOI on the record identified by title. The engine does not look up which paper the swapped DOI actually belongs to.
- **H4** is caught, but as "needs review", not as a named mismatch. `compareAuthors` returns only `MATCH` or `UNKNOWN`, and any `UNKNOWN` routes to `REVIEW_REQUIRED`. This is the current conservative design.
- **H5** stops before field comparison. KCI search returned the correct record, but exact normalized title identity failed, so `articleDetail` never ran. See `docs/CITATION_AUDIT_RULES.md` (REAL-TITLE-FORMAT-001, title-normalization-v1.1 not active).

## Reproducibility

- `input_hash` = sha256 of the canonical JSON of the supplied citation.
- `evidence_hash` = sha256 of the canonical JSON of the sanitized `{search, detail}` evidence; it excludes timestamps, URLs, and keys.
- `test/kci-h1-h5-frozen.test.js` replays every case offline through `src/citation/frozen-evidence.js` and the unchanged audit engine, with network access blocked, and asserts the identical `finding_id`, status, rule, and field results.

## Scope

- Five controlled cases over four real records. This is not a measurement of accuracy across many papers.
- Automated test count is not a paper count.
- Frozen evidence is for offline replay only and is never a silent substitute for LIVE KCI.
- The presentation batch example (`test/fixtures/batch/demo-bibliography.txt`, 6 rows) is a separate artifact and is unchanged by this evaluation.
