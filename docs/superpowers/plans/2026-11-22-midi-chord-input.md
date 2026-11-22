# MIDI Chord Input Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Hold a chord on a MIDI keyboard and the Practice view sets that chord, as if it had been typed.

**Architecture:** There are three units:
- `input/recognize.js`, a pure function: held MIDI notes → chord or message.
- `input/midi-input.js`, which wraps Web MIDI behind injected dependencies and reports held notes and status.
- `views/midi-panel.js`, which wires a button and status line to them and hands recognized chords to the existing chord input.

**Tech Stack:** Web MIDI API (`navigator.requestMIDIAccess`), plain ES modules, `node:test`, Playwright (with a simulated MIDI device).

**Spec:** `docs/superpowers/specs/2026-11-22-midi-chord-input-design.md` (builds on `2026-11-21-lydian-chromatic-explorer-design.md`)

## Global Constraints

- Nothing touches MIDI before a press of `#midi-connect`. Nothing about MIDI is stored.
- `requestMIDIAccess({ sysex: false })` only. Read note-on/note-off only; note-on with velocity 0 = off.
- `public/_headers`: `midi=()` becomes `midi=(self)`. Every other header stays identical.
- Refuse to start when `window.top !== window.self`.
- Stop listening after 20 minutes (1 200 000 ms) without a note message.
- Recognition runs 150 ms after the last held-note change, and only with 3 or more distinct pitch classes.
- Only `SUPPORTED_QUALITIES` are recognized. Root spellings come from the picker list `C Db D Eb E F F# G Ab A Bb B`.
- No inline scripts, styles or handlers. Style with tokens in `app.css`. `localStorage` only via `prefs.js`, and MIDI doesn't use it.
- Copy is playful and plain. The status line is `role="status"`.

## Review Focus

1. **Notes arriving while a chord is "settling".** Rolling a chord one note at a time must yield one chord, not intermediate partial chords. → Task 2 test (settle timer).
2. **Releasing every key** must keep the current chord and not raise an error. → Task 2 test (release ⇒ `onHeld([])`); Task 3 e2e.
3. **Unplugging the keyboard mid-session** (statechange with no inputs) must say "No MIDI keyboard found" and keep working when it's plugged back in. → Task 2 test.
4. **Pressing Connect twice** must not double-attach handlers or double-report notes. → Task 2 test.
5. **Velocity-0 note-ons** (many keyboards send these instead of note-off) must count as releases. → Task 2 test.

---

### Task 1: Chord recognition (pure)

**Files:**
- Create: `public/js/input/recognize.js`
- Test: `tests/recognize.test.mjs`

**Interfaces:**
- Consumes: `parseNote`, `pc`, `noteName`, `asciiName`, `DEGREE_SEMITONES` (notes.js); `QUALITIES`, `SUPPORTED_QUALITIES`, `parseChord` (chords.js).
- Produces: `recognizeChord(midiNotes: number[]) -> null | { chord, heard: string } | { error: string, heard: string }`.
  - `null` when there are fewer than 3 distinct pitch classes.
  - `heard` is the distinct pitch classes, bass first then ascending, spelled with the picker roots and Unicode accidentals, for example `"C E G A♭"`.
  - `chord` is exactly what `parseChord(rootAscii + QUALITIES[id].aliases[0])` returns.
  - The error text is `` `${heard} isn't a chord I know yet.` ``

- [ ] **Step 1: Write failing tests**, with C4 = 60:
  - `[60,64,67,71]` → `chord.symbol === 'Cmaj7'`
  - `[64,67,71,72]` (E in the bass) → `Cmaj7`
  - `[60,64,67,69]` → `C6`; `[57,60,64,67]` → `Am7`
  - `[62,65,69,72]` → `Dm7`; `[55,59,62,65]` → `G7`
  - `[48,60,64,67,72]` → `C` (quality `maj`)
  - `[60,64]` → `null`; `[]` → `null`
  - `[60,64,67,68]` → `.error` equals `"C E G A♭ isn't a chord I know yet."`
  - `[60,63,66,69]` (dim7, pending) → `.error`
  - `[66,70,73,76]` → `chord.symbol === 'F♯7'`
- [ ] **Step 2: Run `node --test tests/recognize.test.mjs`.** Expected: FAIL (module missing).
- [ ] **Step 3: Implement.** Root candidates are the bass pitch class first, then the other pitch classes ordered by `(p - bass + 12) % 12` ascending. For each candidate, compare its interval set with each supported quality's `degrees.map(d => DEGREE_SEMITONES[d] % 12)` set. The first exact match wins.
- [ ] **Step 4: Run.** Expected: PASS.
- [ ] **Step 5: Commit** `feat(midi): recognize chords from held notes`.

### Task 2: MIDI input controller

**Files:**
- Create: `public/js/input/midi-input.js`
- Test: `tests/midi-input.test.mjs`

**Interfaces:**
- Produces: `createMidiInput({ requestAccess, isFramed, onHeld, onStatus, setTimer = setTimeout, clearTimer = clearTimeout, idleMs = 1200000, settleMs = 150 }) -> { connect(): Promise<void>, disconnect(): void, isListening(): boolean }`.
  - `onHeld(notes: number[])` gets the held notes sorted ascending, after settling. Releasing every key gives `[]`.
  - `onStatus({ state, message })`, where `state` is one of `'unsupported' | 'framed' | 'denied' | 'no-devices' | 'listening' | 'idle-stopped' | 'off'`.
  - Messages, exactly:
    - unsupported: `"MIDI isn't available in this browser. Try Chrome, Edge or Firefox."`
    - framed: `"MIDI stays off when this page is shown inside another site."`
    - denied: `"Permission was declined. You can allow MIDI in your browser's site settings, then try again."`
    - no-devices: `"No MIDI keyboard found. Plug one in and it'll appear here."`
    - listening: `` `Listening to ${names.join(', ')}. Hold a chord.` ``
    - idle-stopped: `"Stopped listening after 20 quiet minutes. Press Connect to start again."`
    - off: `"MIDI is off."`
