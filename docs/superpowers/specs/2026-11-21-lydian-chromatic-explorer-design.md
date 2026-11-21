# Lydian Chromatic Explorer — design

Date: 2026-11-21 · Owner: David Petry · Status: draft for approval

## 1. Intent

An interactive, exploratory practice app built on George Russell's *Lydian
Chromatic Concept of Tonal Organization* (LCC). It answers one practical
question for a player: **"Over this chord, what can I play, and how far
inside or outside does it sit?"** It pairs a hands-on explorer with a
searchable reference in the same app.

**Who it's for:** improvisers and composers practicing the concept,
including David. They know chord symbols; they don't need music basics
explained, but they do need LCC terms explained.

**Success after ten minutes:** a player can enter any common chord, name
its Lydian tonic and parent scale, hear and see the principal scales
ranked from ingoing to outgoing, and practice one of them over a drone.

## 2. Goals, non-goals, anti-goals

**Goals**
- Chord in → Lydian tonic, parent scale and ranked principal scales out,
  each heard, seen and described in text.
- An explore view of tonal gravity: the twelve tones ordered outward from
  a Lydian tonic by stacked fifths, clickable and audible.
- Practice tools: a drone or looped chord at a set tempo, with scale playback.
- A searchable reference (glossary plus chord-to-tonic table) inside the app.
- WCAG 2.2 AA, with every sound also shown visually and in text.

**Non-goals for v1**
- No MIDI input (but the input code leaves a seam for it, section 6.6).
- No microphone or pitch detection.
- No accounts, sync, analytics, cookies or network requests.
- No notation engraving (no staff rendering) in v1.
- Not a full course on LCC; it explains terms, it doesn't teach the book.

**Anti-goals (failure even if it "works")**
- Theory stated confidently but wrongly. Every scale and mapping must
  trace to a cited source (section 7).
- Information that exists only as sound, or only as colour.
- Copying the book's text, charts or diagrams. Explain in original words,
  compute the scales from intervals, cite the book.
- Anything that spends Netlify credits.

## 3. Constraints

- **Repository:** `davidpetry-cloud/Lydian-Chromatic-Explorer` (the
  session knows it by its earlier name, `Lydian-Chromatic-Explorer-`;
  GitHub redirects). Separate from `david-petry-site`.
- **Hosting:** Cloudflare Pages (free plan: 500 builds a month), connected
  to the repo. No build command; output directory `public/`. Pull requests
  get preview deploys.
- **Stack (chosen: approach A):** plain HTML, CSS and JavaScript ES
  modules. No framework, no build step, no runtime dependencies.
- **Security, carried over from the site's standing rules:**
  - A `public/_headers` file sets a strict CSP: `default-src 'self';
    script-src 'self'; style-src 'self'; img-src 'self' data:; font-src
    'self'; connect-src 'none'; media-src 'self'; object-src 'none';
    base-uri 'self'; form-action 'none'; frame-ancestors 'none'`, plus
    `X-Content-Type-Options`, `Referrer-Policy`,
    `Cross-Origin-Opener-Policy` and a `Permissions-Policy` that turns off
    camera, microphone, geolocation, payment and USB (MIDI is turned on
    only when that feature ships).
  - No inline `<script>`, `on…=` attributes, `<style>` blocks or
    `style=""`. Scripts in `public/js/`, events via `addEventListener`.
  - Data lives in JS modules, not fetched JSON (`connect-src 'none'`).
  - `localStorage` only for preferences (theme, last chord, volume),
    wrapped in try/catch; the app works without it.
  - `SECURITY.md` documents these protections; Dependabot watches the
    GitHub Actions used by CI.
- **Look:** match David's site. Copy its colour tokens and self-hosted
  OFL fonts (Outfit, DM Mono, Cormorant Garamond) with their licence files.
  Dark theme default, plus a light theme and a toggle.
- **Licence:** same model as the site. Code under PolyForm Noncommercial
  1.0.0 with the Required Notice; content (wording, reference text) all
  rights reserved. Third-party items go in `THIRD-PARTY-NOTICES.md`.
- **Before merge:** run the accessibility-review and security-review
  skills and fix what they find.
- **Repo instructions:** add a `CLAUDE.md` carrying the rules above.

## 4. Approaches considered

