# Stop After in Bars and Drone Sounds Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** "Stop after" counts bars, and the drone can be played by organ, pad, upright bass or piano, through a shared instrument format.

**Architecture:**
- A registry (`instruments.js`) describes each sound: whether it holds or dies away, how often to re-strike, its drone notes and its credit.
- The engine plays any instrument. Organ and pad are made in the browser (`synths.js`); piano and bass come from recordings loaded by one generic sample loader.
- The transport counts beats to stop on a bar line. It holds sustaining drones as one voice and re-strikes the ones that die away.

**Tech Stack:** As before: ES modules, Web Audio, `node:test` and Playwright. No new dependencies.

**Spec:** `docs/superpowers/specs/2026-11-24-bars-and-drone-sounds-design.md`

## Global Constraints

- All CLAUDE.md rules apply:
  - strict CSP: no new hosts; files are fetched same-origin
  - no inline code
  - tokens only for styling
  - `localStorage` only via `prefs.js`
  - sound starts only from a press, and the 20-minute idle stop is kept
  - WCAG 2.2 AA
  - record licences in `THIRD-PARTY-NOTICES.md`
- **Stop after choices:** `[2, 4, 6, 8, 0]` bars; 0 means until Stop. The default is **8**. Saved as `lce.stopAfterBars`; the old `lce.stopAfter` is ignored.
- **Bar:** 4 beats. **Fade at the limit:** 2 s (`LIMIT_FADE`, unchanged).
- **Drone sounds:**
  - choices are `['organ', 'pad', 'bass', 'piano']`
  - the default is **organ**
  - saved as `lce.droneSound`
  - the picker's labels are "Organ", "Synth pad", "Upright bass" and "Piano"
- **Drone notes:**
  - organ, pad and piano play `[48 + pc, 55 + pc]` (as today)
  - bass plays `[36 + pc]` (root only, octave 2)
- **Re-strikes:**
  - organ and pad hold for the whole loop
  - piano is re-struck every 4 beats
  - bass is re-struck every 2 beats
- **Bass recordings:**
  - Source: VSCO 2 CE `Strings/Solo Contrabass/Pizz/BKCtbss_Pizz_<name>_v1_rr1.wav` (CC0, Versilian Studios). Its octave numbers run 2 higher than MIDI's: E0 is MIDI 28.
  - Keys: `[28, 30, 31, 34, 36, 38, 40, 42, 44, 45, 49, 52, 56, 59]`.
  - Files: `public/audio/bass/<midi>.mp3`, mono, 96 kbps, leading silence removed, at most 4 s with a 0.5 s fade.

## Review Focus

1. **A tempo change mid-loop** must still stop exactly at the bar count. *(Task 1 test)*
2. **Changing the drone sound while a drone plays** switches cleanly, with no organ or pad voice left ringing. *(Task 4 e2e)*
3. **Stop, a hidden tab or the idle stop with a held organ or pad drone** releases the held voice. *(Task 2 test)*
4. **Corrupt saved values** (`lce.stopAfterBars` = `30` or `"x"`, `lce.droneSound` = `"tuba"`) fall back to 8 bars and organ. *(Task 1 and Task 4 tests)*
5. **Pressing Stop while the bass recordings are still loading** stays silent, and a bass that fails to load falls back to organ with a spoken note. *(Task 3 test)*

---

### Task 1: Stop after counts bars

**Files:**
- Modify: `public/js/prefs.js`, `public/js/audio/transport.js`, `public/index.html` (both `.stop-after` selects and their hints), `public/js/main.js`, `public/js/views/practice.js`, `public/js/views/gravity.js`
- Test: `tests/core.test.mjs`, `tests/e2e.test.mjs`

**Interfaces:**
- Produces:
  - `STOP_AFTER_CHOICES = [2, 4, 6, 8, 0]`
  - `stopAfterPref() -> number` (bars; default 8; key `lce.stopAfterBars`)
  - `describeLimit(bars) -> '2 bars' … '8 bars'`
  - `createTransport(engine, { limit })`, `setLimit(bars|0|null)` and `limit()`, all in **bars**
  - `renew()` restarts the count from the current beat

- [ ] **Step 1: Write failing tests**
  - Transport at bpm 60 with limit 2 bars (8 s) on a looping scale:
    - playing at t = 7.9; stopped with `'limit'` at t = 8.1; fade 2
    - no note scheduled at or after the start + 8 s
  - Tempo change: limit 2 bars at bpm 60; at t = 4 (4 beats), `setBpm(120)`; still playing at t = 5.9; stopped at t = 6.1 (4 more beats take 2 s).
  - `renew()` at beat 6 of a 2-bar limit at bpm 60 → still playing at t = 13.
  - A drone at bpm 80 with limit 2 → stops at 6 s.
  - `stopAfterPref`: default 8; `'4'` → 4; `'0'` → 0; `'30'` → 8; `'"x"'` → 8. `describeLimit(8) === '8 bars'`.
  - e2e:
    - `#stop-after` default `'8'`
    - its options read `['2 bars', '4 bars', '6 bars', '8 bars', 'Until I press Stop']`
    - it stays in step with `#gravity-stop-after` and is remembered
  - Replace the old seconds-based tests.
