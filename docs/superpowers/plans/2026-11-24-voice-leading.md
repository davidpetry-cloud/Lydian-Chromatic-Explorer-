# Voice Leading Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** A Next chord section on the Voicings card. It shows and plays how a chosen voicing moves into a next chord, Smooth or Same shape (planing), with each voice read against tonal gravity from each chord's own drone note.

**Architecture:**
- A pure module `public/js/theory/voiceleading.js` computes the two ways in and the gravity comparison.
- The transport learns a per-step drone.
- `public/js/views/voicings.js` gains the section: a Next chord field, a Lead from picker, and two rows with Play toggles.

**Tech Stack:** As before: ES modules, Web Audio, `node:test` and Playwright. No new dependencies.

**Spec:** `docs/superpowers/specs/2026-11-24-voice-leading-design.md` (read its "Decided" section)

## Global Constraints

- All CLAUDE.md rules apply:
  - strict CSP; no inline code; tokens only
  - WCAG 2.2 AA
  - sound only from a press, and it stops on its own
  - original words only
  - two sources per theory claim, recorded in `docs/theory-sources.md`
- **Ways in:** `smooth` and `planing` (labels "Smooth" and "Same shape"). A way without two agreeing sources is `status: 'pending'` and shown as "Waiting for sources" (David).
- **Smooth:**
  - Targets are the pitch classes `fourTones(next)`; there are 4 voices.
  - Choose the assignment (a permutation of the targets, and each voice's nearest octave of its target) with the smallest total semitone motion, such that the result is strictly ascending: no crossing, no unisons.
  - Ties go to the smaller largest move, then to the lower sum of notes.
  - These tie-breaks are labelled the app's convention.
- **Planing:**
  - Same quality: every voice moves by the root interval, normalised to −6..+6.
  - Otherwise: `voiceAs(voicingId, next)` transposed by the octave that minimises total distance to the current voicing.
  - `null` when the voicing doesn't apply to the next chord.
- **Centres:** each chord's centre is `resolveDrone(dronePref-state, chord, lydianAnalysis(chord).tonic)`.
- **Gravity per voice:** `rankFrom` (from the current chord's centre) and `rankTo` (from the next chord's centre).
  - The kind is `'held'` if the pitch is unchanged, else `'toward'` if `rankTo < rankFrom`, `'away'` if greater, and `'same'` if equal.
  - A held voice still shows both ranks (David).
- **Wording** never matches `/must|should|resolve/i`.
- **Lead from:** a select of the current chord's playable voicings, default `close`, held in memory only.
- **Play:** toggles a looping pattern with two steps of 4 beats each: `[bassA, ...from]` then `[bassB, ...to]`, with a per-step drone when "Hold the drone underneath" is ticked.

## Review Focus

1. **Next chord text that doesn't parse, or a pending quality** (`C7sus4`): the field shows the parser's error, the rows clear, and nothing throws. *(Task 4 e2e)*
2. **Next chord equal to the current chord:** Smooth shows every voice "held"; Same shape moves by 0. *(Task 2 unit)*
3. **Same shape where the voicing doesn't apply to the next chord** (rootless into `Caug`) reads "Not for this chord" and has no Play button. *(Task 2 unit, Task 4 e2e)*
4. **Changing the main chord, the next chord, the Lead from voicing or the drone while a lead plays** restarts it with the new notes, and the toggle states stay true. *(Task 4 e2e)*
5. **A held organ or pad drone with a different drone note per chord** changes at each bar, with no voice left ringing after Stop. *(Task 3 unit with fakes, Task 4 e2e with `voiceCount()`)*

---

### Task 1: Sources

**Files:**
- Modify: `public/js/data/sources.js`, `docs/theory-sources.md` (new section "Voice leading (2026-11-24)")
- Test: `tests/voiceleading.test.mjs` (the data test runs in Task 2)

**Interfaces:**
- Produces: source ids for `WAYS = [{ id: 'smooth', … }, { id: 'planing', … }]`, and a status for each.

- [ ] **Step 1: Research.**
  - Find two independent sources each for:
    - voice leading by the smallest motion (parsimonious or smooth voice leading: common tones held, other voices by step)
    - planing / parallel harmony (a chord shape moved in parallel)
  - Wikipedia ("Voice leading", "Parallel harmony") and Open Music Theory are on the allowed network list; check others by search.
  - Record each row with a short quote under 25 words and a verdict.
  - Label "toward home / away" by gravity rank, the per-chord centre, and the tie-breaks as the app's convention.
- [ ] **Step 2: Commit** `docs: sources for smooth voice leading and planing`.

### Task 2: Voice-leading engine

**Files:**
- Create: `public/js/theory/voiceleading.js`
- Test: `tests/voiceleading.test.mjs`

**Interfaces:**
- Consumes: `fourTones`, `voiceAs` (`voicings.js`); `QUALITIES`, `lydianAnalysis`, `chordNotes` (`chords.js`); `pc`, `noteName`.
- Produces:
  - `WAYS`: a frozen array of `{ id: 'smooth'|'planing', name: 'Smooth'|'Same shape', description, sources, status }`.
  - `smoothInto(fromMidis: number[], next: Chord) -> number[]`, 4 ascending notes.
  - `planeInto(voicingId: string, fromMidis: number[], current: Chord, next: Chord) -> { midis: number[], parallel: boolean } | null`.
  - `compareVoices(fromMidis, toMidis, centreFrom: Note, centreTo: Note) -> Array<{ from: number, to: number, step: number, rankFrom, rankTo, kind: 'held'|'toward'|'away'|'same' }>`.
  - `describeMoves(moves, spell: (midi, which: 'from'|'to') => string) -> { steps: string, summary: string }`.
    - Steps look like `"D→E♭ ↑1 · C→C held · F→E ↓1"`.
    - The summary looks like `"two voices move toward home, one away; one held"` (counts in words, zero kinds omitted).

- [ ] **Step 1: Write failing tests.**
  - Every verified way cites ≥ 2 known source ids.
  - **Smooth:**
    - `smoothInto([62, 65, 69, 72], Ebm7)`: all four moves are ±1 or 0, and the result's pitch classes equal `fourTones(Ebm7)`.
    - `smoothInto(close Dm7, Dm7)` equals the input (every voice held). *(Review Focus 2)*
    - Over 12 roots × [maj7, m7, 7] into G7: always 4 strictly ascending notes. Each result's total motion ≤ the total motion of every other ascending assignment (brute-force check in the test).
  - **Planing:**
    - `planeInto('drop2', drop2(Dm7), Dm7, Ebm7)` gives `{ parallel: true }`, with every voice +1.
    - `planeInto('drop2', drop2(Dm7), Dm7, G7).parallel === false`, with pitch classes equal to `voiceAs('drop2', G7)`'s.
    - `planeInto('rootlessA', x, Dm7, Caug) === null`. *(Review Focus 3)*
  - **compareVoices:** for `Dm7` drop 2 [50, 57, 60, 65] into `Ebm7` [51, 58, 61, 66]:
    - centre G then A♭: every kind is from {toward, away, same}, with no 'held'
    - centre G and G (the same pedal): `rankFrom` of 62 (D) is 2
  - **Held voice:** `compareVoices([60], [60], G, A♭)[0]` gives `{ kind: 'held', rankFrom: 11, rankTo: 5 }`.
  - **describeMoves:** for all kinds over a sweep of chords and centres, the summary never matches `/must|should|resolve/i`.
- [ ] **Step 2: Run** `node --test tests/voiceleading.test.mjs`. Expected: FAIL.
- [ ] **Step 3: Implement.** Smooth: try the 24 permutations × each voice's two nearest octaves (below and above); keep the strictly ascending candidates; rank them by (total motion, largest move, sum).
- [ ] **Step 4: Run.** Expected: PASS.
- [ ] **Step 5: Commit** `feat: voice-leading engine (smooth, planing, gravity per voice)`.

### Task 3: A drone per step

**Files:**
- Modify: `public/js/audio/transport.js`
- Test: `tests/core.test.mjs`

**Interfaces:**
- Produces: a pattern may carry `stepDrones: number[][]`, one drone chord per step, with `droneSound`. When present, it replaces `drone`:
  - **Holding sounds** (organ, pad): release the held voice and hold the new notes at each step whose drone differs.
  - **Sounds that die away:** strike the step's drone notes at each step start, for the step's length.

- [ ] **Step 1: Write failing tests** (with fakes).
  - **Organ, two steps:** `stepDrones [[43, 50], [44, 51]]`, `durations [4, 4]`, bpm 60.
    - two holds, at 0.05 and 4.05
    - the first is released by t = 4.1
    - stop → released count = holds count
  - **Piano** with the same `stepDrones` → note strikes at each step start with the step's notes.
  - **Equal drones on both steps** → one hold, not re-held.
- [ ] **Step 2: Run.** Expected: FAIL.
- [ ] **Step 3: Implement.** Schedule the per-step drone alongside the step loop in `run()`. Releases go through the existing hold-release function and `stopAll`.
- [ ] **Step 4: Run `npm test`.** Expected: PASS.
- [ ] **Step 5: Commit** `feat: transport plays a drone per step (for leads between chords)`.

### Task 4: The Next chord section

**Files:**
- Modify:
  - `public/index.html`: inside `.voicings-card`, a `<section class="lead" aria-labelledby="h-lead">` holding an `h3#h-lead` "Into a next chord", the `label` + `input#next-chord` (text), `p#next-chord-error` (`role=status`), the `label` + `select#lead-from`, `p#lead-centres`, and `ol#leads`
  - `public/js/views/voicings.js`, `public/js/views/practice.js` (pass `getCentreFor(chord)` and the drone-per-chord helper), `public/css/app.css`, `README.md`
- Test: `tests/e2e.test.mjs`

**Interfaces:**
- Consumes: Task 2 (`WAYS`, `smoothInto`, `planeInto`, `compareVoices`, `describeMoves`); Task 3 (`stepDrones`); `parseChord`, `resolveDrone`.
- Produces: the pattern `{ kind: 'lead', way: 'smooth'|'planing', steps: [[bassA, ...from], [bassB, ...to]], durations: [4, 4], loop: true, label: 'Drop 2 of Dm7 → E♭m7, smooth', stepDrones?, droneSound? }`.

- [ ] **Step 1: Write failing e2e tests.**
  - **Empty field:** `#leads` has no rows; a hint says to type a chord.
  - **Planing:** main `Dm7`, next `Ebm7`, Lead from `drop2`. The Same shape row reads "moves in parallel" and its steps include "↑1" four times.
  - **Centres:** main `Dm7/G`, next `Ebm7/Ab`. `#lead-centres` names G and A♭, and the Smooth row's summary has no "must|should|resolve".
  - **Bad input:** next `C7sus4`, or `zz`. `#next-chord-error` shows the parser's message, and `#leads` is empty. *(Review Focus 1)*
  - **Not for this chord:** Lead from `rootlessA`, next `Caug`. The Same shape row reads "Not for this chord" and has no button. *(Review Focus 3)*
  - **Toggle:**
    - Play on the Smooth row → the transport's `kind 'lead'`, `way 'smooth'`, the button pressed
    - press again → stopped
    - while it plays, change the next chord → it restarts, with the label holding the new chord *(Review Focus 4)*
  - **Held organ drone:** "Hold the drone underneath" ticked, organ sound, `Dm7/G → Ebm7/Ab`, playing. After Stop and 600 ms, `app.engine.voiceCount() === 0`. *(Review Focus 5)*
  - **Clean:** no CSP problems, and 320 px reflow.
- [ ] **Step 2: Run `npm test`.** Expected: the new tests FAIL.
- [ ] **Step 3: Implement.**
  - Each row is an `<li>`: the name, the next chord's notes "over <bass>", the steps line, the summary line, any "moves in parallel" or "same voicing type; the chord type changes" note, the sources, and the Play toggle with `aria-pressed` and the name "Play smooth lead" / "Stop smooth lead".
  - The section re-renders on changes to the main chord, the next chord, Lead from, Drone on or hold-drone. Chord changes during play restart through `chordChanged`.
- [ ] **Step 4: Run `npm test`.** Expected: PASS.
- [ ] **Step 5: Commit** `feat: lead into a next chord on the Voicings card (smooth and same shape)`.

### Task 5: Ship

- [ ] **Measure:** 320 px, both themes, the input and select labels, toggle names, and the move arrows mirrored in text, not colour alone.
- [ ] **Security pass:** nothing new stored or fetched.
- [ ] **Review:** get a fresh whole-branch review on the most capable model with this Review Focus. Fix Critical and Important findings test-first.
- [ ] **PR:** push, open a draft PR, and merge when David asks and the checks pass.
