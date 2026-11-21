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
