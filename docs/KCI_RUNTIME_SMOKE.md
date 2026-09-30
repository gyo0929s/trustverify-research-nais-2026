# KCI runtime smoke test — 2026-09-30

The BUILD-01 runtime adapter in `src/kci/adapter.js` was exercised against the live KCI Open API with exactly three authenticated requests. The old qualification probe was not used as the implementation under test. The run used `KCI_API_KEY` from ignored local configuration and did not deliberately test invalid credentials or rate limits.

## Results

| Request | State | Latency | Records | Total | Source record ID |
| --- | --- | ---: | ---: | ---: | --- |
| Positive articleSearch | `KCI_OK` | 313 ms | 10 | 2814 | `ART003062835` |
| articleDetail | `KCI_OK` | 225 ms | 1 | 1 | `ART003062835` |
| Improbable-title articleSearch | `KCI_ZERO_RESULTS` | 107 ms | 0 | unavailable | none |

Search-to-detail identity matched exactly through `articleInfo/@article-id`. The valid zero response remained `KCI_ZERO_RESULTS`; the adapter did not infer zero from a missing `total`. A synthetic local transport-failure classification, requiring no additional live call, returned `KCI_UNAVAILABLE`, was ineligible for `NOT_FOUND_IN_KCI`, and emitted no research finding.

Each positive normalized record serialized successfully. Search and detail produced distinct `normalized_content_sha256` values because detail contains additional observed metadata. Each request produced a `redacted_snapshot_sha256`. The key was absent from the adapter outputs and from the committed derived summary.

The machine-readable result is [2026-09-30-summary.json](../artifacts/runtime-smoke/kci/2026-09-30-summary.json). It contains only state, latency, counts, the selected public KCI record identifier, hashes, eligibility flags, and safety booleans. It does not contain request URLs, headers, credentials, full responses, snapshots, abstracts, titles, author data, or paper text. The hashes are not raw-wire hashes.

## Interpretation

This smoke test confirms the live path for the tested query and timestamp. It does not establish KCI coverage, availability, rate-limit behavior, long-term record-ID stability, or population-wide metadata completeness. `KCI_OK` makes records eligible for later citation comparison; it does not produce `VERIFIED` or prove scientific truth. `KCI_ZERO_RESULTS` is only eligible for a later `NOT_FOUND_IN_KCI` finding. Citation matching remains unimplemented.
