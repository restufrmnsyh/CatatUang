/**
 * app.js
 * Entry point: migrasi skema, wire semua modul dan event listeners.
 */

// ── 0. Toast (import pertama — dipakai di seluruh modul termasuk error handler) ─
import { initToast, showToast } from './toast.js';
initToast();

// ── 1. Migrasi skema (harus pertama, sebelum modul lain membaca localStorage) ─
import { migrate, resetAppData } from './schema.js';
migrate();

// ── 2. Dark mode (terapkan sebelum render agar tidak flash) ───────────────────
import { initDarkMode, cycleDarkPref, getDarkPref } from './darkmode.js';
initDarkMode();

// ── 3. Recurring transactions engine ─────────────────────────────────────────
import { runDueRecurring, getRecurring, addRecurring, deleteRecurring } from './recurring.js';
try {
  const created = runDueRecurring();
  if (created > 0) showToast(`${created} transaksi berulang dibuat otomatis.`, 'info');
} catch (err) {
  showToast(err.message, 'error');
}

// ── 4. Imports lainnya ────────────────────────────────────────────────────────
import {
  getTransactions,
  addTransaction,
  updateTransaction,
  deleteTransaction,
  filterTransactions,
  paginate,
  seedSampleData,
  getCategories,
  CATEGORIES,
  getCustomCategories,
  addCustomCategory,
  removeCustomCategory,
} from './transactions.js';

import {
  renderTransactions,
  renderSummary,
  renderStats,
  renderLoadMore,
  renderEmptyState,
  renderFilterBar,
  renderBudgetList,
  renderSavingsList,
  renderRecurringList,
  renderInsights,
  renderCustomCategories,
  updateCategoryOptions,
  populateFormForEdit,
  resetForm,
  showFormError,
  clearFormError,
} from './ui.js';

import {
  getMonthSummary,
  getExpenseByCategory,
  getMonthlyTrend,
  getDailySaldoTrend,
  getDailyAvgExpense,
  getBiggestExpenseCategory,
  getPreviousMonthComparison,
} from './analytics.js';

import { updateDonutChart, updateBarChart, updateLineChart } from './charts.js';

import { getBudgets, upsertBudget, deleteBudget, getBudgetProgress } from './budget.js';
import { getSavingsGoals, addSavingsGoal, deleteSavingsGoal, getSavingsProgress } from './savings.js';
import { generateInsights } from './insights.js';
import { exportJSON, exportCSV, importFile } from './exportimport.js';

// ─── State ────────────────────────────────────────────────────────────────────

const PAGE_SIZE = 10;

const state = {
  yearMonth: currentYearMonth(),
  search:    '',
  type:      '',
  category:  '',
  sort:      'date-desc',
  limit:     PAGE_SIZE,
  tab:       'dashboard', // 'dashboard' | 'budget' | 'savings' | 'recurring' | 'settings'
};

function currentYearMonth() {
  const now = new Date();
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
}

// ─── Tab Navigation ───────────────────────────────────────────────────────────

/** Urutan tab untuk navigasi geser */
const TAB_ORDER = ['dashboard', 'budget', 'savings', 'recurring', 'settings'];

function switchTab(tab) {
  state.tab = tab;

  // Tampilkan konten tab yang aktif
  document.querySelectorAll('.tab-content').forEach(el => el.classList.add('hidden'));
  document.getElementById(`tab-${tab}`)?.classList.remove('hidden');

  // Update bottom nav: warna aktif + indikator + aria
  document.querySelectorAll('.tab-btn').forEach(btn => {
    const active = btn.dataset.tab === tab;
    btn.setAttribute('aria-selected', active ? 'true' : 'false');
    btn.setAttribute('tabindex',      active ? '0' : '-1');
    // Warna teks
    btn.classList.toggle('text-blue-600',       active);
    btn.classList.toggle('dark:text-blue-400',  active);
    btn.classList.toggle('text-gray-400',       !active);
    btn.classList.toggle('dark:text-gray-500',  !active);
    // Indikator garis bawah
    const ind = btn.querySelector('.tab-indicator');
    if (ind) {
      ind.classList.toggle('bg-blue-600',       active);
      ind.classList.toggle('dark:bg-blue-400',  active);
      ind.classList.toggle('bg-transparent',    !active);
    }
  });

  // Scroll ke atas saat pindah tab
  window.scrollTo({ top: 0, behavior: 'smooth' });

  // Render konten tab yang dipilih
  if (tab === 'budget')    refreshBudget();
  if (tab === 'savings')   refreshSavings();
  if (tab === 'recurring') refreshRecurring();
  if (tab === 'settings')  refreshSettings();
}

