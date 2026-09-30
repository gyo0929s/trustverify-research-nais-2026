import { createServer } from 'node:http';
import { readFile, stat } from 'node:fs/promises';
import { dirname, extname, join, resolve, sep } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { createCitationAuditService } from './citation/audit.js';
import { BatchRequestError, createCitationBatchService, MAX_BATCH_SIZE } from './citation/batch.js';
import { createFrozenEvidenceAdapter } from './citation/frozen-evidence.js';
import { parseReferenceList } from './citation/reference-parser.js';
import { createKciAdapter } from './kci/adapter.js';

const SRC_DIR = dirname(fileURLToPath(import.meta.url));
const ROOT_DIR = join(SRC_DIR, '..');
const DEFAULT_UI_DIR = join(SRC_DIR, 'ui');
const DEFAULT_FIXTURES_DIR = join(ROOT_DIR, 'test', 'fixtures', 'findings');
const DEFAULT_BATCH_DEMO_PATH = join(ROOT_DIR, 'test', 'fixtures', 'batch', 'demo-bibliography.txt');
const DEFAULT_FROZEN_EVIDENCE_PATH = join(ROOT_DIR, 'artifacts', 'evaluation', 'batch-demo', 'demo-batch-results.json');
export const MAX_JSON_BODY_BYTES = 16 * 1024;
export const MAX_BATCH_BODY_BYTES = 128 * 1024;

const MIME_TYPES = {
  '.html': 'text/html; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.js': 'application/javascript; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.svg': 'image/svg+xml',
  '.ico': 'image/x-icon',
};

function sendJson(res, status, value) {
  res.writeHead(status, {
    'Content-Type': 'application/json; charset=utf-8',
    'Cache-Control': 'no-store',
    'X-Content-Type-Options': 'nosniff',
  });
  res.end(JSON.stringify(value));
}

async function sendFile(res, filePath, contentType) {
  try {
    const data = await readFile(filePath);
    res.writeHead(200, {
      'Content-Type': contentType,
      'Cache-Control': 'no-cache, no-store, must-revalidate',
      'X-Content-Type-Options': 'nosniff',
    });
    res.end(data);
  } catch (error) {
    if (error?.code === 'ENOENT') {
      res.writeHead(404, { 'Content-Type': 'text/plain; charset=utf-8' });
      res.end('404 Not Found');
    } else {
      res.writeHead(500, { 'Content-Type': 'text/plain; charset=utf-8' });
      res.end('500 Internal Server Error');
    }
  }
}

async function readJsonBody(req, maxBytes = MAX_JSON_BODY_BYTES) {
  const contentLength = Number(req.headers['content-length']);
  if (Number.isFinite(contentLength) && contentLength > maxBytes) {
    const error = new Error('Request body too large');
    error.code = 'BODY_TOO_LARGE';
    throw error;
  }
  const chunks = [];
  let size = 0;
  for await (const chunk of req) {
    size += chunk.byteLength;
    if (size > maxBytes) {
      const error = new Error('Request body too large');
      error.code = 'BODY_TOO_LARGE';
      throw error;
    }
    chunks.push(chunk);
  }
  let text;
  try {
    text = new TextDecoder('utf-8', { fatal: true }).decode(Buffer.concat(chunks));
  } catch {
    const error = new Error('Invalid UTF-8');
    error.code = 'INVALID_JSON';
    throw error;
  }
  try {
    return JSON.parse(text);
  } catch {
    const error = new Error('Invalid JSON');
    error.code = 'INVALID_JSON';
    throw error;
  }
}

async function loadCanonicalFindings(fixturesDir) {
  const canonicalFileNames = [
    'verified.json',
    'metadata-drift.json',
    'chimera-review.json',
    'not-found.json',
    'system-failure.json',
  ];
  const markers = ['[1]', '[2]', '[3]', '[4]', '[5]'];
  return Promise.all(canonicalFileNames.map(async (fileName, index) => ({
    finding: JSON.parse(await readFile(join(fixturesDir, fileName), 'utf8')),
    display: {
      citation_marker: markers[index],
      file_name: fileName,
      index: index + 1,
      evidence_mode: 'DEMO',
    },
  })));
}

