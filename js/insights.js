/**
 * insights.js
 * Tanggung jawab: menghasilkan insight otomatis rule-based dari data transaksi.
 * Semua fungsi murni — tidak menyentuh DOM atau storage.
 */

import { getExpenseByCategory, getMonthSummary } from './analytics.js';

// ─── Helpers ──────────────────────────────────────────────────────────────────

function prevYM(yearMonth) {
  const [y, m] = yearMonth.split('-').map(Number);
  const d = new Date(y, m - 2, 1);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
}

function pct(cur, prev) {
  if (prev === 0) return null;
  return Math.round(((cur - prev) / prev) * 100);
}

function fmtRp(n) {
  return new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', minimumFractionDigits: 0 }).format(n);
}

// ─── Aturan ───────────────────────────────────────────────────────────────────

/**
 * Menghasilkan daftar insight teks berdasarkan aturan.
 *
 * @param {Array<Object>} allTransactions
 * @param {string} yearMonth  "YYYY-MM"
 * @returns {Array<{ type: 'warning'|'info'|'success', text: string }>}
 */
export function generateInsights(allTransactions, yearMonth) {
  const insights = [];
  const prev = prevYM(yearMonth);

  const curSummary  = getMonthSummary(allTransactions, yearMonth);
  const prevSummary = getMonthSummary(allTransactions, prev);
  const curByCat    = getExpenseByCategory(allTransactions, yearMonth);
  const prevByCat   = getExpenseByCategory(allTransactions, prev);

  // 1. Pengeluaran per kategori naik signifikan (≥30%)
  Object.entries(curByCat).forEach(([cat, cur]) => {
    const p = prevByCat[cat] ?? 0;
    const change = pct(cur, p);
    if (change !== null && change >= 30) {
      insights.push({
        type: 'warning',
        text: `Pengeluaran ${cat} naik ${change}% dari bulan lalu (${fmtRp(p)} → ${fmtRp(cur)}).`,
      });
    }
    // Pengeluaran per kategori turun signifikan (≥20%) — positif
    if (change !== null && change <= -20) {
      insights.push({
        type: 'success',
        text: `Pengeluaran ${cat} turun ${Math.abs(change)}% dari bulan lalu — kerja bagus!`,
      });
    }
  });

  // 2. Total pengeluaran melebihi total pemasukan
  if (curSummary.expense > curSummary.income && curSummary.income > 0) {
    insights.push({
      type: 'warning',
      text: `Pengeluaran bulan ini (${fmtRp(curSummary.expense)}) melebihi pemasukan (${fmtRp(curSummary.income)}). Perhatikan pengeluaranmu!`,
    });
  }

  // 3. Tidak ada pemasukan bulan ini
  if (curSummary.income === 0) {
    insights.push({
      type: 'info',
      text: 'Belum ada pemasukan yang tercatat bulan ini.',
    });
  }

  // 4. Total pengeluaran naik >20% dari bulan lalu
  const expPct = pct(curSummary.expense, prevSummary.expense);
  if (expPct !== null && expPct > 20) {
    insights.push({
      type: 'warning',
      text: `Total pengeluaran naik ${expPct}% dibanding bulan lalu (${fmtRp(prevSummary.expense)} → ${fmtRp(curSummary.expense)}).`,
    });
  }

  // 5. Saldo positif dan lebih baik dari bulan lalu
  if (curSummary.balance > 0 && curSummary.balance > prevSummary.balance && prevSummary.balance >= 0) {
    insights.push({
      type: 'success',
      text: `Saldo bulan ini ${fmtRp(curSummary.balance)} — lebih baik dari bulan lalu (${fmtRp(prevSummary.balance)}).`,
    });
  }

  // 6. Dominasi satu kategori (>50% pengeluaran)
  const totalExpense = Object.values(curByCat).reduce((s, v) => s + v, 0);
  if (totalExpense > 0) {
    Object.entries(curByCat).forEach(([cat, val]) => {
      const share = Math.round((val / totalExpense) * 100);
      if (share > 50) {
        insights.push({
          type: 'info',
          text: `${cat} mendominasi ${share}% dari total pengeluaran bulan ini.`,
        });
      }
    });
  }

  // 7. Bulan ini tidak ada data sama sekali
  if (allTransactions.filter(tx => tx.date.startsWith(yearMonth)).length === 0) {
    insights.push({
      type: 'info',
      text: 'Belum ada transaksi di bulan ini. Mulai catat pemasukanmu!',
    });
  }

  return insights;
}
