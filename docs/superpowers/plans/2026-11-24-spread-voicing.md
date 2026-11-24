# Spread Voicing Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Ship the Spread voicing on the Voicings card: Hutchinson's five-note spread, with the root, 7th and 3rd at the bottom and two parent-scale tones above, a fourth or fifth apart.

**Architecture:** One new pure function in `public/js/theory/voicings.js`, wired into `voiceAs('spread', …)`. Spread's entry in `VOICINGS` becomes verified. The view, Play all, the gravity reading and the next-chord section already take any verified voicing. One fix in `public/js/theory/voiceleading.js`: `smoothInto` must work when the next chord has fewer target tones than the current voicing has voices (5 → 4).

**Tech Stack:** Plain ES modules, `node --test`, Playwright 1.63 e2e (`npm test`).

**Spec:** `docs/superpowers/specs/2026-11-24-spread-voicing-design.md`

## Global Constraints

- All of CLAUDE.md applies:
  - no inline code or styles
  - tokens only
  - original wording
  - a source per theory row in `docs/theory-sources.md`
  - textbooks before Wikipedia
- Notes are computed from intervals; never hand-written note lists in app code (tests may state expected results).
- The row's description must say the sources differ: it must contain "Textbooks differ on the size; a three-note form (root, 3rd, 7th) also exists."
- Extra notes come from Russell's parent scale (`lydianAnalysis(chord).parentNotes`).
- Sources for Spread: `['hutchinson-jazz-voicings', 'pianogroove-spread']` (both already in `public/js/data/sources.js`).
- Wording describes and never prescribes (no "must", "should", "resolve"): the existing reading test enforces this.

## Review Focus

1. **Leading from Spread into a triad** (e.g. Cmaj7 → F): Spread doesn't apply to F, so Smooth falls back to `fourTones(F)`, which has 4 tones for 5 voices. The user expects five moving voices, not an empty row. This is pinned in Task 2.
2. **A 6 or m6 chord** (no 7th): the 6th stands in for the 7th, and the upper notes never add a 7th the chord doesn't have. This is pinned in Task 1.
3. **Every verified chord type on all 12 roots:** the result is null or five distinct rising pitch classes, root lowest, inside G2–G5. It never throws. This is pinned in Task 1.
4. **Slash chords** (Dm7/G): the spread's lowest note is the chord root D, and the octave-2 bass still plays G. This is pinned in Task 1 (the unit test uses `parseChord('Dm7/G')`).
5. **The pending line:** with nothing waiting, `#voicings-pending` is empty, not "Waiting for sources: .". This is pinned in Task 1's e2e step.

---

### Task 1: Spread voicing

**Files:**
- Modify: `public/js/theory/voicings.js` (the `VOICINGS` entry for `spread`, the `roles()` sus fallback, a new `spread(chord, parent)`, and the `voiceAs` switch)
- Modify: `docs/theory-sources.md` (the Spread row becomes Verified)
- Test: `tests/voicings.test.mjs`, `tests/e2e.test.mjs`

**Interfaces:**
- Produces: `voiceAs('spread', chord) → number[5] | null` (rising MIDI), and `VOICINGS` with `spread.status === 'verified'`.

- [ ] **Step 1: Write the failing tests** in `tests/voicings.test.mjs`
  - Update `the list, in order, with only spread waiting for sources`:
    - rename it `the list, in order, with every voicing sourced`
    - nothing is pending: `assert.deepEqual(VOICINGS.filter((v) => v.status !== 'verified').map((v) => v.id), [])`
    - `voicingsFor(c('Cmaj7'))` ids are `['close', 'drop2', 'drop3', 'drop24', 'spread', 'quartal', 'cluster', 'rootlessA', 'rootlessB']`
  - Add `spread: Hutchinson's five notes, root–7th–3rd then two parent-scale tones in fourths`, using `names = (ms) => ms.map((m) => ['C','C#','D','Eb','E','F','F#','G','Ab','A','Bb','B'][m % 12])`:
    - `names(voiceAs('spread', c('Cmaj7')))` → `['C','B','E','A','D']`
    - `Dm7` → `['D','C','F','B','E']`
    - `G7` → `['G','F','B','E','A']`
    - `Dm7/G` → `['D','C','F','B','E']` (the chord root is lowest; the bass is separate)
  - Add `spread on a 6th chord: the 6th stands in for the 7th, and no 7th is added`:
    - for `C6` and `Cm6`, the result is not null
    - its second note is A (pitch class 9)
    - none of its notes is B or B♭ (11 or 10)
  - Add `spread on every verified chord type and root: null or five rising notes, root lowest, inside G2–G5`:
    - loop over `QUALITIES` with `status === 'verified'` × `ROOTS`
    - when non-null: `m.length === 5`, `ascending(m)`, `pcs(m).size === 5`, `m[0] % 12 === pc(chord.root)`, `m[0] >= 43 && m.at(-1) <= 79`
    - triads (`C`, `Cm`, `Caug`, `Cdim`) are `null`
    - `maj7`, `m7`, `7`, `m7b5`, `6` and `m6` are never null on any root
  - Add `the spread row says where the sources differ`: `VOICINGS.find((v) => v.id === 'spread').description` includes `'Textbooks differ on the size; a three-note form (root, 3rd, 7th) also exists.'`