| | Approach | Trade-off |
|---|---|---|
| **A (chosen)** | Plain HTML/CSS/JS modules, Web Audio, SVG | Smallest, no dependencies to patch, fits the strict CSP as is; UI wiring is by hand |
| B | Dart compiled to JS, like the site's metronome | Typed and familiar, but adds a build step and a heavier download, not needed at this size |
| C | Svelte/React + Vite + Tone.js | Ready-made parts, but dependencies, a build step and the largest surface to keep secure |

David picked A.

## 5. What David decided

- Audience: players practicing (improvisers and composers).
- Input: click or type a chord first; MIDI later.
- One app with the reference inside it, not two apps.
- Own repo; Cloudflare Pages; no Netlify credits.
- Approach A.

## 6. The design

### 6.1 Screens and layout

One page with three views reached by a tab bar (links that update the URL
hash, so each view can be bookmarked and the back button works):

1. **Practice** (default)
2. **Gravity** (explore view)
3. **Reference**

```
┌ Lydian Chromatic Explorer ─────── Practice · Gravity · Reference ┐
│ Chord [ C ▾ ][ maj7 ▾ ]  or type [ Cmaj7      ]   ▶ Play ◉ Drone │
│ Lydian tonic: C · parent: C Lydian (C D E F♯ G A B)              │
│ in ●●●●●●●○○○○○ out                                              │
│ Scales over this chord, ingoing → outgoing                       │
│  [1 Lydian ▶] [2 Lydian Augmented ▶] [3 …]                        │
│ ┌ keyboard: scale tones lit + named, chord tones ringed ┐        │
│ Now playing: C Lydian, ascending, 80 bpm   (text + visual pulse) │
└──────────────────────────────────────────────────────────────────┘
```

Phones: one column, the keyboard scrolls sideways inside its own box
(never the page), tap targets at least 44 px.

### 6.2 Practice view

- **Chord input:** a root picker (12 roots, with sharps and flats
  available) and a quality picker, kept in step with a text field that
  parses chord symbols. v1 qualities: maj, maj7, 6, 6/9, maj7♯11, m,
  m7, m6, m(maj7), 7, 9, 13, 7♯11, 7sus4, m7♭5, dim, dim7, aug, maj7♯5,
  7♯5, 7♭9, 7♯9, 7alt. Qualities whose LCC mapping can't be verified
  are left out of v1 rather than guessed.
- Accepted spellings include `Cmaj7`, `CΔ7`, `CM7`, `C-7`, `Cm7`, `Cø`,
  `C°7`, `Bb7`, `B♭7`. Unknown input gives a plain message and keeps the
  last good chord.
- **Result panel:** Lydian tonic, parent scale with spelled note names,
  and the chord's tones shown inside that scale.
- **Scale ladder:** the principal scales that hold the chord, ordered
  ingoing → outgoing. Each card shows name, notes, intervals from the
  Lydian tonic, and a play button.
- **Keyboard:** two octaves in SVG; scale tones filled and named, chord
  tones ringed (shape plus colour, never colour alone). Clicking a key
  plays that note.
- **Practice controls:** drone (Lydian tonic + fifth) or a looped chord;
  tempo 40–200 bpm; scale up, down or up-and-down; volume; stop. Sound
  starts only after a press, and stops on its own after 20 minutes
  without input, or when the tab is hidden.

### 6.3 Gravity view (explore)

- A circle of the twelve tones arranged by stacked fifths from the
  current Lydian tonic, with the Lydian Chromatic order of tonal gravity
  shown as a numbered path (1 = tonic, out to 12).
- Clicking a tone plays it against a tonic drone and shows a short
  plain-words note on its relation to the tonic.
- Arrow keys move around the circle; a picker changes the tonic.
- A toggle overlays any principal scale's tones on the circle.

### 6.4 Reference view

- **Search box** filtering two lists as you type.
- **Glossary:** about 15–25 LCC terms (Lydian tonic, tonal gravity,
  parent scale, ingoing/outgoing, vertical/horizontal, the seven
  principal scales and the horizontal scales, and so on), each two to
  four sentences in original wording, with a "see in Practice" or "see in
  Gravity" link.
- **Chord table:** each supported quality → Lydian tonic (as an interval
  from the root) → parent scale, with an example in C.
