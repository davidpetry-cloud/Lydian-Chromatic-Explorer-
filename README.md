# Lydian Chromatic Explorer

Pick a chord, meet its Lydian tonic, and hear the scales that sit over it,
from snugly ingoing to gloriously outgoing. Try it:
https://lydian-chromatic-explorer.davidpetry.workers.dev/ It's a practice tool for
improvisers and composers, built on George Russell's *Lydian Chromatic
Concept of Tonal Organization*.

- **Practice:** pick or type a chord (`Cmaj7`, `Dm7`, `G7`, `B♭6`…) to see
  its Lydian tonic and parent scale. All seven principal scales are laid out
  from ingoing to outgoing. Play any of them, with or without the tonic
  held underneath, or loop the chord or a drone. Got a MIDI keyboard?
  Press **Connect MIDI keyboard** and just hold the chord (Chrome, Edge or
  Firefox; Safari doesn't support MIDI).
- **Gravity:** the twelve tones placed round the circle of fifths and
  numbered by their pull toward the tonic. Walk them with the arrow keys
  and hear each one against home.
- **Learn:** six short, playable stops on tonal gravity: home and away,
  ingoing and outgoing, vertical and horizontal, voice leading and the bass
  (harmonic rhythm, inversions, pedal points), and Russell's view next to
  classical voice leading.
- **Reference:** a searchable glossary, the chord table, and the sources.

Type slash chords (`Cmaj7/E`, `Dm7/G`) to choose the bass note; the drone
plays that bass note by default (or the Lydian tonic, the root, or any note).

The sound is a recorded grand piano (the Salamander Grand Piano, CC BY 3.0).
Drones, chord loops and scale runs fade out after 30 seconds, or whatever
you choose under **Stop after**.

Every sound is also shown on screen and named in text, everything works
from the keyboard, and the app works on a phone.

## Run it locally

```bash
npm install
npm test
npm run serve
```

`npm run serve` prints a local address (port 8080). There is no build step:
the app is the `public/` folder.

## Live, and how it's hosted

**https://lydian-chromatic-explorer.davidpetry.workers.dev/**

It runs on Cloudflare Workers (free), connected to this repository: every
merge to `main` redeploys it. Cloudflare serves the `public/` folder and
applies `public/_headers`, so the live site has the same strict security
policy the tests check. To set it up again from scratch, go to Cloudflare →
**Workers & Pages** → **Create** → import this repository, with the build
command empty. `wrangler.jsonc` tells Cloudflare to serve `public/` and
enables a preview link for every pull request.

## About the theory

Scales and the order of tonal gravity are computed from intervals in
`public/js/theory/`. Every chord mapping traces to sources listed in
`docs/theory-sources.md`. Chords whose sources disagree are left out
rather than guessed. Explanations are original; the book is: George Russell,
*Lydian Chromatic Concept of Tonal Organization*, 4th ed. (Brookline, MA:
Concept Publishing, 2001).

## Licence

Code: PolyForm Noncommercial 1.0.0. Content: all rights reserved. See
`LICENSE` and `THIRD-PARTY-NOTICES.md`.
