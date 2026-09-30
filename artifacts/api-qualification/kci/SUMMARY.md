# KCI API qualification — 2026-09-30

**YELLOW: usable as canonical KCI bibliographic evidence with pinned snapshots and fail-closed response validation.** Four live responses establish feasibility, not coverage or availability guarantees. Human reviewers remain the final decision makers. No product runtime, UI, other sources, language-risk layer, or bias detection was built.

## Scope and provenance

Security preflight passed: exact requested Git root, ignored `.env.local`, nonempty local credential. The initial sandbox attempt failed before an HTTP response; the explicitly permitted retry succeeded. Four authenticated calls returned responses (search, detail, zero, invalid). No credential alteration or authentication-failure test was performed.

Official references: [search specification](https://www.kci.go.kr/kciportal/po/openapi/openDataView.kci?datasetBean.dtstSeqNo=1), [detail specification](https://www.kci.go.kr/kciportal/po/openapi/openDataView.kci?datasetBean.dtstSeqNo=21), [endpoint usage](https://www.kci.go.kr/kciportal/po/openapi/openApiConnSamp.kci). Documentation describes the endpoints and control-number parameter; all observations below come from the attached live artifacts, not documentation samples.

## Live observations

All four responses: HTTP 200, `application/xml; charset=UTF-8`, XML root `MetaData`, nested `inputData` and `outputData/result`.

| Test | Latency | Count / result | Artifact |
| --- | ---: | --- | --- |
| A: title `컴퓨터` | 383 ms | `outputData/result/total=2814`; three records retained | [search](success-search.redacted.json) |
| B/C: detail using search identifier | 282 ms | `total=1`, same article identifier | [detail](success-detail.redacted.json) |
| D: improbable title | 195 ms | `resultMsg=No Data`; **no total element**, no record elements | [zero](zero-result.redacted.json) |
| E: articleDetail without required id | 80 ms | Two error messages; no total or records | [invalid](invalid-request.redacted.json) |

Actual identifier: `record/articleInfo/@article-id=ART003062835`. Passing that exact value as articleDetail `id` returned the same record, title, authors and publication year. This confirms lookup identity in this run; long-term identifier persistence remains untested. `journalInfo/@journal-id` and reference `@refebibl-id` are different namespaces and must not become article identifiers.

The search requested `displayCount=3`, but the response echoed `displayCount=10`. Only three article records were saved by local truncation; the original returned record count was not separately retained. Zero search requested 1 and also echoed 10. Pagination/limit semantics require later investigation; no extra calls were made.

KCI echoes the real credential in `inputData/key`. It was replaced in memory before saving or displaying responses. No authenticated request URL or headers were saved. Snapshot hashes cover the **redacted, XML-serialized, potentially record-truncated response**, not raw wire bytes. Search and detail artifacts are modest record samples, not bulk exports.

## Zero and error handling

Valid zero response is exactly `MetaData/outputData/result/resultMsg = No Data`, with no `total` and no `record`. This is distinguishable from the tested invalid-input response, whose two `resultMsg` values are `필수 요청 파라미터가 없음 => id` and `검색 조건이 없습니다.`. HTTP 200 alone therefore cannot establish success. The tested invalid case is a request validation failure, not an authentication failure or a citation outcome.

Future adapter requirements (not implemented): validate HTTP success, XML envelope, expected operation and structural consistency. Recognize this observed No Data shape only for a successful search with no contradictory errors or records. Never default missing counts or unknown messages to zero. Positive responses require valid records and count consistency with pagination. Treat mixed, unknown, or inconsistent responses as `KCI_INVALID_RESPONSE`; malformed XML as `KCI_PARSE_FAILED`; transport/timeouts and service outages as `KCI_UNAVAILABLE`; explicit authentication rejection as `KCI_AUTH_FAILED`. Authentication-error envelopes remain unobserved, so their eventual classifier needs separate validation. The harmless missing-id response belongs to a system/request failure (proposed `KCI_INVALID_RESPONSE` with a validation-error reason), never `NOT_FOUND_IN_KCI`.

Only the valid zero-search outcome supports `NOT_FOUND_IN_KCI`, limited to the exact query, retrieval time and KCI coverage. It never means fake paper, confirmed hallucination, or ghost citation.

## Forensic and public explanation feasibility

Observed detail includes multilingual titles, structured authors and affiliations, year/month, journal, publisher, volume/issue, ISSN, DOI, abstracts, keywords, pages, public URL, citation counts and 17 reference entries. The field map separates live paths from normalized proposals and documents empty fields.

- `VERIFIED`: feasible for bibliographic consistency when one coherent record supports supplied important fields. It does not verify the paper's scientific claims. KCI's own `verified=Y` is not the TrustVerify status.
- `METADATA_DRIFT`: feasible after establishing coherent identity independently of the differing field. Compare explicit supplied values against the pinned record; missing KCI values do not prove disagreement.
- `CHIMERA`: potentially feasible using multiple distinct article records and strong field-level evidence. This run did not test a mixed citation or establish search recall. Reference-list entries and citation counts alone do not establish chimera. No similarity thresholds are proposed. Ambiguous identities, name variants, missing evidence or weak cross-record matches require `REVIEW_REQUIRED`.
- `NOT_FOUND_IN_KCI`: feasible only under the validated successful zero-search conditions above.

Example future panel, explicitly **synthetic citation input**: supplied year 2023 for the observed title “Computer Vision-based Basketball Player Training System”; KCI record ART003062835 reports `journalInfo/pub-year=2024`. Rule REF-META-002: once title/authors independently establish coherent identity, supplied year differs from the pinned evidence. Proposed result METADATA_DRIFT; recommendation: human checks citation version and publication date. Include exact source paths, record URL, retrieval timestamp, snapshot hash, rule version and human recommendation. This is a feasibility example, not an executed classification.

References are actually returned in `referenceInfo/reference`, including real misspellings `pubilisher`, `pubi-year`, and `isseue`. Several reference values are empty. Reference identifiers were not tested as detail IDs and are not proven resolvable article records. Bibliographic/reference inspection is possible; exhaustive citation graph verification and claim-level entailment are not established.

## Snapshot and audit feasibility

A future normalized record can preserve `source_system=KCI`, `source_record_id` copied from the observed article attribute, retrieval UTC time (collector-generated), normalized metadata, and SHA-256 content hash. Preserve multilingual values, author order, empty-versus-absent distinctions and raw field paths. Version normalization rules; define deterministic UTF-8 canonical JSON serialization with stable property ordering. Hash metadata independently of retrieval time for content identity. Store a separate envelope hash for provenance, and bind normalized evidence to the redacted snapshot hash already demonstrated here.

No normalized product schema or ledger was implemented. Deterministic reruns require storing the actual snapshot, query scope, candidate IDs, normalizer/rule versions and citation input; a hash alone cannot recreate evidence. Fresh live calls may change metadata or ordering. Snapshot fallback must be clearly labeled with age/provenance and never masquerade as a fresh zero result. Availability retries, rate limits, redistribution rights and retention policy need resolution before public deployment. The frozen source strategy remains unchanged.

## Limits and decision

One ordinary query, three retained search records and one detail cannot establish cross-discipline coverage, DOI/abstract completeness, service uptime, rate limits, ranking stability, or long-term identifier stability. Search/detail category strings already vary in granularity. The strongest immediate risk is accepting HTTP 200 or missing totals as success/zero without interpreting the response. Snapshots and conservative review are required for a defensible demonstration.

KCI GRADE: YELLOW
AUTH: Accepted for all four live responses; invalid/expired credentials untested.
SEARCH: Successful; total 2814, three records retained; displayCount echo differed from request.
DETAIL: Successful; total 1 and matching article identifier.
STABLE IDENTIFIER: articleInfo/@article-id confirmed across search/detail in this run; long-term stability unknown.
ZERO RESULT DISTINGUISHABLE: Yes in tested case: resultMsg No Data, absent total and records.
ERROR DISTINGUISHABLE: Yes for missing id; HTTP 200 with two error resultMsg elements. Other error families untested.
OBSERVED CORE FIELDS: Titles, authors, affiliations, year/month, journal, publisher, volume, issue, ISSN, DOI, pages, URL.
ABSTRACT AVAILABLE: Yes in retained search records and sampled detail; population completeness unknown.
DOI AVAILABLE: Yes in sampled article records; empty DOI occurs in references.
REFERENCE FORENSICS POSSIBLE: Limited bibliographic analysis yes; 17 detail references observed; graph resolution and CHIMERA classification unproven.
PUBLIC RULE EXPLANATION POSSIBLE: Yes for metadata comparisons with pinned evidence and human review; public redistribution terms unresolved.
SNAPSHOT POSSIBLE: Yes; redacted serialized snapshot SHA-256 recorded; versioned normalized ledger remains future work.
BIGGEST RISK: HTTP 200 error envelopes and absent counts could become false citation conclusions; credential echo also requires mandatory redaction.
UNRESOLVED QUESTIONS: Coverage/recall; displayCount and pagination; auth/rate-limit/outage envelopes; uptime; identifier persistence; metadata completeness; reference-link resolution; retention and redistribution permission.
