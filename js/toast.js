/**
 * toast.js
 * Tanggung jawab: tampilkan notifikasi toast non-blocking di sudut layar.
 * Tidak bergantung pada modul lain — bisa diimpor di mana saja.
 */

let _container = null;

/**
 * Inisialisasi container toast. Dipanggil sekali dari app.js.
 */
export function initToast() {
  if (_container) return;
  _container = document.createElement('div');
  _container.id = 'toast-container';
  _container.setAttribute('aria-live', 'polite');
  _container.setAttribute('aria-atomic', 'false');
  _container.style.cssText = [
    'position:fixed',
    'bottom:5rem',           // di atas bottom nav
    'right:1rem',
    'z-index:50',
    'display:flex',
    'flex-direction:column',
    'gap:0.5rem',
    'max-width:calc(100vw - 2rem)',
    'pointer-events:none',
  ].join(';');
  document.body.appendChild(_container);
}

/**
 * Tampilkan toast.
 * @param {string} message
 * @param {'info'|'success'|'warning'|'error'} type
 * @param {number} duration  ms sebelum hilang (default 3500)
 */
export function showToast(message, type = 'info', duration = 3500) {
  if (!_container) initToast();

  const colors = {
    info:    'bg-blue-600  text-white',
    success: 'bg-green-600 text-white',
    warning: 'bg-yellow-500 text-gray-900',
    error:   'bg-red-600   text-white',
  };
  const icons = { info: 'ℹ', success: '✓', warning: '⚠', error: '✕' };

  const el = document.createElement('div');
  el.setAttribute('role', 'status');
  el.className = [
    'flex items-center gap-2 px-4 py-2.5 rounded-xl shadow-lg text-sm font-medium',
    'pointer-events-auto transition-all duration-300 opacity-0 translate-y-2',
    colors[type] ?? colors.info,
  ].join(' ');
  el.innerHTML = `<span aria-hidden="true">${icons[type] ?? icons.info}</span><span>${escapeHtml(message)}</span>`;

  _container.appendChild(el);

  // Animate in
  requestAnimationFrame(() => {
    requestAnimationFrame(() => {
      el.classList.remove('opacity-0', 'translate-y-2');
    });
  });

  // Animate out + remove
  const timer = setTimeout(() => removeToast(el), duration);
  el.addEventListener('click', () => { clearTimeout(timer); removeToast(el); }, { once: true });
}

function removeToast(el) {
  el.classList.add('opacity-0', 'translate-y-2');
  el.addEventListener('transitionend', () => el.remove(), { once: true });
}

function escapeHtml(str) {
  return String(str ?? '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
}
