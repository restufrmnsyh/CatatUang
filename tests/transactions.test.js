/**
 * tests/transactions.test.js
 * Unit tests untuk fungsi pure di js/transactions.js (filterTransactions, paginate)
 * Fungsi yang menyentuh localStorage di-mock.
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

// ── Mock crypto.randomUUID ────────────────────────────────────────────────────
let _uuid = 0;
vi.stubGlobal('crypto', { randomUUID: () => `uuid-${++_uuid}` });

import {
  filterTransactions,
  paginate,
  getCategories,
  DEFAULT_CATEGORIES,
  addCustomCategory,
  removeCustomCategory,
} from '../js/transactions.js';

// ── Fixtures ──────────────────────────────────────────────────────────────────

const TX = [
  { id: '1', type: 'income',  date: '2026-10-01', amount: 800000, category: 'Uang Saku', note: 'uang saku' },
  { id: '2', type: 'expense', date: '2026-10-03', amount:  35000, category: 'Makan',     note: 'warteg' },
  { id: '3', type: 'expense', date: '2026-10-10', amount:  50000, category: 'Transport', note: 'ojek' },
  { id: '4', type: 'income',  date: '2026-09-01', amount: 500000, category: 'Gaji',      note: 'part time' },
  { id: '5', type: 'expense', date: '2026-09-15', amount: 200000, category: 'Pendidikan', note: 'kursus' },
];

// ── filterTransactions ────────────────────────────────────────────────────────

describe('filterTransactions', () => {
  it('filter berdasarkan yearMonth', () => {
    const result = filterTransactions(TX, { yearMonth: '2026-10' });
    expect(result).toHaveLength(3);
    result.forEach(tx => expect(tx.date.startsWith('2026-10')).toBe(true));
  });

  it('filter berdasarkan type', () => {
    const inc = filterTransactions(TX, { type: 'income' });
    expect(inc.every(t => t.type === 'income')).toBe(true);
    const exp = filterTransactions(TX, { type: 'expense' });
    expect(exp.every(t => t.type === 'expense')).toBe(true);
  });

  it('filter berdasarkan category', () => {
    const result = filterTransactions(TX, { category: 'Makan' });
    expect(result).toHaveLength(1);
    expect(result[0].id).toBe('2');
  });

  it('filter berdasarkan search (note)', () => {
    const result = filterTransactions(TX, { search: 'ojek' });
    expect(result).toHaveLength(1);
    expect(result[0].id).toBe('3');
  });

  it('search case-insensitive', () => {
    expect(filterTransactions(TX, { search: 'WARTEG' })).toHaveLength(1);
  });

  it('sort date-desc (default)', () => {
    const result = filterTransactions(TX, {});
    expect(new Date(result[0].date) >= new Date(result[1].date)).toBe(true);
  });

  it('sort date-asc', () => {
    const result = filterTransactions(TX, { sort: 'date-asc' });
    expect(new Date(result[0].date) <= new Date(result[1].date)).toBe(true);
  });

  it('sort amount-desc', () => {
    const result = filterTransactions(TX, { sort: 'amount-desc' });
    expect(result[0].amount >= result[1].amount).toBe(true);
  });

  it('sort amount-asc', () => {
    const result = filterTransactions(TX, { sort: 'amount-asc' });
    expect(result[0].amount <= result[1].amount).toBe(true);
  });

  it('tidak memodifikasi array sumber', () => {
    const original = [...TX];
    filterTransactions(TX, { sort: 'amount-asc' });
    expect(TX[0].id).toBe(original[0].id);
  });

  it('filter gabungan yearMonth + type', () => {
    const result = filterTransactions(TX, { yearMonth: '2026-10', type: 'expense' });
    expect(result).toHaveLength(2);
    result.forEach(tx => {
      expect(tx.date.startsWith('2026-10')).toBe(true);
      expect(tx.type).toBe('expense');
    });
  });
});

// ── paginate ──────────────────────────────────────────────────────────────────

describe('paginate', () => {
  it('kembalikan slice pertama', () => {
    const { visible, hasMore } = paginate(TX, 3);
    expect(visible).toHaveLength(3);
    expect(hasMore).toBe(true);
  });

  it('hasMore = false jika limit >= panjang array', () => {
    const { visible, hasMore } = paginate(TX, 10);
    expect(visible).toHaveLength(5);
    expect(hasMore).toBe(false);
  });

  it('array kosong', () => {
    const { visible, hasMore } = paginate([], 10);
    expect(visible).toHaveLength(0);
    expect(hasMore).toBe(false);
  });
});

// ── Kategori ──────────────────────────────────────────────────────────────────

describe('DEFAULT_CATEGORIES', () => {
  it('income mengandung Uang Saku dan Gaji', () => {
    expect(DEFAULT_CATEGORIES.income).toContain('Uang Saku');
    expect(DEFAULT_CATEGORIES.income).toContain('Gaji');
  });

  it('expense mengandung Makan, Transport, Hiburan', () => {
    expect(DEFAULT_CATEGORIES.expense).toContain('Makan');
    expect(DEFAULT_CATEGORIES.expense).toContain('Transport');
    expect(DEFAULT_CATEGORIES.expense).toContain('Hiburan');
  });
});

describe('custom categories', () => {
  beforeEach(() => {
    localStorage.clear();
    // inisialisasi key custom cats
    localStorage.setItem('cu_custom_categories', JSON.stringify({ income: [], expense: [] }));
  });

  it('addCustomCategory menambah kategori baru', () => {
    const ok = addCustomCategory('expense', 'Investasi');
    expect(ok).toBe(true);
    const cats = getCategories();
    expect(cats.expense).toContain('Investasi');
  });

  it('addCustomCategory tolak duplikat (case-insensitive)', () => {
    addCustomCategory('expense', 'Investasi');
    const ok = addCustomCategory('expense', 'investasi');
    expect(ok).toBe(false);
  });

  it('removeCustomCategory hapus kategori', () => {
    addCustomCategory('expense', 'Investasi');
    removeCustomCategory('expense', 'Investasi');
    expect(getCategories().expense).not.toContain('Investasi');
  });

  it('getCategories gabungkan default + custom', () => {
    addCustomCategory('income', 'Freelance');
    const cats = getCategories();
    expect(cats.income).toContain('Uang Saku');
    expect(cats.income).toContain('Freelance');
  });
});
