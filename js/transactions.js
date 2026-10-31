/**
 * transactions.js
 * Tanggung jawab: logika bisnis transaksi (tambah, edit, hapus, hitung ringkasan).
 * Bergantung pada storage.js, tidak menyentuh DOM.
 */

import { loadTransactions, saveTransactions } from './storage.js';
import { KEY_CUSTOM_CATS } from './schema.js';

// ─── Kategori ─────────────────────────────────────────────────────────────────

/** Kategori bawaan berdasarkan tipe transaksi */
export const DEFAULT_CATEGORIES = {
  income:  ['Uang Saku', 'Gaji', 'Lainnya'],
  expense: ['Makan', 'Transport', 'Hiburan', 'Belanja', 'Pendidikan', 'Lainnya'],
};

/**
 * Ambil kategori kustom dari localStorage.
 * @returns {{ income: string[], expense: string[] }}
 */
export function getCustomCategories() {
  try {
    const raw = localStorage.getItem(KEY_CUSTOM_CATS);
    return raw ? JSON.parse(raw) : { income: [], expense: [] };
  } catch { return { income: [], expense: [] }; }
}

/**
 * Simpan kategori kustom ke localStorage.
 * @param {{ income: string[], expense: string[] }} cats
 */
export function saveCustomCategories(cats) {
  localStorage.setItem(KEY_CUSTOM_CATS, JSON.stringify(cats));
}

/**
 * Tambah kategori kustom.
 * @param {'income'|'expense'} type
 * @param {string} name
 * @returns {boolean} true jika berhasil ditambahkan
 */
export function addCustomCategory(type, name) {
  const cats  = getCustomCategories();
  const all   = [...DEFAULT_CATEGORIES[type], ...cats[type]];
  const clean = name.trim();
  if (!clean || all.some(c => c.toLowerCase() === clean.toLowerCase())) return false;
  cats[type].push(clean);
  saveCustomCategories(cats);
  return true;
}

/**
 * Hapus kategori kustom.
 * @param {'income'|'expense'} type
 * @param {string} name
 */
export function removeCustomCategory(type, name) {
  const cats = getCustomCategories();
  cats[type] = cats[type].filter(c => c !== name);
  saveCustomCategories(cats);
}

/**
 * Gabungan kategori bawaan + kustom.
 * @returns {{ income: string[], expense: string[] }}
 */
export function getCategories() {
  const custom = getCustomCategories();
  return {
    income:  [...DEFAULT_CATEGORIES.income,  ...custom.income],
    expense: [...DEFAULT_CATEGORIES.expense, ...custom.expense],
  };
}

/** Alias tetap untuk backward compat dengan modul lain yang import CATEGORIES */
export const CATEGORIES = DEFAULT_CATEGORIES;

/** Semua kategori pengeluaran bawaan */
export const ALL_EXPENSE_CATEGORIES = DEFAULT_CATEGORIES.expense;

// ─── CRUD ─────────────────────────────────────────────────────────────────────

/**
 * Mengambil semua transaksi, diurutkan terbaru di atas.
 * @returns {Array<Object>}
 */
export function getTransactions() {
  return loadTransactions().sort((a, b) => new Date(b.date) - new Date(a.date));
}

/**
 * Menambah transaksi baru.
 * @param {{ type: string, date: string, amount: number, category: string, note: string }} data
 * @returns {Object}
 */
export function addTransaction(data) {
  const transactions = loadTransactions();
  const newTx = {
    id:        crypto.randomUUID(),
    type:      data.type,
    date:      data.date,
    amount:    Number(data.amount),
    category:  data.category,
    note:      data.note?.trim() ?? '',
    createdAt: new Date().toISOString(),
  };
  transactions.push(newTx);
  saveTransactions(transactions);
  return newTx;
}

/**
 * Memperbarui transaksi berdasarkan id.
 * @param {string} id
 * @param {{ type, date, amount, category, note }} data
 * @returns {Object|null}
 */
export function updateTransaction(id, data) {
  const transactions = loadTransactions();
  const idx = transactions.findIndex(tx => tx.id === id);
  if (idx === -1) return null;
  transactions[idx] = {
    ...transactions[idx],
    type:     data.type,
    date:     data.date,
    amount:   Number(data.amount),
    category: data.category,
    note:     data.note?.trim() ?? '',
  };
  saveTransactions(transactions);
  return transactions[idx];
}

/**
 * Menghapus transaksi berdasarkan id.
 * @param {string} id
 */
export function deleteTransaction(id) {
  saveTransactions(loadTransactions().filter(tx => tx.id !== id));
}

/**
 * Menghitung ringkasan: total pemasukan, pengeluaran, dan saldo.
 * @returns {{ income: number, expense: number, balance: number }}
 */
export function getSummary() {
  const transactions = loadTransactions();
  const income  = transactions.filter(tx => tx.type === 'income') .reduce((sum, tx) => sum + tx.amount, 0);
  const expense = transactions.filter(tx => tx.type === 'expense').reduce((sum, tx) => sum + tx.amount, 0);
  return { income, expense, balance: income - expense };
}