// ─── Main Refresh ─────────────────────────────────────────────────────────────

function refresh() {
  const all = getTransactions();

  renderFilterBar(all, state.yearMonth);

  const monthSummary = getMonthSummary(all, state.yearMonth);
  renderSummary(monthSummary);

  const { incomePct, expensePct } = getPreviousMonthComparison(all, state.yearMonth);
  renderStats({
    ...monthSummary,
    dailyAvg:   getDailyAvgExpense(all, state.yearMonth),
    biggestCat: getBiggestExpenseCategory(all, state.yearMonth),
    incomePct,
    expensePct,
  });

  updateDonutChart(getExpenseByCategory(all, state.yearMonth));
  updateBarChart(getMonthlyTrend(all, state.yearMonth));
  updateLineChart(getDailySaldoTrend(all, state.yearMonth));

  renderInsights(generateInsights(all, state.yearMonth));

  // Riwayat + filter
  const filtered = filterTransactions(all, {
    yearMonth: state.yearMonth,
    search:    state.search,
    type:      state.type,
    category:  state.category,
    sort:      state.sort,
  });

  const { visible, hasMore } = paginate(filtered, state.limit);

  if (filtered.length === 0) {
    renderEmptyState(all.length === 0 ? 'no-data' : 'no-results', handleSeed);
    renderTransactions([], handleEdit, handleDelete);
  } else {
    renderTransactions(visible, handleEdit, handleDelete);
  }
  renderLoadMore(hasMore, filtered.length - state.limit);

  // Refresh tab aktif jika bukan dashboard
  if (state.tab === 'budget')    refreshBudget();
  if (state.tab === 'savings')   refreshSavings();
  if (state.tab === 'recurring') refreshRecurring();
}

// ─── Tab: Budget ──────────────────────────────────────────────────────────────

function refreshBudget() {
  const all = getTransactions();
  renderBudgetList(getBudgetProgress(all, state.yearMonth), id => {
    deleteBudget(id);
    refreshBudget();
  });
  // Isi opsi kategori di form budget
  populateBudgetCategorySelect();
}

function populateBudgetCategorySelect() {
  const sel = document.getElementById('budget-category');
  if (!sel) return;
  const allCats = getCategories();
  const current = sel.value;
  sel.innerHTML = '<option value="">Pilih kategori...</option>';
  allCats.expense.forEach(cat => {
    const opt = document.createElement('option');
    opt.value = cat; opt.textContent = cat;
    if (cat === current) opt.selected = true;
    sel.appendChild(opt);
  });
}

// ─── Tab: Savings ─────────────────────────────────────────────────────────────

function refreshSavings() {
  const all = getTransactions();
  renderSavingsList(getSavingsProgress(all), id => {
    deleteSavingsGoal(id);
    refreshSavings();
  });
}

// ─── Tab: Recurring ───────────────────────────────────────────────────────────

function refreshRecurring() {
  renderRecurringList(getRecurring(), id => {
    deleteRecurring(id);
    refreshRecurring();
  });
  populateRecurringCategorySelect();
}

function populateRecurringCategorySelect() {
  const typeSel = document.getElementById('rec-type');
  const catSel  = document.getElementById('rec-category');
  if (!typeSel || !catSel) return;
  const type    = typeSel.value;
  const allCats = getCategories();
  const cats    = type === 'income' ? allCats.income : type === 'expense' ? allCats.expense : [];
  const current = catSel.value;
  catSel.innerHTML = '<option value="">Pilih kategori...</option>';
  cats.forEach(cat => {
    const opt = document.createElement('option');
    opt.value = cat; opt.textContent = cat;
    if (cat === current) opt.selected = true;
    catSel.appendChild(opt);
  });
}

// ─── Tab: Settings ────────────────────────────────────────────────────────────

