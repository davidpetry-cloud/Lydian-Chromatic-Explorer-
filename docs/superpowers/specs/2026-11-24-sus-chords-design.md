# Sus chords: no single parent scale (design)

Approved direction by David on 2026-11-24 (approach A). This adds four chord
types: **sus2, sus4, 7sus2 and 7sus4**.

## Intent and why

David: "suspended (sus) could mean that there is no '1' parent scale."
Csus4 (C F G) is also Fsus2 (F G C) and a G11 without its 3rd (G C F). The
same notes have several roots, and they sit in several Lydian scales at
once. Picking one Lydian tonic would hide the thing that makes a sus chord
open and ambiguous, the pentatonic quality David pointed out when 7sus4 was
held back.

David also noticed: "those Lydian scales spell the 7th chord or tonal
gravity." The Lydian tonics that hold a sus chord always run down in
fifths, which is Russell's ladder, so their order *is* tonal gravity. Taken
together they spell a chord of their own: Csus4's tonics F B♭ E♭ A♭ are
B♭7sus4, and with D♭ the D♭ major pentatonic.

## What the player sees

For a sus chord, Practice says the chord has **no single parent scale** and
lists every Lydian tonic that holds it, most ingoing first:

```
Csus4 (C F G) — no single parent scale
Also read as: Fsus2 · G7sus4 (no 5th)
Lydian tonics that hold it, ingoing → outgoing:
  [F] · B♭ · E♭ · A♭ · D♭      ← each a "Hear from" button
These tonics run down in fifths (Russell's ladder): together they spell D♭
major pentatonic.
Hearing it from F: F Lydian.
```

| Chord | Lydian tonics, most ingoing first |
|---|---|
| Csus2 (C D G) | C · F · B♭ · E♭ · A♭ |
| Csus4 (C F G) | F · B♭ · E♭ · A♭ · D♭ |
| C7sus2 (C D G B♭) | B♭ · E♭ · A♭ |
| C7sus4 (C F G B♭) | B♭ · E♭ · A♭ · D♭ |

- **Which tonic is heard:**
  - The drone note picks it, as it already picks the centre for the gravity
    reading (David's modal lens).
  - If the drone note is one of the listed tonics, that one is used.
    Otherwise it's the most ingoing one. The default drone is the bass note
    (C for Csus4), which isn't a tonic there, so Csus4 starts on F.
  - Each tonic in the list is a **"Hear from" button**. Pressing one sets
    Drone on: Other note to that tonic. *My call:* this keeps one source of
    truth (the drone) and makes the choice one press.
- **Everything else follows the tonic heard:** the parent scale, the seven
  principal scales (ingoing → outgoing ladder), the keyboard, the scale
  runs, the voicings' extra notes (drawn from the parent scale) and the
  gravity readings.
- **Reference:** the chord table lists sus rows as "No single parent: F ·
  B♭ · E♭ · A♭ · D♭" (for C), and the "Sources differ" list no longer shows
  7sus4.

## The rule (computed, never hand-written)

1. **Candidate tonics:** every Lydian scale (plain Lydian, the principal
   scale) that contains all of the chord's pitch classes.
2. **Ordered by tonal gravity:** by the chord tones' total distance up the
   ladder of fifths from the tonic. The most ingoing tonic puts the chord
   tones nearest home; each next one is a fifth further out. This equals
   Russell's statement that the Lydian tonic is the lowest note of a ladder
   of fifths.
3. **Readings:** the chord's other root names come from the same pitch
   classes, for example Csus4 = Fsus2 = G7sus4 with no 5th. *My call:* list
   only names the app already knows (these four sus types, plus 7sus4
   without its 5th, which MIDI already accepts).
4. **Only plain Lydian tonics are listed.** The six other principal scales
   still appear on each tonic's ladder, as for any chord.

## Sources (the two-source rule)

- **Chord spellings:** sus2 = 1–2–5, sus4 = 1–4–5, 7sus2 = 1–2–5–♭7,
  7sus4 = 1–4–5–♭7. Each needs two textbook sources (textbooks first; see
  `CLAUDE.md`).
- **No single parent:** Russell's Chart A names no sus chord (already
  recorded). Listing every Lydian scale that holds the chord, in gravity
  order, is the **app's convention (David's reading, 2026-11-24)**, built
  on Russell's ladder-of-fifths rule (scholar.colorado.edu, already cited).
  The app and `docs/theory-sources.md` label it so.
