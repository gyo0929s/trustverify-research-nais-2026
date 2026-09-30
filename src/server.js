import { createServer } from 'node:http';
import { readFile, stat } from 'node:fs/promises';
import { join, extname } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = fileURLToPath(new URL('.', import.meta.url));
const ROOT_DIR = join(__dirname, '..');
const UI_DIR = join(__dirname, 'ui');
const FIXTURES_DIR = join(ROOT_DIR, 'test', 'fixtures', 'findings');

const PORT = parseInt(process.env.PORT || '3000', 10);

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

async function sendFile(res, filePath, contentType) {
  try {
    const data = await readFile(filePath);
    res.writeHead(200, {
      'Content-Type': contentType,
      'Cache-Control': 'no-cache, no-store, must-revalidate',
      'X-Content-Type-Options': 'nosniff',
    });
    res.end(data);
  } catch (err) {
    if (err.code === 'ENOENT') {
      res.writeHead(404, { 'Content-Type': 'text/plain; charset=utf-8' });
      res.end('404 Not Found');
    } else {
      res.writeHead(500, { 'Content-Type': 'text/plain; charset=utf-8' });
      res.end('500 Internal Server Error');
    }
  }
}

async function loadCanonicalFindings() {
  const canonicalFileNames = [
    'verified.json',
    'metadata-drift.json',
    'chimera-review.json',
    'not-found.json',
    'system-failure.json',
  ];

  const markers = ['[1]', '[2]', '[3]', '[4]', '[5]'];
  const results = [];

  for (let i = 0; i < canonicalFileNames.length; i++) {
    const fileName = canonicalFileNames[i];
    const fullPath = join(FIXTURES_DIR, fileName);
    const content = JSON.parse(await readFile(fullPath, 'utf8'));

    // Augment with UI display metadata without altering canonical contract fields
    content._display = {
      citation_marker: markers[i],
      file_name: fileName,
      index: i + 1,
    };
    results.push(content);
  }
  return results;
}

const server = createServer(async (req, res) => {
  const url = new URL(req.url, `http://${req.headers.host || 'localhost'}`);
  const pathname = url.pathname;

  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');

  if (req.method === 'OPTIONS') {
    res.writeHead(204);
    res.end();
    return;
  }

  if (req.method !== 'GET') {
    res.writeHead(405, { 'Content-Type': 'text/plain' });
    res.end('Method Not Allowed');
    return;
  }

  // API Routes
  if (pathname === '/api/manifest') {
    return sendFile(res, join(FIXTURES_DIR, 'manifest.json'), 'application/json; charset=utf-8');
  }

  if (pathname === '/api/draft') {
    return sendFile(res, join(FIXTURES_DIR, 'draft_manuscript.json'), 'application/json; charset=utf-8');
  }

  if (pathname === '/api/findings') {
    try {
      const findings = await loadCanonicalFindings();
      res.writeHead(200, {
        'Content-Type': 'application/json; charset=utf-8',
        'Cache-Control': 'no-cache',
      });
      res.end(JSON.stringify({
        contract_version: 'trustverify-findings-collection-v1',
        is_mock_data: true,
        count: findings.length,
        findings,
      }, null, 2));
      return;
    } catch (err) {
      res.writeHead(500, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ error: err.message }));
      return;
    }
  }

  if (pathname.startsWith('/api/findings/')) {
    const queryId = pathname.slice('/api/findings/'.length);
    try {
      const findings = await loadCanonicalFindings();
      const match = findings.find(f =>
        f.finding_id === queryId ||
        f.failure_id === queryId ||
        f._display?.file_name === queryId ||
        f._display?.file_name === `${queryId}.json`
      );
      if (match) {
        res.writeHead(200, { 'Content-Type': 'application/json; charset=utf-8' });
        res.end(JSON.stringify(match, null, 2));
        return;
      }
    } catch (err) {
      res.writeHead(500, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ error: err.message }));
      return;
    }
  }

  // Static UI files
  let safePath = pathname === '/' ? '/index.html' : pathname;
  const filePath = join(UI_DIR, safePath);
  const ext = extname(filePath).toLowerCase();
  const mime = MIME_TYPES[ext] || 'application/octet-stream';

  try {
    const st = await stat(filePath);
    if (st.isFile()) {
      return sendFile(res, filePath, mime);
    }
  } catch {
    if (!pathname.startsWith('/api/')) {
      return sendFile(res, join(UI_DIR, 'index.html'), 'text/html; charset=utf-8');
    }
  }

  res.writeHead(404, { 'Content-Type': 'text/plain' });
  res.end('404 Not Found');
});

server.listen(PORT, '127.0.0.1', () => {
  console.log(`TrustVerify Research UI running at: http://127.0.0.1:${PORT}`);
  console.log(`Active route: Citation Integrity Audit Workspace`);
  console.log(`Contract: test/fixtures/findings/*.json (BUILD-02A schemas)`);
});

server.on('error', (err) => {
  if (err.code === 'EADDRINUSE') {
    console.warn(`Port ${PORT} in use, attempting ${PORT + 1}...`);
    server.listen(PORT + 1, '127.0.0.1');
  } else {
    console.error('Server error:', err);
  }
});
