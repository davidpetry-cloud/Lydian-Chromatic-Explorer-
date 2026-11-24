# Theory sources

Every scale, the order of tonal gravity, and every chord mapping in
`public/js/theory/` traces to a row here. Source ids match
`public/js/data/sources.js`.

**How this was checked (2026-11-21):** web search only. This session's
network blocks fetching the pages themselves, so each row rests on the
search engine's quoted summaries of the pages, not on a full reading.
None of the sources is the book itself. **The book check below is still
open.** If David (or anyone with the 4th edition) confirms or corrects a
row, record it here with the page number.

## Rule

A fact ships (`status: 'verified'`) when two independent sources support
it. Where sources disagree, or only one source speaks to it, the row stays
`pending`: the app refuses that chord and lists it under "Sources differ".

## Scales and gravity (Task 3)

| Fact | Value in the app | Sources | What they say | Verdict |
|---|---|---|---|---|
| The seven principal scales and their order | Lydian, Lydian Augmented, Lydian Diminished, Lydian Flat Seventh, Auxiliary Augmented, Auxiliary Diminished, Auxiliary Diminished Blues | french-2018 (citing p. 14), tjps, kvr-forum | French lists the seven as the principal chord-producing scales: four of "lydian derivation", three "auxiliary". KVR lists them in order of dissonance. | Agree |
| Lydian Flat Seventh is Lydian with ♭7 | 1 2 3 ♯4 5 6 ♭7 | french-2018 (Lydian Dominant article), italianpiano | French: Russell calls the Lydian Dominant scale the "Lydian Flat Seventh" scale. | Agree |
| Auxiliary Augmented is whole-tone | 1 2 3 ♯4 ♯5 ♭7 | kvr-forum | "Aux Aug = Whole Tone". | One named source; fits every description of the scale. **Book check wanted.** |
| Auxiliary Diminished is whole-half | 1 2 ♭3 4 ♯4 ♯5 6 7 | kvr-forum, plus one search result whose page wasn't identified | "Aux Dim = Whole Half Dim"; the alternating half/whole scales are what Russell calls auxiliary diminished and auxiliary diminished blues. | Agree |
| Auxiliary Diminished Blues is half-whole and completes the 12 tones | 1 ♭2 ♭3 3 ♯4 5 6 ♭7 | french-2018, plus the unidentified result above | French: it includes the ♭II (note 12), so it has a 12-tone order. | Agree |
| Lydian Augmented raises the 5th; Lydian Diminished lowers the 3rd | as in the app | italianpiano, kvr-forum, wikipedia-lydian-chord | "Lydian Dim = Lydian ♭3". The Lydian augmented scale is Lydian with ♯5. | Agree |
| Order of tonal gravity | 1 5 2 6 3 7 ♯4 ♯5 ♭3 ♭7 4 ♭2 | french-2018, mcclimon | The first seven tones are the Lydian scale as stacked fifths. Five extension tones follow, with ♭II last; gravity levels run from ingoing (7) to outgoing (12). | First seven and the last tone agree. Positions 8–11 are inferred: each is the tone the next principal scale adds, which fits every source but isn't quoted by any. **Book check needed.** |

## Chord mappings (Task 5)

"Tonic" is the Lydian tonic as a degree above the chord root.

