# Voicings Card Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** A Voicings card in Practice that plays the current chord in sourced piano voicings (close, drops, spread, quartal, cluster, rootless). Each voicing has a Play/Stop toggle and a tonal-gravity reading counted from the drone note.

**Architecture:**
- A pure module `public/js/theory/voicings.js` computes each voicing from the chord and its Russell parent scale.
- `public/js/theory/reading.js` ranks the notes by tonal gravity from a chosen centre and names the mode colour.
- `public/js/views/voicings.js` renders the card and plays through the existing transport as looping patterns.

**Tech Stack:** As before: ES modules, Web Audio, `node:test` and Playwright. No new dependencies.

**Spec:** `docs/superpowers/specs/2026-11-24-voicings-card-design.md`

## Global Constraints

- All CLAUDE.md rules apply:
  - strict CSP; no inline code
  - tokens only; WCAG 2.2 AA
  - sound only from a press, and it stops on its own (Stop after, idle, hidden tab)
  - original words only; never copy from books
- **Two-source rule:**
  - Each voicing *definition* ships (`status: 'verified'`) only with two independent sources, each with a row in `docs/theory-sources.md`.
  - Applying a definition to any chord is computation.
  - Rootless A/B is offered only on the chord families its sources cover.
- **Extra notes** come from the chord's Russell parent scale: `lydianAnalysis(chord).parentNotes`.
- **Placement:**
  - Upper voices go in C3–B4, MIDI 48–71, inclusive; the span may reach two octaves (two hands).
  - The bass sounds at `36 + pc(chord.bass)`.
- **Centre:** the drone note. The resolved "Drone on" note is `resolveDrone(dronePref-state, chord, tonic)`.
- **Gravity ranks:** `gravityRank(centre, pc)`, 1–12, from `public/js/theory/gravity.js`.
- **The mode name** comes from `modeFrom(parentNotes, centre)?.name`, as "heard from G: G Mixolydian". If the name is null, omit it.
- **Gravity wording describes and never prescribes:**
  - no resolution arrows; no "must", "should" or "resolve"
  - all ranks ≤ 7 → "inside: nothing past rank 7"
  - otherwise → "reaches outward to F♯ (♯4), rank 7+; it can stay there", naming the most outward note
- **Play/Stop toggle:**
  - The label is "▶ Play" or "■ Stop", with `aria-pressed`, and the accessible name "Play drop 2" / "Stop drop 2".
  - While playing, the voicing is re-struck every 4 beats at the Practice tempo (a looping pattern), so Stop after applies.
- **Play all:** a toggle that steps through the playable voicings in list order, 4 beats each, looping.

## Review Focus

1. **Changing the chord while a voicing plays** switches to the same voicing of the new chord, and the toggle states stay true. *(Task 4 e2e)*
2. **A voicing that doesn't apply to the chord** (rootless on aug, dim or 7alt; a voicing with too few distinct tones) shows "Not for this chord", has no Play button, and is skipped by Play all. *(Task 2 unit, Task 4 e2e)*
3. **A slash chord whose bass lies outside the parent scale** (`D/C`), or a centre outside the parent scale (drone on A♭ over Cmaj7), still renders: ranks are shown and the mode name is omitted, with no error. *(Task 3 unit)*
4. **Changing "Drone on" while a voicing plays** updates the readings at once, without restarting playback. *(Task 4 e2e)*
5. **Pressing Play on one row while another plays** switches to it, and only the new row shows pressed. *(Task 4 e2e)*

---

### Task 1: Sources for the voicing definitions

**Files:**
- Modify: `public/js/data/sources.js`, `docs/theory-sources.md` (new section "Voicings (2026-11-24)")
- Test: `tests/voicings.test.mjs` (data part)

**Interfaces:**
- Produces: source ids used in `VOICINGS[*].sources`, and a status per voicing id: `close`, `drop2`, `drop3`, `drop24`, `spread`, `quartal`, `cluster`, `rootlessA`, `rootlessB`.

- [ ] **Step 1: Research.**
  - For each voicing, find two independent sources for its definition, including which voice drops and which tones a rootless voicing holds. Candidates: Wikipedia "Drop voicing"; Open Music Theory; Berklee Online; The Jazz Piano Site; jazz-theory texts quoted online.
  - Record each row with a short quote under 25 words, the source, and a verdict.
  - Also record the **four-tone convention** used here, citing a source if one exists; otherwise label it the app's convention:
    - 4-tone chords: their own tones
    - triads: the root doubled
    - larger chords: keep, in priority order, 3, 7 (or 6), then the extensions from the top down, then 5, then root
  - A voicing without two sources becomes `status: 'pending'`.
