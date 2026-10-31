/**
 * ui.js
 * Tanggung jawab: semua operasi DOM — render list, update ringkasan, kelola state form.
 * Tidak ada logika bisnis di sini.
 */

import { getCategories } from './transactions.js';

// ─── Format ──────────────────────────────────────────────────────────────────

export function formatRupiah(amount) {
  return new Intl.NumberFormat('id-ID', {
    style: 'currency', currency: 'IDR', minimumFractionDigits: 0,
  }).format(amount);
}

function formatDate(dateStr) {
  return new Date(dateStr + 'T00:00:00').toLocaleDateString('id-ID', {
    day: '2-digit', month: 'short', year: 'numeric',
  });
}

function escapeHtml(str) {
  return String(str ?? '')
    .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}

// ─── Summary ─────────────────────────────────────────────────────────────────

export function renderSummary({ income, expense, balance }) {
  document.getElementById('summary-income').textContent  = formatRupiah(income);
  document.getElementById('summary-expense').textContent = formatRupiah(expense);
  const balanceEl = document.getElementById('summary-balance');
  balanceEl.textContent = formatRupiah(balance);
  balanceEl.className   = balance >= 0 ? 'text-lg font-bold text-blue-600 dark:text-blue-400' : 'text-lg font-bold text-red-600 dark:text-red-400';
}

// ─── Stats Cards ─────────────────────────────────────────────────────────────

export function renderStats(stats) {
  const el = document.getElementById('stats-cards');
  if (!el) return;
  const { income, expense, balance, dailyAvg, biggestCat, incomePct, expensePct } = stats;

  const pctBadge = (pct, invert = false) => {
    if (pct === null) return '';
    const up   = pct > 0;
    const good = invert ? !up : up;
    const cls  = pct === 0 ? 'text-gray-400' : (good ? 'text-green-600' : 'text-red-500');
    return `<span class="text-xs ${cls} ml-1">${up ? '▲' : '▼'} ${Math.abs(pct)}%</span>`;
  };

  el.innerHTML = `
    <div class="grid grid-cols-2 gap-3 sm:grid-cols-3">
      <div class="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-4">
        <p class="text-xs text-gray-500 dark:text-gray-400 mb-1">Pemasukan</p>
        <p class="font-bold text-green-600">${formatRupiah(income)}</p>
        ${pctBadge(incomePct, false)}
      </div>
      <div class="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-4">
        <p class="text-xs text-gray-500 dark:text-gray-400 mb-1">Pengeluaran</p>
        <p class="font-bold text-red-600">${formatRupiah(expense)}</p>
        ${pctBadge(expensePct, true)}
      </div>
      <div class="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-4 col-span-2 sm:col-span-1">
        <p class="text-xs text-gray-500 dark:text-gray-400 mb-1">Saldo Bulan Ini</p>
        <p class="font-bold ${balance >= 0 ? 'text-blue-600' : 'text-red-600'}">${formatRupiah(balance)}</p>
      </div>
      <div class="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-4">
        <p class="text-xs text-gray-500 dark:text-gray-400 mb-1">Rata-rata Pengeluaran/Hari</p>
        <p class="font-semibold text-gray-800 dark:text-gray-100">${formatRupiah(Math.round(dailyAvg))}</p>
      </div>
      <div class="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-4 col-span-2 sm:col-span-2">
        <p class="text-xs text-gray-500 dark:text-gray-400 mb-1">Kategori Terbesar</p>
        <p class="font-semibold text-gray-800 dark:text-gray-100">
          ${biggestCat
            ? `${escapeHtml(biggestCat.category)} <span class="text-red-500">(${formatRupiah(biggestCat.amount)})</span>`
            : '<span class="text-gray-400">–</span>'}
        </p>
      </div>
    </div>`;
}

// ─── Budget ───────────────────────────────────────────────────────────────────

/**
 * Render daftar budget dengan progress bar ke #budget-list.
 * @param {Array<{ budget, spent, pct, status }>} progressList
 * @param {Function} onDelete callback(id)
 */