- [ ] **Step 1: Write failing tests** with a fake access object: `{ inputs: Map<id, {name, onmidimessage}>, onstatechange }`, manual timers, and `send(input, [status, note, velocity])`.
  - `requestAccess` undefined → status `unsupported`, and `isListening()` false.
  - `isFramed: () => true` → status `framed`, and `requestAccess` never called.
  - `requestAccess` rejects → `denied`.
  - Empty inputs → `no-devices`. Then add an input and fire `onstatechange` → `listening` with its name.
  - It calls `requestAccess` with `{ sysex: false }`.
  - Note-ons 60, 64, 67 sent one at a time, timers flushed only at the end → `onHeld` called once, with `[60,64,67]`.
  - `[0x90,64,0]` counts as a release, as does `[0x80,60,0]`. Other messages (`[0xB0,1,64]`) are ignored.
  - Connect twice, then one note → `onHeld` receives it once.
  - Advance idle past 1 200 000 ms with no notes → `idle-stopped`, handlers removed (`onmidimessage === null`).
  - `disconnect()` → `off`, handlers null, and `isListening()` false.
- [ ] **Step 2: Run.** Expected: FAIL.
- [ ] **Step 3: Implement.** Attach to every input in `access.inputs.values()` on connect and on each `statechange` (idempotent). Use `status & 0xF0`.
- [ ] **Step 4: Run.** Expected: PASS.
- [ ] **Step 5: Commit** `feat(midi): MIDI input controller with idle shutoff`.

### Task 3: Panel, wiring, policy and docs

**Files:**
- Create: `public/js/views/midi-panel.js`
- Modify:
  - `public/index.html` (chord card)
  - `public/css/app.css`
  - `public/js/input/chord-input.js` (return a setter)
  - `public/js/views/practice.js` (expose it)
  - `public/js/main.js`
  - `public/_headers`
  - `tests/policy.test.mjs`
  - `tests/e2e.test.mjs`
  - `SECURITY.md`
  - `docs/PROGRESS.md`
  - `CLAUDE.md` (the MIDI line becomes "done" wording)

**Interfaces:**
- Consumes: Task 1 `recognizeChord`, Task 2 `createMidiInput`.
- Produces:
  - `mountChordInput(...)` now returns `{ setChord(chord, source) }`. It writes `asciiName(root) + alias` to the text field, syncs the pickers, saves `lce.chord`, clears the error and calls `onChord({ chord, source })`.
  - `mountPractice` returns `setChord` as well.
  - `mountMidiPanel({ setChord })` in `views/midi-panel.js`.
- Markup, inside the chord card after `#chord-error`:
  - `#midi-connect` (button, `aria-pressed`, text "🎹 Connect MIDI keyboard")
  - `#midi-disconnect` (button, `hidden` until listening)
  - `#midi-status` (`role="status"`, initial "MIDI is off. Connect a keyboard to set chords by playing them.")
  - `#midi-heard` (`aria-live="polite"`), showing "Heard C E G B → Cmaj7" or the error text
  - While listening, the connect button shows `aria-pressed="true"` and a visible "● Listening" style, not colour alone.

- [ ] **Step 1: Write failing tests.**
  - policy: `_headers` contains `midi=(self)` (replace the `midi=()` assertion).
  - e2e, with an init script installing a fake `navigator.requestMIDIAccess` and `window.__midi = { play(notes), release() }`:
    - Before pressing Connect, `window.__midiRequested` stays `false`.
    - Press `#midi-connect` → `#midi-status` matches `/Listening to Test Keys/`.
    - `play([62,65,69,72])` → `#chord-text` value `Dm7`, `#tonic` contains `F`, `#midi-heard` matches `/Dm7/`.
    - `release()` → the chord stays `Dm7`.
    - `play([60,64,67,68])` → `#midi-heard` matches `/isn't a chord I know yet/`, and the chord stays `Dm7`.
    - Disconnect → `#midi-status` matches `/MIDI is off/`.
    - No fake installed and `requestMIDIAccess` deleted → Connect gives `/isn't available in this browser/`.
    - Fake that rejects → `/Permission was declined/`.
    - The page still has no CSP violations.
- [ ] **Step 2: Run `npm test`.** Expected: the new tests FAIL.
- [ ] **Step 3: Implement** the panel, wiring, CSS and header change. Pass `requestAccess: navigator.requestMIDIAccess?.bind(navigator)` and `isFramed: () => window.top !== window.self`.
- [ ] **Step 4: Run `npm test`.** Expected: all PASS.
- [ ] **Step 5: Docs.**
  - `SECURITY.md`: MIDI is allowed for this site only; it starts on a press, reads notes only (no SysEx), stops after 20 quiet minutes and refuses inside frames.
  - `PROGRESS.md`: MIDI moves to Done.
  - `CLAUDE.md`: the MIDI line describes the shipped rules.
- [ ] **Step 6: Commit** `feat(midi): connect a MIDI keyboard to set chords by playing them`.
- [ ] **Step 7: Run the accessibility-review and security-review checks on the new panel, as before (measured audit plus manual review), and fix what they find. Then the final whole-branch review, push, draft PR, and watch CI and the Cloudflare preview.**