function refreshSettings() {
  renderCustomCategories(getCustomCategories(), (type, name) => {
    removeCustomCategory(type, name);
    refreshSettings();
    updateCategoryOptions(''); // reset form kategori utama
  });
}

// ─── Handlers: Transaksi ──────────────────────────────────────────────────────

function handleEdit(id) {
  const tx = getTransactions().find(t => t.id === id);
  if (tx) {
    switchTab('dashboard');
    populateFormForEdit(tx);
  }
}

function handleDelete(id) {
  if (!confirm('Hapus transaksi ini?')) return;
  deleteTransaction(id);
  state.limit = PAGE_SIZE;
  refresh();
}

function handleSeed() {
  seedSampleData();
  state.limit = PAGE_SIZE;
  refresh();
}

// ─── Validasi form transaksi ──────────────────────────────────────────────────

function validate({ type, date, amount, category }) {
  if (!type)     return 'Pilih tipe transaksi.';
  if (!date)     return 'Tanggal wajib diisi.';
  if (!amount || Number(amount) <= 0) return 'Nominal harus lebih dari 0.';
  if (!category) return 'Pilih kategori.';
  return null;
}

// ─── Event Listeners: Form Transaksi ─────────────────────────────────────────

document.querySelectorAll('input[name="type"]').forEach(radio => {
  radio.addEventListener('change', () => {
    updateCategoryOptions(radio.value);
    clearFormError();
  });
});

document.getElementById('transaction-form').addEventListener('submit', e => {
  e.preventDefault();
  const form   = e.target;
  const typeEl = form.querySelector('input[name="type"]:checked');
  const data   = {
    type:     typeEl?.value ?? '',
    date:     form.date.value,
    amount:   form.amount.value,
    category: form.category.value,
    note:     form.note.value,
  };

  const error = validate(data);
  if (error) { showFormError(error); return; }
  clearFormError();

  try {
    const editId = document.getElementById('edit-id').value;
    if (editId) { updateTransaction(editId, data); showToast('Transaksi diperbarui.', 'success'); }
    else        { addTransaction(data);              showToast('Transaksi ditambahkan.', 'success'); }
    resetForm();
    state.limit = PAGE_SIZE;
    refresh();
  } catch (err) {
    showToast(err.message, 'error');
  }
});

document.getElementById('btn-cancel').addEventListener('click', () => resetForm());

// ─── Event Listeners: Filter & Search ────────────────────────────────────────

document.getElementById('filter-month').addEventListener('change', e => {
  state.yearMonth = e.target.value;
  state.limit = PAGE_SIZE;
  refresh();
});

document.getElementById('search-input').addEventListener('input', e => {
  state.search = e.target.value;
  state.limit  = PAGE_SIZE;
  refresh();
});

document.getElementById('filter-type').addEventListener('change', e => {
  state.type     = e.target.value;
  state.category = '';
  state.limit    = PAGE_SIZE;
  syncCategoryFilter();
  refresh();
});

document.getElementById('filter-category').addEventListener('change', e => {
  state.category = e.target.value;
  state.limit    = PAGE_SIZE;
  refresh();
});

document.getElementById('sort-select').addEventListener('change', e => {
  state.sort  = e.target.value;
  state.limit = PAGE_SIZE;
  refresh();
});

document.getElementById('btn-load-more').addEventListener('click', () => {
  state.limit += PAGE_SIZE;
  refresh();
});

// ─── Sync filter kategori ─────────────────────────────────────────────────────

function syncCategoryFilter() {
  const sel     = document.getElementById('filter-category');
  const allCats = getCategories();
  sel.innerHTML = '<option value="">Semua Kategori</option>';
  const cats = state.type === 'income'
    ? allCats.income
    : state.type === 'expense'
      ? allCats.expense
      : [...allCats.income, ...allCats.expense];

  cats.forEach(cat => {
    const opt = document.createElement('option');
    opt.value = cat; opt.textContent = cat;
    if (cat === state.category) opt.selected = true;
    sel.appendChild(opt);
  });
}

// ─── Event Listeners: Tab Navigation ─────────────────────────────────────────

document.querySelectorAll('.tab-btn').forEach(btn => {
  btn.addEventListener('click', () => switchTab(btn.dataset.tab));
});

