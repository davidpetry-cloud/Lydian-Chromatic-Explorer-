// Guards the security policy: the page shell must stay free of inline code,
// and the headers file must carry the strict Content-Security-Policy.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { startServer } from './serve.mjs';

export const CSP = "default-src 'self'; script-src 'self'; style-src 'self'; img-src 'self' data:; font-src 'self'; connect-src 'none'; media-src 'self'; object-src 'none'; base-uri 'self'; form-action 'none'; frame-ancestors 'none'; upgrade-insecure-requests";

const read = (p) => readFile(new URL(`../public/${p}`, import.meta.url), 'utf8');

test('index.html has no inline script, style or handlers', async () => {
  const html = await read('index.html');
  for (const tag of html.match(/<script\b[^>]*>/gi) ?? []) {
    assert.match(tag, /\ssrc=/, `inline script: ${tag}`);
  }
  assert.doesNotMatch(html, /<style/i);
  assert.doesNotMatch(html, /\sstyle=/i);
  assert.doesNotMatch(html, /\son[a-z]+=/i);
});

test('_headers sets the strict CSP', async () => {
  const headers = await read('_headers');
  assert.ok(headers.includes(`Content-Security-Policy: ${CSP}`));
  assert.ok(headers.includes("frame-ancestors 'none'"));
  assert.ok(headers.includes('midi=()'));
});

test('server applies headers', async () => {
  const server = await startServer();
  try {
    const res = await fetch(`${server.url}/`);
    assert.equal(res.status, 200);
    assert.equal(res.headers.get('content-security-policy'), CSP);
    const missing = await fetch(`${server.url}/nope.js`);
    assert.equal(missing.status, 404);
  } finally {
    await server.close();
  }
});

test('server refuses malformed and escaping paths without crashing', async () => {
  const http = await import('node:http');
  const server = await startServer();
  const u = new URL(server.url);
  const get = (path) => new Promise((resolve) => {
    const req = http.request({ host: u.hostname, port: u.port, path }, (res) => { res.resume(); resolve(res.statusCode); });
    req.on('error', (e) => resolve(`error ${e.code}`));
    req.end();
  });
  try {
    assert.equal(await get('/%E0%A4%A'), 400);
    assert.equal(await get('/../LICENSE'), 404);
    assert.equal(await get('/%2e%2e/%2e%2e/LICENSE'), 404);
    assert.equal(await get('/_headers'), 404);
    assert.equal(await get('/'), 200);
  } finally {
    await server.close();
  }
});

test('only prefs.js and the pre-paint theme script touch localStorage', async () => {
  const { readdir } = await import('node:fs/promises');
  const root = new URL('../public/js/', import.meta.url);
  const files = (await readdir(root, { recursive: true })).filter((f) => f.endsWith('.js'));
  const users = [];
  for (const f of files) if ((await readFile(new URL(f, root), 'utf8')).includes('localStorage')) users.push(f);
  assert.deepEqual(users.sort(), ['prefs.js', 'theme-init.js']);
});

test('app.css uses colour tokens: raw hex colours appear only in custom properties', async () => {
  const css = await read('css/app.css');
  const stray = css.split('\n').filter((line) => /#[0-9a-f]{3,8}\b/i.test(line))
    .filter((line) => line.replace(/--[\w-]+:\s*#[0-9a-f]{3,8}\b/gi, '').match(/#[0-9a-f]{3,8}\b/i));
  assert.deepEqual(stray, []);
});
