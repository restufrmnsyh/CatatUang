/**
 * savings.js
 * Tanggung jawab: CRUD target tabungan + kalkulasi progress dan estimasi.
 * Data: [{ id, name, target, deadline, createdAt }]
 *
 * "Tabungan" dihitung dari saldo kumulatif semua transaksi sejak createdAt goal,
 * yang diasumsikan sebagai progress menuju target.
 * User tidak menambah transaksi tabungan secara eksplisit —
 * estimasi dihitung dari rata-rata saldo bersih per hari sejak goal dibuat.
 */

import { KEY_SAVINGS } from './schema.js';

// ─── Storage helpers ──────────────────────────────────────────────────────────

function load() {
  try {
    return JSON.parse(localStorage.getItem(KEY_SAVINGS) ?? '[]');
  } catch { return []; }
}

function save(data) {
  localStorage.setItem(KEY_SAVINGS, JSON.stringify(data));
}

// ─── CRUD ─────────────────────────────────────────────────────────────────────

/** @returns {Array<Object>} */
export function getSavingsGoals() { return load(); }

/**
 * @param {{ name: string, target: number, deadline: string }} data  deadline = "YYYY-MM-DD"
 * @returns {Object}
 */
export function addSavingsGoal(data) {
  const list = load();
  const goal = {
    id:        crypto.randomUUID(),
    name:      data.name.trim(),
    target:    Number(data.target),
    deadline:  data.deadline,
    createdAt: new Date().toISOString(),
  };
  list.push(goal);
  save(list);
  return goal;
}

/**
 * @param {string} id
 * @param {{ name: string, target: number, deadline: string }} data
 */
export function updateSavingsGoal(id, data) {
  const list = load();
  const idx  = list.findIndex(g => g.id === id);
  if (idx === -1) return null;
  list[idx] = { ...list[idx], name: data.name.trim(), target: Number(data.target), deadline: data.deadline };
  save(list);
  return list[idx];
}

/** @param {string} id */
export function deleteSavingsGoal(id) {
  save(load().filter(g => g.id !== id));
}

// ─── Progress ─────────────────────────────────────────────────────────────────

/**
 * Hitung progress setiap goal.
 * "Progress" = total (income - expense) sejak tanggal goal dibuat sampai hari ini.
 * "Estimasi tercapai" = deadline reachability berdasarkan rata-rata net/hari.
 *
 * @param {Array<Object>} allTransactions
 * @returns {Array<{
 *   goal: Object,
 *   saved: number,
 *   pct: number,
 *   remaining: number,
 *   estimatedDate: string|null,
 *   willMeetDeadline: boolean|null
 * }>}
 */
export function getSavingsProgress(allTransactions) {
  const goals = load();
  const today = new Date();

  return goals.map(goal => {
    const startDate = new Date(goal.createdAt.slice(0, 10));

    // Transaksi sejak goal dibuat
    const relevant = allTransactions.filter(tx => {
      const txDate = new Date(tx.date);
      return txDate >= startDate && txDate <= today;
    });

    const saved = relevant.reduce((s, tx) => s + (tx.type === 'income' ? tx.amount : -tx.amount), 0);
    const clampedSaved = Math.max(0, saved);
    const pct         = goal.target > 0 ? Math.min(100, Math.round((clampedSaved / goal.target) * 100)) : 0;
    const remaining   = Math.max(0, goal.target - clampedSaved);

    // Estimasi tanggal tercapai berdasarkan rata-rata net per hari
    const daysSinceStart = Math.max(1, Math.round((today - startDate) / 86400000));
    const dailyNet       = saved / daysSinceStart;

    let estimatedDate    = null;
    let willMeetDeadline = null;

    if (remaining > 0 && dailyNet > 0) {
      const daysNeeded  = Math.ceil(remaining / dailyNet);
      const estDate     = new Date(today.getTime() + daysNeeded * 86400000);
      estimatedDate     = estDate.toISOString().slice(0, 10);
      willMeetDeadline  = new Date(goal.deadline) >= estDate;
    } else if (remaining <= 0) {
      estimatedDate    = today.toISOString().slice(0, 10);
      willMeetDeadline = true;
    }

    return { goal, saved: clampedSaved, pct, remaining, estimatedDate, willMeetDeadline };
  });
}
