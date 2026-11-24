# Sus Chords Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Ship sus2, sus4, 7sus2 and 7sus4 as chords with no single parent scale. Every Lydian tonic that holds the chord is listed in tonal-gravity order, and the drone picks which one is heard.

**Architecture:**
- A pure module `public/js/theory/sus.js` computes the candidate tonics, the "also read as" names and the ladder line.
- `lydianAnalysis(chord, { centre })` in `chords.js` uses it for any quality marked `noSingleParent`.
- Practice shows a panel with "Hear from" buttons that set the drone (Drone on: Other note, saved). Everything downstream already follows the analysis and the drone.

**Tech Stack:** Plain ES modules, `node --test`, Playwright 1.63 e2e (`npm test`).

**Spec:** `docs/superpowers/specs/2026-11-24-sus-chords-design.md`. It includes "Settled after the builder check". David chose **A** on 2026-11-24: "Hear from" is a lasting drone setting.

## Global Constraints

- All of `CLAUDE.md`:
  - strict CSP; no inline code or styles; tokens only
  - original wording
  - a source per theory row in `docs/theory-sources.md`, textbooks before Wikipedia
  - notes computed from intervals, never hand-written in app code
- Sources (read 2026-11-24):
  - **sus4 and sus2:** Hutchinson §6.5 "Simple 'Sus' Chords" (`hutchinson-sus`) and the Open Music Theory "Lead-Sheet Chord Symbols" handout (`omt-lead-sheet`).
  - **7sus4:** Hutchinson §31.2 "11 versus sus" (C7sus = C F G B♭; `hutchinson-chord-symbols`) and `omt-lead-sheet` (C7sus4).
  - **7sus2:** neither source names it, so it is built from the sus2 rule (2 replaces 3: hutchinson-sus, omt-lead-sheet) on a dominant 7th. Its row note says so.
- The "no single parent" listing is labelled **the app's convention (David's reading, 2026-11-24)**, built on Russell's ladder-of-fifths rule.
- Wording describes, never prescribes.

## Review Focus

1. **A drone change while a sus chord plays:** pressing "Hear from B♭" re-analyses the chord. The parent scale, ladder and voicings switch to B♭, and anything playing restarts on the new parent, as a chord change does. Pinned in Task 3.
2. **A sus chord spelled with flats or sharps on every root** (D♭sus4, F♯7sus2): every tonic gets a spelling, none is dropped, and nothing throws. Pinned in Task 1.
3. **"Into a next chord" from or to a sus chord:** each chord's centre resolves through `lydianAnalysis(chord, { centre })`. The "Lydian tonic" drone mode means the most ingoing tonic. Pinned in Task 2.
4. **MIDI G C F with a G bass reads G7sus4 (no 5th).** With C or F in the bass it reads Csus4 or Fsus2. Pinned in Task 4.
5. **Reference with nothing pending:** the pending list is hidden, and the sus rows show their tonics. Pinned in Task 4.

---

### Task 1: Sus qualities and their tonics

**Files:**
- Create: `public/js/theory/sus.js`
- Modify: `public/js/theory/chords.js` (rows, `lydianAnalysis`)
- Modify: `public/js/data/sources.js` (3 new sources, kind `'textbook'`)
- Test: `tests/sus.test.mjs`, `tests/chords.test.mjs`

**Interfaces:**
- Produces:
  - `lydianTonics(chord) → Note[]`: plain-Lydian tonics holding every chord tone, ordered by the chord tones' total steps up the ladder of fifths (fewest first).
    - Each tonic is spelled with the fewest accidentals in its Lydian scale, tie → the flat spelling.
  - `lydianAnalysis(chord, { centre } = {})` returns:
    - for sus chords: `{ tonic, parentScale: 'lydian', parentNotes, ladder, tonics, noSingleParent: true }`, where `tonic` is the tonic matching `centre` by pitch class, else `tonics[0]`
    - for other chords: the same fields as today, plus `noSingleParent: false` and `tonics: [tonic]`
  - `QUALITIES` gains `sus4` (aliases `sus4`, `sus`), `sus2`, `7sus4` (`7sus4`, `7sus`) and `7sus2`. All are verified, with `tonicDegree: null`, `parentScale: 'lydian'` and `noSingleParent: true`.

