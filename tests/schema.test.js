/**
 * tests/schema.test.js
 * Unit tests untuk js/schema.js — versi skema dan migrasi
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

import { migrate, getSchemaVersion, KEY_TX, KEY_BUDGETS, KEY_SAVINGS, KEY_RECURRING, KEY_CUSTOM_CATS, KEY_DARK_MODE } from '../js/schema.js';

beforeEach(() => {
  localStorage.clear();
});

describe('migrate (fresh install)', () => {
  it('inisialisasi versi ke 2 pada fresh install', () => {
    migrate();
    expect(getSchemaVersion()).toBe(2);
  });

  it('membuat semua key yang diperlukan', () => {
    migrate();
    expect(localStorage.getItem(KEY_BUDGETS)).not.toBeNull();
    expect(localStorage.getItem(KEY_SAVINGS)).not.toBeNull();
    expect(localStorage.getItem(KEY_RECURRING)).not.toBeNull();
    expect(localStorage.getItem(KEY_CUSTOM_CATS)).not.toBeNull();
    expect(localStorage.getItem(KEY_DARK_MODE)).not.toBeNull();
  });

  it('dark mode default adalah "system"', () => {
    migrate();
    expect(localStorage.getItem(KEY_DARK_MODE)).toBe('system');
  });

  it('custom categories default adalah object kosong', () => {
    migrate();
    const cats = JSON.parse(localStorage.getItem(KEY_CUSTOM_CATS));
    expect(cats.income).toHaveLength(0);
    expect(cats.expense).toHaveLength(0);
  });
});

describe('migrate (dari key lama)', () => {
  it('memindahkan data dari key lama ke key baru', () => {
    const oldTx = [{ id: '1', type: 'income', date: '2026-10-01', amount: 100, category: 'x', note: '' }];
    localStorage.setItem('catat_uang_transactions', JSON.stringify(oldTx));
    migrate();
    const newTx = JSON.parse(localStorage.getItem(KEY_TX));
    expect(newTx).toHaveLength(1);
    expect(newTx[0].id).toBe('1');
  });
});

describe('migrate (idempoten)', () => {
  it('tidak mengubah data saat dijalankan dua kali', () => {
    migrate();
    localStorage.setItem(KEY_TX, JSON.stringify([{ id: 'x' }]));
    migrate();
    // Data yang sudah ada tidak ditimpa
    const tx = JSON.parse(localStorage.getItem(KEY_TX));
    expect(tx[0].id).toBe('x');
  });
});

describe('key constants', () => {
  it('semua key berbeda satu sama lain', () => {
    const keys = [KEY_TX, KEY_BUDGETS, KEY_SAVINGS, KEY_RECURRING, KEY_CUSTOM_CATS, KEY_DARK_MODE];
    const unique = new Set(keys);
    expect(unique.size).toBe(keys.length);
  });
});
