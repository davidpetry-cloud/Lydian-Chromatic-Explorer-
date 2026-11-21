// The only place that touches localStorage. Values are JSON. Every access is
// wrapped, so a private window or blocked storage never breaks the app.
export function readPref(key, fallback) {
  try {
    const raw = globalThis.localStorage?.getItem(key);
    return raw == null ? fallback : JSON.parse(raw);
  } catch {
    return fallback;
  }
}

export function writePref(key, value) {
  try {
    globalThis.localStorage.setItem(key, JSON.stringify(value));
    return true;
  } catch {
    return false;
  }
}
