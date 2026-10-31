/**
 * tests/analytics.test.js
 * Unit tests untuk js/analytics.js (semua fungsi murni)
 */

import { describe, it, expect } from 'vitest';
import {
  getMonthSummary,
  getExpenseByCategory,
  getMonthlyTrend,
  getDailySaldoTrend,
  getDailyAvgExpense,
  getBiggestExpenseCategory,
  getPreviousMonthComparison,
} from '../js/analytics.js';

// ── Fixtures ──────────────────────────────────────────────────────────────────

const TX = [
  { id: '1', type: 'income',  date: '2026-10-01', amount: 800000, category: 'Uang Saku', note: '' },
  { id: '2', type: 'expense', date: '2026-10-02', amount:  35000, category: 'Makan',     note: '' },
  { id: '3', type: 'expense', date: '2026-10-05', amount:  50000, category: 'Transport', note: '' },
  { id: '4', type: 'expense', date: '2026-10-10', amount: 120000, category: 'Makan',     note: '' },
  { id: '5', type: 'income',  date: '2026-09-01', amount: 700000, category: 'Uang Saku', note: '' },
  { id: '6', type: 'expense', date: '2026-09-15', amount: 200000, category: 'Pendidikan', note: '' },
];

// ── getMonthSummary ───────────────────────────────────────────────────────────

describe('getMonthSummary', () => {
  it('hitung total income, expense, balance bulan ini', () => {
    const result = getMonthSummary(TX, '2026-10');
    expect(result.income).toBe(800000);
    expect(result.expense).toBe(205000);
    expect(result.balance).toBe(595000);
  });

  it('kembalikan 0 semua jika tidak ada transaksi di bulan tersebut', () => {
    const result = getMonthSummary(TX, '2026-01');
    expect(result.income).toBe(0);
    expect(result.expense).toBe(0);
    expect(result.balance).toBe(0);
  });

  it('balance negatif jika pengeluaran > pemasukan', () => {
    const tx = [
      { id: 'a', type: 'income',  date: '2026-10-01', amount: 100, category: 'x', note: '' },
      { id: 'b', type: 'expense', date: '2026-10-02', amount: 200, category: 'y', note: '' },
    ];
    expect(getMonthSummary(tx, '2026-10').balance).toBe(-100);
  });
});

// ── getExpenseByCategory ──────────────────────────────────────────────────────

describe('getExpenseByCategory', () => {
  it('kelompokkan pengeluaran per kategori', () => {
    const result = getExpenseByCategory(TX, '2026-10');
    expect(result['Makan']).toBe(155000);     // 35000 + 120000
    expect(result['Transport']).toBe(50000);
    expect(result['Uang Saku']).toBeUndefined();  // income, bukan expense
  });

  it('kembalikan object kosong jika tidak ada pengeluaran', () => {
    const result = getExpenseByCategory(TX, '2026-11');
    expect(Object.keys(result)).toHaveLength(0);
  });
});

// ── getMonthlyTrend ───────────────────────────────────────────────────────────

describe('getMonthlyTrend', () => {
  it('kembalikan 6 bulan labels', () => {
    const result = getMonthlyTrend(TX, '2026-10');
    expect(result.labels).toHaveLength(6);
    expect(result.income).toHaveLength(6);
    expect(result.expense).toHaveLength(6);
  });

  it('nilai bulan terakhir sesuai data Oktober', () => {
    const result = getMonthlyTrend(TX, '2026-10');
    const last = result.income.at(-1);
    expect(last).toBe(800000);
  });
});

// ── getDailySaldoTrend ────────────────────────────────────────────────────────

describe('getDailySaldoTrend', () => {
  it('panjang labels = jumlah hari dalam bulan', () => {
    const result = getDailySaldoTrend(TX, '2026-10');
    expect(result.labels).toHaveLength(31); // Oktober = 31 hari
    expect(result.balances).toHaveLength(31);
  });

  it('saldo kumulatif bertambah setelah income', () => {
    const result = getDailySaldoTrend(TX, '2026-10');
    // Hari ke-1 ada income 800000
    expect(result.balances[0]).toBe(800000);
    // Hari ke-2 ada expense 35000 → 800000 - 35000 = 765000
    expect(result.balances[1]).toBe(765000);
  });

  it('bulan Februari 28 hari (non-leap)', () => {
    const result = getDailySaldoTrend([], '2025-02');
    expect(result.labels).toHaveLength(28);
  });
});

// ── getDailyAvgExpense ────────────────────────────────────────────────────────

describe('getDailyAvgExpense', () => {
  it('rata-rata = total / hari dalam bulan', () => {
    const result = getDailyAvgExpense(TX, '2026-10');
    expect(result).toBeCloseTo(205000 / 31, 2);
  });

  it('0 jika tidak ada pengeluaran', () => {
    expect(getDailyAvgExpense([], '2026-10')).toBe(0);
  });
});

// ── getBiggestExpenseCategory ─────────────────────────────────────────────────

describe('getBiggestExpenseCategory', () => {
  it('kembalikan kategori dengan pengeluaran terbesar', () => {
    const result = getBiggestExpenseCategory(TX, '2026-10');
    expect(result).not.toBeNull();
    expect(result.category).toBe('Makan');
    expect(result.amount).toBe(155000);
  });

  it('kembalikan null jika tidak ada pengeluaran', () => {
    expect(getBiggestExpenseCategory([], '2026-10')).toBeNull();
  });
});

// ── getPreviousMonthComparison ────────────────────────────────────────────────

describe('getPreviousMonthComparison', () => {
  it('hitung persentase perubahan income dan expense', () => {
    const result = getPreviousMonthComparison(TX, '2026-10');
    // Sep income: 700000, Oct income: 800000 → +14%
    expect(result.incomePct).toBe(14);
    // Sep expense: 200000, Oct expense: 205000 → +3% (rounded)
    expect(result.expensePct).toBe(3);
  });

  it('kembalikan null jika bulan sebelumnya tidak ada data', () => {
    const result = getPreviousMonthComparison(TX, '2026-06');
    expect(result.incomePct).toBeNull();
    expect(result.expensePct).toBeNull();
  });
});