export function renderBudgetList(progressList, onDelete) {
  const el = document.getElementById('budget-list');
  if (!el) return;

  if (progressList.length === 0) {
    el.innerHTML = `<p class="text-sm text-gray-400 dark:text-gray-500 text-center py-6">
      Belum ada budget. Tambahkan di formulir di bawah.</p>`;
    return;
  }

  el.innerHTML = progressList.map(({ budget, spent, pct, status }) => {
    const barColor = status === 'over'  ? 'bg-red-500'
                   : status === 'warn'  ? 'bg-yellow-400'
                   : 'bg-green-500';
    const badgeColor = status === 'over'  ? 'bg-red-100 text-red-700 dark:bg-red-900 dark:text-red-300'
                     : status === 'warn'  ? 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900 dark:text-yellow-300'
                     : 'bg-gray-100 text-gray-600 dark:bg-gray-700 dark:text-gray-300';
    const badge = status === 'over' ? '⚠️ Melebihi batas' : status === 'warn' ? '⚠️ Hampir habis' : '';

    return `
      <div class="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-4">
        <div class="flex items-center justify-between mb-2">
          <div class="flex items-center gap-2">
            <span class="font-medium text-sm text-gray-800 dark:text-gray-100">${escapeHtml(budget.category)}</span>
            ${badge ? `<span class="text-xs px-2 py-0.5 rounded-full ${badgeColor}">${badge}</span>` : ''}
          </div>
          <button class="btn-del-budget text-xs text-red-400 hover:text-red-600" data-id="${budget.id}">Hapus</button>
        </div>
        <div class="w-full bg-gray-100 dark:bg-gray-700 rounded-full h-2 mb-1">
          <div class="${barColor} h-2 rounded-full transition-all" style="width:${Math.min(pct, 100)}%"></div>
        </div>
        <div class="flex justify-between text-xs text-gray-500 dark:text-gray-400">
          <span>${formatRupiah(spent)} terpakai</span>
          <span>${pct}% dari ${formatRupiah(budget.limit)}</span>
        </div>
      </div>`;
  }).join('');

  el.querySelectorAll('.btn-del-budget').forEach(btn => {
    btn.addEventListener('click', () => onDelete(btn.dataset.id));
  });
}

// ─── Savings ──────────────────────────────────────────────────────────────────

/**
 * Render daftar savings goals ke #savings-list.
 * @param {Array<{ goal, saved, pct, remaining, estimatedDate, willMeetDeadline }>} progressList
 * @param {Function} onDelete callback(id)
 */
export function renderSavingsList(progressList, onDelete) {
  const el = document.getElementById('savings-list');
  if (!el) return;

  if (progressList.length === 0) {
    el.innerHTML = `<p class="text-sm text-gray-400 dark:text-gray-500 text-center py-6">
      Belum ada target tabungan.</p>`;
    return;
  }

  el.innerHTML = progressList.map(({ goal, saved, pct, remaining, estimatedDate, willMeetDeadline }) => {
    const estText = estimatedDate
      ? `Estimasi selesai: ${formatDate(estimatedDate)} ${willMeetDeadline === false ? '⚠️ Mungkin terlambat' : willMeetDeadline ? '✅' : ''}`
      : 'Tidak cukup data untuk estimasi';

    return `
      <div class="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-4">
        <div class="flex items-center justify-between mb-1">
          <span class="font-medium text-sm text-gray-800 dark:text-gray-100">${escapeHtml(goal.name)}</span>
          <button class="btn-del-saving text-xs text-red-400 hover:text-red-600" data-id="${goal.id}">Hapus</button>
        </div>
        <p class="text-xs text-gray-500 dark:text-gray-400 mb-2">
          Target: ${formatRupiah(goal.target)} · Tenggat: ${formatDate(goal.deadline)}
        </p>
        <div class="w-full bg-gray-100 dark:bg-gray-700 rounded-full h-2 mb-1">
          <div class="bg-blue-500 h-2 rounded-full transition-all" style="width:${pct}%"></div>
        </div>
        <div class="flex justify-between text-xs text-gray-500 dark:text-gray-400 mb-1">
          <span>${formatRupiah(saved)} terkumpul</span>
          <span>${pct}%</span>
        </div>
        <p class="text-xs text-gray-400 dark:text-gray-500">${estText}</p>
      </div>`;
  }).join('');

  el.querySelectorAll('.btn-del-saving').forEach(btn => {
    btn.addEventListener('click', () => onDelete(btn.dataset.id));
  });
}