// ─── Filter / Search / Sort ───────────────────────────────────────────────────

/**
 * Filter, cari, dan urutkan transaksi.
 * @param {Array<Object>} transactions  array sumber (tidak dimodifikasi)
 * @param {{ yearMonth?, search?, type?, category?, sort? }} opts
 * @returns {Array<Object>}
 */
export function filterTransactions(transactions, opts = {}) {
  const { yearMonth, search, type, category, sort = 'date-desc' } = opts;
  let result = [...transactions];

  if (yearMonth) result = result.filter(tx => tx.date.startsWith(yearMonth));
  if (type)      result = result.filter(tx => tx.type === type);
  if (category)  result = result.filter(tx => tx.category === category);
  if (search?.trim()) {
    const q = search.trim().toLowerCase();
    result = result.filter(tx => tx.note.toLowerCase().includes(q));
  }

  result.sort((a, b) => {
    switch (sort) {
      case 'date-asc':    return new Date(a.date) - new Date(b.date);
      case 'amount-desc': return b.amount - a.amount;
      case 'amount-asc':  return a.amount - b.amount;
      default:            return new Date(b.date) - new Date(a.date);
    }
  });

  return result;
}

/**
 * Potong array untuk keperluan "load more".
 * @param {Array<Object>} transactions
 * @param {number} limit
 * @returns {{ visible: Array<Object>, hasMore: boolean }}
 */
export function paginate(transactions, limit) {
  return {
    visible: transactions.slice(0, limit),
    hasMore: transactions.length > limit,
  };
}

// ─── Sample Data ──────────────────────────────────────────────────────────────

/**
 * Mengisi localStorage dengan data contoh (hanya jika localStorage kosong).
 */
export function seedSampleData() {
  const existing = loadTransactions();
  if (existing.length > 0) return;

  const now = new Date();
  const txs = [];

  const add = (monthOffset, day, type, category, amount, note) => {
    const d       = new Date(now.getFullYear(), now.getMonth() + monthOffset, day);
    const dateStr = d.toISOString().slice(0, 10);
    txs.push({ id: crypto.randomUUID(), type, category, amount, note, date: dateStr, createdAt: d.toISOString() });
  };

  // Bulan ini
  add(0,  1, 'income',  'Uang Saku',   800000, 'Uang saku bulan ini');
  add(0,  2, 'expense', 'Makan',        35000, 'Makan siang warteg');
  add(0,  3, 'expense', 'Transport',    25000, 'Ojek ke kampus');
  add(0,  5, 'expense', 'Makan',        45000, 'Nongkrong kafe');
  add(0,  7, 'income',  'Gaji',        500000, 'Part time');
  add(0,  8, 'expense', 'Belanja',      95000, 'Beli alat tulis');
  add(0, 10, 'expense', 'Hiburan',      50000, 'Nonton bioskop');
  add(0, 12, 'expense', 'Makan',        28000, 'Sarapan');
  add(0, 14, 'expense', 'Pendidikan',  120000, 'Beli buku');
  add(0, 15, 'expense', 'Transport',    30000, 'Bensin motor');
  add(0, 17, 'expense', 'Makan',        55000, 'Makan malam');
  add(0, 20, 'expense', 'Belanja',      75000, 'Kebutuhan kos');
  add(0, 22, 'expense', 'Lainnya',      40000, 'Isi pulsa');

  // Bulan lalu
  add(-1,  1, 'income',  'Uang Saku',  800000, 'Uang saku bulan lalu');
  add(-1,  2, 'expense', 'Makan',       32000, 'Makan siang');
  add(-1,  4, 'expense', 'Transport',   22000, 'KRL');
  add(-1,  6, 'income',  'Gaji',       400000, 'Part time');
  add(-1,  8, 'expense', 'Hiburan',     60000, 'Konser');
  add(-1, 10, 'expense', 'Makan',       40000, 'Makan bareng teman');
  add(-1, 12, 'expense', 'Belanja',    150000, 'Beli baju');
  add(-1, 15, 'expense', 'Pendidikan', 200000, 'Kursus online');
  add(-1, 18, 'expense', 'Transport',   25000, 'Taksi');
  add(-1, 20, 'expense', 'Makan',       38000, 'Makan siang');

  // 2 bulan lalu
  add(-2,  1, 'income',  'Uang Saku',  800000, 'Uang saku');
  add(-2,  3, 'expense', 'Makan',       30000, 'Makan');
  add(-2,  5, 'expense', 'Transport',   20000, 'Ojek');
  add(-2,  7, 'income',  'Lainnya',    200000, 'Jual buku bekas');
  add(-2, 10, 'expense', 'Belanja',     80000, 'Kebutuhan bulanan');
  add(-2, 15, 'expense', 'Makan',       50000, 'Makan malam');
  add(-2, 20, 'expense', 'Hiburan',     45000, 'Bioskop');

  saveTransactions(txs);
}