- [ ] **Step 2: Run `npm test`.** Expected: the new tests FAIL.
- [ ] **Step 3: Implement.**
  - Count beats rather than wall time: keep `beatPos`. Each `run()` adds `(now - lastRun) * bpm / 60`, and `setBpm` folds in the time elapsed before changing bpm.
  - Each step and drone strike carries its beat index (`nextBeat`). Nothing is scheduled once `nextBeat >= limitFrom + bars * 4`.
  - Stop with `'limit'` once `beatPos >= limitFrom + bars * 4`.
  - Messages read "Faded out after 8 bars" (announced, and in both now-playing lines).
  - Hints:
    - Practice: "Drones, chord loops and scale runs fade out after this many bars."
    - Gravity: "The drone fades out after this many bars, at 80 bpm. Each tone you play restarts the count."
- [ ] **Step 4: Run `npm test`.** Expected: PASS.
- [ ] **Step 5: Commit** `feat: Stop after counts bars (2, 4, 6, 8, or until Stop; default 8)`.

### Task 2: Instrument format, organ and pad, held drones

**Files:**
- Create: `public/js/audio/instruments.js`, `public/js/audio/synths.js`
- Modify: `public/js/audio/engine.js`, `public/js/audio/transport.js`
- Test: `tests/instruments.test.mjs` (new), `tests/core.test.mjs`, `tests/e2e.test.mjs` (OfflineAudioContext)

**Interfaces:**
- Produces:
  - `INSTRUMENTS`: a frozen map of id → `{ id, name, kind: 'recorded'|'synth', holds: boolean, restrikeBeats: number|null, credit: string|null }`, for `piano`, `organ`, `pad` and `bass`.
  - `DRONE_SOUNDS = ['organ','pad','bass','piano']`.
  - `droneMidis(soundId, pc) -> number[]`.
  - `synths.js`:
    - `organVoice(ctx, dest, midi, at, gain) -> { out, oscs, start }`: sine partials at ratios 0.5, 1.5, 1 and 2 with gains 1, 0.8, 1 and 0.35; a 0.8 Hz tremolo of ±18 %; a 20 ms attack.
    - `padVoice(ctx, dest, midi, at, gain) -> { out, oscs, start }`: three sawtooths at −8, 0 and +8 cents, plus a sine at f/2 (gain 0.6); a lowpass at 900 Hz; a 1.5 s attack.
  - Engine:
    - `note(midi, at, dur, { gain, instrument = 'piano' })`
    - `hold(midis, at, { gain, instrument }) -> release()`
    - `stopAll(fade)` also releases held voices
  - Transport:
    - patterns may carry `droneSound`, which defaults to `'piano'` for back-compat in tests
    - holding instruments get one `engine.hold` at start
    - the others are re-struck every `restrikeBeats`

- [ ] **Step 1: Write failing tests**
  - Registry:
    - every `DRONE_SOUNDS` id is in `INSTRUMENTS`
    - organ and pad have `holds === true`
    - `restrikeBeats` is 4 for piano and 2 for bass
    - `droneMidis('bass', 0)` deep-equals `[36]`; `droneMidis('organ', 2)` deep-equals `[50, 57]`
  - Transport fakes:
    - an organ drone → exactly one `hold` call and no `note` calls over 10 s
    - stop → its release ran
    - a bass drone at bpm 60 → strikes 2 s apart
    - `stop('hidden')` and the idle stop also release a held drone
  - e2e Offline render:
    - an organ hold of 3 s: RMS(2.5–2.9 s) > 0.5 × RMS(0.2–0.6 s) (it sustains)
    - after `stopAll(0.1)` at 3 s, RMS(3.3–3.5 s) < 0.002
    - same for the pad, using RMS(1.6–2.0 s) for the swell
- [ ] **Step 2: Run.** Expected: FAIL.
- [ ] **Step 3: Implement.** The synth voices join the engine's `voices` set, so `release()` and `stopAll()` work unchanged.
- [ ] **Step 4: Run `npm test`.** Expected: PASS.
- [ ] **Step 5: Commit** `feat: instrument format with organ and pad; held drones`.

### Task 3: Upright bass recordings

**Files:**
- Create: `public/audio/bass/*.mp3` (14 files)
- Modify:
  - `public/js/audio/piano.js` → generic `samples.js` (keep `piano.js` exporting its keys and loader)
  - `public/js/audio/engine.js`
  - `THIRD-PARTY-NOTICES.md`, `public/index.html` (footer credit)
  - `SECURITY.md` (the same-origin list now includes `audio/bass/`)
