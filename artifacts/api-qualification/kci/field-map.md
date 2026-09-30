# Actual KCI fields and proposed normalization

Evidence: the four adjacent redacted JSON artifacts captured 2026-09-30. Paths below are relative to `MetaData/outputData/record` unless stated otherwise. OBSERVED means present, not necessarily populated or universal. DOCUMENTED_NOT_OBSERVED means listed in the official specification but absent in the relevant sample. UNKNOWN means not established; no field is declared globally NOT_SUPPORTED from a single sample.

## Actual KCI field map

| Actual KCI field | Observed? | Meaning | Needed for TrustVerify P0? |
| --- | --- | --- | --- |
| `articleInfo/@article-id` | OBSERVED search/detail | Article control number; ART003062835 round-tripped via detail id | Yes, evidence identity |
| `journalInfo/@journal-id` | OBSERVED detail | Journal identity, sample 001943 | Supporting |
| `journalInfo/journal-name` | OBSERVED | Journal title | Yes |
| `journalInfo/publisher-name` | OBSERVED | Publishing organization | Supporting |
| `journalInfo/pub-year` | OBSERVED | Publication year; sample 2024 | Yes |
| `journalInfo/pub-mon` | OBSERVED | Publication month; sample 03 | Supporting |
| `journalInfo/volume`, `journalInfo/issue` | OBSERVED | Volume and issue | Yes when supplied |
| `journalInfo/issn` | OBSERVED detail | Journal ISSN | Supporting |
| `journalInfo/kci-registration` | OBSERVED detail | Registration category | No |
| `journalInfo/foreign-registration` | OBSERVED detail, empty | Overseas registration | No |
| `journalInfo/foreign-listed/name` | DOCUMENTED_NOT_OBSERVED search | Overseas listing names | No |
| `articleInfo/article-categories` | OBSERVED | Research category; search/detail granularity differs | No |
| `articleInfo/article-regularity` | OBSERVED | Regular article marker | No |
| `articleInfo/article-language` | OBSERVED detail | Article language | Supporting |
| `articleInfo/title-group/article-title`, `@lang` | OBSERVED | Titles labeled original/foreign/english; original need not be Korean | Yes |
| `articleInfo/author-group/author` (search text) | OBSERVED | Combined author and affiliation text | Yes; prefer structured detail |
| `articleInfo/author-group/author/@english` | OBSERVED search | English author name | Supporting |
| `articleInfo/author-group/author/@orc-id` | OBSERVED third search record; absent sampled detail | Author identifier | Supporting; do not assume universal |
| `articleInfo/author-group/author/name` | OBSERVED detail | Author name | Yes |
| `articleInfo/author-group/author/name-eng` | OBSERVED detail | English name | Supporting |
| `articleInfo/author-group/author/institution` | OBSERVED detail | Affiliation | Supporting |
| `articleInfo/author-group/author/@author-division`, `@author-part` | OBSERVED detail | Authorship role values | Supporting |
| `articleInfo/abstract-group/abstract`, `@lang` | OBSERVED search/detail | Abstracts by language | Optional context; not full-text verification |
| `articleInfo/abstract` as direct child | DOCUMENTED_NOT_OBSERVED detail | Documentation places abstract here; live response nests abstract-group | Use observed path |
| `articleInfo/keyword-group/keyword` | OBSERVED detail | Repeated keywords | Optional |
| `articleInfo/fpage`, `articleInfo/lpage` | OBSERVED | First and last page | Yes when supplied |
| `articleInfo/doi` | OBSERVED populated | DOI represented as resolver URL | Yes when supplied |
| `articleInfo/uci` | OBSERVED search, empty; DOCUMENTED_NOT_OBSERVED detail | UCI identifier | No |
| `articleInfo/citation-count`, `@kci`, `@wos` | OBSERVED | Citation counts; zero in retained samples | No; not reference verification |
| `articleInfo/fwci`, `@create-dt` | OBSERVED detail | Impact metric and creation date, not publication date | No |
| `articleInfo/url` | OBSERVED | Public record URL with article ID, no credentials | Yes, evidence link |
| `articleInfo/verified` | OBSERVED Y | Source's own verification flag; not TrustVerify VERIFIED | No classification shortcut |
| `articleInfo/orte-open-yn` | DOCUMENTED_NOT_OBSERVED search | Full-text availability flag | No |
| `referenceInfo/reference` | OBSERVED detail, 17 entries | Outgoing bibliography entries | Supporting future forensics |
| `referenceInfo/reference/@refebibl-id` | OBSERVED | Reference entry identifier; not proven KCI article ID | Supporting |
| `referenceInfo/reference/@type-code`, `@type-name` | OBSERVED | Bibliography item type | Supporting |
| `referenceInfo/reference/title`, `author` | OBSERVED | Reference title and author text | Supporting |
| `referenceInfo/reference/journal-name`, `conference-name` | OBSERVED depending on type | Reference venue | Supporting |
| `referenceInfo/reference/pubilisher` | OBSERVED, sometimes empty | Reference publisher; spelling is literal | Supporting |
| `referenceInfo/reference/pubi-year` | OBSERVED, sometimes empty | Reference publication year; spelling is literal | Supporting |
| `referenceInfo/reference/volume`, `isseue`, `serno` | OBSERVED, some/all values empty | Reference volume, issue-like field, serial-like field; latter semantics unverified | Supporting; preserve literal names |
| `referenceInfo/reference/page`, `doi` | OBSERVED, some DOI empty | Reference pages and DOI | Supporting |
| `MetaData/outputData/result/total` | OBSERVED positive search/detail only | Total matches, 2814 / 1 | Yes; missing does not mean zero |
| `MetaData/outputData/result/resultMsg` | OBSERVED zero/invalid | No Data or validation messages | Yes, classify envelope first |
| `MetaData/inputData/key` | OBSERVED, value redacted | Echoed secret | Never preserve value |
| `MetaData/inputData/apiCode`, `title`, `id`, `page`, `displayCount` | OBSERVED depending on call | Echoed request context; displayCount differs from requested value | Audit supporting, excluding key |
| Publication day, full text, record revision timestamp | UNKNOWN | No corresponding field observed | Not assumed |

