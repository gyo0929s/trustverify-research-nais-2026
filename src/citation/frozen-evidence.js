/**
 * FROZEN_EVIDENCE replay adapter. It serves sanitized KCI responses that were observed live and
 * frozen, so the unchanged audit engine can recompute findings offline. It never invents a result:
 * a citation whose search evidence was not frozen is reported as not covered, and must not be audited.
 * This is an explicitly labeled demo/replay mode, never a silent fallback for LIVE KCI.
 */
const toRecord = record => ({ source_record_id: record.article_id, ...record });

export function createFrozenEvidenceAdapter(frozen) {
  const searchByTitle = new Map();
  const detailById = new Map();
  for (const item of frozen?.items ?? []) {
    const evidence = frozen.evidence?.[item.evidence_hash];
    if (!evidence || typeof item.input?.title !== 'string') continue;
    searchByTitle.set(item.input.title, evidence.search);
    for (const record of evidence.detail?.records ?? []) detailById.set(record.article_id, evidence.detail);
  }
  return Object.freeze({
    covers(citation) {
      return typeof citation?.title === 'string' && searchByTitle.has(citation.title);
    },
    async articleSearch({ title } = {}) {
      const search = searchByTitle.get(title);
      if (!search) throw new Error('No frozen search evidence for this title');
      return { state: search.state, messages: [], total: search.total, records: search.records.map(toRecord) };
    },
    async articleDetail(id) {
      const detail = detailById.get(id);
      if (!detail) throw new Error('No frozen detail evidence for this record');
      return { state: detail.state, messages: [], total: 1, records: detail.records.map(toRecord) };
    },
  });
}
