# Learn Tab and Bass-Note Drone Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Slash chords and a bass-note drone everywhere, plus a six-section Learn tab with playable, sourced examples.

**Architecture:**
- Slash chords extend the existing parser with a `bass` note; analysis ignores it.
- A pure `resolveDrone` picks the drone note.
- A pure `voiceProgression` voices chord sequences with nearest-voice leading.
- The transport gains per-step durations, so chords can be held.
- The Learn tab is data (`data/learn.js`) rendered by `views/learn.js`, and plays through the existing transport.

**Tech Stack:** As before: ES modules, Web Audio, `node:test`, Playwright.

**Spec:** `docs/superpowers/specs/2026-11-23-learn-and-bass-drone-design.md`

## Global Constraints

- All CLAUDE.md rules:
  - strict CSP; no inline code or styles
  - tokens only
  - `localStorage` via `prefs.js`
  - sound only after a press, with the 20-minute idle stop
  - WCAG 2.2 AA
  - original wording only
- **Sources:** every Learn theory claim cites at least two sources from `SOURCES`. Practice ideas are marked `kind: 'idea'` and shown as "Idea".
- **Traditions:** each Learn section has `tradition: 'russell' | 'classical' | 'both'`, which is shown on screen.
- **Drone modes:** `'bass' | 'tonic' | 'root' | 'other'`, default `'bass'`, stored as `lce.drone = { mode, note }`.
- **Voicing:** bass in MIDI 36–47 (octave 2); upper voices in 60–71.
- **Analysis:** a slash bass never changes `lydianAnalysis`.

## Review Focus

1. **A slash bass outside the chord** (`Dm7/G`, a pedal) must parse, keep the analysis, and drone on G. → Task 1 and Task 2 tests.
2. **Changing a picker while a slash chord is set** keeps the bass (`Cmaj7/E` → `Dm7/E`); typing without a slash clears it. → Task 2 e2e.
3. **A corrupt saved drone choice** (`lce.drone` = `"zzz"` or an unknown mode) falls back to bass. → Task 2 test.
4. **Playing a Learn example while Practice is playing** (or the other way round) replaces it cleanly, and Stop silences both. → Task 4 e2e.
5. **Example chords that would need triple accidentals or pending qualities** never ship. A data test parses every example chord. → Task 4 test.

---

### Task 1: Slash chords

**Files:**
- Modify: `public/js/theory/chords.js`, `public/js/input/recognize.js`
- Tests: `tests/chords.test.mjs`, `tests/recognize.test.mjs`

**Interfaces:**
- `parseChord` returns `{ root, quality, symbol, bass }`.
  - `bass` defaults to `root`.
  - `"Cmaj7/E"` gives `bass` = E and `symbol` = `"Cmaj7/E"`.
  - Unicode accidentals are accepted after the slash.
  - A bad bass gives the error `` `I don't know “X” as a bass note.` ``