NOT_SUPPORTED is intentionally unused: these observations do not establish API-wide absence. Wrapper nodes (`record`, `journalInfo`, `articleInfo`, title/author/abstract/keyword groups) are actual containers, not additional bibliographic values.

## TrustVerify normalized proposals — not KCI fields

| Proposed normalized meaning | Derivation / constraint |
| --- | --- |
| `source_system` | Collector constant KCI |
| `kci_record_id` / ledger `source_record_id` | Copy `articleInfo/@article-id`; keep namespace |
| `title` / multilingual titles | title-group values with original language labels preserved |
| `authors` | Ordered detail names, name-eng, affiliations and optional identifiers; retain source values |
| `publication_year`, `publication_month` | journalInfo/pub-year and pub-mon; no invented day |
| `journal`, `publisher`, `volume`, `issue`, `issn` | Corresponding journalInfo children |
| `doi` | Preserve source URL plus carefully parsed DOI identifier; missing stays unknown |
| `abstract` | Observed abstract-group values with language labels |
| `keywords` | Repeated keyword-group values |
| `url` | Observed public article URL; validate separately before display |
| `references` | Preserve reference-entry namespace and literal field provenance; never promote REF IDs to ART IDs |
| `retrieved_at` | Collector UTC timestamp, not a KCI field |
| `content_hash` | Proposed canonical normalized metadata SHA-256 with normalization version; not implemented |
| `response_snapshot_sha256` | Implemented SHA-256 over UTF-8 saved response_xml string after redaction, XML serialization and record trimming; not a raw-wire hash |

Official schema context: [search](https://www.kci.go.kr/kciportal/po/openapi/openDataView.kci?datasetBean.dtstSeqNo=1) and [detail](https://www.kci.go.kr/kciportal/po/openapi/openDataView.kci?datasetBean.dtstSeqNo=21). Live output takes precedence for parser design. Normalization must not turn absent/empty fields into asserted facts.
