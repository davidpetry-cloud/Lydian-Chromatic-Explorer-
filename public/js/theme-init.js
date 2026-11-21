// Applies the saved (or system) light/dark theme before first paint, so the
// page never flashes the wrong colours. Loaded in <head> as a classic script.
document.documentElement.classList.add('js');
(function () {
  var t;
  try { t = JSON.parse(localStorage.getItem('lce.theme')); } catch (e) { t = null; }
  if (t !== 'light' && t !== 'dark') {
    t = (window.matchMedia && matchMedia('(prefers-color-scheme: light)').matches) ? 'light' : 'dark';
  }
  document.documentElement.setAttribute('data-theme', t);
})();
