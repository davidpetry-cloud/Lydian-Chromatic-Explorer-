// Maps the URL hash to one of the three views. Unknown hashes go to Practice.
export const VIEWS = Object.freeze(['practice', 'gravity', 'learn', 'reference']);

/** True only for hashes that name a view, so other anchors (like #main) don't switch views. */
export const isViewHash = (hash) => VIEWS.includes(String(hash ?? '').replace(/^#/, '').toLowerCase());

export function viewFromHash(hash) {
  const name = String(hash ?? '').replace(/^#/, '').toLowerCase();
  return VIEWS.includes(name) ? name : 'practice';
}
