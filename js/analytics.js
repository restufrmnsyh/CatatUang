/**
 * analytics.js
 * Tanggung jawab: fungsi murni untuk agregasi dan statistik.
 * Tidak menyentuh DOM maupun localStorage secara langsung.
 * Semua fungsi menerima array transaksi sebagai parameter.
 */

// ─── Helpers ──────────────────────────────────────────────────────────────────

/** Mengambil string "YYYY-MM" dari transaksi */
function txYearMonth(tx) {
  return tx.date.slice(0, 7); // "YYYY-MM"
}

/** Mengambil string "YYYY-MM" dari objek Date */
function dateToYM(date) {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  return `${y}-${m}`;
}

/** Mundur n bulan dari Date d, kembalikan "YYYY-MM" */
function prevMonths(d, n) {
  const result = [];
  for (let i = n - 1; i >= 0; i--) {
    const dt = new Date(d.getFullYear(), d.getMonth() - i, 1);
    result.push(dateToYM(dt));
  }
  return result;
}

/** Jumlah hari dalam bulan "YYYY-MM" */
function daysInMonth(ym) {
  const [y, m] = ym.split('-').map(Number);
  return new Date(y, m, 0).getDate();
}

// ─── Fungsi publik ────────────────────────────────────────────────────────────

/**
 * Ringkasan bulan tertentu: total income, expense, balance.
 * @param {Array<Object>} allTransactions
 * @param {string} yearMonth "YYYY-MM"
 * @returns {{ income: number, expense: number, balance: number }}
 */
export function getMonthSummary(allTransactions, yearMonth) {
  const txs = allTransactions.filter(tx => txYearMonth(tx) === yearMonth);
  const income  = txs.filter(tx => tx.type === 'income') .reduce((s, tx) => s + tx.amount, 0);
  const expense = txs.filter(tx => tx.type === 'expense').reduce((s, tx) => s + tx.amount, 0);
  return { income, expense, balance: income - expense };
}

/**
 * Total pengeluaran per kategori dalam bulan tertentu.
 * @param {Array<Object>} allTransactions
 * @param {string} yearMonth
 * @returns {Object} { [category]: number }
 */
export function getExpenseByCategory(allTransactions, yearMonth) {
  return allTransactions
    .filter(tx => tx.type === 'expense' && txYearMonth(tx) === yearMonth)
    .reduce((acc, tx) => {
      acc[tx.category] = (acc[tx.category] ?? 0) + tx.amount;
      return acc;
    }, {});
}

/**
 * Tren pemasukan vs pengeluaran per bulan selama 6 bulan terakhir.
 * @param {Array<Object>} allTransactions
 * @param {string} currentYearMonth  bulan acuan terakhir "YYYY-MM"
 * @returns {{ labels: string[], income: number[], expense: number[] }}
 */
export function getMonthlyTrend(allTransactions, currentYearMonth) {
  const [y, m] = currentYearMonth.split('-').map(Number);
  const months = prevMonths(new Date(y, m - 1, 1), 6);

  const income  = months.map(ym => allTransactions.filter(tx => tx.type === 'income'  && txYearMonth(tx) === ym).reduce((s, tx) => s + tx.amount, 0));
  const expense = months.map(ym => allTransactions.filter(tx => tx.type === 'expense' && txYearMonth(tx) === ym).reduce((s, tx) => s + tx.amount, 0));

  const labels = months.map(ym => {
    const [ly, lm] = ym.split('-').map(Number);
    return new Date(ly, lm - 1, 1).toLocaleDateString('id-ID', { month: 'short', year: '2-digit' });
  });

  return { labels, income, expense };
}

/**
 * Tren saldo harian dalam bulan tertentu (saldo kumulatif per hari).
 * @param {Array<Object>} allTransactions
 * @param {string} yearMonth
 * @returns {{ labels: string[], balances: number[] }}
 */
export function getDailySaldoTrend(allTransactions, yearMonth) {
  const total = daysInMonth(yearMonth);
  const [y, m] = yearMonth.split('-').map(Number);

  const labels   = [];
  const balances = [];
  let cumulative = 0;

  for (let d = 1; d <= total; d++) {
    const day = String(d).padStart(2, '0');
    const dateStr = `${yearMonth}-${day}`;
    const dayTxs = allTransactions.filter(tx => tx.date === dateStr);
    dayTxs.forEach(tx => {
      cumulative += tx.type === 'income' ? tx.amount : -tx.amount;
    });
    labels.push(String(d));
    balances.push(cumulative);
  }

  return { labels, balances };
}

/**
 * Rata-rata pengeluaran harian dalam bulan.
 * @param {Array<Object>} allTransactions
 * @param {string} yearMonth
 * @returns {number}
 */
export function getDailyAvgExpense(allTransactions, yearMonth) {
  const total = allTransactions
    .filter(tx => tx.type === 'expense' && txYearMonth(tx) === yearMonth)
    .reduce((s, tx) => s + tx.amount, 0);
  return total / daysInMonth(yearMonth);
}

/**
 * Kategori pengeluaran terbesar dalam bulan.
 * @param {Array<Object>} allTransactions
 * @param {string} yearMonth
 * @returns {{ category: string, amount: number } | null}
 */
export function getBiggestExpenseCategory(allTransactions, yearMonth) {
  const byCategory = getExpenseByCategory(allTransactions, yearMonth);
  const entries = Object.entries(byCategory);
  if (entries.length === 0) return null;
  const [category, amount] = entries.sort((a, b) => b[1] - a[1])[0];
  return { category, amount };
}

/**
 * Persentase perubahan income & expense dibanding bulan sebelumnya.
 * @param {Array<Object>} allTransactions
 * @param {string} yearMonth
 * @returns {{ incomePct: number|null, expensePct: number|null }}
 */
export function getPreviousMonthComparison(allTransactions, yearMonth) {
  const [y, m] = yearMonth.split('-').map(Number);
  const prevYM = dateToYM(new Date(y, m - 2, 1));

  const cur  = getMonthSummary(allTransactions, yearMonth);
  const prev = getMonthSummary(allTransactions, prevYM);

  const pct = (cur, prev) => prev === 0 ? null : Math.round(((cur - prev) / prev) * 100);
  return {
    incomePct:  pct(cur.income,  prev.income),
    expensePct: pct(cur.expense, prev.expense),
  };
}
