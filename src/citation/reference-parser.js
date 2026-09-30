/**
 * Reference-list parser. Pure text extraction only: it never queries KCI and never produces
 * an audit status. Parse states are READY, NEEDS_REVIEW, or UNPARSED. An UNPARSED row is a
 * parsing outcome, never NOT_FOUND_IN_KCI.
 */
export const PARSE_STATES = Object.freeze({ READY: 'READY', NEEDS_REVIEW: 'NEEDS_REVIEW', UNPARSED: 'UNPARSED' });
export const MAX_REFERENCE_TEXT_LENGTH = 32000;
export const MAX_PARSED_REFERENCES = 100;

const NUMBER_PREFIX = /^\s*(?:\[\s*\d{1,3}\s*\]|\(\s*\d{1,3}\s*\)|\d{1,3}\s*[.)])\s*/u;
const DOI_PATTERN = /(?:https?:\/\/(?:dx\.)?doi\.org\/|doi:\s*)?(10\.\d{4,9}\/[^\s"'<>]+)/iu;
const YEAR_PATTERN = /(?<!\d)(?:19|20)\d{2}(?!\d)/gu;
const PAREN_YEAR_PATTERN = /\(\s*((?:19|20)\d{2})[a-z]?\s*\)/u;
const QUOTED_TITLE = /[“"「『]([^”"」』]{3,})[”"」』]/u;
const AUTHOR_SPLIT = /\s*(?:,|;|&|·|ㆍ|\band\b)\s*/u;
const INITIALS_ONLY = /^(?:[A-Z]\.?\s*-?\s*)+$/u;

function splitEntries(text) {
  const lines = text.split(/\r?\n/u);
  const numbered = lines.some(line => NUMBER_PREFIX.test(line) && line.replace(NUMBER_PREFIX, '').trim());
  if (!numbered) return lines.map(line => line.trim()).filter(Boolean);
  const entries = [];
  for (const line of lines) {
    const trimmed = line.trim();
    if (!trimmed) continue;
    if (NUMBER_PREFIX.test(line) || entries.length === 0) entries.push(trimmed);
    else entries[entries.length - 1] = `${entries[entries.length - 1]} ${trimmed}`;
  }
  return entries;
}

const cleanEdge = value => value.replace(/^[\s,.:;]+|[\s,.:;]+$/gu, '');

function parseAuthors(segment, issues) {
  const cleaned = cleanEdge(segment ?? '');
  if (!cleaned) return null;
  const parts = cleaned.split(AUTHOR_SPLIT).map(cleanEdge)
    .filter(part => part && !/^(?:et al|외)$/iu.test(part));
  if (!parts.length) return null;
  if (parts.some(part => INITIALS_ONLY.test(part))) {
    // "Zhang, M., & Shin, S. S." cannot be split into names without guessing.
    issues.push('AUTHORS_AMBIGUOUS');
    return null;
  }
  return parts;
}

/** Parses one reference string into citation fields plus a parse state. */
export function parseReference(raw, index = 1) {
  const source = String(raw ?? '').trim();
  let text = source.replace(NUMBER_PREFIX, '').trim();
  const issues = [];

  const doiMatch = text.match(DOI_PATTERN);
  const doi = doiMatch ? doiMatch[1].replace(/[.,;)\]]+$/u, '') : null;
  if (doiMatch) text = text.replace(doiMatch[0], ' ').replace(/\s+/gu, ' ').trim();

  const parenYear = text.match(PAREN_YEAR_PATTERN);
  const years = [...new Set(text.match(YEAR_PATTERN) ?? [])];
  let publicationYear = parenYear ? parenYear[1] : null;
  if (!publicationYear && years.length === 1) [publicationYear] = years;
  if (!publicationYear && years.length > 1) issues.push('YEAR_AMBIGUOUS');

  let title = null;
  let authors = null;
  const quoted = text.match(QUOTED_TITLE);
  if (quoted) {
    title = cleanEdge(quoted[1]);
    authors = parseAuthors(text.slice(0, quoted.index), issues);
  } else if (parenYear) {
    const afterYear = text.slice(parenYear.index + parenYear[0].length).replace(/^\s*[.,:]\s*/u, '');
    const end = afterYear.search(/\.\s/u);
    title = cleanEdge(end >= 0 ? afterYear.slice(0, end) : afterYear);
    authors = parseAuthors(text.slice(0, parenYear.index), issues);
  } else {
    // Unrecognized layout: best-effort "Authors. Title. Venue" split, always flagged for review.
    const segments = text.split(/\.\s/u).map(cleanEdge).filter(Boolean);
    if (segments.length >= 2) {
      title = segments[1];
      authors = parseAuthors(segments[0], issues);
      issues.push('TITLE_HEURISTIC');
    }
  }
  if (title !== null && title.length < 3) title = null;

  const parseStatus = title === null
    ? PARSE_STATES.UNPARSED
    : issues.length ? PARSE_STATES.NEEDS_REVIEW : PARSE_STATES.READY;
  return {
    row_id: `ref-${index}`,
    index,
    raw: source,
    title,
    authors,
    publication_year: publicationYear,
    doi,
    parse_status: parseStatus,
    issues: title === null ? ['TITLE_NOT_FOUND', ...issues] : issues,
  };
}

/** Splits a pasted bibliography into entries and parses each one. */
export function parseReferenceList(text) {
  if (typeof text !== 'string') throw new TypeError('Reference text must be a string');
  if (text.length > MAX_REFERENCE_TEXT_LENGTH) throw new TypeError('Reference text is too long');
  const entries = splitEntries(text);
  const truncated = entries.length > MAX_PARSED_REFERENCES;
  const rows = entries.slice(0, MAX_PARSED_REFERENCES).map((entry, position) => parseReference(entry, position + 1));
  return { rows, truncated };
}