// ─── Event Listeners: Budget Form ────────────────────────────────────────────

document.getElementById('budget-form')?.addEventListener('submit', e => {
  e.preventDefault();
  const form = e.target;
  const cat  = form['budget-category'].value;
  const lim  = Number(form['budget-limit'].value);
  if (!cat)    { showToast('Pilih kategori budget.', 'warning'); return; }
  if (lim <= 0){ showToast('Limit harus lebih dari 0.', 'warning'); return; }
  try {
    upsertBudget({ yearMonth: state.yearMonth, category: cat, limit: lim });
    showToast('Budget disimpan.', 'success');
    form.reset();
    populateBudgetCategorySelect();
    refreshBudget();
  } catch (err) { showToast(err.message, 'error'); }
});

// ─── Event Listeners: Savings Form ───────────────────────────────────────────

document.getElementById('savings-form')?.addEventListener('submit', e => {
  e.preventDefault();
  const form = e.target;
  const name   = form['saving-name'].value.trim();
  const target = Number(form['saving-target'].value);
  const dl     = form['saving-deadline'].value;
  if (!name)     { showToast('Nama target wajib diisi.', 'warning'); return; }
  if (target<=0) { showToast('Target harus lebih dari 0.', 'warning'); return; }
  if (!dl)       { showToast('Tenggat wajib diisi.', 'warning'); return; }
  try {
    addSavingsGoal({ name, target, deadline: dl });
    showToast('Target tabungan ditambahkan.', 'success');
    form.reset();
    refreshSavings();
  } catch (err) { showToast(err.message, 'error'); }
});

// ─── Event Listeners: Recurring Form ─────────────────────────────────────────

document.getElementById('rec-type')?.addEventListener('change', () => populateRecurringCategorySelect());

document.getElementById('recurring-form')?.addEventListener('submit', e => {
  e.preventDefault();
  const form = e.target;
  const type  = form['rec-type'].value;
  const cat   = form['rec-category'].value;
  const amt   = Number(form['rec-amount'].value);
  const note  = form['rec-note'].value;
  const freq  = form['rec-freq'].value;
  const start = form['rec-start'].value;
  if (!type)   { showToast('Pilih tipe.', 'warning'); return; }
  if (!cat)    { showToast('Pilih kategori.', 'warning'); return; }
  if (amt <= 0){ showToast('Nominal harus lebih dari 0.', 'warning'); return; }
  if (!freq)   { showToast('Pilih frekuensi.', 'warning'); return; }
  if (!start)  { showToast('Tanggal mulai wajib diisi.', 'warning'); return; }
  try {
    addRecurring({ type, category: cat, amount: amt, note, freq, startDate: start });
    showToast('Aturan berulang ditambahkan.', 'success');
    form.reset();
    populateRecurringCategorySelect();
    refreshRecurring();
  } catch (err) { showToast(err.message, 'error'); }
});

// ─── Event Listeners: Export/Import ──────────────────────────────────────────

document.getElementById('btn-export-json')?.addEventListener('click', () => {
  exportJSON();
  showToast('Data diekspor sebagai JSON.', 'success');
});
document.getElementById('btn-export-csv')?.addEventListener('click', () => {
  exportCSV();
  showToast('Transaksi diekspor sebagai CSV.', 'success');
});

const resetDialog = document.getElementById('reset-confirm-dialog');
document.getElementById('btn-reset-data')?.addEventListener('click', () => {
  resetDialog.returnValue = '';
  resetDialog.showModal();
});

resetDialog?.addEventListener('close', () => {
  if (resetDialog.returnValue !== 'reset') return;

  try {
    resetAppData();
    state.search = '';
    state.type = '';
    state.category = '';
    state.sort = 'date-desc';
    state.limit = PAGE_SIZE;
    document.getElementById('search-input').value = '';
    document.getElementById('filter-type').value = '';
    document.getElementById('sort-select').value = state.sort;
    document.getElementById('budget-form').reset();
    document.getElementById('savings-form').reset();
    document.getElementById('recurring-form').reset();
    document.getElementById('form-add-cat-income').reset();
    document.getElementById('form-add-cat-expense').reset();
    resetForm();
    syncCategoryFilter();
    refresh();
    refreshBudget();
    refreshSavings();
    refreshRecurring();
    refreshSettings();
    showToast('Semua data berhasil direset.', 'success');
  } catch (err) {
    showToast(err.message, 'error');
  }
});

