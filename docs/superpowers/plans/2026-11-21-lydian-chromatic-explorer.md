# Lydian Chromatic Explorer Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** A static, single-page practice app where a player enters a chord and sees, hears and reads its Lydian tonic, parent scale and the seven principal scales ranked ingoing → outgoing, plus a tonal-gravity explorer and a searchable reference.

**Architecture:** Plain HTML/CSS/JS ES modules served from `public/` on Cloudflare Pages, with no build step. Pure theory modules (`public/js/theory/`) hold all the music logic and are unit-tested with `node --test`. Thin DOM view modules and a Web Audio engine sit on top. A tiny Node static server applies `public/_headers`, so the Playwright tests run under the real CSP.

**Tech Stack:** HTML, CSS, JavaScript (ES2022 modules), Web Audio API, SVG, Node 22 `node:test`, Playwright 1.63.0 (dev only), GitHub Actions, Cloudflare Pages.

**Spec:** `docs/superpowers/specs/2026-11-21-lydian-chromatic-explorer-design.md`

## Global Constraints

- No runtime dependencies. The only devDependency is `playwright` pinned to `1.63.0` exactly.
- No inline `<script>`, `on…=` attributes, `<style>` blocks or `style=""` anywhere in `public/`. Wire events with `addEventListener`. Scripts may set `element.style.*` via the CSSOM.
- `public/_headers`, for `/*`: `Content-Security-Policy: default-src 'self'; script-src 'self'; style-src 'self'; img-src 'self' data:; font-src 'self'; connect-src 'none'; media-src 'self'; object-src 'none'; base-uri 'self'; form-action 'none'; frame-ancestors 'none'; upgrade-insecure-requests`, plus `X-Content-Type-Options: nosniff`, `Referrer-Policy: strict-origin-when-cross-origin`, `Cross-Origin-Opener-Policy: same-origin`, `Permissions-Policy: camera=(), microphone=(), geolocation=(), payment=(), usb=(), midi=()`.
- No `fetch`/XHR; data lives in JS modules.
- `localStorage` keys `lce.theme`, `lce.chord`, `lce.volume`, accessed only through `js/prefs.js` (try/catch). The app must work when storage throws.
- Note names shown with Unicode accidentals (`♯ ♭ 𝄪 𝄫`). Input accepts ASCII too (`#`, `b`, `x`, `##`, `bb`).
- Equal temperament, A4 = 440 Hz, MIDI 69.
- Sound starts only after a user press. It stops after 20 minutes without input, and immediately when `document.visibilityState === 'hidden'`.
- Every sound event is mirrored by a visual highlight and by text in a polite live region (`#live`).
- Tap targets ≥ 44 × 44 px. Honour `prefers-reduced-motion`. Colour is never the only signal.
- Look: tokens copied from `david-petry-site/site.css` lines 18–182 (dark default plus `:root[data-theme="light"]`). Fonts copied from `david-petry-site/fonts/` with their OFL files.
- Licence: code under PolyForm Noncommercial 1.0.0 with `Required Notice: Copyright (c) 2026 David Petry (https://david-petry.netlify.app/)`; content all rights reserved. List fonts and Playwright in `THIRD-PARTY-NOTICES.md`.
- Original wording only. Never copy text, charts or diagrams from Russell's book. Cite: George Russell, *Lydian Chromatic Concept of Tonal Organization*, 4th ed. (Brookline, MA: Concept Publishing, 2001).
- Copy tone: playful, inviting, clear (David's voice). No jargon without a glossary link.
- Commits end with the session's attribution lines. Work on branch `claude/gracious-clarke-j0czpj`.

## Review Focus

1. **Enharmonic spelling.** `Gb7` must give tonic G♭ (never F♯); F♯ Lydian Augmented must spell its ♯5 as C𝄪, not D. → Task 2 and Task 3 tests.
2. **Messy typing in the chord field** (`""`, `"H7"`, `"C7#"`, `" cmaj7 "`, `"c-7"`). Valid input is accepted case-insensitively on the root letter. Invalid input shows a plain message and keeps the last good chord. → Task 4 test; Task 7 e2e.
3. **Repeated Play presses or switching patterns** must never stack loops; only one pattern sounds at a time, and Stop silences everything. → Task 6 test.
4. **Storage unavailable or corrupted** (throws, or `lce.chord` holds `"zzz"`). The app boots with `Cmaj7`. → Task 6 test (prefs); Task 7 e2e.
5. **Unknown or stale URL hash** (`#nope`, `#Reference`). Unknown hashes fall back to Practice; matching is case-insensitive. → Task 6 test (router).

---

### Task 1: Repo scaffold, policy and page shell

**Files:**
- Create: `package.json`, `.gitignore`, `CLAUDE.md`, `README.md` (replace), `LICENSE`, `LICENSES/PolyForm-Noncommercial-1.0.0.txt` (copy from site), `THIRD-PARTY-NOTICES.md`, `SECURITY.md`, `.github/dependabot.yml`, `.github/workflows/test.yml`
- Create: `public/index.html`, `public/_headers`, `public/css/tokens.css`, `public/css/app.css`, `public/fonts/*` (copy site's `fonts/`), `public/js/theme-init.js`, `public/js/theme-toggle.js`
- Create: `tests/serve.mjs`, `tests/policy.test.mjs`

**Interfaces:**
- Produces: `tests/serve.mjs` exporting `startServer({ port = 0 }) -> Promise<{ url: string, close(): Promise<void> }>`. It serves `public/`, maps `/` to `index.html`, and applies every header from the `/*` block of `public/_headers`.
- Produces: page skeleton IDs used by later tasks: `#tab-practice`, `#tab-gravity`, `#tab-reference` (tab links with `href="#practice"` and so on); `#view-practice`, `#view-gravity`, `#view-reference` (sections); `#live` (`aria-live="polite"`); `#themeToggle`; `#skip` (skip link to `#main`).
- Produces: `npm test` runs `node --test tests/`.

- [ ] **Step 1: Write failing `tests/policy.test.mjs`**
  - `test('index.html has no inline script, style or handlers')`: read `public/index.html`; assert no `<script>` without `src`, no `<style`, no `style=`, and no `/\son[a-z]+=/i`.
  - `test('_headers sets the strict CSP')`: assert `public/_headers` contains the exact CSP string from Global Constraints, plus `frame-ancestors 'none'` and `midi=()`.
  - `test('server applies headers')`: `startServer()`, fetch `/`, assert the `content-security-policy` header equals the CSP string and the status is 200; fetch `/nope.js`, status 404.
- [ ] **Step 2: Run `npm test`.** Expected: FAIL (files missing).
- [ ] **Step 3: Create the scaffold.**
  - `package.json`: `{"name":"lydian-chromatic-explorer","private":true,"type":"module","scripts":{"test":"node --test tests/","serve":"node tests/serve.mjs"},"devDependencies":{"playwright":"1.63.0"}}`. Running `serve.mjs` directly starts on port 8080 and prints the URL.
  - `index.html`: `lang="en"`, `<title>Lydian Chromatic Explorer</title>`, meta description and viewport. `<head>` loads `css/tokens.css`, `css/app.css` and `fonts/fonts.css`, then `js/theme-init.js` (classic script), then `js/main.js` (`type="module"`, created in Task 6; a 404 is fine until then). Body: skip link, header with title + tab nav + theme toggle, `<main id="main">` holding the three sections (Gravity and Reference `hidden`), `#live`, and a footer with the credit line, a link to `LICENSE` on GitHub (`https://github.com/davidpetry-cloud/Lydian-Chromatic-Explorer/blob/main/LICENSE`) and a link to the book citation in Reference.
  - Theme scripts: copy the site's versions, with storage key `lce.theme` instead of `dp-theme`.
  - `tokens.css`: site.css lines 18–182 verbatim. `app.css`: base layout (one column under 720 px), focus ring, `.visually-hidden`, `[hidden]{display:none!important}`, and `@media (prefers-reduced-motion: reduce)` turning off animations and transitions.
  - `CLAUDE.md`: the Global Constraints above as standing rules, plus "run accessibility-review and security-review before merging a new screen" and "theory data changes need a source per row in `docs/theory-sources.md`".
  - `LICENSE`: the site's structure, adapted: section 1 covers `public/js/`, `public/css/`, `public/index.html`, `public/_headers` and `tests/`; section 2 covers glossary and reference wording, `docs/`, and README prose.
  - `.github/workflows/test.yml`: on `pull_request` and `push` to `main`; ubuntu-latest; `actions/checkout@v4`, `actions/setup-node@v4` with node 22; `npm ci`; `npx playwright install --with-deps chromium`; `npm test`. Commit `package-lock.json`.
  - `dependabot.yml`: ecosystems `npm` (root) and `github-actions`, weekly.
  - `SECURITY.md`: the protections, how they're tested (Task 10), and how to report problems (GitHub private reporting).
- [ ] **Step 4: Run `npm test`.** Expected: 3 pass.
- [ ] **Step 5: Commit** `chore: scaffold app shell, strict CSP, licence and CI`.

### Task 2: Notes, spelling and pitch

**Files:**
- Create: `public/js/theory/notes.js`
- Test: `tests/notes.test.mjs`

**Interfaces:**
- Produces:
  - `parseNote(text: string) -> Note | null`. Note is `{ letter: 'A'..'G', acc: -2..2 }`. Accepts `#`, `♯`, `x`, `##`, `𝄪`, `b`, `♭`, `bb`, `𝄫`; trims whitespace; the letter is case-insensitive.
  - `pc(note: Note) -> 0..11`
  - `noteName(note: Note) -> string` (Unicode accidentals)
  - `DEGREE_SEMITONES`: `{'1':0,'b2':1,'2':2,'#2':3,'b3':3,'3':4,'4':5,'#4':6,'b5':6,'5':7,'#5':8,'b6':8,'6':9,'bb7':9,'b7':10,'7':11}`
  - `transpose(root: Note, degree: string) -> Note`. The letter moves by (degree number − 1); the accidental is whatever makes the semitone distance equal `DEGREE_SEMITONES[degree]` (mod 12). Throws `RangeError` when that needs more than two accidentals.
  - `ascendingMidis(notes: Note[], startOctave = 4) -> number[]`. The first note goes in `startOctave` (C4 = 60). Each following note is the next MIDI number above the previous one with the same pitch class. The first note is appended one octave up.
  - `midiToFreq(m: number) -> number`: `440 * 2 ** ((m - 69) / 12)`

- [ ] **Step 1: Write failing tests**
  - `parseNote('Bb')` → `{letter:'B',acc:-1}`; `parseNote(' f# ')` → `{letter:'F',acc:1}`; `parseNote('Cx')` → acc 2; `parseNote('H')` → `null`; `parseNote('')` → `null`.
  - `pc(parseNote('Cb'))` → 11; `pc(parseNote('E#'))` → 5.
  - `noteName({letter:'C',acc:2})` → `'C𝄪'`; `noteName({letter:'G',acc:-1})` → `'G♭'`.
  - `transpose(parseNote('C'),'#4')` → F♯; `transpose(parseNote('D'),'b3')` → F; `transpose(parseNote('F#'),'#5')` → C𝄪; `transpose(parseNote('C'),'bb7')` → B𝄫; `transpose(parseNote('Gb'),'1')` → G♭.
  - `ascendingMidis(['C','D','E','F#','G','A','B'].map(parseNote))` → `[60,62,64,66,67,69,71,72]`.
  - `midiToFreq(69)` → 440; `midiToFreq(60)` ≈ 261.63 (to 2 places).
- [ ] **Step 2: Run `node --test tests/notes.test.mjs`.** Expected: FAIL (module missing).
- [ ] **Step 3: Implement `notes.js`** with the signatures above. Use the letter pitch classes `{C:0,D:2,E:4,F:5,G:7,A:9,B:11}`; the accidental is the signed difference mod 12, wrapped to −6..5.
- [ ] **Step 4: Run tests.** Expected: PASS.
- [ ] **Step 5: Commit** `feat(theory): note parsing, spelling and pitch`.

### Task 3: Principal scales and the order of tonal gravity

**Files:**
- Create: `public/js/theory/scales.js`, `public/js/theory/gravity.js`
- Test: `tests/scales.test.mjs`

**Interfaces:**
- Consumes: `transpose`, `pc`, `parseNote` (Task 2).
- Produces:
  - `PRINCIPAL_SCALES`: frozen array, ingoing → outgoing, each `{ id, name, degrees, derivation }`:

    | id | name | degrees | derivation |
    |---|---|---|---|
    | `lydian` | Lydian | 1 2 3 #4 5 6 7 | lydian |
    | `lydian-augmented` | Lydian Augmented | 1 2 3 #4 #5 6 7 | lydian |
    | `lydian-diminished` | Lydian Diminished | 1 2 b3 #4 5 6 7 | lydian |
    | `lydian-flat-seventh` | Lydian Flat Seventh | 1 2 3 #4 5 6 b7 | lydian |
    | `auxiliary-augmented` | Auxiliary Augmented | 1 2 3 #4 #5 b7 | auxiliary |
    | `auxiliary-diminished` | Auxiliary Diminished | 1 2 b3 4 #4 #5 6 7 | auxiliary |
    | `auxiliary-diminished-blues` | Auxiliary Diminished Blues | 1 b2 b3 3 #4 5 6 b7 | auxiliary |

  - `scaleById(id) -> scale` (throws on an unknown id); `scaleNotes(tonic: Note, id) -> Note[]`; `scalePcs(tonic: Note, id) -> Set<number>`
  - `GRAVITY_DEGREES = ['1','5','2','6','3','7','#4','#5','b3','b7','4','b2']`
  - `gravityOrder(tonic: Note) -> Note[]` (12 notes); `gravityRank(tonic: Note, pitchClass: number) -> 1..12`
  - `rankScales(tonic: Note, chordPcs: Set<number>) -> Array<{ scale, notes: Note[], holdsChord: boolean, missing: number[] }>`. It returns all seven, in `PRINCIPAL_SCALES` order; `missing` lists the chord pitch classes not in the scale, ascending.

- [ ] **Step 1: Write failing tests**
  - C Lydian names → `C D E F♯ G A B`; C Auxiliary Diminished Blues → `C D♭ E♭ E F♯ G A B♭`; F♯ Lydian Augmented contains `C𝄪`.
  - Gravity-nesting invariant: every pitch class of scale *k* has `gravityRank ≤ N`, where N is 7, 8, 9, 10, 10, 11, 12 for the seven scales in order.
  - Union of all seven scales' pitch classes on C → 12 tones.
  - `gravityOrder(C)` names → `C G D A E B F♯ G♯ E♭ B♭ F D♭`.
  - `rankScales(C, pcs of Cmaj7)` → `lydian.holdsChord === true`, `lydian-flat-seventh.missing` deep-equals `[11]`, length 7.
- [ ] **Step 2: Run.** Expected: FAIL.
- [ ] **Step 3: Implement** both modules, deriving every note via `transpose` (no hand-written note lists).
- [ ] **Step 4: Run.** Expected: PASS.
- [ ] **Step 5: Commit** `feat(theory): principal scales and order of tonal gravity`.

### Task 4: Chord parsing and Lydian analysis

**Files:**
- Create: `public/js/theory/chords.js`
- Test: `tests/chords.test.mjs`

**Interfaces:**
- Consumes: Tasks 2–3.
- Produces:
  - `QUALITIES`: frozen object keyed by id; each value is `{ id, label, aliases: string[], degrees: string[], tonicDegree: string, parentScale: scaleId, status: 'verified'|'pending', sources: string[] }`.
  - `SUPPORTED_QUALITIES`: the ids with `status === 'verified'`, in the table order below.
  - `parseChord(text, { allowPending = false } = {}) -> { root: Note, quality: id, symbol: string } | { error: string }`. Trim the input, take the root (Task 2 rules), then match the remainder exactly against the aliases (case-sensitive after the root, so `M7` ≠ `m7`). An empty remainder means `maj`. Errors are friendly sentences, e.g. `"I don't know “H” as a note. Try A to G, with # or b."` and `"“C7#” isn't a chord I know yet. See Reference for the list."`. Pending qualities give the second message unless `allowPending` is true (tests only).
  - `chordNotes(chord) -> Note[]`
  - `lydianAnalysis(chord) -> { tonic: Note, parentScale: scaleId, parentNotes: Note[], ladder: rankScales(...) }`
- Rows (all start `pending`; Task 5 flips each to `verified` once two sources agree):

  | id | label | aliases | degrees | tonicDegree | parentScale |
  |---|---|---|---|---|---|
  | maj | major | `''`, `maj`, `M` | 1 3 5 | 1 | lydian |
  | maj7 | major 7 | `maj7`, `M7`, `Δ`, `Δ7`, `ma7` | 1 3 5 7 | 1 | lydian |
  | 6 | 6 | `6` | 1 3 5 6 | 1 | lydian |
  | 69 | 6/9 | `6/9`, `69` | 1 3 5 6 2 | 1 | lydian |
  | maj7s11 | maj7♯11 | `maj7#11`, `Δ#11`, `maj7♯11` | 1 3 5 7 #4 | 1 | lydian |
  | m7 | minor 7 | `m7`, `-7`, `mi7`, `min7` | 1 b3 5 b7 | b3 | lydian |
  | 7 | dominant 7 | `7` | 1 3 5 b7 | 1 | lydian-flat-seventh |
  | 9 | 9 | `9` | 1 3 5 b7 2 | 1 | lydian-flat-seventh |
  | 13 | 13 | `13` | 1 3 5 b7 2 6 | 1 | lydian-flat-seventh |
  | 7s11 | 7♯11 | `7#11`, `7♯11` | 1 3 5 b7 #4 | 1 | lydian-flat-seventh |
  | aug | augmented | `aug`, `+` | 1 3 #5 | 1 | lydian-augmented |
  | maj7s5 | maj7♯5 | `maj7#5`, `Δ#5`, `+maj7` | 1 3 #5 7 | 1 | lydian-augmented |
  | 7s5 | 7♯5 | `7#5`, `+7`, `7+` | 1 3 #5 b7 | 1 | auxiliary-augmented |
  | dim7 | diminished 7 | `dim7`, `°7`, `o7` | 1 b3 b5 bb7 | 1 | auxiliary-diminished |
  | 7b9 | 7♭9 | `7b9`, `7♭9` | 1 3 5 b7 b2 | 1 | auxiliary-diminished-blues |
  | m | minor | `m`, `-`, `mi`, `min` | 1 b3 5 | b3 | lydian |
  | m6 | minor 6 | `m6`, `-6` | 1 b3 5 6 | (Task 5) | (Task 5) |
  | mmaj7 | minor-major 7 | `m(maj7)`, `mMaj7`, `-Δ7` | 1 b3 5 7 | 1 | lydian-diminished |
  | m7b5 | half-diminished | `m7b5`, `ø`, `ø7`, `-7b5` | 1 b3 b5 b7 | (Task 5) | (Task 5) |
  | dim | diminished | `dim`, `°`, `o` | 1 b3 b5 | (Task 5) | (Task 5) |
  | 7sus4 | 7sus4 | `7sus4`, `7sus` | 1 4 5 b7 | (Task 5) | (Task 5) |
  | 7s9 | 7♯9 | `7#9`, `7♯9` | 1 3 5 b7 #2 | 1 | auxiliary-diminished-blues |
  | 7alt | altered | `7alt`, `alt` | 1 3 b7 b2 #2 #4 b6 | (Task 5) | (Task 5) |

  Rows marked "(Task 5)" have `tonicDegree: null`, stay `pending`, and must not be in `SUPPORTED_QUALITIES` until Task 5 fills them in.

- [ ] **Step 1: Write failing tests**
  - `parseChord('Cmaj7')`, `parseChord('CΔ7')` and `parseChord(' cmaj7 ')` → root C, quality `maj7`.
  - `parseChord('Bb7')` and `parseChord('B♭7')` → root B♭, quality `7`.
  - `parseChord('H7')` → `.error` matching `/know “H”/`; `parseChord('C7#')` → `.error`; `parseChord('')` → `.error`.
  - Analysis (parsing with `allowPending: true`) of `Dm7` → tonic F, parent `lydian`; of `G7` → tonic G, parent `lydian-flat-seventh`; of `Gb7` → tonic name `G♭`; of `Cmaj7` → `parentNotes` `C D E F♯ G A B`.
  - Containment invariant: for every row with a non-null `tonicDegree`, every chord pitch class is in `scalePcs(tonic, parentScale)` (checked for all 12 roots).
  - `test('only verified rows are supported')`: every id in `SUPPORTED_QUALITIES` has `status === 'verified'` and `sources.length >= 2`. (This passes trivially with zero rows; Task 5 adds a check that the count is ≥ 15.)
  - Pending quality: with `m6` pending, `parseChord('Cm6')` → `.error`.
- [ ] **Step 2: Run.** Expected: FAIL.
- [ ] **Step 3: Implement `chords.js`.** Every row ships `pending` with `sources: []`; Task 5 changes that.
- [ ] **Step 4: Run.** Expected: PASS.
- [ ] **Step 5: Commit** `feat(theory): chord parsing and Lydian analysis`.

### Task 5: Verify the theory data against sources

**Files:**
- Create: `docs/theory-sources.md`, `public/js/data/sources.js`
- Modify: `public/js/theory/chords.js` (statuses, sources, Task 5 rows)
- Test: `tests/chords.test.mjs` (add the count check)

**Interfaces:**
- Produces: `SOURCES` in `sources.js`: frozen array `{ id, citation, url|null, kind: 'primary'|'secondary' }`. Ids are used in `QUALITIES[*].sources`. It must include `russell-2001` (the book), `french-2018` (andyfrench.co.uk, LCC part 3), `tjps` (thejazzpianosite.com, Lydian Chromatic Concept) and `wikipedia-lcc`.

- [ ] **Step 1: Research.** Use WebSearch (`standard`, then `extended` where results are thin) to confirm, for each `QUALITIES` row, its `tonicDegree` and `parentScale`; also the seven scales' degrees and `GRAVITY_DEGREES`. Record one table row per fact in `docs/theory-sources.md`: fact, value, source ids, a short quote or paraphrase, agree/disagree. This session can't fetch pages, only search; note that limit in the doc.
- [ ] **Step 2: Apply the rule.**
  - A fact confirmed by two independent sources becomes `verified`.
  - A fact the sources disagree on stays `pending` and is listed under "Sources differ" in the doc.
  - If a scale degree or gravity entry disagrees with Task 3, stop and report to David before changing anything.
  - For "(Task 5)" rows, fill in `tonicDegree` and `parentScale` only when they're verified.
- [ ] **Step 3: Add the test** `test('at least 15 qualities verified')`. Switch the Task 7 e2e chords (`Dm7`, `Gb7`, `Cmaj7`) to rows that are now verified; if any of them isn't, tell David before going on.
- [ ] **Step 4: Run `npm test`.** Expected: PASS. If fewer than 15 rows are verified, lower the number to the actual count and say so in the PR description. Don't mark rows verified to hit a number.
- [ ] **Step 5: Commit** `docs(theory): source table; mark verified chord mappings`.

### Task 6: App core: prefs, router, audio engine and transport

**Files:**
- Create: `public/js/prefs.js`, `public/js/router.js`, `public/js/audio/engine.js`, `public/js/audio/transport.js`, `public/js/main.js`
- Test: `tests/core.test.mjs`

**Interfaces:**
- Produces:
  - `readPref(key: string, fallback: any) -> any` (JSON-parsed; returns the fallback on throw or a parse error) and `writePref(key, value) -> boolean`.
  - `viewFromHash(hash: string) -> 'practice'|'gravity'|'reference'` (case-insensitive, defaults to `'practice'`).
  - `createEngine({ AudioContextCtor = globalThis.AudioContext } = {}) -> Engine`, where `Engine = { resume(): Promise<void>, now(): number, note(midi, at, dur, { gain = 0.2 } = {}): void, drone(midis: number[]): () => void /* returns stop */, stopAll(): void, setVolume(v: 0..1): void }`. The AudioContext is created lazily on the first `resume()`. Each voice is two detuned oscillators (`triangle` + `sine`) → low-pass at 2400 Hz → an ADSR gain envelope (attack 0.01 s, release 0.15 s) → master gain → destination.
  - `stepTimes(start: number, bpm: number, count: number) -> number[]` (pure: `start + i * 60 / bpm`).
  - `createTransport(engine, { setTimer = setInterval, clearTimer = clearInterval, lookahead = 0.1, tick = 25 } = {}) -> { play(pattern), stop(), setBpm(bpm), isPlaying(): boolean, onStep(cb), onStop(cb) }`. `pattern = { kind: 'scale'|'chordLoop'|'drone', steps: number[][], bpm, loop: boolean, label: string }`. `play()` always stops the current pattern first. The idle auto-stop timer (20 min) is reset by `poke()`, also exported on the transport. `visibilitychange` → hidden calls `stop()`; `main.js` registers that listener.
  - `main.js`: boots the router (`hashchange`; shows one section, sets `aria-current="page"` on its tab, and moves focus to the section heading on change), loads `lce.chord` (falls back to `Cmaj7` when `parseChord` errors), and imports the views from Tasks 7–9.
- [ ] **Step 1: Write failing tests**
  - prefs: with `globalThis.localStorage` stubbed so `getItem` and `setItem` throw → `readPref('lce.chord','Cmaj7') === 'Cmaj7'` and `writePref(...) === false`; with a stub returning `'zzz'` (bad JSON) → the fallback.
  - router: `'#Reference'` → `'reference'`; `'#nope'`, `''` → `'practice'`.
  - `stepTimes(0,120,4)` → `[0,0.5,1,1.5]`.
  - transport with a fake engine (records `note` calls and `stopAll` count) and manual timers: `play(A)` then `play(B)` → only B's steps are scheduled after the second call, `isPlaying()` is true, and `stopAll` was called once between them; `stop()` → `isPlaying() === false`; idle timeout: advancing the fake clock past 20 min with no `poke()` → `onStop` fires with reason `'idle'`.
- [ ] **Step 2: Run.** Expected: FAIL.
- [ ] **Step 3: Implement** the modules above. The transport's scheduler loop: every `tick` ms, schedule any step whose time is `< engine.now() + lookahead`.
- [ ] **Step 4: Run.** Expected: PASS.
- [ ] **Step 5: Commit** `feat: prefs, router, audio engine and transport`.

### Task 7: Chord input, keyboard and the Practice view

**Files:**
- Create: `public/js/input/chord-input.js`, `public/js/views/keyboard.js`, `public/js/views/practice.js`
- Modify: `public/index.html` (`#view-practice` markup), `public/css/app.css`
- Create: `tests/e2e.test.mjs` (Playwright via `startServer`)

**Interfaces:**
- Consumes: Tasks 2–6.
- Produces:
  - `mountChordInput(root: HTMLElement, { initial: string, onChord(chord) })`: a root `<select>` (12 roots spelled C D♭ D E♭ E F F♯ G A♭ A B♭ B), a quality `<select>` (`SUPPORTED_QUALITIES` labels), and a text field `#chord-text` (label "Type a chord"). The selects and the field stay in sync. Parsing runs on `input`, debounced 300 ms, and on Enter. Errors go to `#chord-error` (`role="status"`), and the last good chord stays. Valid chords are saved to `lce.chord`. The source tag `'ui'` is kept on the event, ready for MIDI.
  - `renderKeyboard(svgHost, { lit: Set<pc>, ringed: Set<pc>, names: Map<pc,string>, onKey(midi) })`: two octaves from C3, in SVG. Keys are `<g role="button" tabindex="-1">` with an `aria-label` such as "F sharp, in scale". Roving tabindex: arrow keys move, and Enter or Space plays. Lit keys are filled and named; chord tones get a ring as well as a fill.
  - The Practice view shows: Lydian tonic; parent scale name + notes; a gravity strip (12 dots, filled up to the parent scale's nesting N, with text "7 of 12 tones from the tonic"); the scale ladder (seven cards, ordered, each with name, notes, degrees and a "holds every chord tone" or "changes: B → B♭" line, built from `missing` and the scale's notes); keyboard; practice controls (Play scale, direction `up|down|updown`, Drone, Chord loop, bpm 40–200 default 80, volume 0–100 default 70, Stop). Each transport step lights its key and briefly pulses its ladder card. `#live` gets the pattern label on start ("C Lydian, ascending, 80 bpm") and "Stopped" on stop. Per-note announcements are off.
- [ ] **Step 1: Write failing e2e tests** (`node:test` + `chromium.launch()`; collect `console` messages containing `Content Security Policy` and `pageerror`s):
  - Load `/` → no CSP messages, no page errors; `#view-practice` visible.
  - Fill `#chord-text` with `Dm7`, press Enter → the tonic text contains `F`; the parent notes text is `F G A B C D E`.
  - Fill `H7` → `#chord-error` contains `“H”`; the tonic still shows `F`.
  - Fill `Gb7` → the tonic text contains `G♭`.
  - With an init script making `localStorage` throw → the page loads and shows the `Cmaj7` analysis.
  - Click Play, then Play again, then Stop → `#live` text is `Stopped`.
  - Keyboard: Tab reaches `#chord-text`; Tab reaches the keyboard; ArrowRight moves focus to the next key.
- [ ] **Step 2: Run `npm test`.** Expected: e2e FAIL.
- [ ] **Step 3: Implement** the modules, markup and CSS (cards, ladder, keyboard in a horizontally scrolling box on narrow screens, 44 px targets).
- [ ] **Step 4: Run.** Expected: PASS.
- [ ] **Step 5: Commit** `feat: Practice view with chord input, ladder and keyboard`.

### Task 8: Gravity view

**Files:**
- Create: `public/js/views/gravity.js`
- Modify: `public/index.html` (`#view-gravity`), `public/css/app.css`
- Test: `tests/e2e.test.mjs` (add cases)

**Interfaces:**
- Consumes: `gravityOrder`, `gravityRank`, `PRINCIPAL_SCALES`, `scalePcs`, engine/transport, `#live`.
- Produces: `mountGravity(root, { getTonic(): Note, transport, engine })`. An SVG circle of 12 nodes placed by stacked fifths clockwise from the tonic at 12 o'clock. Each node shows the name and its gravity rank number, and a path links ranks 1→12. A tonic `<select>` defaults to the current Practice tonic. A scale-overlay `<select>` ("none" plus the seven scales) gives in-scale nodes a filled shape. Roving tabindex with ArrowLeft/ArrowRight and Home/End. Enter, Space or a click plays the node over a tonic drone and writes a one-line note to `#gravity-note` and `#live` ("F♯: rank 7 of 12, the raised fourth, the last tone of the Lydian scale"). A visually hidden `<table>` lists all 12 (rank, note, degree).
- [ ] **Step 1: Write failing e2e tests:** go to `#gravity` → 12 nodes; the first node's label is the tonic; ArrowRight then Enter → `#gravity-note` contains `rank 2`; the hidden table has 12 body rows.
- [ ] **Step 2: Run.** Expected: FAIL.
- [ ] **Step 3: Implement.** Under reduced motion the path draws with no animation.
- [ ] **Step 4: Run.** Expected: PASS.
- [ ] **Step 5: Commit** `feat: Gravity view`.

### Task 9: Reference view

**Files:**
- Create: `public/js/data/glossary.js`, `public/js/views/reference.js`
- Modify: `public/index.html` (`#view-reference`), `public/css/app.css`
- Test: `tests/glossary.test.mjs`, `tests/e2e.test.mjs` (add cases)

**Interfaces:**
- Consumes: `SOURCES`, `QUALITIES`, `SUPPORTED_QUALITIES`, `PRINCIPAL_SCALES`.
- Produces:
  - `GLOSSARY`: frozen array `{ id, term, aka: string[], body: string, see: 'practice'|'gravity'|null, sources: string[] }`, 15–25 entries. It must include `lydian-tonic`, `tonal-gravity`, `parent-scale`, `ingoing-outgoing`, `vertical-horizontal`, `lydian-chromatic-scale`, one entry per principal scale id, and `sources-differ` (explaining why some chords are missing). Bodies are 2–4 original sentences in David's voice.
  - `mountReference(root)`: a search field `#ref-search` (label "Search the reference") filters the glossary and chord table as you type, matching term, aka and body (case- and accent-insensitive). A result count goes to a `role="status"` line. The chord table has caption, quality, example in C, Lydian tonic and parent scale columns, built from `SUPPORTED_QUALITIES` with live examples via `lydianAnalysis`. Pending rows are listed after it as "Sources differ: not in the app yet". The sources list ends with the full book citation.
- [ ] **Step 1: Write failing tests:** every glossary entry has 2–4 sentences, at least one source id present in `SOURCES`, and unique ids; the required ids are present. e2e: `#reference`, type `gravity` → the count is ≥ 1 and every visible entry matches; clear → all entries are visible.
- [ ] **Step 2: Run.** Expected: FAIL.
- [ ] **Step 3: Write the glossary and the view.** Don't paraphrase sentence by sentence from any source; explain from understanding.
- [ ] **Step 4: Run.** Expected: PASS.
- [ ] **Step 5: Commit** `feat: Reference view with glossary, chord table and sources`.

### Task 10: Attack tests, reviews and ship

**Files:**
- Modify: `tests/e2e.test.mjs`, `SECURITY.md`, `README.md`, any files the reviews flag

- [ ] **Step 1: Add attack e2e tests:** with an init script, append `<script>window.__x=1</script>` and `<img src=x onerror="window.__y=1">` after load → `window.__x` and `window.__y` are undefined, and the console shows CSP violations; `fetch('https://example.com')` from `page.evaluate` → rejects; loading the page inside an `<iframe>` from another origin (second server on another port) → blocked (`frame-ancestors`).
- [ ] **Step 2: Run `npm test`.** Expected: all PASS.
- [ ] **Step 3: Run the `design:accessibility-review` skill** on the running app (`npm run serve`), fix its findings, and re-run tests.
- [ ] **Step 4: Run the `security-review` skill**, fix its findings, re-run tests, and update `SECURITY.md` with what was tested.
- [ ] **Step 5: README:** what the app is, how to run it (`npm install`, `npm test`, `npm run serve`), the Cloudflare Pages settings (production branch `main`, build command empty, output directory `public`), and the citation.
- [ ] **Step 6: Commit, push** (`git -c push.negotiate=true push -u origin claude/gracious-clarke-j0czpj`), open a **draft** PR, and subscribe to its activity.
