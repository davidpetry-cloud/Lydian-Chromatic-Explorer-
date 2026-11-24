# Third-party notices

The app's own code and content are licensed as described in `LICENSE`
(PolyForm Noncommercial 1.0.0 for the code; all rights reserved for the
content). It also uses the third-party components below, which keep their
own licences. Those licences apply only to these components.

## Fonts: SIL Open Font License 1.1

Self-hosted from `public/fonts/` (copied from David Petry's site). The full
licence text for each family is in `public/fonts/`.

| Font | Copyright | Licence file |
|---|---|---|
| Outfit | The Outfit Project Authors | `public/fonts/OFL-outfit.txt` |
| DM Mono | The DM Mono Project Authors | `public/fonts/OFL-dm-mono.txt` |
| Cormorant Garamond | The Cormorant Project Authors | `public/fonts/OFL-cormorant-garamond.txt` |

## Piano recordings: Creative Commons Attribution 3.0

`public/audio/piano/*.mp3` are from the **Salamander Grand Piano V3** by
Alexander Holm (a Yamaha C5), as mapped by the sfzinstruments project:
https://github.com/sfzinstruments/SalamanderGrandPiano (original:
https://archive.org/details/SalamanderGrandPianoV3). Licensed under
Creative Commons Attribution 3.0 Unported:
https://creativecommons.org/licenses/by/3.0/

**Changes made:** 25 notes (C, D♯, F♯ and A from C1 to C7) at velocity
layer 8 of 16; leading silence removed; trimmed to 8 seconds with a 1.5-second fade (the top notes are shorter, as recorded);
mixed to mono; level evened out about halfway between notes; encoded as
96 kbps MP3. The app also credits the recordings in its footer.

## Upright bass recordings: CC0 1.0 (public domain)

`public/audio/bass/*.mp3` are from **VSCO 2 Community Edition** by
Versilian Studios (solo contrabass, pizzicato):
https://github.com/sgossner/VSCO-2-CE. Dedicated to the public domain under
CC0 1.0 Universal; Versilian asks for credit, which the app gives in its
footer.

**Changes made:** 14 notes (`_v1_rr1`: E, F♯, G and A♯ in octave 1, then C to
B in octaves 2 and 3); leading silence removed; trimmed to 4 seconds with a
0.5-second fade; mixed to mono; raised by one gain for the whole set (loudest
peak 0.9); encoded as 96 kbps MP3, named by MIDI note.

## Playwright: Apache License 2.0 (development only)

Used only to run the browser tests in `tests/`. It is not part of the
published app. Copyright Microsoft Corporation.
https://github.com/microsoft/playwright/blob/main/LICENSE

## Sources

The music theory follows George Russell, *Lydian Chromatic Concept of
Tonal Organization*, 4th ed. (Brookline, MA: Concept Publishing, 2001),
explained in original words. See `docs/theory-sources.md`.