document.getElementById('import-file')?.addEventListener('change', async e => {
  const file = e.target.files[0];
  if (!file) return;
  const mode = document.getElementById('import-mode')?.value ?? 'merge';
  try {
    const result = await importFile(file, mode);
    showToast(`Import selesai: ${result.imported} ditambahkan, ${result.skipped} dilewati.`, 'success');
    if (result.errors.length) {
      result.errors.forEach(err => showToast(err, 'warning', 5000));
    }
  } catch (err) {
    showToast(err.message, 'error');
  }
  e.target.value = '';
  state.limit = PAGE_SIZE;
  refresh();
});

// ─── Event Listeners: Dark Mode ──────────────────────────────────────────────

document.getElementById('btn-dark-toggle')?.addEventListener('click', () => { cycleDarkPref(); syncDarkToggleButtons(); });
document.getElementById('btn-dark-toggle-settings')?.addEventListener('click', () => { cycleDarkPref(); syncDarkToggleButtons(); });

// ─── Event Listeners: Custom Categories ──────────────────────────────────────

document.getElementById('form-add-cat-income')?.addEventListener('submit', e => {
  e.preventDefault();
  const inp = document.getElementById('input-add-cat-income');
  const ok  = addCustomCategory('income', inp.value);
  if (!ok) { showToast('Kategori sudah ada atau tidak valid.', 'warning'); return; }
  inp.value = '';
  showToast('Kategori pemasukan ditambahkan.', 'success');
  refreshSettings();
  syncCategoryFilter();
});

document.getElementById('form-add-cat-expense')?.addEventListener('submit', e => {
  e.preventDefault();
  const inp = document.getElementById('input-add-cat-expense');
  const ok  = addCustomCategory('expense', inp.value);
  if (!ok) { showToast('Kategori sudah ada atau tidak valid.', 'warning'); return; }
  inp.value = '';
  showToast('Kategori pengeluaran ditambahkan.', 'success');
  refreshSettings();
  syncCategoryFilter();
  populateBudgetCategorySelect();
});

// ─── Sync dark toggle button labels ──────────────────────────────────────────

function syncDarkToggleButtons() {
  const labels = { system: 'Sistem', on: 'Gelap', off: 'Terang' };
  const label  = labels[getDarkPref()] ?? 'Sistem';
  const h = document.getElementById('btn-dark-toggle');
  const s = document.getElementById('btn-dark-toggle-settings');
  if (h) h.textContent = label;
  if (s) s.textContent = label;
}

// ─── Swipe Gesture (geser kiri/kanan antar tab) ───────────────────────────────

(function initSwipe() {
  const el = document.getElementById('main-swipe');
  if (!el) return;

  let startX = 0;
  let startY = 0;
  let moved  = false;

  el.addEventListener('touchstart', e => {
    startX = e.touches[0].clientX;
    startY = e.touches[0].clientY;
    moved  = false;
  }, { passive: true });

  el.addEventListener('touchmove', e => {
    moved = true;
  }, { passive: true });

  el.addEventListener('touchend', e => {
    if (!moved) return;
    const dx = e.changedTouches[0].clientX - startX;
    const dy = e.changedTouches[0].clientY - startY;

    // Hanya proses geser horizontal yang dominan (bukan scroll vertikal)
    if (Math.abs(dx) < 50 || Math.abs(dx) < Math.abs(dy) * 1.5) return;

    const idx = TAB_ORDER.indexOf(state.tab);
    if (dx < 0 && idx < TAB_ORDER.length - 1) {
      // Geser ke kiri → tab berikutnya
      switchTab(TAB_ORDER[idx + 1]);
    } else if (dx > 0 && idx > 0) {
      // Geser ke kanan → tab sebelumnya
      switchTab(TAB_ORDER[idx - 1]);
    }
  }, { passive: true });
})();

// ─── Init ─────────────────────────────────────────────────────────────────────

syncCategoryFilter();
syncDarkToggleButtons();
switchTab('dashboard');
refresh();