// ─── Recurring ────────────────────────────────────────────────────────────────

/**
 * Render daftar transaksi berulang ke #recurring-list.
 * @param {Array<Object>} rules
 * @param {Function} onDelete callback(id)
 */
export function renderRecurringList(rules, onDelete) {
  const el = document.getElementById('recurring-list');
  if (!el) return;

  if (rules.length === 0) {
    el.innerHTML = `<p class="text-sm text-gray-400 dark:text-gray-500 text-center py-6">
      Belum ada transaksi berulang.</p>`;
    return;
  }

  el.innerHTML = rules.map(rule => {
    const isIncome = rule.type === 'income';
    return `
      <div class="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 px-4 py-3 flex items-center gap-3">
        <div class="w-2 self-stretch rounded-full ${isIncome ? 'bg-green-500' : 'bg-red-500'}"></div>
        <div class="flex-1 min-w-0">
          <div class="flex items-center gap-2">
            <span class="text-xs font-medium px-2 py-0.5 rounded-full
              ${isIncome ? 'bg-green-50 text-green-700 dark:bg-green-900 dark:text-green-300' : 'bg-red-50 text-red-700 dark:bg-red-900 dark:text-red-300'}">
              ${escapeHtml(rule.category)}
            </span>
            <span class="text-xs text-gray-400 dark:text-gray-500">${rule.freq === 'daily' ? 'Harian' : rule.freq === 'weekly' ? 'Mingguan' : 'Bulanan'}</span>
          </div>
          ${rule.note ? `<p class="text-sm text-gray-600 dark:text-gray-300 mt-0.5 truncate">${escapeHtml(rule.note)}</p>` : ''}
          <p class="text-xs text-gray-400 dark:text-gray-500">Mulai: ${formatDate(rule.startDate)} · Terakhir: ${rule.lastRun ? formatDate(rule.lastRun) : '–'}</p>
        </div>
        <div class="text-right shrink-0">
          <p class="font-semibold text-sm ${isIncome ? 'text-green-600' : 'text-red-600'}">
            ${isIncome ? '+' : '−'}${formatRupiah(rule.amount)}
          </p>
          <button class="btn-del-rec text-xs text-red-400 hover:text-red-600 mt-1" data-id="${rule.id}">Hapus</button>
        </div>
      </div>`;
  }).join('');

  el.querySelectorAll('.btn-del-rec').forEach(btn => {
    btn.addEventListener('click', () => onDelete(btn.dataset.id));
  });
}

// ─── Insights ─────────────────────────────────────────────────────────────────

/**
 * Render daftar insight ke #insights-list.
 * @param {Array<{ type: 'warning'|'info'|'success', text: string }>} insights
 */
export function renderInsights(insights) {
  const el = document.getElementById('insights-list');
  if (!el) return;

  if (insights.length === 0) {
    el.innerHTML = `<p class="text-sm text-gray-400 dark:text-gray-500 text-center py-4">
      Tidak ada insight untuk bulan ini.</p>`;
    return;
  }

  const cfg = {
    warning: { icon: '⚠️', cls: 'bg-yellow-50 border-yellow-300 text-yellow-800 dark:bg-yellow-900/30 dark:border-yellow-600 dark:text-yellow-300' },
    info:    { icon: 'ℹ️', cls: 'bg-blue-50 border-blue-200 text-blue-800 dark:bg-blue-900/30 dark:border-blue-600 dark:text-blue-300' },
    success: { icon: '✅', cls: 'bg-green-50 border-green-200 text-green-800 dark:bg-green-900/30 dark:border-green-600 dark:text-green-300' },
  };

  el.innerHTML = insights.map(({ type, text }) => {
    const { icon, cls } = cfg[type] ?? cfg.info;
    return `<div class="flex gap-2 border rounded-lg px-3 py-2 text-sm ${cls}">
      <span>${icon}</span>
      <span>${escapeHtml(text)}</span>
    </div>`;
  }).join('');
}

