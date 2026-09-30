/**
 * Resolves a draft sentence's citation marker ([n]) to bibliography row n.
 * P0 scope: exactly one distinct numeric marker per sentence. It never guesses a row.
 */
const MARKER = /\[\s*(\d{1,3})\s*\]/gu;
const PRINTED_NUMBER = /^\s*(?:\[\s*(\d{1,3})\s*\]|\(\s*(\d{1,3})\s*\)|(\d{1,3})\s*[.)])/u;

const printedNumberOf = row => {
  const match = String(row?.raw ?? '').match(PRINTED_NUMBER);
  return match ? Number(match[1] ?? match[2] ?? match[3]) : null;
};

export function resolveCitationMarker(draftSentence, bibliographyRows) {
  if (typeof draftSentence !== 'string' || !draftSentence.trim()) throw new TypeError('draftSentence must be a non-empty string');
  if (!Array.isArray(bibliographyRows)) throw new TypeError('bibliographyRows must be an array');
  const numbers = [...new Set([...draftSentence.matchAll(MARKER)].map(match => Number(match[1])))];
  if (numbers.length === 0) return { resolved: false, reason: 'NO_MARKER' };
  if (numbers.length > 1) return { resolved: false, reason: 'MULTIPLE_MARKERS', markers: numbers };
  const [number] = numbers;

  const numbered = bibliographyRows.some(row => printedNumberOf(row) !== null);
  const row = numbered
    ? bibliographyRows.find(candidate => printedNumberOf(candidate) === number)
    : bibliographyRows.find(candidate => candidate.index === number);
  if (!row) return { resolved: false, reason: 'MARKER_NOT_IN_BIBLIOGRAPHY', marker: `[${number}]` };

  const citingClaim = draftSentence.replace(MARKER, '').replace(/\s+([.,;:!?])/gu, '$1').replace(/\s{2,}/gu, ' ').trim();
  return { resolved: true, marker: `[${number}]`, number, resolved_by: numbered ? 'PRINTED_NUMBER' : 'ROW_POSITION', row, citing_claim: citingClaim };
}
