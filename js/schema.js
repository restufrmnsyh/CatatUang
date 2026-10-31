/**
 * schema.js
 * Tanggung jawab: versi skema data localStorage dan migrasi antar versi.
 *
 * Versi:
 *   1 → key lama 'catat_uang_transactions', tidak ada cu_schema_version
 *   2 → key baru 'cu_transactions', tambah budget/savings/recurring/custom_cats
 *   3 → (reservasi untuk perubahan berikutnya)
 *
 * Fungsi migrate() dipanggil SEKALI saat aplikasi dibuka,
 * sebelum modul lain membaca data.
 */

const CURRENT_VERSION = 2;

const KEY_VERSION     = 'cu_schema_version';
const KEY_TX_OLD      = 'catat_uang_transactions';
const KEY_TX          = 'cu_transactions';
const KEY_BUDGETS     = 'cu_budgets';
const KEY_SAVINGS     = 'cu_savings';
const KEY_RECURRING   = 'cu_recurring';
const KEY_CUSTOM_CATS = 'cu_custom_categories';
const KEY_DARK_MODE   = 'cu_dark_mode';

// Re-export key constants agar modul storage dapat menggunakannya
export {
  KEY_TX,
  KEY_BUDGETS,
  KEY_SAVINGS,
  KEY_RECURRING,
  KEY_CUSTOM_CATS,
  KEY_DARK_MODE,
};

/** Baca versi skema saat ini dari localStorage */
function readVersion() {
  const v = localStorage.getItem(KEY_VERSION);
  return v ? parseInt(v, 10) : 0;
}

/** Tulis versi baru */
function writeVersion(v) {
  localStorage.setItem(KEY_VERSION, String(v));
}

/** Baca JSON dari localStorage, kembalikan defaultVal jika tidak ada atau gagal parse */
function readKey(key, defaultVal) {
  try {
    const raw = localStorage.getItem(key);
    return raw ? JSON.parse(raw) : defaultVal;
  } catch {
    return defaultVal;
  }
}

// ─── Migrasi ──────────────────────────────────────────────────────────────────

/** Migrasi v0→v1: hanya tandai versi (tidak ada perubahan struktur) */
function migrate0to1() {
  writeVersion(1);
}

/**
 * Migrasi v1→v2:
 * - Pindahkan data dari 'catat_uang_transactions' ke 'cu_transactions'
 * - Inisialisasi key baru dengan nilai kosong
 */
function migrate1to2() {
  const oldTx = readKey(KEY_TX_OLD, []);
  if (oldTx.length > 0 && !localStorage.getItem(KEY_TX)) {
    localStorage.setItem(KEY_TX, JSON.stringify(oldTx));
    // Jangan hapus key lama — biarkan sebagai cadangan
  }

  if (!localStorage.getItem(KEY_BUDGETS))     localStorage.setItem(KEY_BUDGETS,     JSON.stringify([]));
  if (!localStorage.getItem(KEY_SAVINGS))     localStorage.setItem(KEY_SAVINGS,     JSON.stringify([]));
  if (!localStorage.getItem(KEY_RECURRING))   localStorage.setItem(KEY_RECURRING,   JSON.stringify([]));
  if (!localStorage.getItem(KEY_CUSTOM_CATS)) localStorage.setItem(KEY_CUSTOM_CATS, JSON.stringify({ income: [], expense: [] }));
  if (!localStorage.getItem(KEY_DARK_MODE))   localStorage.setItem(KEY_DARK_MODE,   'system');

  writeVersion(2);
}

/**
 * Jalankan semua migrasi yang diperlukan secara berurutan.
 * Dipanggil sekali di awal app.js sebelum modul lain membaca data.
 */
export function migrate() {
  let version = readVersion();

  if (version < 1) { migrate0to1(); version = 1; }
  if (version < 2) { migrate1to2(); version = 2; }

  // Pastikan key baru ada meski lewat jalur versi apapun
  if (!localStorage.getItem(KEY_TX) && localStorage.getItem(KEY_TX_OLD)) {
    localStorage.setItem(KEY_TX, localStorage.getItem(KEY_TX_OLD));
  }
  if (!localStorage.getItem(KEY_BUDGETS))     localStorage.setItem(KEY_BUDGETS,     JSON.stringify([]));
  if (!localStorage.getItem(KEY_SAVINGS))     localStorage.setItem(KEY_SAVINGS,     JSON.stringify([]));
  if (!localStorage.getItem(KEY_RECURRING))   localStorage.setItem(KEY_RECURRING,   JSON.stringify([]));
  if (!localStorage.getItem(KEY_CUSTOM_CATS)) localStorage.setItem(KEY_CUSTOM_CATS, JSON.stringify({ income: [], expense: [] }));
  if (!localStorage.getItem(KEY_DARK_MODE))   localStorage.setItem(KEY_DARK_MODE,   'system');
}

/**
 * Reset data pengguna tanpa mengubah versi skema atau preferensi tampilan.
 */
export function resetAppData() {
  localStorage.setItem(KEY_TX, JSON.stringify([]));
  localStorage.setItem(KEY_BUDGETS, JSON.stringify([]));
  localStorage.setItem(KEY_SAVINGS, JSON.stringify([]));
  localStorage.setItem(KEY_RECURRING, JSON.stringify([]));
  localStorage.setItem(KEY_CUSTOM_CATS, JSON.stringify({ income: [], expense: [] }));
  localStorage.removeItem(KEY_TX_OLD);
}

/** Kembalikan versi skema aktif */
export function getSchemaVersion() {
  return readVersion();
}