- **Sources:** full citation of Russell, *Lydian Chromatic Concept of
  Tonal Organization*, 4th ed. (Brookline, MA: Concept Publishing, 2001),
  plus the secondary sources used.

### 6.5 Sound

- Web Audio API only: oscillators with a short envelope and a gentle
  low-pass filter, one master gain. No sample files, so nothing to
  license. Equal temperament, A4 = 440 Hz.
- A look-ahead scheduler (Web Audio clock) keeps loops steady.
- Every sound event is also shown: the sounding key lights up, the
  ladder card pulses (or stays outlined under `prefers-reduced-motion`),
  and a polite live region names what's playing ("C Lydian, ascending,
  80 bpm").

### 6.6 Code structure

```
public/
  index.html
  _headers
  css/tokens.css  css/app.css
  fonts/…         (copied from the site, with OFL files)
  js/
    main.js        boot, view routing (hash), preferences
    theory/
      notes.js     pitch classes, spelling, intervals
      scales.js    the principal scales as interval sets from the tonic
      gravity.js   order of tonal gravity; ranking ingoing → outgoing
      chords.js    chord-symbol parser + quality → Lydian tonic mapping
    audio/
      engine.js    AudioContext, voices, master gain, auto-stop
      scheduler.js look-ahead loop for drone, chord loop, scale runs
    input/
      chord-input.js  pickers + text field; emits "chord" events
                      (MIDI will be a second source of the same events)
    views/
      practice.js  gravity.js  reference.js  keyboard.js
    data/
      glossary.js  sources.js
tests/            node:test unit tests + one Playwright smoke test
docs/             this design, later the plan
```

`theory/` is pure functions with no DOM and no audio, so all the theory
can be unit-tested.

### 6.7 Testing and CI

- `node --test` unit tests for the theory modules. The scale and mapping
  tables are tested against hand-written expected values taken from the
  sources (section 7), so a wrong change fails loudly.
- One Playwright smoke test: loads the page, enters `Cmaj7`, checks the
  result and that no CSP violations were logged.
- GitHub Actions runs both on each pull request (free for public repos).

### 6.8 Accessibility and the senses

- **Hearing:** the main channel, never the only one.
- **Sight:** everything heard is also shown; colour always comes with a
  shape or label; contrast AA in both themes.
- **Text:** every sound and diagram has a text equivalent (live region,
  SVG `<title>` and `<desc>`, a table version of the circle).
- **Touch:** targets of at least 44 px; no hover-only features; no drag
  required (drag optional, keys and taps always work).
- **Keyboard:** all controls reachable; arrow-key navigation on the
  keyboard and circle; visible focus; a skip link.
- **Motion:** honour `prefers-reduced-motion`; no flashing over three
  times a second.
- Taste and smell don't apply.

## 7. Theory accuracy

The structure follows Russell's 4th edition as reported by secondary
sources (Andy French's walkthrough citing p. 14; The Jazz Piano Site;
Wikipedia). Seven principal (vertical) scales: Lydian, Lydian Augmented,
Lydian Diminished, Lydian Flat Seventh, Auxiliary Augmented, Auxiliary
Diminished, Auxiliary Diminished Blues; the first four of Lydian
derivation, the last three auxiliary. Sources differ on some names
(for example "Lydian Flat Seventh" vs "Lydian Dominant") and on the
horizontal scales.

Before any theory ships:
1. Each scale's interval set, the order of tonal gravity, and each chord
   quality's Lydian tonic are written into one data table with a source
   per row.
2. Rows confirmed by two independent sources go in. Rows that sources
   disagree on are flagged and checked against the book; if that's not
   possible, they're left out or marked "sources differ" in the app.
3. The book's names for terms are used; other names are listed as
   alternatives in the glossary.

## 8. Left to the builder

- Synth timbre, envelope and mix levels.
- Exact layout, spacing and animation within the site's tokens.
- Which glossary terms make the first cut, within the list above.
- Keyboard range and labels on very narrow screens.
- Wording of messages and empty states (playful, inviting, like David's
  site).

## 9. Open items

- **Book check:** does David own the 4th edition, to confirm the data
  table in section 7? If not, rows where sources disagree are flagged.
- **Cloudflare account:** David creates a free account and connects the
  repo; Claude can't do this.
- **Linking from david-petry.netlify.app:** a later site change, folded
  into a regular site update to spend only one deploy.