| Quality | Tonic | Parent | Sources | What they say | Verdict |
|---|---|---|---|---|---|
| major, maj7, 6, 6/9 | 1 | Lydian | italianpiano, wikipedia-chord-scale | Russell derives the major chord from the first degree of the Lydian scale; Russell associated the C major chord with the Lydian scale. | Verified |
| maj7♯11 | 1 | Lydian | italianpiano, wikipedia-lydian-chord | The Lydian chord is the major chord with ♯11, from the Lydian scale. | Verified |
| dominant 7, 9, 13 | ♭7 (a whole step below the root) | Lydian | italianpiano, cafesaxophone | Russell derives the dominant chord from the second degree of the Lydian scale; a forum example: "for A7 I would play G Lydian". | Verified. **This changes the plan**, which had the root's Lydian Flat Seventh. That scale still appears in the chord's ladder. |
| minor 7, minor | ♭3 (a minor third above the root) | Lydian | italianpiano, gct-f-lydian | italianpiano: Russell derives the minor seventh chord from the sixth degree of the Lydian scale. gct-f-lydian confirms Dm7 is the vi chord of F Lydian (the structure, not Russell's attribution). | Verified, with a weaker second source. **Book check wanted.** |
| augmented, maj7♯5 | 1 | Lydian Augmented | italianpiano, wikipedia-lydian-chord | Russell includes Lydian Augmented because it gives the augmented chord, which the Lydian scale lacks; Wikipedia ties the Lydian augmented chord to the Lydian augmented scale. | Verified |

## MIDI recognition and mode names (2026-11-22)

| Fact | Value in the app | Sources | What they say | Verdict |
|---|---|---|---|---|
| The perfect 5th may be left out of seventh-family chords | MIDI recognition accepts maj7, 6, 6/9, m7, 7, 9 and 13 without the 5th, only after exact matches fail | wikipedia-seventh-chord, tjps-shell | In jazz the fifth of a seventh chord is often omitted; shell voicings keep root, 3rd and 7th and drop the 5th. | Agree |
| The seven modes of the major scale, and their names | Ionian, Dorian, Phrygian, Lydian, Mixolydian, Aeolian, Locrian, as rotations of the Lydian scale (computed in `modes.js`) | wikipedia-mode, berklee-modes | Each mode is the major scale started on a different degree; Dorian is natural minor with a raised 6th, Mixolydian lowers the 7th, and so on. | Agree. Only these seven get names; other scales show their notes from the root without a name. |

## More chord types (2026-11-23)

| Quality | Tonic | Parent | Sources | What they say | Verdict |
|---|---|---|---|---|---|
| 7♯11 | 1 | Lydian Flat Seventh | wikipedia-lydian-chord, french-lydian-dominant | The dominant 7♯11 is the chord of the Lydian dominant scale; Russell calls that scale the Lydian Flat Seventh. | Verified |
| maj9, add9, maj13 | 1 | Lydian | as major (italianpiano, wikipedia-chord-scale) | Extensions of the major chord whose every tone is in the same Lydian scale, the same reasoning that ships 9 and 13 with the dominant. | Verified (by extension) |
| m9, m11, m13 | ♭3 | Lydian | as minor 7 (italianpiano, gct-f-lydian) | Extensions of the minor 7 chord whose every tone is in the same Lydian scale. | Verified (by extension); the minor 7 book check also covers these |

A second research round (search only) did **not** reach two sources for:
- **7♯5:** one forum example uses Auxiliary Augmented.
- **7♭9 and 7♯9:** the sources contradict each other.
- **dim7:** Lydian Diminished vs Auxiliary Diminished.
- **m7♭5, altered, minor-major 7, m6, dim and 7sus4:** no source tying them to Russell's system.

## Learn tab (2026-11-23)

| Claim in Learn | Sources | Verdict |
|---|---|---|
| The nearest seven tones stack in fifths; near and far tones (§1) | french-2018, mcclimon | Agree |
| Ingoing ↔ outgoing as the seven principal scales from Lydian to Auxiliary Diminished Blues (§2) | mcclimon, french-2018 | Agree. The four "Ideas" are practice suggestions, labelled as such, not claims about Russell. |
| Minor 7 leans to the Lydian tonic a minor third up; same notes as Dorian from the root (§3) | italianpiano, wikipedia-mode | As in the chord table |
| ii and V both live in the Lydian scale a whole step below V; the passage leans to I (§4) | italianpiano, cafesaxophone | As in the chord table |
| Leading tone rises by half step; chordal seventh falls by step (§5) | geneseo-dominant-seventh, harmony-musicianship-lt7 | Agree |
| Harmonic rhythm = how often chords change; it often speeds up toward cadences (§5) | wikipedia-harmonic-rhythm, britannica-harmonic-rhythm | Agree |
| Pedal point: a held bass note under changing chords, which may lie outside them (§5) | wikipedia-pedal-point, puget-sound-pedal | Agree |
| Inversion: a chord tone other than the root in the bass; C/E is first inversion (§5) | omt-inversion, wikipedia-first-inversion | Agree |
| Classical view hears lines and resolutions; Russell hears centres (§6) | geneseo-dominant-seventh, italianpiano, french-2018 | Summary of the rows above |

| Order of tonal gravity beyond the first seven (§1 wording) | french-2018, mcclimon | Only the first seven are stacked fifths; positions 8–11 are inferred (see "Scales and gravity" above). §1 now says so. |

**Open question:** when the bass lies outside the chord's parent scale (D/C: C is not in D Lydian), no source says how Russell analyses it. The app keeps the chord's own parent and says so in Practice. This is for the book check.

The bass note never changes the Lydian analysis in this app. No source found treats inversions differently in Russell's system; if the book does, this is the place to record it.

## Russell's Chart A: nine more chord types (2026-11-24)

**How this was checked:** two independent reproductions of Russell's own
tables, both read in full this time (not search summaries):

- **french-chart-a:** Andy French, Part 6, reproduces **Chart A** from the
  4th edition's inside cover. Chart A lists the principal and sub-principal
  chordmodes for every mode of all seven principal scales.
- **mcclimon:** McClimon's SMT slides quote Russell's table of **primary
  modal tonics** (p. 29). It says which Lydian degree each chord family
  sits on. The slides also reproduce Mark Levine's minor-scale harmony
  table.

Every row was also checked by pitch: the chord's notes lie in the parent
scale on all 12 roots (`tests/chords.test.mjs`).

**Rule for chords with more than one home (David, 2026-11-24):** where
Chart A lists a chord in more than one scale, the app uses the **most
ingoing** one, nearest plain Lydian in the order of the seven principal
scales. This is the app's convention, not Russell's statement; it matches
how dominant 7 already works (G7 → F Lydian, not G Lydian ♭7). The other
homes still appear in the chord's ladder, and the app's Reference table
names them in a Note column.

| Quality | Tonic | Parent | Chart A cell | Second source | Verdict |
|---|---|---|---|---|---|
| minor 6 | ♭3 | Lydian | Lydian VI "min 6th" | mcclimon: p. 29, VI = "minor and altered minor chords" | Verified |
| half-diminished (m7♭5) | ♭5 or ♯4, whichever spells the parent with fewer accidentals | Lydian | Lydian +IV "min 7th ♭5" | mcclimon: p. 29, +IV = "minor seventh ♭5" | Verified |
| diminished triad | ♭5 / ♯4 | Lydian | Not named. It is m7♭5 without the 7th (Lydian +IV). | — | **Inferred**: David chose on 2026-11-24 to ship it so labelled. Its cited sources name m7♭5, not the triad. |
| 7♯5 | 3 or ♭4, fewer accidentals | Lydian Augmented | LA +V "7th +5"; **also** LD VII, L♭7 II and Aux Aug II, +IV, +V | mcclimon: p. 29, +V = "seventh +5 chords" | Verified; other homes named |
| altered (7alt) | 3 or ♭4 | Lydian Augmented | LA +V: "7th +5 ♭9", "+9 +11", "7th +5 +9", "7th +5 +11" | mcclimon: p. 29, +V = "seventh +5 chords" fixes the tonic. Levine's table confirms the notes (the altered chord is VII of melodic minor) but not the tonic. | Verified |
| minor-major 7 | ♭3 | Lydian Augmented | LA VI "min +7"; **also** LD I "Dim Maj 7th" | mcclimon: p. 29, VI = "minor and altered minor chords" fixes the tonic. Levine (CmM7 = C melodic minor = E♭ Lydian Augmented) confirms the notes. | Verified; second home named |
| diminished 7 | ♭5 / ♯4 | Lydian Diminished | LD +IV "Dim tetrachord"; **also** Aux Dim +IV | italianpiano: Russell derives the diminished seventh chord from Lydian Diminished. It names no mode, and may be reading "Dim Maj 7th" (see below). | Verified on the scale; **the tonic waits for the book check**, and the app says so |
| 7♭9 | ♭7 | Lydian Diminished | LD II "7th ♭9"; **also** LD VII and the auxiliary diminished scales | mcclimon: p. 29, II = "seventh and altered seventh chords" | Verified; other homes named |
| 7♯9 | ♭7 | **Auxiliary Diminished** | Aux Dim II "7th +9 +11"; **also** LD VII "7th +9" | mcclimon: p. 29 puts altered sevenths on **II** | Verified on the home **both** sources share. The two-source rule outranks the most-ingoing convention here. The app names the Lydian Diminished home. |

**Russell's naming trap:** on Chart A, "Dim Maj 7th" (Lydian Diminished I)
means 1 ♭3 5 7, a minor-major seventh, not a diminished seventh chord.
italianpiano's "diminished seventh from Lydian Diminished" may come from
this name. This is one more reason for the book check.

**Book check wanted:**
- 7♯9: confirm or correct.
- The diminished triad.
- Whether Russell has a principal home for chords Chart A lists twice.

David Baker's *Techniques of Improvisation, Vol. 1: The Lydian Chromatic
Concept* (Russell's former sideman) would make a strong second source.

## Voicings (2026-11-24)

**How this was checked:** Wikipedia's "Voicing (music)", "Quartal and
quintal harmony" and "Tone cluster" articles were read in full. The other
rows rest on search summaries of the pages, as in the earlier rounds. The
definitions are written in my own words in `public/js/theory/voicings.js`;
nothing is copied.

| Voicing | Definition used | Sources | What they say | Verdict |
|---|---|---|---|---|
| Close | The four tones as compact as possible, inside an octave | wikipedia-voicing, tjps-close | "close position (the most compact voicing)"; four-way close = a four-note close-position chord | Verified |
| Drop 2 | From a four-note close voicing, the 2nd voice from the top moves down an octave | wikipedia-voicing, pianogroove-drop2 | "A drop-2 voicing lowers the second voice by an octave"; begin with a 4-note closed voicing, drop the 2nd note from the top an octave | Verified |
| Drop 3 | Same, with the 3rd voice from the top | wikipedia-voicing, bonedo-drop3 | Voices are numbered from the top, and "drop-3" lowers the third; drop 3 drops the third-highest note | Verified |
| Drop 2 & 4 | Same, with the 2nd and 4th voices | wikipedia-voicing | Gives the four drop-2-and-4 voicings of G7; no second source defines it | **Waiting for sources** |
| Spread | — | pianogroove-spread, (open position: wikipedia-voicing) | One source: root with 3rd and 7th spread apart; another: any tones spaced wider than a third | **Sources differ**, so not shipped |
| Quartal | Four notes stacked in fourths, using the parent scale's tones (a fourth may be augmented where the scale has it) | wikipedia-quartal, pianogroove-quartal | Quartal harmony is built mainly from fourths rather than thirds; quartal comping voicings for jazz piano | Verified |
| Cluster | Four parent-scale tones in consecutive steps (seconds), spanning no more than a fifth, holding **one** of the 3rd and 7th: here the 3rd, from the step below it | pianogroove-cluster, pianowithjonny-cluster | Built from seconds, usually within a fifth; clusters don't contain both the 3rd and 7th. Sizes differ (three notes in one source, more in the other); the app uses four | Verified (the size is the app's choice) |
| Rootless A / B | A: 3–5–7–9; B: 7–9–3–5. On dominant chords the 13th replaces the 5th (A: 3–13–7–9; B: 7–9–3–13). Only on major 7, minor 7 and dominant chord families | pianowithjonny-rootless, tjps-rootless | Type A 3-5-7-9, Type B 7-9-3-5; B is A with the bottom two notes moved to the top; dominants commonly use the 13th for the 5th | Verified |

**The app's own conventions** (no source states them; labelled as such):
- **Four tones for drop voicings:** a chord with four distinct tones uses
  them; a triad doubles its root; a larger chord keeps, in this order, the
  3rd, the 7th (or 6th), the extensions from the top down, then the 5th, then
  the root. The bass note sounds the root anyway.
- **Extra notes** (9ths, 13ths, the steps of a cluster, the fourths of a
  quartal stack) come from the chord's Russell parent scale (David's
  decision).