- **Spread and cluster:** a sus 4th stands in for the 3rd (Hutchinson
  §31.7, already in the code). *My call:* a sus 2nd stands in for the 3rd
  the same way, by analogy, labelled the app's convention.

## Goals, non-goals, anti-goals

- **Goal:** the four sus chords parse, play and voice like any chord, and
  their ambiguity is shown, not hidden.
- **Non-goals:**
  - other "no single parent" chords (quartal stacks, add-chords)
  - choosing a tonic from Russell's book, which waits for the book check
- **Anti-goal:** presenting one Lydian tonic as *the* answer for a sus
  chord.

## Constraints

- **All `CLAUDE.md` rules apply:**
  - strict CSP and tokens only
  - WCAG 2.2 AA:
    - the tonic buttons have `aria-pressed` for the one heard
    - names that read "Hear from F"
    - one polite announcement per press
  - original wording
- **Mobile:** it reflows at 320 px.
- **No new storage:** the tonic heard lives in the existing drone setting.

## Approaches

- **A. A "no single parent" panel, with the drone picking the tonic**
  (chosen by David). It shows the ambiguity and fits the drone-as-centre
  lens.
- **B. One default tonic, with the others named in a line.** Simpler, but it
  still puts one home first, which is what David's point argues against.

## Settled after the builder check (my calls, for David to check)

- **Drone on: Lydian tonic** means the most ingoing tonic for a sus chord. In
  "Into a next chord", each chord's centre is resolved on its own, as now.
- **MIDI:** naming stays bass-first, so C F G is Csus4 over a C bass, Fsus2
  over F, and G7sus4 (no 5th) over G. 7sus4 and 7sus2 join the chords
  allowed without their 5th.
- **"Also read as":** generated from the four sus types and their no-5th
  forms (C D B♭ is B♭sus2 as well as C7sus2 with no 5th). The line is left
  out when there are none.
- **Spelling:** each tonic gets the spelling with the fewest accidentals,
  matched to the drone picker by pitch class. No tonic is ever dropped.
- **"Together they spell":** every chord gets "a ladder of fifths: B♭ E♭ A♭
  D♭". Five tonics add "(the D♭ major pentatonic)". It is labelled the app's
  convention and gets a row in `docs/theory-sources.md`.
- **Names that parse:**
  - `sus` and `sus4` mean sus4
  - `sus2`
  - `7sus` and `7sus4` mean 7sus4
  - `7sus2`
  - 9sus4, 13sus4 and the other extended sus chords are out of scope.
- **Voicings:**
  - Sus triads get no spread, as other triads have none.
  - Cluster returns null for sus2 types, because the stand-in and the 9th
    are the same note.
  - Rootless voicings stay limited to the maj7, m7 and dominant families, so
    they aren't offered on sus chords.
- **Shipping:** each chord type ships on its own two sources, as
  `CLAUDE.md` already says. One that lacks them waits alone. The
  "Sources differ" list is hidden when it is empty, like the Voicings card's
  pending line.
- **Reference row:** the Parent scale cell reads "Lydian (no single tonic)",
  and the Lydian tonic cell lists the tonics. The search text includes
  "sus", "suspended", "no single parent" and the tonic names.

## Left to the builder

- Where the panel sits in the analysis card, and its exact wording.
- How `lydianAnalysis` takes the drone, for example
  `lydianAnalysis(chord, { centre })` returning `{ tonics, tonic, ... }`,
  and every caller updated.
- Tests:
  - the four tables above
  - every root
  - Reference rows
  - MIDI naming of C F G by its bass note