- [ ] **Step 2: Run them to see them fail**
  Run: `node --test tests/voicings.test.mjs`
  Expected: the new spread tests and the list test FAIL (`voiceAs('spread')` returns null; status is pending).

- [ ] **Step 3: Implement `spread(chord, parent: number[]) → number[] | null` in `public/js/theory/voicings.js`**
  - **In `roles()`:** `third` falls back to the sus 4th (`find('4')`) when the chord has no 3rd. Exclude that 4 from `extensions` when it is standing in.
  - **The base:** `[root, seventh (or 6th), third]`. Return null if `seventh` or `third` is null.
  - **Allowed upper tones:** parent-scale pitch classes at 2, 5, 6, 7, 9 semitones above the root, plus 1, 3 or 8 when the parent has them. That is the 9ths, 11th or ♯11, 5th and 13ths, never a 7th. A tone already in the base is excluded.
  - **The search:** choose the pair (a, b) stacked upward from the 3rd, trying steps of 5, 7, 6, 3, 4 semitones. Fourths and fifths come first; thirds are the fallback, since Hutchinson says "often".
  - **Scoring:** first, more steps that are 5–7 semitones; then more of the chord's own `extensions` among a and b; then the lower top note.
  - **Placement:** `place(stack([root, seventh, third, a, b]))`. `stack` starts at C3; `place` falls back to G2–G5. Null if no pair is found.
  - Wire it as `case 'spread': return spread(chord, parent);`.
  - Set the `VOICINGS` entry:
    - name `'Spread'`
    - description `'The root at the bottom, the 7th and the 3rd above it, then two tones of the parent scale a fourth or fifth apart: both hands, wide open. Textbooks differ on the size; a three-note form (root, 3rd, 7th) also exists.'`
    - sources `['hutchinson-jazz-voicings', 'pianogroove-spread']`
    - status verified (drop the `'pending'` argument)

- [ ] **Step 4: Run the unit tests**
  Run: `node --test tests/voicings.test.mjs tests/voiceleading.test.mjs tests/reading.test.mjs`
  Expected: all PASS.

- [ ] **Step 5: Update the e2e test** in `tests/e2e.test.mjs` (`Voicings card: each sourced voicing…`)
  - The row count becomes `9`.
  - The pending check becomes `assert.equal(await page.textContent('#voicings-pending'), '')`.
  - Add `assert.match(await row(page, 'Spread').textContent(), /C B E A D over C/)`.
  - Run `npm test`. Expected: all pass.

- [ ] **Step 6: Update `docs/theory-sources.md`** in the Voicings table
  - The Spread row's definition becomes the rule above.
  - Its verdict becomes "Verified. **Sources differ on the size** (Hutchinson five notes, PianoGroove three); the app uses five and says so in the row."
  - Under "The app's own conventions", add the upper-tone search order (steps 5, 7, 6, then thirds) and "the 7th below the 3rd".

- [ ] **Step 7: Commit**
  `git add public/js/theory/voicings.js tests/voicings.test.mjs tests/e2e.test.mjs docs/theory-sources.md && git commit -m "Voicings: ship Spread (Hutchinson's five notes)"`

### Task 2: Smooth leading from five voices into a four-tone chord

**Files:**
- Modify: `public/js/theory/voiceleading.js` (`smoothInto`)
- Test: `tests/voiceleading.test.mjs`

**Interfaces:**
- Consumes: `voiceAs('spread', chord)` from Task 1.
- Produces: `smoothInto(fromMidis, next, voicingId)`, which always returns `fromMidis.length` rising notes when the next chord has any tones.

- [ ] **Step 1: Write the failing tests**
  - Add `smooth from a five-note spread into a triad keeps five voices, doubling the new root`:
    - `const from = voiceAs('spread', parseChord('Cmaj7'))`
    - `const to = smoothInto(from, parseChord('F'), 'spread')`
    - `to.length === 5`
    - it is rising
    - its pitch classes equal `{5, 9, 0}` (F A C)
  - Add `smooth from spread into another seventh chord aims at its spread notes`:
    - `smoothInto(voiceAs('spread', Dm7), G7, 'spread')`
    - its pitch-class set equals that of `voiceAs('spread', G7)`

- [ ] **Step 2: Run them to see them fail**
  Run: `node --test tests/voiceleading.test.mjs`
  Expected: the triad test FAILS (`smoothInto` returns null).

- [ ] **Step 3: Implement the padding in `smoothInto`**
  When `goal.length < fromMidis.length`, append the next chord's root pitch class until the lengths match, before the permutation search. Permutations of 5 are 120, which is fine. Also dedupe identical permutations (`new Set` of joined keys) so a doubled root doesn't double the work.

- [ ] **Step 4: Run all tests**
  Run: `npm test`
  Expected: all pass (the 292 tests from before plus the new ones).

- [ ] **Step 5: Commit**
  `git add public/js/theory/voiceleading.js tests/voiceleading.test.mjs && git commit -m "Voice leading: five voices into a four-tone chord double the new root"`

### Finish

- [ ] **Run a fresh review of the branch diff** (most capable model) and fix its important findings test-first.
- [ ] **Run the accessibility-review and security-review skills.** This isn't a new screen, but a new row: check that the row's Play button name ("Play Spread") and its notes text are present.
- [ ] **Push and open a draft PR.**
