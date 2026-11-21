# Security

## What protects this app

Every page is served with these headers (set in `public/_headers`):

| Header | Value | What it means |
|---|---|---|
| Content-Security-Policy | `default-src 'self'; script-src 'self'; style-src 'self'; connect-src 'none'; frame-ancestors 'none'; …` | Only this app's own script, style and font files load. No inline scripts, `onclick=` attributes or inline styles run. The page can't send data anywhere, and no other site can frame it. |
| Permissions-Policy | `camera=(), microphone=(), geolocation=(), payment=(), usb=(), midi=()` | Device features are off. |
| X-Content-Type-Options, Referrer-Policy, Cross-Origin-Opener-Policy | `nosniff`, `strict-origin-when-cross-origin`, `same-origin` | Standard hardening. |

The app uses no cookies, accounts, analytics or trackers, makes no network
requests and collects no personal data. It keeps three preferences in your
browser's `localStorage` (theme, last chord, volume), and works without them.

Sound starts only when you press a button, is always shown on screen and
in text, and stops on its own after 20 minutes without input or when you
switch tabs.

## How it's tested

`npm test` runs the policy checks (`tests/policy.test.mjs`) and browser
tests (`tests/e2e.test.mjs`) that serve the app under these exact headers.

## Reporting a vulnerability

Please report security problems privately, not in a public issue: use
**"Report a vulnerability"** under this repository's **Security** tab, or
contact David Petry through https://david-petry.netlify.app/.
