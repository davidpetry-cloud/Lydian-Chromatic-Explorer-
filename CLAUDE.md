# Instructions for working on the Lydian Chromatic Explorer

A static practice app (plain HTML, CSS and JavaScript modules, no build
step) served from `public/` on Cloudflare Workers
(https://lydian-chromatic-explorer.davidpetry.workers.dev/). Design:
`docs/superpowers/specs/2026-11-21-lydian-chromatic-explorer-design.md`.

- Run `npm test` before every commit: unit tests (`node --test`) plus
  Playwright tests that run the app under the real security headers.
- Look: use the tokens in `public/css/tokens.css` (copied from David
  Petry's site). Style in `public/css/app.css`; no inline styles.
- Licensing (see `LICENSE`): code is PolyForm Noncommercial 1.0.0 with a
  `Required Notice` line to keep intact; the wording is all rights
  reserved. Record new third-party code or assets in
  `THIRD-PARTY-NOTICES.md`.
- Never copy text, charts or diagrams from Russell's book. Explain in
  original words and cite it.

## Theory accuracy

- Cite a source for every music-theory claim, and where sources disagree,
  say so rather than guessing.
- Scales and the gravity order are computed from intervals in
  `public/js/theory/`; never hand-write note lists.
- Any change to theory data needs a source per row in
  `docs/theory-sources.md`. A chord quality ships only when two
  independent sources agree (`status: 'verified'`); where sources differ,
  say so in the app rather than guessing.

## Security by default

- `public/_headers` sets a strict policy: `script-src 'self'`,
  `style-src 'self'`, `connect-src 'self'`, `frame-ancestors 'none'`, and
  a Permissions-Policy that turns off devices. Keep it that strict.
- No inline `<script>`, `on…=` attributes, `<style>` blocks or `style=""`.
  Scripts go in `public/js/`; wire events with `addEventListener`.
- The only network requests are the app's own piano recordings
  (`public/audio/piano/`, fetched by `public/js/audio/piano.js` on the
  first press). Never fetch from another site; data lives in JS modules.
  `localStorage` only via
  `public/js/prefs.js`, and the app must work without it.
- Sound starts only after a user press, shows its state on screen and in
  text, and stops on its own: loops and drones fade out after "Stop
  after" (default 30 s), and everything stops after 20 minutes idle or
  when the tab is hidden. Stop cancels a press still waiting for the piano.
- MIDI (`public/js/input/midi-input.js`): connects only after the Connect
  button is pressed, asks for notes only (no SysEx), shows a clear
  "Listening" state, stops after 20 quiet minutes, and refuses inside
  another site's frame. `_headers` allows `midi=(self)` and nothing wider.
- Before merging a new screen, run the accessibility-review and
  security-review skills and fix what they find. See `SECURITY.md`.

## Hosting

- This app is hosted on Cloudflare Workers (free), not Netlify: David's
  Netlify site is on the Free plan, where each production deploy costs
  15 of 300 monthly credits. Never add Netlify config here.