- [ ] **Step 1: Write the failing tests** in `tests/sus.test.mjs`
  - `names = (ns) => ns.map(noteName)`
  - For each chord, `lydianTonics(parseChord(t))`:

    | Chord | Tonics |
    |---|---|
    | Csus2 | C, F, B♭, E♭, A♭ |
    | Csus4 | F, B♭, E♭, A♭, D♭ |
    | C7sus2 | B♭, E♭, A♭ |
    | C7sus4 | B♭, E♭, A♭, D♭ |

  - On all 12 roots × the 4 types, the counts are 5/5/3/4.
    - Each tonic's Lydian scale contains every chord pitch class.
    - Consecutive tonics are a perfect 5th apart going down (7 semitones up from the next).
    - No spelling has a double accidental.
  - `lydianAnalysis(Csus4).tonic` is F. With `{ centre: parseNote('Bb') }` it is B♭. With `{ centre: parseNote('D') }` it is F. `.noSingleParent` is `true`.
  - `lydianAnalysis(Cmaj7)` is unchanged (tonic C, `noSingleParent` false).
  - `parseChord('Csus')` is sus4, and `parseChord('C7sus')` is 7sus4.
  - In `tests/chords.test.mjs`, update whatever test expects `7sus4` pending.
- [ ] **Step 2: Run** `node --test tests/sus.test.mjs tests/chords.test.mjs`. Expect FAIL: module missing and parse errors.
- [ ] **Step 3: Implement** `sus.js` and the `chords.js` changes. Spell with `scaleNotes(tonic, 'lydian')`, trying the sharp and flat names of each pitch class and keeping the lower `accidentals` count.
- [ ] **Step 4: Run** `node --test`. Expect all to pass.
- [ ] **Step 5: Commit:** "Sus chords: four qualities with no single parent scale"

### Task 2: Callers pass the centre

**Files:**
- Modify:
  - `public/js/views/practice.js`: `onChord`, `droneNote`, `getCentreFor`, `stepDroneFor`
  - `public/js/audio/drone.js` (`resolveDrone`)
  - `public/js/views/voicings.js`, `public/js/views/lead.js` (`speller`)
  - `public/js/theory/voicings.js` (`voiceAs` takes `{ centre }` and passes it on)
- Test: `tests/core.test.mjs`, `tests/voicings.test.mjs`

**Interfaces:**
- Consumes: `lydianAnalysis(chord, { centre })` from Task 1.
- Produces: `resolveDrone(choice, chord, tonic)` is unchanged. For mode `tonic`, callers pass `lydianAnalysis(chord).tonic`, the most ingoing one. Practice's analysis is `lydianAnalysis(chord, { centre: droneNoteFor(chord) })`.

- [ ] **Step 1: Failing tests**
  - `voiceAs('quartal', Csus4, { centre: parseNote('Bb') })` draws its extra notes from B♭ Lydian. For example, it contains no B natural, while the F-centred one does.
  - `resolveDrone({ mode: 'tonic' }, Csus4, lydianAnalysis(Csus4).tonic)` returns F.
- [ ] **Step 2: Run them; they fail.**
- [ ] **Step 3: Implement.** `onChord` computes the centre from the drone choice before the analysis. `droneChanged` re-runs `onChord({ chord: state.chord })` when `state.analysis.noSingleParent` is set, so the parent follows the drone.
- [ ] **Step 4: Run** `npm test`. Expect all to pass.
- [ ] **Step 5: Commit:** "Sus chords: the drone picks the tonic heard"

### Task 3: The "no single parent" panel

**Files:**
- Modify:
  - `public/index.html`: a `<div id="sus-panel" hidden>` after `#bass-note`, holding `<p id="sus-readings">`, `<p id="sus-tonics-label">`, `<div id="sus-tonics" role="group" aria-labelledby="sus-tonics-label">` and `<p id="sus-ladder" class="hint">`
  - `public/css/app.css`
  - `public/js/views/practice.js`
- Modify: `public/js/theory/sus.js` (`susReadings`, `ladderLine`)
- Test: `tests/sus.test.mjs`, `tests/e2e.test.mjs`