- [ ] **Step 2: Write the failing test** `every verified voicing cites two known sources`. Every `VOICINGS` entry with `status === 'verified'` has ≥ 2 ids, each found in `SOURCES`.
- [ ] **Step 3: Add the sources.** The test passes once Task 2 adds `VOICINGS`, so run it in Task 2.
- [ ] **Step 4: Commit** `docs: sources for piano voicing definitions`.

### Task 2: Voicing engine

**Files:**
- Create: `public/js/theory/voicings.js`
- Test: `tests/voicings.test.mjs`

**Interfaces:**
- Consumes: `chordNotes`, `lydianAnalysis` (`chords.js`), `pc` and `degreeLabel` (`notes.js`).
- Produces:
  - `VOICINGS`: a frozen array of `{ id, name, description, sources, status }` in list order: Close, Drop 2, Drop 3, Drop 2 & 4, Spread, Quartal, Cluster, Rootless A, Rootless B.
  - `voiceAs(id, chord) -> number[] | null`: ascending MIDI notes in 48–71, or null when the voicing doesn't apply.
  - `voicingsFor(chord) -> Array<{ id, name, description, sources, status, midis: number[] | null }>`, listing verified voicings only.
  - `fourTones(chord) -> number[]`: four pitch classes, per the Task 1 convention.

- [ ] **Step 1: Write failing tests.** Use `parseChord` for the chords.
  - `voiceAs('close', Cmaj7)` has pitch classes {0, 4, 7, 11}, a span ≤ 11, all within 48–71.
  - **Drop 2 of Cmaj7:**
    - its pitch-class set equals close's
    - its 2nd-highest close note sits 12 lower
    - a test that rebuilds drop 2 from the returned close voicing matches
  - **Drop 3 and drop 2 & 4:** the same kind of reconstruction test.
  - **Every verified voicing,** for every root in the 12 picker roots × qualities `maj7`, `m7`, `7`, `m7b5`, `6`, `maj`: the result is null, or ascending, unique and within 48–71.
  - **Rootless A of Dm7** has pitch classes {F, A, C, E} = {5, 9, 0, 4}, with no D. `voiceAs('rootlessA', Caug)` is `null`.
  - **Cluster of Cmaj7:** four parent-scale tones in consecutive scale steps starting at the 7th: B C D E = {11, 0, 2, 4}, all from C Lydian.
  - **Quartal of Dm7:** four notes whose adjacent intervals are each 5 or 6 semitones, all within F Lydian.
  - `fourTones(C)` is `[0, 4, 7, 0]` (the root doubled). `fourTones(C13)` has 4 tones and contains 4 and 10 (the 3rd and ♭7).
- [ ] **Step 2: Run** `node --test tests/voicings.test.mjs`. Expected: FAIL (module missing).
- [ ] **Step 3: Implement.**
  - Close voicings are built from `fourTones`.
  - **Placement:** of the four rotations, after the voicing's own transformation, choose the one with all notes in 48–71 whose top note is nearest 67 (G4); ties go lower.
  - **Spread, quartal, cluster and rootless** follow the Task 1 definitions:
    - quartal: diatonic fourths in the parent scale, starting on the chord tone that keeps the most chord tones
    - cluster: four consecutive parent-scale steps from the 7th (or the 6th, or the 5th for triads)
- [ ] **Step 4: Run.** Expected: PASS, including Task 1's test.
- [ ] **Step 5: Commit** `feat: voicing engine (close, drops, spread, quartal, cluster, rootless)`.

### Task 3: Gravity reading from a centre

**Files:**
- Create: `public/js/theory/reading.js`
- Test: `tests/reading.test.mjs`

**Interfaces:**
- Consumes: `gravityRank`, `modeFrom`, `degreeLabel`, `noteName`, `pc`.
- Produces: `gravityReading(midis: number[], centre: Note, parentNotes: Note[], chordNotes: Note[]) -> { ranks: number[], reach: { note: Note, rank: number } | null, words: string, colour: string | null }`.
  - `colour` is e.g. `"G Mixolydian"`.
  - Note names are spelled from the chord or parent spelling, using `parentNotes` to find each pitch class's name.

