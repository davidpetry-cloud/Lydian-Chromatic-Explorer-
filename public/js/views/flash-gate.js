// Limits visual flashes: never more than about three a second, and none at
// all when the viewer asks for reduced motion. Text still says what's playing.
const prefersReduced = () => globalThis.matchMedia?.('(prefers-reduced-motion: reduce)').matches ?? false;

export function createFlashGate({ minMs = 334, now = () => performance.now(), reducedMotion = prefersReduced } = {}) {
  let last = -Infinity;
  return function allow() {
    if (reducedMotion()) return false;
    const t = now();
    if (t - last < minMs) return false;
    last = t;
    return true;
  };
}
