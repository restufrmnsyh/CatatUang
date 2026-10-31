/**
 * tests/budget.test.js
 * Unit tests untuk js/budget.js
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

import { upsertBudget, getBudgets, deleteBudget, getBudgetProgress } from '../js/budget.js';

const TX = [
  { id: 't1', type: 'expense', date: '2026-10-02', amount:  50000, category: 'Makan',     note: '' },
  { id: 't2', type: 'expense', date: '2026-10-05', amount:  60000, category: 'Makan',     note: '' },
  { id: 't3', type: 'expense', date: '2026-10-10', amount: 120000, category: 'Transport', note: '' },
  { id: 't4', type: 'income',  date: '2026-10-01', amount: 800000, category: 'Uang Saku', note: '' },
];

beforeEach(() => {
  localStorage.clear();
  localStorage.setItem('cu_budgets', JSON.stringify([]));
  _uuid = 0;
});

describe('upsertBudget', () => {
  it('tambah budget baru', () => {
    upsertBudget({ yearMonth: '2026-10', category: 'Makan', limit: 200000 });
    expect(getBudgets()).toHaveLength(1);
    expect(getBudgets()[0].limit).toBe(200000);
  });

  it('perbarui budget yang sudah ada (yearMonth+category sama)', () => {
    upsertBudget({ yearMonth: '2026-10', category: 'Makan', limit: 200000 });
    upsertBudget({ yearMonth: '2026-10', category: 'Makan', limit: 300000 });
    expect(getBudgets()).toHaveLength(1);
    expect(getBudgets()[0].limit).toBe(300000);
  });

  it('budget beda bulan → tidak replace', () => {
    upsertBudget({ yearMonth: '2026-10', category: 'Makan', limit: 200000 });
    upsertBudget({ yearMonth: '2026-11', category: 'Makan', limit: 150000 });
    expect(getBudgets()).toHaveLength(2);
  });
});

describe('deleteBudget', () => {
  it('hapus budget berdasarkan id', () => {
    const b = upsertBudget({ yearMonth: '2026-10', category: 'Makan', limit: 200000 });
    deleteBudget(b.id);
    expect(getBudgets()).toHaveLength(0);
  });

  it('tidak error jika id tidak ada', () => {
    expect(() => deleteBudget('nonexistent')).not.toThrow();
  });
});

describe('getBudgetProgress', () => {
  it('hitung pct dan status ok', () => {
    upsertBudget({ yearMonth: '2026-10', category: 'Makan', limit: 200000 });
    const progress = getBudgetProgress(TX, '2026-10');
    expect(progress).toHaveLength(1);
    const { spent, pct, status } = progress[0];
    expect(spent).toBe(110000);      // 50000 + 60000
    expect(pct).toBe(55);            // 110000/200000 = 55%
    expect(status).toBe('ok');
  });

  it('status warn saat >= 80%', () => {
    upsertBudget({ yearMonth: '2026-10', category: 'Transport', limit: 130000 });
    const progress = getBudgetProgress(TX, '2026-10');
    expect(progress[0].status).toBe('warn'); // 120000/130000 ≈ 92% → warn then over? 92 >= 100? no → warn
  });

  it('status over saat >= 100%', () => {
    upsertBudget({ yearMonth: '2026-10', category: 'Transport', limit: 100000 });
    const progress = getBudgetProgress(TX, '2026-10');
    expect(progress[0].status).toBe('over'); // 120000/100000 = 120%
  });

  it('pct di-clamp ke 100 di status (but spent masih asli)', () => {
    upsertBudget({ yearMonth: '2026-10', category: 'Transport', limit: 100000 });
    const { spent, pct } = getBudgetProgress(TX, '2026-10')[0];
    expect(spent).toBe(120000);
    expect(pct).toBe(120); // pct tidak di-clamp di logika, hanya di render
  });

  it('income tidak ikut dihitung ke spent', () => {
    upsertBudget({ yearMonth: '2026-10', category: 'Uang Saku', limit: 1000000 });
    const progress = getBudgetProgress(TX, '2026-10');
    expect(progress[0].spent).toBe(0); // Uang Saku adalah income
  });
});
