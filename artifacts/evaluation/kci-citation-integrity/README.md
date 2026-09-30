# KCI Citation Integrity — S1–S5 evaluation

Observed on 2026-10-01 with the current deterministic engine (rule versions 1.0, title normalization v1.0). No rule was changed for this evaluation. Mutations were defined before execution, and every result below is the observed output, frozen afterwards.

## Files

| File | Content |
| --- | --- |
| `S1-S5-results.json` | Per-case observed results, primary demo runs, hashes, and the separate real-world regression entry |
| `frozen-evidence.json` | Sanitized bibliographic KCI evidence keyed by `evidence_hash`, used for offline replay |
| `../../../tools/evaluation/run-kci-s1-s5.mjs` | Runner that produced the LIVE observations (needs `KCI_API_KEY` in `.env.local`) |
| `../../../test/kci-s1-s5-frozen.test.js` | Offline regression test that replays `frozen-evidence.json` and asserts the observed results |

## Evidence categories

These categories are deliberately kept apart.

- **LIVE-qualified.** Results produced by calling the real KCI Open API through the existing adapter (`articleSearch` → `articleDetail`). Every S1–S5 `execution_mode: "LIVE"` entry and all five primary demo runs are in this category.
- **OFFLINE regression.** Automated tests that never touch the network. They replay frozen, sanitized evidence or static fixtures. They prove the engine still produces the same result from the same evidence. They do not prove KCI is currently reachable.
- **Synthetic mutation (S2–S5).** One real KCI record (`ART003062835`) with exactly one supplied field deliberately changed. The KCI record is real; the mutated citations are constructed test inputs, not errors found in the wild. S1 is the unmodified control.
- **Real-world edge (REAL-TITLE-FORMAT-001).** A real paper (`ART001298965`) whose PDF title and KCI title differ only in Unicode quote marks and spacing. It is not a synthetic mutation and is not used as S5.

**49 tests ≠ 49 papers.** The automated test count is the number of test cases in the suite. It is not the number of papers evaluated. This evaluation covers one base KCI record (five controlled cases) plus one separate real-world regression paper.

## Base record

`ART003062835`, "Computer Vision-based Basketball Player Training System", 장만 (Man Zhang), 신승수 (Seung-Soon Shin), 디지털콘텐츠학회논문지 25(3), pp. 595–605, 2024, DOI `10.9728/dcs.2024.25.3.595`. Confirmed live: `articleSearch` returned `KCI_OK` with one candidate, and `articleDetail` returned `KCI_OK` for that ID.

## Observed results

| Case | Mutation | Status | Rule | Title | Authors | Year | DOI |
| --- | --- | --- | --- | --- | --- | --- | --- |
| S1 control | none | `VERIFIED` | REF-META-001 | MATCH | MATCH | MATCH | MATCH |
| S2 year | 2024 → 2023 | `METADATA_DRIFT` | REF-META-002 | MATCH | MATCH | **MISMATCH** | MATCH |
| S3 author | 신승수 → Gil-Dong Hong | `REVIEW_REQUIRED` | REF-ID-002 | MATCH | **UNKNOWN** | MATCH | MATCH |
| S4 DOI | …595 → …596 | `METADATA_DRIFT` | REF-META-002 | MATCH | MATCH | MATCH | **MISMATCH** |
| S5 title | removed "Player" | `REVIEW_REQUIRED` | REF-ID-002 | — | — | — | — |

S5 has no field comparisons. Title identity failed at the search stage, so `articleDetail` was never called.

Real-world regression, reported separately: **REAL-TITLE-FORMAT-001** (`ART001298965`) → `REVIEW_REQUIRED` / REF-ID-002.

## Findings worth reviewing

1. **S3 cannot become `METADATA_DRIFT` under current rules.** `compareAuthors` returns only `MATCH` or `UNKNOWN`, never `MISMATCH`, and any `UNKNOWN` routes to `REVIEW_REQUIRED`. This is the conservative design, not a defect, but a wrong author is reported as "needs review", not as "differs".
2. **`human_review_required` is `true` for every research finding**, including `VERIFIED` (S1). `baseFinding` hard-codes it. The flag therefore does not distinguish the control from the drift cases.
3. **KCI `doi_raw` is a resolver URL** (`http://dx.doi.org/10.9728/…`). The S1 input copied it in that form. The DOI normalizer handles both URL and bare forms, but a presenter typing a bare DOI would be exercising a slightly different input than S1.
4. **S5: KCI search is broader than identity.** Search still returned the base record for the mutated title; the engine refused to adopt it without exact normalized title identity.

## Reproducibility

- `input_hash` = sha256 of the canonical JSON of the supplied citation.
- `evidence_hash` = sha256 of the canonical JSON of the sanitized `{search, detail}` evidence. It excludes `retrieved_at`, request timestamps, URLs, keys, and request IDs.
- Every case was replayed offline from `frozen-evidence.json` and produced the identical `finding_id`, status, rule, and field comparisons as the live run.
- Primary demo S2 ran five times sequentially against live KCI. All five returned `KCI_OK` for search and detail, `METADATA_DRIFT` / REF-META-002 on `ART003062835`, mismatched field `publication_year`, and identical `finding_id` and `evidence_hash`. No system failure or rate limiting was observed.

## What this does not show

- It covers one base record. It is not a measurement of accuracy across many papers.
- Frozen evidence is for offline replay only. It is never a silent substitute for a failed LIVE KCI call.
- KCI availability on presentation day is not guaranteed by these results.
