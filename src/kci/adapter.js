import { createHash } from 'node:crypto';
import { writeFile } from 'node:fs/promises';
import { SaxesParser } from 'saxes';

export const NORMALIZER_VERSION = 'kci-normalizer-v1';
export const KCI_STATES = Object.freeze([
  'KCI_OK', 'KCI_ZERO_RESULTS', 'KCI_UNAVAILABLE', 'KCI_AUTH_FAILED',
  'KCI_INVALID_RESPONSE', 'KCI_PARSE_FAILED',
]);
const ENDPOINT = 'https://open.kci.go.kr/po/openapi/openApiSearch.kci';
const MAX_BYTES = 2 * 1024 * 1024;
const hash = value => createHash('sha256').update(value, 'utf8').digest('hex');
export function canonicalJson(value) {
  if (Array.isArray(value)) return `[${value.map(canonicalJson).join(',')}]`;
  if (value !== null && typeof value === 'object') {
    return `{${Object.keys(value).sort().map(k => `${JSON.stringify(k)}:${canonicalJson(value[k])}`).join(',')}}`;
  }
  return JSON.stringify(value);
}

function parseXml(body) {
  const parser = new SaxesParser({ xmlns: true });
  const stack = [];
  let root;
  let count = 0;
  parser.on('doctype', () => { throw new Error('DTD prohibited'); });
  parser.on('error', () => { throw new Error('Invalid XML'); });
  parser.on('opentag', tag => {
    if (++count > 50000 || stack.length >= 64) throw new Error('XML limits');
    const node = { name: tag.name, attributes: Object.create(null), text: '', children: [], namespaced: Boolean(tag.uri || tag.prefix) };
    // Well-formed namespaces are an unknown envelope, not an XML parse error.
    for (const [name, attr] of Object.entries(tag.attributes)) {
      if (attr.uri) node.namespaced = true;
      node.attributes[name] = attr.value;
    }
    if (stack.length) stack.at(-1).children.push(node); else root = node;
    stack.push(node);
  });
  const text = value => { if (stack.length) stack.at(-1).text += value; };
  parser.on('text', text);
  parser.on('cdata', text);
  parser.on('closetag', () => { stack.pop(); });
  parser.write(body).close();
  return root;
}

const nodes = (node, name) => node?.children.filter(child => child.name === name) ?? [];
function one(node, name, required = false) {
  const matches = nodes(node, name);
  if (matches.length > 1 || (required && matches.length !== 1)) throw new Error('Cardinality');
  return matches[0] ?? null;
}
function leaf(node) {
  if (!node) return null;
  if (node.children.length) throw new Error('Expected scalar');
  return node.text;
}
const value = (node, name) => leaf(one(node, name));
function container(node, allowed) {
  if (!node || node.text.trim() || node.children.some(n => !allowed.includes(n.name))) throw new Error('Envelope shape');
}

function redact(root, secret) {
  const secrets = new Set(secret ? [secret, encodeURIComponent(secret)] : []);
  function collect(node) {
    if (/^(key|api[-_]?key|authorization|access[-_]?token)$/i.test(node.name) && node.text) {
      secrets.add(node.text); secrets.add(encodeURIComponent(node.text));
    }
    for (const [key, val] of Object.entries(node.attributes)) {
      if (/^(key|api[-_]?key|authorization|access[-_]?token)$/i.test(key) && val) secrets.add(val);
    }
    node.children.forEach(collect);
  }
  collect(root);
  const scrub = text => {
    for (const item of secrets) if (item) text = text.split(item).join('[REDACTED]');
    return text.replace(/https?:\/\/[^\s<>"']+/gi, url => {
      try {
        const parsed = new URL(url);
        if (parsed.username || parsed.password || [...parsed.searchParams.keys()].some(k => /^(key|api[-_]?key|authorization|access[-_]?token)$/i.test(k))) return '[REDACTED_URL]';
      } catch { return '[REDACTED_URL]'; }
      return url;
    });
  };
  function visit(node) {
    node.text = scrub(node.text);
    for (const key of Object.keys(node.attributes)) node.attributes[key] = scrub(node.attributes[key]);
    node.children.forEach(visit);
  }
  visit(root);
}

