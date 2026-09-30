// Shared evidence sanitizer for evaluation runners.
// Keeps only bibliographic fields the audit engine reads: no key, URL, public_url, source paths, or timestamps.
export function sanitizeRecord(record) {
  return {
    article_id: record.source_record_id,
    titles: record.titles.map(title => ({ value: title.value, lang: title.lang })),
    authors: record.authors.map(author => ({ name: author.name, english_name: author.english_name, source_text: author.source_text })),
    publication_year: record.publication_year,
    journal: record.journal,
    volume: record.volume,
    issue: record.issue,
    first_page: record.first_page,
    last_page: record.last_page,
    doi_raw: record.doi_raw,
    doi_normalized: record.doi_normalized,
  };
}

// Records sanitized adapter responses. Each articleSearch call starts a new trace entry.
export function recordingAdapter(inner) {
  const traces = [];
  return {
    traces,
    async articleSearch(input) {
      const response = await inner.articleSearch(input);
      traces.push({ search: { state: response.state, total: response.total ?? null, records: (response.records ?? []).map(sanitizeRecord) }, detail: null });
      return response;
    },
    async articleDetail(id) {
      const response = await inner.articleDetail(id);
      traces[traces.length - 1].detail = { state: response.state, records: (response.records ?? []).map(sanitizeRecord) };
      return response;
    },
  };
}
