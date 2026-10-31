/**
 * darkmode.js
 * Tanggung jawab: dark mode toggle + sinkronisasi preferensi sistem.
 *
 * Preferensi: 'system' | 'on' | 'off'  — disimpan di KEY_DARK_MODE.
 * Class 'dark' ditambahkan ke <html> saat dark mode aktif.
 */

import { KEY_DARK_MODE } from './schema.js';

// ─── Core ─────────────────────────────────────────────────────────────────────

/** Baca preferensi dari localStorage */
export function getDarkPref() {
  return localStorage.getItem(KEY_DARK_MODE) ?? 'system';
}

/** Simpan preferensi */
export function setDarkPref(pref) {
  localStorage.setItem(KEY_DARK_MODE, pref);
  applyDarkMode();
}

/**
 * Terapkan dark mode ke <html> berdasarkan preferensi.
 * Dipanggil saat init dan setiap kali preferensi berubah.
 */
export function applyDarkMode() {
  const pref    = getDarkPref();
  const sysDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
  const isDark  = pref === 'on' || (pref === 'system' && sysDark);

  document.documentElement.classList.toggle('dark', isDark);
  updateToggleButton(pref);
}

/** Perbarui label/ikon tombol toggle */
function updateToggleButton(pref) {
  const btn = document.getElementById('btn-dark-toggle');
  if (!btn) return;
  const labels = { system: 'Sistem', on: 'Gelap', off: 'Terang' };
  btn.textContent = labels[pref] ?? labels.system;
}

/**
 * Rotasi: system → on → off → system
 */
export function cycleDarkPref() {
  const cur  = getDarkPref();
  const next = cur === 'system' ? 'on' : cur === 'on' ? 'off' : 'system';
  setDarkPref(next);
}

/**
 * Inisialisasi: terapkan mode saat ini dan pasang listener perubahan sistem.
 */
export function initDarkMode() {
  applyDarkMode();
  window.matchMedia('(prefers-color-scheme: dark)').addEventListener('change', () => {
    if (getDarkPref() === 'system') applyDarkMode();
  });
}
