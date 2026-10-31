/**
 * storage.js
 * Tanggung jawab: operasi baca/tulis localStorage untuk transaksi.
 * Key utama diambil dari schema.js agar konsisten dengan migrasi.
 * Error localStorage (quota exceeded, corrupted data) ditangani dengan graceful fallback.
 */

import { KEY_TX } from './schema.js';

// ─── Internal helpers ─────────────────────────────────────────────────────────

/**
 * Coba tulis ke localStorage.
 * Jika quota exceeded, hapus key yang ada lalu coba lagi sekali.
 * @param {string} key
 * @param {string} value
 * @throws {Error} jika tetap gagal setelah retry
 */
function safeSetItem(key, value) {
  try {
    localStorage.setItem(key, value);
  } catch (err) {
    // QuotaExceededError — coba bersihkan key yang sama dan retry
    if (err.name === 'QuotaExceededError' || err.code === 22) {
      try {
        localStorage.removeItem(key);
        localStorage.setItem(key, value);
      } catch {
        throw new Error('localStorage penuh. Hapus beberapa transaksi lama untuk melanjutkan.');
      }
    } else {
      throw err;
    }
  }
}

// ─── Public API ───────────────────────────────────────────────────────────────

/**
 * Membaca semua transaksi dari localStorage.
 * Jika data korup, kembalikan array kosong (tidak crash).
 * @returns {Array<Object>}
 */
export function loadTransactions() {
  try {
    const raw = localStorage.getItem(KEY_TX);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    // Validasi bahwa hasilnya array
    if (!Array.isArray(parsed)) {
      console.warn('[storage] Data transaksi bukan array, direset ke []');
      return [];
    }
    return parsed;
  } catch (err) {
    console.warn('[storage] Data transaksi korup, direset ke []:', err.message);
    return [];
  }
}

/**
 * Menyimpan seluruh array transaksi ke localStorage.
 * @param {Array<Object>} transactions
 * @throws {Error} jika localStorage penuh dan tidak bisa di-recover
 */
export function saveTransactions(transactions) {
  safeSetItem(KEY_TX, JSON.stringify(transactions));
}