- **Placement:** inside C3–B4, with the top note as near G4 as possible.

## Gravity reading from a chosen centre (2026-11-24)

| Claim | Basis | Verdict |
|---|---|---|
| The order of tonal gravity (1 5 2 6 3 7 ♯4 ♯5 ♭3 ♭7 4 ♭2) ranks tones from a Lydian tonic | french-2018, mcclimon (see "Scales and gravity") | As shipped since #1 |
| The Voicings card counts those ranks **from the drone note**, whatever it is | **The app's convention (David's modal lens, 2026-11-24).** Russell counts from the Lydian tonic; treating another note as the centre is like asking "what if this note were the Lydian tonic?". No source states it, and the card never replaces Russell's own analysis, which stays shown | App convention, labelled |
| "Heard from G, the parent scale sounds as G Mixolydian" | The mode name of the parent scale's notes started on the centre: the major-mode rotation rule already sourced (wikipedia-mode, berklee-modes) | As the mode names |
| Ranks 1–7 read as "inside" | The first seven ranks are the Lydian scale (french-2018, mcclimon) | Agree |

## Voice leading (2026-11-24)

**How this was checked:** textbooks and teaching sources first (David,
2026-11-24: "better sources than Wikipedia before going to Wiki"). The rows
rest on search summaries of these pages; Wikipedia's "Voice leading" and
"Parallel harmony" agree but are not cited.

