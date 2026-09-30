# Deterministic citation audit rules

The citation audit service in `src/citation/audit.js` connects structured citation input to the fail-closed KCI adapter. It returns either the citation-finding contract or the system-failure contract. It does not implement fuzzy matching, embeddings, LLM matching, manuscript scoring, or runtime CHIMERA classification.

Only `title` is required. Optional authors, publication year, and DOI are compared only when supplied. Text normalization applies Unicode NFKC normalization, trimming, whitespace collapse, and lowercasing. It does not remove words or punctuation. A search candidate establishes identity only when at least one preserved multilingual KCI title is exactly equal after this normalization.

| Rule | Version | Behavior |
| --- | --- | --- |
| `REF-ID-001` | 1.0 | One unique exact normalized title candidate establishes coherent identity and permits detail retrieval |
| `REF-ID-002` | 1.0 | Zero exact candidates, multiple exact candidates, changed detail identity, or unknown supplied metadata requires human review |
| `REF-META-001` | 1.0 | One coherent detail record and all supplied comparisons match produces `VERIFIED` |
| `REF-META-002` | 1.0 | One coherent detail record and at least one supplied comparison mismatches produces `METADATA_DRIFT` |
| `REF-SEARCH-001` | 1.0 | A validated `KCI_ZERO_RESULTS` search produces `NOT_FOUND_IN_KCI` |

Title compares against every language-labeled KCI title. Year uses exact normalized string equality. DOI uses the adapter's DOI normalizer while retaining raw DOI evidence. Authors match only when the supplied ordered list exactly matches the corresponding KCI name or English-name aliases after conservative text normalization. Non-exact author forms, invalid DOI values, and missing KCI fields are `UNKNOWN`, never forced mismatches. Any `UNKNOWN` produces `REVIEW_REQUIRED` in this conservative P0 implementation.

KCI failures produce the separate system-failure contract and can never become citation findings. `VERIFIED` means only that supplied bibliographic metadata is consistent with one coherent KCI record under these rules. It does not verify scientific truth, manuscript quality, peer-review validity, or publication acceptance. `CHIMERA` remains available only in a fixture explicitly labeled as a demo; validated mixed-citation golden cases are required before enabling it at runtime.

## Known robustness case: REAL-TITLE-FORMAT-001

Paper `ART001298965` (최승재, 증권법연구 9(2), 2008) is frozen as a real-world robustness case. The title printed in the PDF and the KCI canonical title refer to the same paper, but their Unicode quotation marks and spacing differ:

| Source | Subtitle fragment | Characters |
| --- | --- | --- |
| PDF | `―소위 ‘행동경제학’적` | U+2018 / U+2019, space before the opening quote |
| KCI | `―소위＂행동경제학＂적` | U+FF02 (NFKC folds it to U+0022), no space |

Current result: `REVIEW_REQUIRED` under `REF-ID-002`, because identity normalization does not canonicalize quotation-mark variants or the whitespace next to them. No `articleDetail` call and no field comparison happen. This is the intended conservative behavior under rule version 1.0, not a defect to hide.

The offline regression test `test/real-title-format.test.js` pins this result using the static title pair in `test/fixtures/kci/real-title-format-001.json`. The fixture contains no API key, request URL, or `public_url`, and the test blocks all network access. It must keep expecting `REVIEW_REQUIRED` until the experiment below is activated.

## Proposed experiment: title-normalization-v1.1 (not active)

Scope, applied to identity comparison only:

- Fold Unicode quotation-mark variants (for example U+2018, U+2019, U+201C, U+201D, U+FF02, U+FF07, U+0027, U+0022) to a single canonical quote before comparison.
- Normalize whitespace adjacent to quotation marks, so that `소위 ‘X’` and `소위＂X＂` compare equally.
- Preserve the raw supplied title and every raw KCI title unchanged in evidence and findings.
- No subtitle removal or truncation.
- No fuzzy, partial, edit-distance, embedding, or LLM title matching.

The change requires a rule version bump (`REF-ID-001` / `REF-ID-002` to 1.1) so that findings stay traceable to the normalization that produced them.

Activation criteria. Do not enable in production unless all three hold:

1. Every existing test remains green.
2. REAL-TITLE-FORMAT-001 resolves correctly: the PDF title variant establishes identity with `ART001298965` and reaches field comparison.
3. Negative near-title cases do not collapse into the same identity: titles that differ in any word, in subtitle presence, or in characters other than quote form and quote-adjacent whitespace must still produce distinct normalized identities.

Until then, the presentation demo stays on the existing stable `METADATA_DRIFT` record (`ART003062835`, supplied year 2023 against KCI 2024, `REF-META-002`).
