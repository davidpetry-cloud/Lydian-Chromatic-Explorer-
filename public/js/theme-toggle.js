// The light/dark theme button in the header.
export function mountThemeToggle(button, root = document.documentElement) {
  if (!button) return;
  function paint() {
    const light = root.getAttribute('data-theme') === 'light';
    const label = light ? 'Switch to dark theme' : 'Switch to light theme';
    button.setAttribute('aria-label', label);
    button.setAttribute('title', label);
    button.firstElementChild.textContent = light ? '☾' : '☀';
  }
  button.addEventListener('click', () => {
    const next = root.getAttribute('data-theme') === 'light' ? 'dark' : 'light';
    root.setAttribute('data-theme', next);
    try { localStorage.setItem('lce.theme', JSON.stringify(next)); } catch (e) { /* storage off: theme lasts this visit */ }
    paint();
  });
  paint();
}
