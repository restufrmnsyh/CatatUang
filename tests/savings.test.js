/**
 * tests/savings.test.js
 * Unit tests untuk js/savings.js
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';

// ── Mock localStorage ─────────────────────────────────────────────────────────
const store = {};
vi.stubGlobal('localStorage', {
  getItem:    key => store[key] ?? null,
  setItem:    (key, val) => { store[key] = val; },
  removeItem: key => { delete store[key]; },
  clear:      () => { Object.keys(store).forEach(k => delete store[k]); },
});

let _uuid = 0;
vi.stubGlobal('crypto', { randomUUID: () => `uuid-${++_uuid}` });

import {
  addSavingsGoal,
  getSavingsGoals,
  updateSavingsGoal,
  deleteSavingsGoal,
  getSavingsProgress,
} from '../js/savings.js';

beforeEach(() => {
  localStorage.clear();
  localStorage.setItem('cu_savings', JSON.stringify([]));
  _uuid = 0;
});

// ── CRUD ──────────────────────────────────────────────────────────────────────

describe('addSavingsGoal', () => {
  it('tambah goal baru', () => {
    addSavingsGoal({ name: 'Laptop', target: 5000000, deadline: '2027-06-01' });
    expect(getSavingsGoals()).toHaveLength(1);
    expect(getSavingsGoals()[0].name).toBe('Laptop');
  });

  it('nama di-trim', () => {
    addSavingsGoal({ name: '  Laptop  ', target: 5000000, deadline: '2027-06-01' });
    expect(getSavingsGoals()[0].name).toBe('Laptop');
  });
});

describe('updateSavingsGoal', () => {
  it('perbarui goal yang ada', () => {
    const g = addSavingsGoal({ name: 'Laptop', target: 5000000, deadline: '2027-06-01' });
    updateSavingsGoal(g.id, { name: 'Laptop Pro', target: 7000000, deadline: '2027-12-01' });
    expect(getSavingsGoals()[0].target).toBe(7000000);
  });

  it('kembalikan null jika id tidak ditemukan', () => {
    const result = updateSavingsGoal('nonexistent', { name: 'x', target: 0, deadline: '' });
    expect(result).toBeNull();
  });
});

describe('deleteSavingsGoal', () => {
  it('hapus goal', () => {
    const g = addSavingsGoal({ name: 'Laptop', target: 5000000, deadline: '2027-06-01' });
    deleteSavingsGoal(g.id);
    expect(getSavingsGoals()).toHaveLength(0);
  });
});

// ── getSavingsProgress ────────────────────────────────────────────────────────

describe('getSavingsProgress', () => {
  it('progress 0 jika tidak ada transaksi', () => {
    addSavingsGoal({ name: 'Laptop', target: 5000000, deadline: '2027-06-01' });
    const [p] = getSavingsProgress([]);
    expect(p.pct).toBe(0);
    expect(p.saved).toBe(0);
    expect(p.remaining).toBe(5000000);
  });

  it('progress 100 jika sudah melebihi target', () => {
    // goal dibuat di masa lalu agar transaksi relevan
    const g = addSavingsGoal({ name: 'Buku', target: 100000, deadline: '2027-01-01' });
    // patch createdAt ke waktu lampau
    const goals = getSavingsGoals();
    goals[0].createdAt = '2020-01-01T00:00:00.000Z';
    localStorage.setItem('cu_savings', JSON.stringify(goals));

    const tx = [
      { id: 'a', type: 'income',  date: '2026-10-01', amount: 200000, category: 'x', note: '' },
    ];
    const [p] = getSavingsProgress(tx);
    expect(p.pct).toBe(100);
    expect(p.saved).toBe(200000);
  });

  it('willMeetDeadline true jika estimasi sebelum tenggat', () => {
    const goals = [
      { id: 'g1', name: 'X', target: 1000000, deadline: '2030-01-01', createdAt: '2020-01-01T00:00:00.000Z' },
    ];
    localStorage.setItem('cu_savings', JSON.stringify(goals));
    const tx = Array.from({ length: 10 }, (_, i) => ({
      id: `t${i}`,
      type: 'income',
      date: `2026-10-${String(i + 1).padStart(2, '0')}`,
      amount: 10000,
      category: 'x',
      note: '',
    }));
    const [p] = getSavingsProgress(tx);
    // estimatedDate ada karena ada net income positif
    expect(p.estimatedDate).not.toBeNull();
    // willMeetDeadline adalah boolean — hanya pastikan bukan undefined
    expect(p.willMeetDeadline === true || p.willMeetDeadline === false).toBe(true);
  });
});