- [ ] **Step 1: Write failing tests.**
  - **Drop 2 of Dm7, centre G** (the spec's example):
    - `colour === 'G Mixolydian'`
    - the ranks of [A, D, F, C] are `[3, 2, 10, 11]`
    - `words` matches `/reaches outward to C/`
  - **Close Cmaj7, centre C:** `words === 'inside: nothing past rank 7'`; `colour === 'C Lydian'`.
  - **Centre A♭ over Cmaj7:** `colour === null`, and no throw.
  - **No prescription:** for every result over the 12 roots × `maj7`, `m7` and `7` × every centre pitch class, `words` never matches `/must|should|resolve/i`.
- [ ] **Step 2: Run.** Expected: FAIL.
- [ ] **Step 3: Implement.** Sort ties in `reach` by the lower rank's note.
- [ ] **Step 4: Run.** Expected: PASS.
- [ ] **Step 5: Commit** `feat: tonal gravity reading of a voicing from any centre`.

### Task 4: The Voicings card

**Files:**
- Create: `public/js/views/voicings.js`
- Modify:
  - `public/index.html`: a `<section class="card voicings-card" aria-labelledby="h-voicings">` after the scale ladder, before the keyboard. It holds an `h2#h-voicings`, a `p#voicings-heard`, a `button#voicings-all` and an `ol#voicings`.
  - `public/css/app.css`
  - `public/js/views/practice.js`: mount the card, give it the chord, the drone centre and the hold-drone state, and fire its chord-change hook.
  - `README.md`
- Test: `tests/e2e.test.mjs`

**Interfaces:**
- Consumes: `voicingsFor`, `gravityReading`, the transport (`play`, `stop`, `current`, `onPlay`, `onStop`, `onStep`), `app.droneSound`, and the keyboard's `flash`.
- Produces: `mountVoicings({ app, announce, keyboard, getChord, getCentre, droneFor }) -> { refresh(), chordChanged() }`.
  - **Single voicing pattern:** `{ kind: 'voicing', owner: 'practice', voicingId, steps: [[bass, ...midis]], durations: [4], loop: true, bpm, label: 'Drop 2 of Cmaj7', drone?, droneSound? }`.
  - **Play all:** `kind: 'voicings'`, one step per playable voicing, `voicingIds` in step order.

- [ ] **Step 1: Write failing e2e tests.**
  - **The card exists:**
    - for Cmaj7, `#h-voicings` reads "Voicings of Cmaj7"
    - every verified voicing has a row with its name and its notes as text
    - `#voicings-heard` reads "heard from C: C Lydian" (default centre = bass)
  - **Modal centre:** typing `Dm7/G` makes `#voicings-heard` read "heard from G: G Mixolydian".
  - **Toggle:**
    - clicking a row's Play makes the transport play `kind 'voicing'` with that `voicingId`, sets `aria-pressed="true"`, and shows text "■ Stop"
    - clicking it again stops (`isPlaying()` false)
    - clicking another row's Play switches: only the new one is pressed *(Review Focus 5)*
  - **Changing the chord while a voicing plays:** switching to `G7` keeps the same `voicingId` playing, and the label contains "G7" *(Review Focus 1)*.
  - **Changing "Drone on" while playing:**
    - the readings update
    - the transport's pattern object is unchanged: same `current()` reference before and after *(Review Focus 4)*
  - **Not for this chord:** for `Caug`, the Rootless rows read "Not for this chord" and have no Play button; Play all's steps exclude them *(Review Focus 2)*.
  - **Play all** is a toggle with the same pressed and stop behaviour.
  - **CSP and reflow:** no CSP problems, and 320 px reflow with no sideways scroll.
- [ ] **Step 2: Run** `npm test`. Expected: the new tests FAIL.
- [ ] **Step 3: Implement.**
  - The rows are an `<ol>` of `<li>`. Each holds the name, the notes ("B C D E over C"), the ranks ("ranks 6 · 1 · 3 · 5"), the reading words, the description with source numbers like the Learn tab, and the toggle button.
  - The playing row is marked with a ring plus `aria-current="true"`, not colour alone.
  - There is one polite announcement per press: the label, or "Stopped".
  - The drone underneath plays only when "Hold the drone underneath" is ticked, using `droneFor()` from Practice.
- [ ] **Step 4: Run `npm test`.** Expected: PASS.
- [ ] **Step 5: Commit** `feat: Voicings card in Practice with gravity reading and Play toggles`.

### Task 5: Ship

- [ ] **Measure:** contrast in both themes, the buttons' accessible names, 320 px, and that the playing row is not marked by colour alone.
- [ ] **Security pass:** CSP unchanged; no new storage.
- [ ] **Docs:** `README.md`, the Learn/Reference glossary if a term is added (each with sources), and `docs/theory-sources.md` complete.
- [ ] **Review:** get a fresh whole-branch review on the most capable model, with this Review Focus. Fix Critical and Important findings test-first.
- [ ] **PR:** push, open a draft PR, watch CI and the Cloudflare preview, and merge only when David says.
