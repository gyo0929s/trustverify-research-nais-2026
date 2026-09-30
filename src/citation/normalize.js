import { normalizeDoi } from '../kci/adapter.js';

export function normalizeText(value) {
  if (typeof value !== 'string') return null;
  const normalized = value.normalize('NFKC').trim().replace(/\s+/gu, ' ').toLowerCase();
  return normalized || null;
}

export function normalizeYear(value) {
  if (typeof value !== 'string') return null;
  const normalized = value.normalize('NFKC').trim().replace(/\s+/gu, ' ');
  return normalized || null;
}

export function normalizeCitationInput(input) {
  if (!input || typeof input !== 'object' || Array.isArray(input)) {
    throw new TypeError('Citation must be an object');
  }
  if (typeof input.title !== 'string' || !normalizeText(input.title) || input.title.length > 2000) {
    throw new TypeError('Citation title is required');
  }

  const citation = { title: input.title.normalize('NFC').trim().replace(/\s+/gu, ' ') };
  if (Object.hasOwn(input, 'authors')) {
    if (!Array.isArray(input.authors) || input.authors.length > 100
      || input.authors.some(author => typeof author !== 'string' || !normalizeText(author) || author.length > 500)) {
      throw new TypeError('Citation authors must be non-empty strings');
    }
    citation.authors = input.authors.map(author => author.normalize('NFC').trim().replace(/\s+/gu, ' '));
  }
  for (const field of ['publication_year', 'doi']) {
    if (!Object.hasOwn(input, field)) continue;
    if (typeof input[field] !== 'string' || !input[field].trim() || input[field].length > 500) {
      throw new TypeError(`Citation ${field} must be a non-empty string`);
    }
    citation[field] = input[field].normalize('NFC').trim().replace(/\s+/gu, ' ');
  }
  return citation;
}

export function titleMatches(record, suppliedTitle) {
  const target = normalizeText(suppliedTitle);
  return target !== null && record.titles.some(title => normalizeText(title.value) === target);
}

export function compareAuthors(supplied, evidence) {
  if (!Array.isArray(evidence) || evidence.length === 0) return 'UNKNOWN';
  if (supplied.length !== evidence.length) return 'UNKNOWN';
  const matches = supplied.every((author, index) => {
    const normalized = normalizeText(author);
    const aliases = [evidence[index]?.name, evidence[index]?.english_name, evidence[index]?.source_text]
      .map(normalizeText)
      .filter(Boolean);
    return normalized !== null && aliases.includes(normalized);
  });
  return matches ? 'MATCH' : 'UNKNOWN';
}

export function compareDoi(supplied, evidenceRaw) {
  const suppliedNormalized = normalizeDoi(supplied);
  const evidenceNormalized = normalizeDoi(evidenceRaw);
  if (suppliedNormalized === null || evidenceNormalized === null) return 'UNKNOWN';
  return suppliedNormalized === evidenceNormalized ? 'MATCH' : 'MISMATCH';
}
