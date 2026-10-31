/**
 * tests/insights.test.js
 * Unit tests untuk js/insights.js (fungsi murni)
 */

import { describe, it, expect } from 'vitest';
import { generateInsights } from '../js/insights.js';

const BASE_TX = [
  { id: '1', type: 'income',  date: '2026-10-01', amount: 800000, category: 'Uang Saku', note: '' },
  { id: '2', type: 'expense', date: '2026-10-02', amount:  35000, category: 'Makan',     note: '' },
  { id: '3', type: 'expense', date: '2026-09-01', amount:  20000, category: 'Makan',     note: '' },
  { id: '4', type: 'income',  date: '2026-09-01', amount: 600000, category: 'Uang Saku', note: '' },
];

describe('generateInsights', () => {
  it('kembalikan array', () => {
    const result = generateInsights(BASE_TX, '2026-10');
    expect(Array.isArray(result)).toBe(true);
  });

  it('setiap insight punya type dan text', () => {
    const result = generateInsights(BASE_TX, '2026-10');
    result.forEach(ins => {
      expect(['warning', 'info', 'success']).toContain(ins.type);
      expect(typeof ins.text).toBe('string');
      expect(ins.text.length).toBeGreaterThan(0);
    });
  });

  it('insight "belum ada transaksi" saat bulan kosong', () => {
    const result = generateInsights([], '2026-11');
    const found = result.find(i => i.text.includes('Belum ada transaksi'));
    expect(found).toBeDefined();
    expect(found.type).toBe('info');
  });

  it('insight warning saat pengeluaran > pemasukan', () => {
    const tx = [
      { id: 'a', type: 'income',  date: '2026-10-01', amount:  100, category: 'x', note: '' },
      { id: 'b', type: 'expense', date: '2026-10-02', amount: 9999, category: 'y', note: '' },
    ];
    const result = generateInsights(tx, '2026-10');
    const found = result.find(i => i.type === 'warning' && i.text.includes('melebihi pemasukan'));
    expect(found).toBeDefined();
  });

  it('insight kategori naik >= 30%', () => {
    const tx = [
      { id: 'a', type: 'expense', date: '2026-09-01', amount: 100000, category: 'Makan', note: '' },
      { id: 'b', type: 'expense', date: '2026-10-01', amount: 150000, category: 'Makan', note: '' },
    ];
    const result = generateInsights(tx, '2026-10');
    const found = result.find(i => i.text.includes('Makan') && i.text.includes('naik'));
    expect(found).toBeDefined();
    expect(found.type).toBe('warning');
  });

  it('insight kategori turun >= 20%', () => {
    const tx = [
      { id: 'a', type: 'expense', date: '2026-09-01', amount: 100000, category: 'Transport', note: '' },
      { id: 'b', type: 'expense', date: '2026-10-01', amount:  60000, category: 'Transport', note: '' },
    ];
    const result = generateInsights(tx, '2026-10');
    const found = result.find(i => i.text.includes('Transport') && i.text.includes('turun'));
    expect(found).toBeDefined();
    expect(found.type).toBe('success');
  });

  it('insight "belum ada pemasukan" saat income = 0', () => {
    const tx = [
      { id: 'a', type: 'expense', date: '2026-10-01', amount: 50000, category: 'Makan', note: '' },
    ];
    const result = generateInsights(tx, '2026-10');
    const found = result.find(i => i.text.includes('pemasukan') && i.type === 'info');
    expect(found).toBeDefined();
    expect(found.type).toBe('info');
  });

  it('insight dominasi kategori > 50%', () => {
    const tx = [
      { id: 'a', type: 'expense', date: '2026-10-01', amount: 900000, category: 'Hiburan', note: '' },
      { id: 'b', type: 'expense', date: '2026-10-02', amount: 100000, category: 'Makan',   note: '' },
    ];
    const result = generateInsights(tx, '2026-10');
    const found = result.find(i => i.text.includes('Hiburan') && i.text.includes('%'));
    expect(found).toBeDefined();
  });
});
