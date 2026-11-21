// A tiny static server for tests and local preview. It serves public/ and
// applies the headers from the "/*" block of public/_headers, the same way
// Cloudflare Pages does, so tests run under the real security policy.
import { createServer } from 'node:http';
import { readFile } from 'node:fs/promises';
import { extname, join, normalize } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = fileURLToPath(new URL('../public/', import.meta.url));
const TYPES = {
  '.html': 'text/html; charset=utf-8', '.js': 'text/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8', '.woff2': 'font/woff2', '.svg': 'image/svg+xml',
  '.txt': 'text/plain; charset=utf-8', '.png': 'image/png', '.ico': 'image/x-icon',
};

async function loadHeaders() {
  const text = await readFile(join(ROOT, '_headers'), 'utf8');
  const headers = {};
  let inAll = false;
  for (const line of text.split('\n')) {
    if (!line.trim() || line.trim().startsWith('#')) continue;
    if (!/^\s/.test(line)) { inAll = line.trim() === '/*'; continue; }
    if (!inAll) continue;
    const at = line.indexOf(':');
    headers[line.slice(0, at).trim()] = line.slice(at + 1).trim();
  }
  return headers;
}

export async function startServer({ port = 0 } = {}) {
  const headers = await loadHeaders();
  const server = createServer(async (req, res) => {
    const path = decodeURIComponent(new URL(req.url, 'http://x').pathname);
    const rel = path.endsWith('/') ? `${path}index.html` : path;
    const file = normalize(join(ROOT, rel));
    if (!file.startsWith(ROOT) || rel.split('/').some((p) => p.startsWith('_'))) {
      res.writeHead(404, headers).end('Not found');
      return;
    }
    try {
      const body = await readFile(file);
      res.writeHead(200, { ...headers, 'Content-Type': TYPES[extname(file)] ?? 'application/octet-stream' });
      res.end(body);
    } catch {
      res.writeHead(404, headers).end('Not found');
    }
  });
  await new Promise((resolve) => server.listen(port, '127.0.0.1', resolve));
  const url = `http://127.0.0.1:${server.address().port}`;
  return { url, close: () => new Promise((resolve) => server.close(resolve)) };
}

if (process.argv[1] && fileURLToPath(import.meta.url) === process.argv[1]) {
  const { url } = await startServer({ port: Number(process.env.PORT) || 8080 });
  console.log(`Lydian Chromatic Explorer: ${url}`);
}
