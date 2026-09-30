# BUILD-01 KCI runtime adapter

KCI is the primary canonical bibliographic evidence source for this prototype. It does not prove scientific truth. This component retrieves and normalizes evidence; it does not compare citations or assign research findings.

## Interface and execution

Requires Node.js 24+. Run `npm ci --ignore-scripts` and `npm test`. All tests are offline. No live API calls were needed for BUILD-01.

Server-side usage, with `KCI_API_KEY` supplied through the environment by the host (for local execution Node supports `--env-file=.env.local`):

```js
import { createKciAdapter, persistRedactedSnapshot } from './src/kci/adapter.js';

const kci = createKciAdapter();
const search = await kci.articleSearch({ title: '컴퓨터', page: 1, displayCount: 3 });
if (search.state === 'KCI_OK') {
  const detail = await kci.articleDetail(search.records[0].source_record_id);
  // Choose an access-controlled, new snapshot path. No persistence is automatic.
  if (detail.redacted_snapshot) {
    await persistRedactedSnapshot('/your/evidence/unique-snapshot.json', detail);
  }
}
```

Keep the adapter on the server. It never prints the key, request URL, response body, or exception details. Redirects are disabled. The default deadline is 10 seconds across request and body consumption; responses are limited to 2 MiB, XML depth to 64, and element count to 50,000. DTDs are prohibited. Resource options may lower the body limit. Requests are not retried automatically. The transport and clock can be injected by trusted tests; instrumentation around a transport must not log authenticated URLs.

Missing credentials or invalid adapter resource configuration throw generic setup errors. Invalid method arguments return `KCI_INVALID_RESPONSE` without a request. Transport exceptions/timeouts return `KCI_UNAVAILABLE`. Runtime methods are `articleSearch({ title, page?, displayCount? })` and `articleDetail(articleId)`; only the documented subset of request parameters used here is exposed.

## Runtime state contract

Every response includes `state`, `messages: string[]`, `records`, `total`, `eligible_for_citation_comparison`, and `eligible_for_not_found_in_kci`.

| State | Meaning | Permitted downstream use |
| --- | --- | --- |
| `KCI_OK` | Consistent positive total and valid article records; detail identity matches request | Eligible for citation comparison only |
| `KCI_ZERO_RESULTS` | Search No Data message, no records or contradictory messages, absent or zero total | Eligible for a future `NOT_FOUND_IN_KCI` finding only |
| `KCI_UNAVAILABLE` | Transport failure/deadline, or HTTP 429/5xx with a valid inspected envelope | System failure only |
| `KCI_AUTH_FAILED` | Recognized documented authentication messages in an otherwise consistent error envelope | System failure only |
| `KCI_INVALID_RESPONSE` | Invalid inputs, unexpected structure, validation errors, contradictory/unknown messages, identity mismatch or unsupported HTTP result | System failure only |
| `KCI_PARSE_FAILED` | Malformed XML, prohibited DTD, parser resource limit, or invalid UTF-8 | System failure only |

No state emits `VERIFIED`, `METADATA_DRIFT`, `CHIMERA`, or any other research finding. Both eligibility flags are false for all failures. KCI's `verified=Y` and bibliography `refebibl-id` never supply an application finding or article identifier.

Classification validates XML and the expected `MetaData/inputData` and `outputData/result` shape before interpreting messages. Auth messages are recognized conservatively from the official documented Korean wording, with an optional final period; synthetic tests cover these, but real auth-failure envelopes remain unqualified. Unknown HTTP 401/403 bodies are not assumed to prove an authentication error. Malformed HTTP error bodies yield parse failures, and unknown HTTP error envelopes yield invalid-response failures; neither can become a citation result.

Positive search totals may exceed page record counts. Totals must be safe nonnegative integers, positive for records, and at least the page record count. Detail requires total 1 and one record. Missing positive totals, duplicate record IDs, missing titles/IDs, duplicate singleton structures, namespaces, and mixed errors fail closed. Search title echoes are checked by the live adapter. The observed search zero lacks a total; absence alone never means zero. A detail No Data response is not a search zero.

## Normalized records

Each record preserves:

- `source_system`, `source_record_id` from `articleInfo/@article-id`, and optional `journal_id`.
- `titles: [{ value, lang, source_path }]` without selecting a canonical title.
- Authors in source order, English names, affiliations, optional observed ORCID and source paths. Search's combined author/affiliation text remains in `source_text`; a trailing parenthesized affiliation is also split as a derived convenience. Detail's separate name/institution fields are preferable. Ambiguous combined text is retained without an invented affiliation.
- `publication_year`, `publication_month`, `journal`, `publisher`, `volume`, `issue`, `issn`.
- `doi_raw` unchanged from decoded source text and `doi_normalized` derived by trimming, removing a recognized DOI prefix, validating the basic DOI shape, and lowercasing. Suffix punctuation is retained; DOI existence is not checked.
- Language-labeled `abstracts`, `keywords`, `first_page`, `last_page`, `public_url` and scalar `source_paths`.
- `normalizer_version`, `retrieved_at`, `normalized_content_sha256`, and `redacted_snapshot_sha256`.

Scalar source values remain strings. Missing scalars are null; present empty scalars remain empty strings. Missing groups are empty arrays. A provenance path names the source location but does not assert that a missing field exists. DOI normalization returns null for empty or unrecognized values while retaining the raw value. There is no assumed publication day, full text, DOI, or ORCID. Public URLs are source evidence values, not URLs that the adapter fetches; any future renderer must independently validate safe link schemes.

The canonical metadata hash covers the normalizer version plus normalized values, preserving source array order. Retrieval time, snapshot identity, and source-position paths are excluded, so the same metadata on a different page or at a different time has the same content identity. Search and detail may legitimately hash differently because they expose different metadata.

## Snapshots and security

After successful XML parsing, the adapter redacts credential elements/attributes and known secret values in decoded text, including entity-encoded credential echoes. Credential-bearing URLs are suppressed. It then creates canonical JSON for the redacted XML tree (`kci-redacted-tree-v1`). Malformed XML and transport failures return no body or snapshot, preventing unsafe raw-response persistence.

`redacted_snapshot_sha256` hashes the UTF-8 bytes of `redacted_snapshot`. `persistRedactedSnapshot` verifies that hash and writes exactly those bytes, without a newline, to a new file; it refuses overwrite. Persistence failures throw independently and are not citation outcomes. No raw-wire hash is claimed. Pinning evidence requires retaining the snapshot itself, not only its hash. No API secret, authenticated request URL, request headers, raw PDF, or full paper text is written by this adapter.

## Validation and limits

The offline suite covers the four committed qualification fixtures, all BUILD-01 required cases, and adversarial/synthetic envelope, transport, redaction and hash cases. Fixture totals describe the original query; the retained search fixture has three sampled records and is not a full response export.

Remaining limits: KCI coverage and uptime, real authentication/rate-limit envelopes, displayCount/pagination behavior, long-term ID stability and metadata completeness are not established by these tests. No live pagination traversal, retries, cache, citation comparison, reference graph resolution, or application ledger is implemented. The strict parser dependency `saxes` is pinned in the lockfile; its upstream repository is archived, so continued dependency review or replacement is needed before broader deployment. Corpus and language-track plans remain unchanged.
