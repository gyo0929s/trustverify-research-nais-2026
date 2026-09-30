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