// ─── Category Manager ─────────────────────────────────────────────────────────

/**
 * Render daftar kategori kustom ke #custom-cats-income dan #custom-cats-expense.
 * @param {{ income: string[], expense: string[] }} customCats
 * @param {Function} onRemove callback(type, name)
 */
export function renderCustomCategories(customCats, onRemove) {
  ['income', 'expense'].forEach(type => {
    const el = document.getElementById(`custom-cats-${type}`);
    if (!el) return;
    const cats = customCats[type] ?? [];
    el.innerHTML = cats.length === 0
      ? `<span class="text-xs text-gray-400 dark:text-gray-500">Belum ada kategori kustom.</span>`
      : cats.map(cat => `
          <span class="inline-flex items-center gap-1 bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-200
                       text-xs px-2 py-1 rounded-full">
            ${escapeHtml(cat)}
            <button class="btn-rm-cat text-gray-400 hover:text-red-500 font-bold leading-none"
                    data-type="${type}" data-name="${escapeHtml(cat)}">×</button>
          </span>`).join('');

    el.querySelectorAll('.btn-rm-cat').forEach(btn => {
      btn.addEventListener('click', () => onRemove(btn.dataset.type, btn.dataset.name));
    });
  });
}

// ─── Transaction List ─────────────────────────────────────────────────────────

export function renderTransactions(transactions, onEdit, onDelete) {
  const listEl  = document.getElementById('transaction-list');
  const emptyEl = document.getElementById('empty-state');

  listEl.innerHTML = '';

  if (transactions.length === 0) {
    listEl.classList.add('hidden');
    emptyEl.classList.remove('hidden');
    return;
  }

  listEl.classList.remove('hidden');
  emptyEl.classList.add('hidden');

  transactions.forEach(tx => {
    const isIncome = tx.type === 'income';
    const card = document.createElement('div');
    card.className = 'bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 px-4 py-3 flex items-center gap-3';
    card.dataset.id = tx.id;

    card.innerHTML = `
      <div class="w-2 self-stretch rounded-full ${isIncome ? 'bg-green-500' : 'bg-red-500'}"></div>
      <div class="flex-1 min-w-0">
        <div class="flex items-center gap-2">
          <span class="text-xs font-medium px-2 py-0.5 rounded-full
            ${isIncome
              ? 'bg-green-50 text-green-700 dark:bg-green-900 dark:text-green-300'
              : 'bg-red-50 text-red-700 dark:bg-red-900 dark:text-red-300'}">
            ${escapeHtml(tx.category)}
          </span>
          <span class="text-xs text-gray-400 dark:text-gray-500">${formatDate(tx.date)}</span>
        </div>
        ${tx.note ? `<p class="text-sm text-gray-600 dark:text-gray-300 mt-0.5 truncate">${escapeHtml(tx.note)}</p>` : ''}
      </div>
      <div class="text-right shrink-0">
        <p class="font-semibold text-sm ${isIncome ? 'text-green-600' : 'text-red-600'}">
          ${isIncome ? '+' : '−'}${formatRupiah(tx.amount)}
        </p>
        <div class="flex gap-2 justify-end mt-1">
          <button class="btn-edit text-xs text-blue-500 hover:text-blue-700" data-id="${tx.id}">Edit</button>
          <button class="btn-delete text-xs text-red-400 hover:text-red-600" data-id="${tx.id}">Hapus</button>
        </div>
      </div>`;

    card.querySelector('.btn-edit').addEventListener('click', () => onEdit(tx.id));
    card.querySelector('.btn-delete').addEventListener('click', () => onDelete(tx.id));
    listEl.appendChild(card);
  });
}

// ─── Load More ────────────────────────────────────────────────────────────────

export function renderLoadMore(visible, remaining) {
  const btn = document.getElementById('btn-load-more');
  if (!btn) return;
  if (visible) {
    btn.textContent = `Muat Lebih Banyak (${remaining} lagi)`;
    btn.classList.remove('hidden');
  } else {
    btn.classList.add('hidden');
  }
}

// ─── Empty State ──────────────────────────────────────────────────────────────