- Test: `tests/piano.test.mjs` → `tests/samples.test.mjs`, `tests/e2e.test.mjs`

**Interfaces:**
- Produces:
  - `samples.js`:
    - `pickNearest(keys, midi) -> { sample, rate }`
    - `loadSamples(ctx, { keys, base, fetchFn }) -> Map`
  - `BASS_SAMPLES = [28,30,31,34,36,38,40,42,44,45,49,52,56,59]`
  - Engine:
    - `ensure(instrument) -> Promise<'ready'|'fallback'>`: loads the bass once, on its first use.
    - `note` and `hold` with `instrument: 'bass'` use the recordings once loaded.
    - If the load fails, the bass falls back to organ, and `onSound('bass-fallback')` fires once.

- [ ] **Step 1: Prepare the assets.**
  - Download the 14 `_v1_rr1` WAVs.
  - Encode each with ffmpeg: `silenceremove`, `atrim=0:4`, `afade=t=out:st=3.5:d=0.5`, mono, normalised to the set's loudest peak at 0.9, `libmp3lame -b:a 96k -map_metadata -1`, saved as `<midi>.mp3`.
  - Verify the pitch of 3 files by FFT, within ±25 cents of the target.
- [ ] **Step 2: Write failing tests**
  - Unit:
    - all 14 bass files exist
    - `pickNearest(BASS_SAMPLES, 37)` → sample 36, rate 2^(1/12)
    - the existing piano mapping tests still pass through `samples.js`
  - Engine fake:
    - a bass loader that rejects → `ensure('bass')` resolves `'fallback'`
    - `onSound` is called with `'bass-fallback'`
  - e2e:
    - selecting Upright bass and pressing Drone fetches 14 `/audio/bass/` files, all same-origin, with no CSP problems
    - Stop pressed while they are held back by `page.route` → stays silent (same pattern as the piano test)
- [ ] **Step 3: Implement.**
  - Credits:
    - `THIRD-PARTY-NOTICES.md`: "VSCO 2 Community Edition by Versilian Studios, CC0 1.0", plus the changes made.
    - Footer: "Upright bass: VSCO 2 Community Edition by Versilian Studios (CC0)".
- [ ] **Step 4: Run `npm test`.** Expected: PASS.
- [ ] **Step 5: Commit** `feat: upright bass recordings (VSCO 2 CE, CC0), loaded on first use`.

### Task 4: Drone sound picker

**Files:**
- Modify:
  - `public/index.html` (a `#drone-sound` select in Practice's drone row, labelled "Drone sound")
  - `public/js/prefs.js` (`droneSoundPref()`)
  - `public/js/main.js`, `public/js/views/practice.js`, `public/js/views/gravity.js`
  - `CLAUDE.md` (sound rules: "after Stop after, default 8 bars"), `README.md`, `docs/PROGRESS.md`
- Test: `tests/core.test.mjs`, `tests/e2e.test.mjs`

**Interfaces:**
- Consumes: `DRONE_SOUNDS`, `INSTRUMENTS[id].name`, `droneMidis(soundId, pc)` (Task 2); `engine.ensure` (Task 3).
- Produces: `droneSoundPref() -> 'organ'|'pad'|'bass'|'piano'` (default `'organ'`, key `lce.droneSound`).

- [ ] **Step 1: Write failing tests**
  - `droneSoundPref`: default `'organ'`; `'"tuba"'` → `'organ'`.
  - e2e:
    - `#drone-sound` default `'organ'`, with options as in Global Constraints
    - pressing Drone puts "Drone on C, bass note, organ" in now-playing
    - switching to Synth pad while the drone plays restarts it with "pad" in the label, leaving one transport pattern and no extra held voice (check `app.engine.voiceCount()`, a new test-only getter that is also useful for the stuck-voice check)
    - the scale run's held drone and Gravity's drone use the chosen sound
    - the choice is remembered after reload
- [ ] **Step 2: Run.** Expected: FAIL.
- [ ] **Step 3: Implement.** The label word is the instrument name in lower case. Practice and Gravity call `await app.engine.ensure(sound)` inside their existing `whenReady` press.
- [ ] **Step 4: Run `npm test`.** Expected: PASS.
- [ ] **Step 5: Commit** `feat: Drone sound picker (organ, synth pad, upright bass, piano; default organ)`.

### Task 5: Ship

- [ ] **Measure:** contrast in both themes, the labels of the new select, and 320 px reflow (no sideways scroll).
- [ ] **Security pass:** `connect-src 'self'` is unchanged, and every fetch is same-origin.
- [ ] **Docs:** update `SECURITY.md`, `README.md` and `PROGRESS.md`.
- [ ] **Review:** get a fresh whole-branch review on the most capable model. Fix Critical and Important findings test-first.
- [ ] **PR:** push, retitle PR #15 to cover this work (it currently holds only the bookmark), and watch CI and the Cloudflare preview.
