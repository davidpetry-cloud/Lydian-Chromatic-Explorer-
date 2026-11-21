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
  await page.locator('#tonic').waitFor({ timeout: 5000 });
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