| Way in | Definition used | Sources | What they say | Verdict |
|---|---|---|---|---|
| Smooth | Each of the four voices moves to a tone of the next chord by the smallest total motion; common tones stay; voices don't cross | rwu-part-writing, harmony-musicianship-common-tone | Two open textbooks: keep the common tone in its voice and move the other voices to the nearest chord tones of the next chord | Verified |
| Same shape (planing) | Same chord type: the whole shape moves in parallel by the root interval. A different chord type: the same voicing type of the next chord, placed nearest | hutchinson-planing, learnmusictheory-planing | Hutchinson: parallelism, or planing, moves every voice of a chord in parallel (Debussy, Ravel). Feezell: whole chords moving in parallel; chromatic planing keeps the exact intervals, diatonic planing follows a scale | Verified. Exact parallel motion = chromatic planing; "same voicing type" when the chord type changes is the app's reading of the looser, diatonic kind |

**The app's conventions** (labelled as such):
- **Smooth tie-breaks:** the smaller largest single move, then the lower
  result.
- **"Toward home / away":** compares each voice's gravity rank, counted from
  each chord's own drone note (David's lens). A held note "stays", with its
  rank change shown.
- **Smooth covers the next chord's four tones by the drop-voicing
  convention** (`fourTones`).

## Sources differ, or not enough found

These ship as `pending`: the app refuses them and lists them in Reference.

| Quality | Why it's pending |
|---|---|
| 7sus4 | Chart A names no sus chord. Its open, pentatonic sound (David's point) fits several Lydian tonics at once: D7sus4 (D G A C) lies in C Lydian (II), F Lydian (VI) and B♭ Lydian (III). |

## Not yet used

The four horizontal scales: sources mention them ("Seven Principal Scales and Four Horizontal Scales") but don't agree on the details, so the glossary describes the idea without listing them.