**Interfaces:**
- Produces:
  - `susReadings(chord) → string[]`: other names for the same pitch classes, from the four sus types and their no-5th 7sus forms.
    - Csus4 → `['Fsus2', 'G7sus4 (no 5th)']`
    - Csus2 → `['Gsus4', 'D7sus4 (no 5th)']`
    - C7sus2 and C7sus4 → `[]`: only exact pitch-class matches count, and none of the other types matches their four notes.
  - `ladderLine(tonics) → string`:
    - for 5 tonics: `"These tonics run down in fifths (Russell's ladder): together they are the D♭ major pentatonic."`
    - otherwise: `"These tonics run down in fifths (Russell's ladder)."`

- [ ] **Step 1: Failing tests**
  - Unit tests for `susReadings` and `ladderLine` with the values above.
  - e2e: enter Csus4.
    - `#sus-panel` is visible, and `#parent-name` reads "F Lydian".
    - The buttons read "Hear from F", "Hear from B♭" and so on, in order. F has `aria-pressed="true"`.
    - Press "Hear from B♭":
      - `#drone-on` becomes `other` and `#drone-other` becomes `Bb`
      - `#parent-name` reads "B♭ Lydian"
      - B♭ is pressed
      - the pref `lce.drone` is saved
    - Enter Cmaj7: the panel is hidden and the drone stays on B♭ (David's A).
  - e2e: play a scale on Csus4, press "Hear from E♭", and check that the playing label names E♭.
- [ ] **Step 2: Run; they fail.**
- [ ] **Step 3: Implement** the panel in `onChord`.
  - A button press sets `#drone-on` = `other` and `#drone-other` = the pitch-class name, then calls `droneChanged()`.
  - There is one polite announcement per press: "Hearing Csus4 from B♭ Lydian."
- [ ] **Step 4: Run** `npm test`. Expect all to pass.
- [ ] **Step 5: Commit:** "Sus chords: no-single-parent panel with Hear from"

### Task 4: Voicings, MIDI, Reference and docs

**Files:**
- Modify:
  - `public/js/theory/voicings.js` (`roles`: a 2 stands in for a missing 3rd when there's no 4; cluster null for sus2 types)
  - `public/js/input/recognize.js` (`FIFTH_OPTIONAL` += `7sus4`, `7sus2`)
  - `public/js/views/reference.js`
  - `docs/theory-sources.md`
  - `docs/PROGRESS.md`
- Test: `tests/voicings.test.mjs`, `tests/recognize.test.mjs`, `tests/e2e.test.mjs`

- [ ] **Step 1: Failing tests**
  - Voicings:
    - `voiceAs('spread', C7sus4)` is C B♭ F, then two tones, with no E.
    - `voiceAs('cluster', Csus2)` is null.
    - `voiceAs('spread', Csus2)` is null (a triad).
  - MIDI:
    - `recognize([55, 60, 65])` (G C F) names G7sus4 with no 5th.
    - `[48, 53, 55]` is Csus4, and `[53, 55, 60]` is Fsus2.
    - Replace the test that expects C7sus4 to be refused.
  - Reference e2e:
    - The Csus4 row's tonic cell includes "F · B♭ · E♭ · A♭ · D♭", and its scale cell is "Lydian (no single tonic)".
    - A search for "suspended" finds 4 rows.
    - `#pending-list` is hidden when it is empty. Update `e2e.test.mjs:178`.
- [ ] **Step 2: Run; they fail.**
- [ ] **Step 3: Implement.** In `docs/theory-sources.md`:
  - add the four chord rows with their sources
  - add the "no single parent" convention and the ladder line
  - add the 7sus2 composition note
  - move 7sus4 out of "Sources differ"
- [ ] **Step 4: Run** `npm test`. Expect all to pass.
- [ ] **Step 5: Commit:** "Sus chords: voicings, MIDI, Reference and sources"

### Finish

- [ ] Fresh whole-branch review on the most capable model. Fix important findings test-first.
- [ ] Run the accessibility-review and security-review skills: the panel is new UI on the Practice screen.
- [ ] Push, open a draft PR, and merge when David asks.
