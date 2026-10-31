/**
 * recurring.js
 * Tanggung jawab: CRUD transaksi berulang + engine "jalankan yang terlambat".
 *
 * Data: [{
 *   id, type, category, amount, note,
 *   freq: 'daily' | 'weekly' | 'monthly',
 *   startDate: "YYYY-MM-DD",
 *   lastRun:   "YYYY-MM-DD" | null
 * }]
 *
 * Logika:
 *   Saat runDueRecurring() dipanggil, setiap rule dicek.
 *   Jika tanggal hari ini >= tanggal jadwal berikutnya,
 *   buat transaksi aktual dan perbarui lastRun.
 *   Satu rule hanya menghasilkan SATU transaksi per panggilan
 *   (tidak catch-up mundur — terlalu banyak insert jika lama offline).
 */

import { KEY_RECURRING } from './schema.js';
import { addTransaction }  from './transactions.js';

// ─── Storage helpers ──────────────────────────────────────────────────────────

function load() {
  try {
    return JSON.parse(localStorage.getItem(KEY_RECURRING) ?? '[]');
  } catch { return []; }
}

function save(data) {
  localStorage.setItem(KEY_RECURRING, JSON.stringify(data));
}

// ─── CRUD ─────────────────────────────────────────────────────────────────────

/** @returns {Array<Object>} */
export function getRecurring() { return load(); }

/**
 * @param {{ type, category, amount, note, freq, startDate }} data
 * @returns {Object}
 */
export function addRecurring(data) {
  const list = load();
  const rule = {
    id:        crypto.randomUUID(),
    type:      data.type,
    category:  data.category,
    amount:    Number(data.amount),
    note:      data.note?.trim() ?? '',
    freq:      data.freq,
    startDate: data.startDate,
    lastRun:   null,
  };
  list.push(rule);
  save(list);
  return rule;
}

/**
 * @param {string} id
 * @param {{ type, category, amount, note, freq, startDate }} data
 */
export function updateRecurring(id, data) {
  const list = load();
  const idx  = list.findIndex(r => r.id === id);
  if (idx === -1) return null;
  list[idx] = { ...list[idx], type: data.type, category: data.category, amount: Number(data.amount), note: data.note?.trim() ?? '', freq: data.freq, startDate: data.startDate };
  save(list);
  return list[idx];
}

/** @param {string} id */
export function deleteRecurring(id) {
  save(load().filter(r => r.id !== id));
}

// ─── Engine ───────────────────────────────────────────────────────────────────

/**
 * Hitung tanggal jadwal berikutnya setelah `lastRunDate`.
 * @param {string} lastRunDate  "YYYY-MM-DD"
 * @param {string} freq  'daily'|'weekly'|'monthly'
 * @returns {Date}
 */
function nextDate(lastRunDate, freq) {
  const d = new Date(lastRunDate + 'T00:00:00');
  switch (freq) {
    case 'daily':   d.setDate(d.getDate() + 1);   break;
    case 'weekly':  d.setDate(d.getDate() + 7);   break;
    case 'monthly': d.setMonth(d.getMonth() + 1); break;
  }
  return d;
}

/**
 * Jalankan semua rule yang jatuh tempo pada hari ini atau sebelumnya.
 * Membuat transaksi aktual dan memperbarui lastRun.
 * @returns {number} jumlah transaksi yang dibuat
 */
export function runDueRecurring() {
  const list  = load();
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const todayStr = today.toISOString().slice(0, 10);

  let created = 0;

  list.forEach(rule => {
    // Tentukan tanggal mulai berdasarkan lastRun atau startDate
    const referenceDate = rule.lastRun ?? rule.startDate;
    const due = rule.lastRun
      ? nextDate(rule.lastRun, rule.freq)
      : new Date(rule.startDate + 'T00:00:00');

    if (due <= today) {
      const dateStr = due.toISOString().slice(0, 10);
      addTransaction({
        type:     rule.type,
        date:     dateStr,
        amount:   rule.amount,
        category: rule.category,
        note:     rule.note ? `[Otomatis] ${rule.note}` : '[Otomatis]',
      });
      rule.lastRun = dateStr;
      created++;
    }
  });

  if (created > 0) save(list);
  return created;
}

/**
 * Label frekuensi dalam Bahasa Indonesia.
 * @param {string} freq
 * @returns {string}
 */
export function freqLabel(freq) {
  return { daily: 'Harian', weekly: 'Mingguan', monthly: 'Bulanan' }[freq] ?? freq;
}
