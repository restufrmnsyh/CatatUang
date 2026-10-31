/**
 * exportimport.js
 * Tanggung jawab: export ke JSON/CSV dan import dengan validasi.
 */

import { KEY_TX, KEY_BUDGETS, KEY_SAVINGS, KEY_RECURRING, KEY_CUSTOM_CATS } from './schema.js';

// ─── Helpers ──────────────────────────────────────────────────────────────────

function readKey(key, def) {
  try { return JSON.parse(localStorage.getItem(key) ?? JSON.stringify(def)); }
  catch { return def; }
}

function triggerDownload(filename, content, mime) {
  const blob = new Blob([content], { type: mime });
  const url  = URL.createObjectURL(blob);
  const a    = document.createElement('a');
  a.href = url; a.download = filename; a.click();
  URL.revokeObjectURL(url);
}

// ─── Export ───────────────────────────────────────────────────────────────────

/**
 * Export semua data ke file JSON.
 */
export function exportJSON() {
  const payload = {
    version:          2,
    exportedAt:       new Date().toISOString(),
    transactions:     readKey(KEY_TX, []),
    budgets:          readKey(KEY_BUDGETS, []),
    savings:          readKey(KEY_SAVINGS, []),
    recurring:        readKey(KEY_RECURRING, []),
    customCategories: readKey(KEY_CUSTOM_CATS, { income: [], expense: [] }),
  };
  const filename = `catat-uang-${new Date().toISOString().slice(0, 10)}.json`;
  triggerDownload(filename, JSON.stringify(payload, null, 2), 'application/json');
}

/**
 * Export hanya transaksi ke file CSV.
 */
export function exportCSV() {
  const txs = readKey(KEY_TX, []);
  const header = 'id,type,date,amount,category,note,createdAt';
  const rows = txs.map(tx =>
    [tx.id, tx.type, tx.date, tx.amount, `"${(tx.category ?? '').replace(/"/g, '""')}"`, `"${(tx.note ?? '').replace(/"/g, '""')}"`, tx.createdAt ?? ''].join(',')
  );
  const csv = [header, ...rows].join('\n');
  const filename = `catat-uang-transaksi-${new Date().toISOString().slice(0, 10)}.csv`;
  triggerDownload(filename, '\uFEFF' + csv, 'text/csv;charset=utf-8'); // BOM untuk Excel
}

// ─── Import ───────────────────────────────────────────────────────────────────

/** Validasi satu transaksi dari JSON */
function validateTx(tx) {
  if (typeof tx !== 'object' || tx === null) return false;
  if (!tx.id || typeof tx.id !== 'string')   return false;
  if (!['income', 'expense'].includes(tx.type)) return false;
  if (!tx.date || !/^\d{4}-\d{2}-\d{2}$/.test(tx.date)) return false;
  if (typeof tx.amount !== 'number' || tx.amount <= 0)   return false;
  if (!tx.category || typeof tx.category !== 'string')   return false;
  return true;
}

/** Validasi satu row CSV → objek transaksi */
function parseCsvRow(row) {
  // Sederhana: split comma tapi hormati quoted fields
  const cols = [];
  let cur = '', inQuote = false;
  for (const ch of row) {
    if (ch === '"') { inQuote = !inQuote; }
    else if (ch === ',' && !inQuote) { cols.push(cur); cur = ''; }
    else { cur += ch; }
  }
  cols.push(cur);
  if (cols.length < 5) return null;
  const [id, type, date, amountStr, category, note = '', createdAt = ''] = cols;
  const amount = Number(amountStr);
  const tx = { id: id.trim(), type: type.trim(), date: date.trim(), amount, category: category.trim(), note: note.trim(), createdAt: createdAt.trim() };
  return validateTx(tx) ? tx : null;
}

/**
 * Import dari file JSON atau CSV.
 * Mode 'merge': tambahkan record baru, lewati yang sudah ada (berdasarkan id).
 * Mode 'replace': timpa semua data transaksi.
 *
 * @param {File} file
 * @param {'merge'|'replace'} mode
 * @returns {Promise<{ imported: number, skipped: number, errors: string[] }>}
 */
export async function importFile(file, mode = 'merge') {
  const text   = await file.text();
  const errors = [];
  let toImport = [];
  let budgets = null, savings = null, recurring = null, customCats = null;

  if (file.name.endsWith('.json')) {
    let parsed;
    try { parsed = JSON.parse(text); }
    catch { return { imported: 0, skipped: 0, errors: ['File JSON tidak valid.'] }; }

    if (!parsed.transactions || !Array.isArray(parsed.transactions)) {
      return { imported: 0, skipped: 0, errors: ['Format JSON tidak dikenali. Field "transactions" wajib ada.'] };
    }

    parsed.transactions.forEach((tx, i) => {
      if (validateTx(tx)) toImport.push(tx);
      else errors.push(`Baris JSON transactions[${i}] tidak valid, dilewati.`);
    });

    // Ambil data non-transaksi jika ada
    if (Array.isArray(parsed.budgets))          budgets    = parsed.budgets;
    if (Array.isArray(parsed.savings))          savings    = parsed.savings;
    if (Array.isArray(parsed.recurring))        recurring  = parsed.recurring;
    if (parsed.customCategories)                customCats = parsed.customCategories;

  } else if (file.name.endsWith('.csv')) {
    const lines = text.replace(/^\uFEFF/, '').split('\n').filter(l => l.trim());
    const header = lines[0]?.toLowerCase() ?? '';
    if (!header.startsWith('id,type,date')) {
      return { imported: 0, skipped: 0, errors: ['Header CSV tidak cocok. Gunakan file yang diekspor dari CatatUang.'] };
    }
    lines.slice(1).forEach((line, i) => {
      const tx = parseCsvRow(line);
      if (tx) toImport.push(tx);
      else errors.push(`Baris CSV ${i + 2} tidak valid, dilewati.`);
    });

  } else {
    return { imported: 0, skipped: 0, errors: ['Format file tidak didukung. Gunakan .json atau .csv.'] };
  }

  // Tulis ke localStorage
  let imported = 0, skipped = 0;

  if (mode === 'replace') {
    localStorage.setItem(KEY_TX, JSON.stringify(toImport));
    imported = toImport.length;
  } else {
    const existing = readKey(KEY_TX, []);
    const existingIds = new Set(existing.map(tx => tx.id));
    const merged = [...existing];
    toImport.forEach(tx => {
      if (existingIds.has(tx.id)) { skipped++; }
      else { merged.push(tx); imported++; }
    });
    localStorage.setItem(KEY_TX, JSON.stringify(merged));
  }

  // Tulis data non-transaksi jika ada (JSON import)
  if (budgets)    localStorage.setItem(KEY_BUDGETS,     JSON.stringify(budgets));
  if (savings)    localStorage.setItem(KEY_SAVINGS,     JSON.stringify(savings));
  if (recurring)  localStorage.setItem(KEY_RECURRING,   JSON.stringify(recurring));
  if (customCats) localStorage.setItem(KEY_CUSTOM_CATS, JSON.stringify(customCats));

  return { imported, skipped, errors };
}
