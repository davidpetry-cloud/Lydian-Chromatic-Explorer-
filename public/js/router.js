// Maps the URL hash to one of the three views. Unknown hashes go to Practice.
export const VIEWS = Object.freeze(['practice', 'gravity', 'reference']);

export function viewFromHash(hash) {
  const name = String(hash ?? '').replace(/^#/, '').toLowerCase();
  return VIEWS.includes(name) ? name : 'practice';
}