export function normalizeDoi(raw) {
  if (raw === null || !raw.trim()) return null;
  const candidate = raw.trim().replace(/^https?:\/\/(?:dx\.)?doi\.org\//i, '').replace(/^doi:\s*/i, '');
  // No punctuation stripping: punctuation may belong to the DOI suffix.
  return /^10\.\d{4,9}\/\S+$/i.test(candidate) ? candidate.toLowerCase() : null;
}

function normalizeRecord(record, index) {
  container(record, ['journalInfo', 'articleInfo', 'referenceInfo']);
  const journal = one(record, 'journalInfo', true);
  const article = one(record, 'articleInfo', true);
  if (journal.text.trim() || article.text.trim()) throw new Error('Mixed record content');
  const base = `/MetaData/outputData/record[${index + 1}]`;
  const ap = `${base}/articleInfo`;
  const jp = `${base}/journalInfo`;
  const id = article.attributes['article-id'];
  if (!/^ART\d+$/.test(id ?? '')) throw new Error('Article identity');
  const localized = (groupName, childName) => nodes(one(article, groupName), childName).map((n, i) => ({
    value: leaf(n), lang: n.attributes.lang ?? null,
    source_path: `${ap}/${groupName}/${childName}[${i + 1}]`,
  }));
  const titles = localized('title-group', 'article-title');
  if (!titles.some(t => t.value.trim())) throw new Error('Missing title');
  const authors = nodes(one(article, 'author-group'), 'author').map((n, i) => {
    const path = `${ap}/author-group/author[${i + 1}]`;
    const combined = n.text.match(/^([^()]+)\((.+)\)$/s);
    if (!n.children.length) return {
      name: combined ? combined[1] : n.text, english_name: n.attributes.english ?? null,
      affiliations: combined ? [{ value: combined[2], source_path: path }] : [],
      orcid: n.attributes['orc-id'] ?? null,
      source_text: n.text, source_path: path,
      english_name_source_path: `${path}/@english`,
    }; // Retain the combined source text alongside the derived trailing-parenthesis split.
    if (n.text.trim()) throw new Error('Mixed author content');
    return {
      name: value(n, 'name'), english_name: value(n, 'name-eng'),
      orcid: n.attributes['orc-id'] ?? null,
      affiliations: nodes(n, 'institution').map((a, j) => ({ value: leaf(a), source_path: `${path}/institution[${j + 1}]` })),
      source_text: null, source_path: path,
      name_source_path: `${path}/name`, english_name_source_path: `${path}/name-eng`,
    };
  });
  const metadata = {
    source_system: 'KCI', source_record_id: id,
    journal_id: journal.attributes['journal-id'] ?? null,
    titles, authors,
    publication_year: value(journal, 'pub-year'), publication_month: value(journal, 'pub-mon'),
    journal: value(journal, 'journal-name'), publisher: value(journal, 'publisher-name'),
    volume: value(journal, 'volume'), issue: value(journal, 'issue'), issn: value(journal, 'issn'),
    doi_raw: value(article, 'doi'), abstracts: localized('abstract-group', 'abstract'),
    keywords: nodes(one(article, 'keyword-group'), 'keyword').map((n, i) => ({ value: leaf(n), source_path: `${ap}/keyword-group/keyword[${i + 1}]` })),
    first_page: value(article, 'fpage'), last_page: value(article, 'lpage'), public_url: value(article, 'url'),
  };
  metadata.doi_normalized = normalizeDoi(metadata.doi_raw);
  if (metadata.publication_year && !/^\d{4}$/.test(metadata.publication_year)) throw new Error('Year format');
  if (metadata.publication_month && !/^(0?[1-9]|1[0-2])$/.test(metadata.publication_month)) throw new Error('Month format');
  const source_paths = { source_record_id: `${ap}/@article-id`, journal_id: `${jp}/@journal-id` };
  for (const [field, name] of Object.entries({ publication_year: 'pub-year', publication_month: 'pub-mon', journal: 'journal-name', publisher: 'publisher-name', volume: 'volume', issue: 'issue', issn: 'issn' })) source_paths[field] = `${jp}/${name}`;
  for (const [field, name] of Object.entries({ doi_raw: 'doi', first_page: 'fpage', last_page: 'lpage', public_url: 'url' })) source_paths[field] = `${ap}/${name}`;
  // Source position belongs to provenance, not normalized content identity.
  function contentOnly(item) {
    if (Array.isArray(item)) return item.map(contentOnly);
    if (item && typeof item === 'object') return Object.fromEntries(Object.entries(item).filter(([k]) => !k.endsWith('source_path')).map(([k, v]) => [k, contentOnly(v)]));
    return item;
  }
  const normalizer_version = NORMALIZER_VERSION;
  return { ...metadata, source_paths, normalizer_version,
    normalized_content_sha256: hash(canonicalJson({ normalizer_version, metadata: contentOnly(metadata) })) };
}

function outcome(state, extra = {}) {
  return { state, messages: [], records: [], total: null,
    eligible_for_citation_comparison: state === 'KCI_OK',
    eligible_for_not_found_in_kci: state === 'KCI_ZERO_RESULTS', ...extra };
}

/** Pure offline boundary; body is never returned. No research findings are emitted. */
export function classifyKciResponse({ body, status = 200, operation, expectedId,
  expectedTitle, transportFailure = false, apiKey, retrievedAt = new Date().toISOString() }) {
  if (transportFailure) return outcome('KCI_UNAVAILABLE');
  if (typeof body !== 'string' || Buffer.byteLength(body) > MAX_BYTES) return outcome('KCI_INVALID_RESPONSE');
  let root;
  try { root = parseXml(body); } catch { return outcome('KCI_PARSE_FAILED'); }
  // Redact decoded XML text/attributes, including numeric-entity encoded secrets.
  redact(root, apiKey);
  const snapshot = canonicalJson({ format: 'kci-redacted-tree-v1', root });
  const audit = { retrieved_at: retrievedAt, redacted_snapshot: snapshot, redacted_snapshot_sha256: hash(snapshot) };
  let messages = [];
  const result = (state, extra = {}) => outcome(state, { ...audit, messages, ...extra });
  try {
    const hasNamespace = n => n.namespaced || n.children.some(hasNamespace);
    if (hasNamespace(root) || !Number.isInteger(status) || status < 100 || status > 599) return result('KCI_INVALID_RESPONSE');
    if (!['articleSearch', 'articleDetail'].includes(operation) || root.name !== 'MetaData') return result('KCI_INVALID_RESPONSE');
    container(root, ['inputData', 'outputData']);
    const input = one(root, 'inputData', true);
    if (value(input, 'apiCode') !== operation) return result('KCI_INVALID_RESPONSE');
    if (operation === 'articleSearch' && expectedTitle !== undefined && value(input, 'title') !== expectedTitle) return result('KCI_INVALID_RESPONSE');
    const output = one(root, 'outputData', true);
    container(output, ['result', 'record']);
    const envelope = one(output, 'result', true);
    container(envelope, ['total', 'resultMsg']);
    messages = nodes(envelope, 'resultMsg').map(n => leaf(n).trim());
    const records = nodes(output, 'record');
    const rawTotal = value(envelope, 'total');
    const total = rawTotal !== null && /^\d+$/.test(rawTotal.trim()) ? Number(rawTotal.trim()) : null;
    if (rawTotal !== null && (total === null || !Number.isSafeInteger(total))) return result('KCI_INVALID_RESPONSE');
    const authMessage = m => /^(등록되지 않은 key 입니다|사용기간이 종료되었습니다)[.]?$/.test(m);
    if (!records.length && rawTotal === null && messages.length && messages.every(authMessage)) return result('KCI_AUTH_FAILED');
    if (status === 429 || status >= 500) return result('KCI_UNAVAILABLE');
    if (status < 200 || status >= 300) return result('KCI_INVALID_RESPONSE');
    if (records.length && !messages.length && total !== null && total >= records.length && total > 0) {
      if (operation === 'articleDetail' && (total !== 1 || records.length !== 1)) return result('KCI_INVALID_RESPONSE');
      const normalized = records.map(normalizeRecord);
      if (new Set(normalized.map(r => r.source_record_id)).size !== records.length) return result('KCI_INVALID_RESPONSE');
      if (operation === 'articleDetail' && (!expectedId || value(input, 'id') !== expectedId || normalized[0].source_record_id !== expectedId)) return result('KCI_INVALID_RESPONSE');
      return result('KCI_OK', { total, records: normalized.map(r => ({ ...r, retrieved_at: retrievedAt, redacted_snapshot_sha256: audit.redacted_snapshot_sha256 })) });
    }
    if (operation === 'articleSearch' && !records.length && messages.length === 1 && messages[0] === 'No Data' && (rawTotal === null || total === 0)) return result('KCI_ZERO_RESULTS', { total });
    return result('KCI_INVALID_RESPONSE');
  } catch { return result('KCI_INVALID_RESPONSE'); }
}

/** Write exactly the bytes hashed by redacted_snapshot_sha256, with no newline. */
export async function persistRedactedSnapshot(path, response) {
  if (typeof response.redacted_snapshot !== 'string' || hash(response.redacted_snapshot) !== response.redacted_snapshot_sha256) throw new Error('Invalid snapshot');
  await writeFile(path, response.redacted_snapshot, { encoding: 'utf8', flag: 'wx', mode: 0o600 });
}

/** Server-side adapter. Inject a transport only for trusted callers/tests. */
export function createKciAdapter({ apiKey = process.env.KCI_API_KEY, fetchImpl = globalThis.fetch,
  timeoutMs = 10000, maxResponseBytes = MAX_BYTES, now = () => new Date().toISOString() } = {}) {
  if (typeof apiKey !== 'string' || !apiKey.trim()) throw new Error('KCI credential required');
  if (!Number.isSafeInteger(timeoutMs) || timeoutMs <= 0 || timeoutMs > 2147483647 || !Number.isSafeInteger(maxResponseBytes) || maxResponseBytes <= 0 || maxResponseBytes > MAX_BYTES) throw new Error('Invalid KCI resource limits');
  async function request(operation, parameters) {
    const url = new URL(ENDPOINT);
    url.search = new URLSearchParams({ apiCode: operation, ...parameters, key: apiKey }).toString();
    const controller = new AbortController();
    let timer;
    const work = async () => {
      try {
        const response = await fetchImpl(url, { method: 'GET', redirect: 'error', signal: controller.signal, headers: { Accept: 'application/xml' } });
        if (!response.body) return outcome('KCI_INVALID_RESPONSE');
        const reader = response.body.getReader();
        const chunks = [];
        let length = 0;
        try {
          for (;;) {
            const { done, value: chunk } = await reader.read();
            if (done) break;
            length += chunk.byteLength;
            if (length > maxResponseBytes) {
              controller.abort(); void reader.cancel().catch(() => {});
              return outcome('KCI_INVALID_RESPONSE');
            }
            chunks.push(chunk);
          }
        } finally { reader.releaseLock(); }
        let body;
        try { body = new TextDecoder('utf-8', { fatal: true }).decode(Buffer.concat(chunks)); }
        catch { return outcome('KCI_PARSE_FAILED'); }
        return classifyKciResponse({ body, status: response.status, operation, expectedId: parameters.id, expectedTitle: parameters.title, apiKey, retrievedAt: now() });
      } catch { return outcome('KCI_UNAVAILABLE'); } // Never return URL, headers, body, or exception messages.
    };
    const timeout = new Promise(resolve => { timer = setTimeout(() => { controller.abort(); resolve(outcome('KCI_UNAVAILABLE')); }, timeoutMs); });
    try { return await Promise.race([work(), timeout]); } finally { clearTimeout(timer); }
  }
  return Object.freeze({
    articleSearch(input = {}) {
      if (!input || typeof input !== 'object' || Array.isArray(input)) return Promise.resolve(outcome('KCI_INVALID_RESPONSE'));
      const { title, page = 1, displayCount = 10 } = input;
      if (typeof title !== 'string' || !title.trim() || title.length > 2000 || !Number.isSafeInteger(page) || page < 1 || !Number.isSafeInteger(displayCount) || displayCount < 1 || displayCount > 100) return Promise.resolve(outcome('KCI_INVALID_RESPONSE'));
      return request('articleSearch', { title, page: String(page), displayCount: String(displayCount) });
    },
    articleDetail(id) {
      if (typeof id !== 'string' || id.length > 100 || !/^ART\d+$/.test(id)) return Promise.resolve(outcome('KCI_INVALID_RESPONSE'));
      return request('articleDetail', { id });
    },
  });
}