function configuredAdapter(adapter) {
  if (adapter) return adapter;
  try {
    return createKciAdapter();
  } catch {
    const authFailure = async () => ({
      state: 'KCI_AUTH_FAILED', messages: [], records: [], total: null,
      eligible_for_citation_comparison: false,
      eligible_for_not_found_in_kci: false,
    });
    return { articleSearch: authFailure, articleDetail: authFailure };
  }
}

export function createTrustVerifyServer({
  kciAdapter,
  uiDir = DEFAULT_UI_DIR,
  fixturesDir = DEFAULT_FIXTURES_DIR,
  batchDemoPath = DEFAULT_BATCH_DEMO_PATH,
  frozenEvidencePath = DEFAULT_FROZEN_EVIDENCE_PATH,
} = {}) {
  const auditService = createCitationAuditService({ kciAdapter: configuredAdapter(kciAdapter) });
  const liveBatchService = createCitationBatchService({ auditService, evidenceMode: 'LIVE' });
  let frozenBatchService = null;

  // FROZEN_EVIDENCE replays observed evidence through the same audit engine; only when explicitly requested.
  async function batchServiceFor(evidenceMode) {
    if (evidenceMode === undefined || evidenceMode === 'LIVE') return liveBatchService;
    if (evidenceMode !== 'FROZEN_EVIDENCE') throw new BatchRequestError('evidence_mode must be LIVE or FROZEN_EVIDENCE');
    if (!frozenBatchService) {
      const frozenAdapter = createFrozenEvidenceAdapter(JSON.parse(await readFile(frozenEvidencePath, 'utf8')));
      frozenBatchService = createCitationBatchService({
        auditService: createCitationAuditService({ kciAdapter: frozenAdapter }),
        evidenceMode: 'FROZEN_EVIDENCE',
        covers: citation => frozenAdapter.covers(citation),
      });
    }
    return frozenBatchService;
  }

  // JSON POST routes. Batch routes only orchestrate; every verdict comes from auditService.
  const postRoutes = {
    '/api/audit/citation': {
      maxBytes: MAX_JSON_BODY_BYTES,
      invalidMessage: 'Invalid citation request',
      failureMessage: 'Citation audit failed',
      handle: body => auditService.auditCitation(body),
    },
    '/api/audit/citations': {
      maxBytes: MAX_BATCH_BODY_BYTES,
      invalidMessage: 'Invalid batch request',
      failureMessage: 'Batch audit failed',
      handle: async body => (await batchServiceFor(body?.evidence_mode)).auditBatch(body),
    },
    '/api/references/parse': {
      maxBytes: MAX_BATCH_BODY_BYTES,
      invalidMessage: 'Invalid reference text',
      failureMessage: 'Reference parsing failed',
      handle: body => {
        if (!body || typeof body !== 'object' || Array.isArray(body)) throw new TypeError('Body must be an object');
        const { rows, truncated } = parseReferenceList(body.text);
        return { contract_version: 'trustverify-reference-parse-v1', count: rows.length, truncated, max_batch_size: MAX_BATCH_SIZE, rows };
      },
    },
  };

  return createServer(async (req, res) => {
    let pathname;
    try {
      pathname = new URL(req.url, 'http://localhost').pathname;
    } catch {
      sendJson(res, 400, { error: 'Invalid request' });
      return;
    }

    if (req.method === 'OPTIONS') {
      res.writeHead(204, { Allow: 'GET, POST, OPTIONS' });
      res.end();
      return;
    }

    const postRoute = postRoutes[pathname];
    if (postRoute) {
      if (req.method !== 'POST') {
        res.writeHead(405, { Allow: 'POST', 'Content-Type': 'text/plain; charset=utf-8' });
        res.end('Method Not Allowed');
        return;
      }
      const contentType = String(req.headers['content-type'] ?? '').split(';', 1)[0].trim().toLowerCase();
      if (contentType !== 'application/json') {
        sendJson(res, 415, { error: 'Content-Type must be application/json' });
        return;
      }
      try {
        const body = await readJsonBody(req, postRoute.maxBytes);
        sendJson(res, 200, await postRoute.handle(body));
      } catch (error) {
        if (error?.code === 'BODY_TOO_LARGE') sendJson(res, 413, { error: 'Request body too large' });
        else if (error?.code === 'INVALID_JSON' || error instanceof TypeError || error instanceof BatchRequestError) sendJson(res, 400, { error: postRoute.invalidMessage });
        else sendJson(res, 500, { error: postRoute.failureMessage });
      }
      return;
    }

    if (req.method !== 'GET') {
      res.writeHead(405, { Allow: 'GET', 'Content-Type': 'text/plain; charset=utf-8' });
      res.end('Method Not Allowed');
      return;
    }

    if (pathname === '/api/manifest') {
      await sendFile(res, join(fixturesDir, 'manifest.json'), 'application/json; charset=utf-8');
      return;
    }
    if (pathname === '/api/references/example') {
      try {
        sendJson(res, 200, { is_demo: true, text: await readFile(batchDemoPath, 'utf8') });
      } catch {
        sendJson(res, 500, { error: 'Unable to load example references' });
      }
      return;
    }
    if (pathname === '/api/draft') {
      await sendFile(res, join(fixturesDir, 'draft_manuscript.json'), 'application/json; charset=utf-8');
      return;
    }
    if (pathname === '/api/findings') {
      try {
        const findings = await loadCanonicalFindings(fixturesDir);
        sendJson(res, 200, {
          contract_version: 'trustverify-findings-collection-v1',
          is_mock_data: true,
          count: findings.length,
          findings,
        });
      } catch {
        sendJson(res, 500, { error: 'Unable to load demo findings' });
      }
      return;
    }
    if (pathname.startsWith('/api/findings/')) {
      const queryId = decodeURIComponent(pathname.slice('/api/findings/'.length));
      try {
        const findings = await loadCanonicalFindings(fixturesDir);
        const match = findings.find(entry => entry.finding.finding_id === queryId
          || entry.finding.failure_id === queryId
          || entry.display.file_name === queryId
          || entry.display.file_name === `${queryId}.json`);
        if (match) {
          sendJson(res, 200, match);
          return;
        }
      } catch {
        sendJson(res, 500, { error: 'Unable to load demo finding' });
        return;
      }
    }

    const relativePath = pathname === '/' ? 'index.html' : pathname.replace(/^\/+/, '');
    const filePath = resolve(uiDir, relativePath);
    const uiRoot = `${resolve(uiDir)}${sep}`;
    if (filePath !== resolve(uiDir) && !filePath.startsWith(uiRoot)) {
      res.writeHead(404, { 'Content-Type': 'text/plain; charset=utf-8' });
      res.end('404 Not Found');
      return;
    }
    try {
      const fileStat = await stat(filePath);
      if (fileStat.isFile()) {
        await sendFile(res, filePath, MIME_TYPES[extname(filePath).toLowerCase()] || 'application/octet-stream');
        return;
      }
    } catch {
      if (!pathname.startsWith('/api/')) {
        await sendFile(res, join(uiDir, 'index.html'), 'text/html; charset=utf-8');
        return;
      }
    }
    res.writeHead(404, { 'Content-Type': 'text/plain; charset=utf-8' });
    res.end('404 Not Found');
  });
}

const isMain = process.argv[1]
  && pathToFileURL(resolve(process.argv[1])).href === import.meta.url;
if (isMain) {
  const parsedPort = Number.parseInt(process.env.PORT ?? '3000', 10);
  const port = Number.isInteger(parsedPort) && parsedPort >= 0 && parsedPort <= 65535 ? parsedPort : 3000;
  const server = createTrustVerifyServer();
  server.listen(port, '127.0.0.1', () => {
    const address = server.address();
    console.log(`TrustVerify Research UI running at http://127.0.0.1:${address.port}`);
  });
  server.on('error', () => {
    console.error('TrustVerify server failed to start.');
  });
}
