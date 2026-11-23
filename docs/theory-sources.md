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

## Sources differ, or not enough found

These ship as `pending`: the app refuses them and lists them in Reference.

| Quality | Provisional idea | Why it's pending |
|---|---|---|
| diminished 7 | Lydian Diminished (italianpiano) *or* Auxiliary Diminished (the plan, via the whole-half scale) | italianpiano says Russell derives the diminished seventh chord from Lydian Diminished; no second source. |
| 7♯5 | Auxiliary Augmented on the root | The whole-tone scale is described, but no source links the chord to Russell's parent. |
| 7♭9, 7♯9 | Auxiliary Diminished Blues on the root | As above. |
| minor-major 7 | Lydian Diminished on the root | A search found no source tying it to Lydian Diminished. |
| minor 6, half-diminished, diminished, 7sus4, altered | — | No source found. |

## Not yet used

The four horizontal scales: sources mention them ("Seven Principal Scales and Four Horizontal Scales") but don't agree on the details, so the glossary describes the idea without listing them.