export function renderEmptyState(reason, onSeed) {
  const el = document.getElementById('empty-state');
  if (!el) return;

  if (reason === 'no-data') {
    el.innerHTML = `
      <div class="py-10 text-center">
        <p class="text-4xl mb-3">📋</p>
        <p class="font-medium text-gray-700 dark:text-gray-200 mb-1">Belum ada transaksi</p>
        <p class="text-sm text-gray-400 mb-4">Tambahkan transaksi pertama kamu, atau coba data contoh.</p>
        <button id="btn-seed" class="bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium px-4 py-2 rounded-lg transition-colors">
          Isi Data Contoh
        </button>
      </div>`;
    document.getElementById('btn-seed')?.addEventListener('click', onSeed);
  } else {
    el.innerHTML = `
      <div class="py-10 text-center">
        <p class="text-4xl mb-3">🔍</p>
        <p class="font-medium text-gray-700 dark:text-gray-200 mb-1">Tidak ada hasil</p>
        <p class="text-sm text-gray-400">Coba ubah filter atau kata kunci pencarian.</p>
      </div>`;
  }
}

// ─── Filter Bar ───────────────────────────────────────────────────────────────

export function renderFilterBar(allTransactions, selectedYM) {
  const select = document.getElementById('filter-month');
  if (!select) return;
  const monthSet = new Set(allTransactions.map(tx => tx.date.slice(0, 7)));
  monthSet.add(selectedYM);
  const months = Array.from(monthSet).sort().reverse();
  select.innerHTML = '';
  months.forEach(ym => {
    const [y, m] = ym.split('-').map(Number);
    const label  = new Date(y, m - 1, 1).toLocaleDateString('id-ID', { month: 'long', year: 'numeric' });
    const opt    = document.createElement('option');
    opt.value = ym; opt.textContent = label;
    if (ym === selectedYM) opt.selected = true;
    select.appendChild(opt);
  });
}

// ─── Form State ───────────────────────────────────────────────────────────────

/**
 * Memperbarui opsi <select> kategori (form input) sesuai tipe yang dipilih.
 * Menggunakan kategori gabungan bawaan + kustom.
 * @param {string} type 'income' | 'expense'
 */
export function updateCategoryOptions(type) {
  const selectEl = document.getElementById('input-category');
  const currentValue = selectEl.value;
  selectEl.innerHTML = '<option value="">Pilih kategori...</option>';
  if (!type) return;
  const allCats = getCategories();
  allCats[type].forEach(cat => {
    const opt = document.createElement('option');
    opt.value = cat; opt.textContent = cat;
    if (cat === currentValue) opt.selected = true;
    selectEl.appendChild(opt);
  });
}

export function populateFormForEdit(tx) {
  document.getElementById('edit-id').value     = tx.id;
  document.getElementById('input-date').value   = tx.date;
  document.getElementById('input-amount').value = tx.amount;
  document.getElementById('input-note').value   = tx.note;
  const radioEl = document.querySelector(`input[name="type"][value="${tx.type}"]`);
  if (radioEl) radioEl.checked = true;
  updateCategoryOptions(tx.type);
  document.getElementById('input-category').value = tx.category;
  document.getElementById('form-title').textContent = 'Edit Transaksi';
  document.getElementById('btn-submit').textContent  = 'Perbarui';
  document.getElementById('btn-cancel').classList.remove('hidden');
  document.getElementById('transaction-form').scrollIntoView({ behavior: 'smooth', block: 'start' });
}

export function resetForm() {
  const form = document.getElementById('transaction-form');
  form.reset();
  document.getElementById('edit-id').value = '';
  updateCategoryOptions('');
  document.getElementById('form-title').textContent = 'Tambah Transaksi';
  document.getElementById('btn-submit').textContent  = 'Simpan';
  document.getElementById('btn-cancel').classList.add('hidden');
  clearFormError();
}

export function showFormError(message) {
  const el = document.getElementById('form-error');
  el.textContent = message;
  el.classList.remove('hidden');
}

export function clearFormError() {
  const el = document.getElementById('form-error');
  el.textContent = '';
  el.classList.add('hidden');
}