- `chordNotes` and `lydianAnalysis` are unchanged; they ignore `bass`.
- `recognizeChord`: when the lowest note's pitch class ≠ the root's, the chord gets that bass (spelled from `chordNotes` when it's a chord tone, otherwise from picker spelling), and the symbol becomes `Cmaj7/E`.

- [ ] **Step 1: Write failing tests**
  - `parseChord('Cmaj7/E')` → bass E, symbol `Cmaj7/E`, and the same analysis as `Cmaj7`.
  - `Dm7/G` → bass G; the tonic is still F.
  - `C/Bb` → bass B♭.
  - `Cmaj7/H` → an error matching `/bass note/`.
  - `Cmaj7` → bass equals the root.
  - `recognizeChord([64,67,71,72]).chord.symbol === 'Cmaj7/E'`
  - `[60,64,67,71]` → `Cmaj7` (no slash)
- [ ] **Step 2: Run.** Expected: FAIL.
- [ ] **Step 3: Implement.** Split the input on the last `/` before matching the quality.
- [ ] **Step 4: Run `npm test`.** Expected: PASS. The existing e2e test "hold a chord → Dm7" still expects `Dm7`, because that test plays its root in the bass.
- [ ] **Step 5: Commit** `feat: slash chords (bass note) in typing and MIDI`.

### Task 2: Drone on the bass note

**Files:**
- Create: `public/js/audio/drone.js`
- Modify:
  - `public/js/prefs.js` (`dronePref`)
  - `public/index.html` (`#drone-on`, `#drone-other`; "Hold the drone underneath")
  - `public/js/views/practice.js`
  - `public/js/input/chord-input.js` (pickers keep the bass)
- Tests: `tests/core.test.mjs`, `tests/e2e.test.mjs`

**Interfaces:**
- `resolveDrone({ mode, note }, chord, tonic) -> Note`:
  - `bass` → `chord.bass`
  - `tonic` → `tonic`
  - `root` → `chord.root`
  - `other` → `parseNote(note) ?? chord.bass`
- `dronePref() -> { mode, note }`. It's validated, falling back to `{ mode: 'bass', note: 'C' }`.
- Practice uses `resolveDrone` for the Drone button and for the held drone under scale runs.
- The chord loop's lowest voice is `chord.bass`, in octave 2.

- [ ] **Step 1: Write failing tests**
  - Unit: each mode of `resolveDrone`; `dronePref` with `"zzz"` → bass; an unknown mode → bass.
  - e2e:
    - The default `#drone-on` value is `bass`, and the Drone label for `Cmaj7/E` contains `Drone on E`.
    - Mode `tonic` with `Cm7` → `Drone on E♭`.
    - Selecting `Cmaj7/E` and then the `m7` quality → the text field shows `Cm7/E`.
- [ ] **Step 2: Run.** Expected: FAIL.
- [ ] **Step 3: Implement.** The `#drone-other` select is shown only when the mode is `other`.
- [ ] **Step 4: Run.** Expected: PASS.
- [ ] **Step 5: Commit** `feat: drone on the bass note by default; Drone on picker`.

### Task 3: Voicing and held chords

**Files:**
- Create: `public/js/theory/voicing.js`
- Modify: `public/js/audio/transport.js`
- Tests: `tests/voicing.test.mjs`, `tests/core.test.mjs`

**Interfaces:**
- `voiceChord(chord) -> { bass: number, upper: number[] }`. The bass sits in 36–47; the other chord tones go in 60–71, ascending.
- `voiceProgression(chords: chord[]) -> Array<{ bass, upper }>`. The first chord uses `voiceChord`. Each later chord tries the upper tones' octave placements within 55–76 and picks the one with the smallest total movement from the previous upper voices; ties go to the lower placement.
- Transport: a pattern may carry `durations: number[]` (in beats, per step). A note's length is `(durations?.[i] ?? 0.9) * beat`.

- [ ] **Step 1: Write failing tests**
  - `voiceChord(Cmaj7/E).bass === 40` (E2), with all of upper's pitch classes in {C, G, B}.
  - Upper voices are all within 60–71.
  - In `voiceProgression([Dm7, G7, Cmaj7])`, every upper voice moves at most 2 semitones between chords.
  - Transport with `durations: [4]` → `note` is called with `dur === 4 * beat`.
- [ ] **Step 2: Run.** Expected: FAIL.
- [ ] **Step 3: Implement.**
- [ ] **Step 4: Run.** Expected: PASS.
- [ ] **Step 5: Commit** `feat: nearest-voice voicing and held chords`.

### Task 4: Learn tab

**Files:**
- Create: `public/js/data/learn.js`, `public/js/views/learn.js`
- Modify:
  - `public/index.html` (`#tab-learn`, `#view-learn`)
  - `public/js/router.js` (add `'learn'`)
  - `public/js/main.js`, `public/css/app.css`
  - `public/js/data/sources.js` (new sources)
  - `docs/theory-sources.md`
- Tests: `tests/learn.test.mjs`, `tests/e2e.test.mjs`, `tests/core.test.mjs` (router)

**Interfaces:**
- `LEARN`: a frozen array of six `{ id, title, tradition, paragraphs: string[], ideas?: string[], example: { label, description, bpm, chords: Array<{ symbol, beats }>, drone?: 'bass' } | null, try: 'practice'|'gravity'|null, sources: string[] }`.
- Section ids: `home-away`, `ingoing-outgoing`, `vertical`, `horizontal`, `voice-leading-bass`, `two-views`.
- `mountLearn({ app, announce })`:
  - renders the sections, each with Play and Stop buttons
  - renders the example's chord list as `<ol>`, highlighting the current chord with `aria-current="true"` plus a ring, not colour alone
  - shows a now-playing line
- Example playback uses `voiceProgression`, with a `progression` pattern: steps = one per chord (bass and upper together), `durations` = the chord's beats, `bpm` = the example's bpm.

- [ ] **Step 1: Write failing tests**
  - Data: 6 sections with the ids above, in order.
  - Every source id exists, with at least two sources per section.
  - `tradition` is valid.
  - Every example chord symbol parses without pending qualities.
  - The `ingoing-outgoing` section has at least 4 `ideas`, and `voice-leading-bass` mentions "harmonic rhythm", "inversion" and "pedal".
  - Router: `#learn` → `'learn'`.
  - e2e:
    - `#learn` shows 6 `h2`s.
    - Pressing section 4's Play → the now-playing text matches `/Dm7/`, and one chord is marked `aria-current`.
    - Stop → silent.
    - No CSP problems.
    - Starting a Practice scale and then a Learn example replaces the scale.
- [ ] **Step 2: Run.** Expected: FAIL.
- [ ] **Step 3: Write the content and view.**
  - **Prose:** original, playful and plain, written for players.
  - **Labels:** ideas are tagged "Idea", and each section shows its tradition ("Russell's idea", "Classical voice leading", or "Both").
  - **Sources:** add harmonic rhythm, inversion, pedal point and the leading tone (verify each by search first, then record it in `docs/theory-sources.md`).
- [ ] **Step 4: Run `npm test`.** Expected: all PASS.
- [ ] **Step 5: Commit** `feat: Learn tab: six sections on tonal gravity with playable examples`.

### Task 5: Ship

- [ ] Run the measured accessibility audit (contrast in both themes, targets, names, 320 px) and a security pass. Fix what they find, test-first.
- [ ] Update the docs: README (Learn and the bass drone), `PROGRESS.md`, and CLAUDE.md if any rules changed.
- [ ] Get a fresh whole-branch review on the most capable model, then fix its Critical and Important findings test-first.
- [ ] Push, open a draft PR, and watch CI and the Cloudflare preview.
