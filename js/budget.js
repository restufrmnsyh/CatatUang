/**
 * budget.js
 * Tanggung jawab: CRUD budget bulanan per kategori + kalkulasi progress.
 * Data: [{ id, yearMonth, category, limit }]
 */

import { KEY_BUDGETS } from './schema.js';

// ─── Storage helpers ──────────────────────────────────────────────────────────

function load() {
  try {
    return JSON.parse(localStorage.getItem(KEY_BUDGETS) ?? '[]');
  } catch { return []; }
}

function save(data) {
  localStorage.setItem(KEY_BUDGETS, JSON.stringify(data));
}

// ─── CRUD ─────────────────────────────────────────────────────────────────────

/** @returns {Array<Object>} */
export function getBudgets() { return load(); }

/**
 * Tambah atau perbarui budget (upsert berdasarkan yearMonth+category).
 * @param {{ yearMonth: string, category: string, limit: number }} data
 * @returns {Object}
 */
export function upsertBudget(data) {
  const list = load();
  const idx  = list.findIndex(b => b.yearMonth === data.yearMonth && b.category === data.category);
  if (idx >= 0) {
    list[idx].limit = Number(data.limit);
    save(list);
    return list[idx];
  }
  const newB = { id: crypto.randomUUID(), yearMonth: data.yearMonth, category: data.category, limit: Number(data.limit) };
  list.push(newB);
  save(list);
  return newB;
}

/**
 * Hapus budget berdasarkan id.
 * @param {string} id
 */
export function deleteBudget(id) {
  save(load().filter(b => b.id !== id));
}

// ─── Progress ─────────────────────────────────────────────────────────────────

/**
 * Hitung progress semua budget untuk bulan tertentu.
 * @param {Array<Object>} allTransactions
 * @param {string} yearMonth
 * @returns {Array<{ budget: Object, spent: number, pct: number, status: 'ok'|'warn'|'over' }>}
 */
export function getBudgetProgress(allTransactions, yearMonth) {
  const budgets = load().filter(b => b.yearMonth === yearMonth);

  return budgets.map(budget => {
    const spent = allTransactions
      .filter(tx => tx.type === 'expense' && tx.date.startsWith(yearMonth) && tx.category === budget.category)
      .reduce((s, tx) => s + tx.amount, 0);

    const pct = budget.limit > 0 ? Math.round((spent / budget.limit) * 100) : 0;
    const status = pct >= 100 ? 'over' : pct >= 80 ? 'warn' : 'ok';

    return { budget, spent, pct, status };
  });
}
