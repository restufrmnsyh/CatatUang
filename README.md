# CatatUang — Pencatat Keuangan Pribadi

Aplikasi web pencatat keuangan pribadi untuk mahasiswa. Dibangun dengan HTML, JavaScript ES6+ vanilla, dan Tailwind CSS — tanpa backend, semua data tersimpan di `localStorage`.

[![Tests](https://img.shields.io/badge/tests-69%20passed-brightgreen)](#cara-menjalankan-test)
[![Coverage](https://img.shields.io/badge/coverage-87%25%20functions-green)](#cara-menjalankan-test)

---

## Fitur

| Kategori | Fitur |
|---|---|
| **Transaksi** | Tambah, edit, hapus pemasukan & pengeluaran |
| **Riwayat** | Cari catatan, filter tipe/kategori/bulan, sort, load more |
| **Dashboard** | Ringkasan 3 kartu, 5 kartu statistik, badge % vs bulan lalu |
| **Grafik** | Donut pengeluaran per kategori, bar 6 bulan, line tren saldo harian |
| **Insight** | 7 aturan rule-based otomatis (naik >30%, dominasi, defisit, dll.) |
| **Budget** | Budget bulanan per kategori + progress bar + peringatan 80%/100% |
| **Tabungan** | Target dengan estimasi tanggal tercapai & indikator deadline |
| **Berulang** | Aturan harian/mingguan/bulanan, dijalankan otomatis saat buka app |
| **Export** | JSON (semua data) dan CSV (transaksi saja) |
| **Import** | JSON & CSV dengan validasi baris per baris, mode merge/replace |
| **Dark mode** | Sistem / terang / gelap — tersimpan di preferensi |
| **Kategori kustom** | Tambah & hapus kategori pemasukan/pengeluaran |

---

## Tech Stack

| Layer | Teknologi |
|---|---|
| Markup | HTML5 |
| Logika | JavaScript ES6+ (module) |
| Styling | Tailwind CSS v3 via CDN |
| Grafik | Chart.js 4 via CDN |
| Penyimpanan | `localStorage` |
| Testing | Vitest 1.x + @vitest/coverage-v8 |
| Linting | ESLint 9 (flat config) |
| Formatting | Prettier 3 |

---

## Struktur Folder

```
Project-IBM-FinancialRecord/
├── index.html              # Markup utama + tab UI
├── js/
│   ├── app.js              # Entry point: event listeners, init
│   ├── schema.js           # Versi skema + migrasi localStorage
│   ├── storage.js          # Baca/tulis localStorage (error handling)
│   ├── transactions.js     # CRUD transaksi, filter/sort, kategori kustom
│   ├── analytics.js        # Fungsi agregasi murni (pure functions)
│   ├── budget.js           # CRUD budget + progress
│   ├── savings.js          # CRUD target tabungan + estimasi
│   ├── recurring.js        # CRUD aturan berulang + engine
│   ├── insights.js         # Insight rule-based (pure functions)
│   ├── charts.js           # Wrapper Chart.js (donut, bar, line)
│   ├── ui.js               # Render DOM — tidak ada logika bisnis
│   ├── toast.js            # Notifikasi toast non-blocking
│   ├── darkmode.js         # Dark mode + sinkronisasi sistem
│   └── exportimport.js     # Export JSON/CSV, import dengan validasi
├── tests/
│   ├── analytics.test.js   # 16 tests
│   ├── transactions.test.js# 20 tests
│   ├── budget.test.js      # 10 tests
│   ├── savings.test.js     #  8 tests
│   ├── schema.test.js      #  7 tests
│   └── insights.test.js    #  8 tests
├── package.json
├── vitest.config.js
├── eslint.config.js
└── .prettierrc
```

---

## Cara Menjalankan

### 🌐 Online (GitHub Pages)

Langsung buka di browser tanpa instalasi apapun:

**https://restufrmnsyh.github.io/CatatUang/**

### Prasyarat (Local)
- Browser modern (Chrome 90+, Firefox 90+, Safari 15+)
- Python 3 atau VS Code + Live Server extension

### Development (Local)
```bash
# Clone atau buka folder project
cd Project-IBM-FinancialRecord

# Jalankan local HTTP server (wajib untuk ES modules)
python -m http.server 8080

# Atau dengan VS Code:
# Klik kanan index.html → "Open with Live Server"
```

Buka **http://localhost:8080** di browser.

> ⚠️ Jangan buka `index.html` langsung via `file://` — ES modules tidak bekerja di protokol `file://`.

---

## Cara Menjalankan Test

```bash
# Install dependensi (sekali saja)
npm install

# Jalankan semua test
npm test

# Jalankan dengan coverage report
npm run test:coverage

# Watch mode (re-run saat file berubah)
npm run test:watch
```

Output coverage saat ini:

| File | Functions | Lines |
|------|-----------|-------|
| `analytics.js`    | 100% | 100% |
| `budget.js`       | 100% | 100% |
| `insights.js`     | 100% | 100% |
| `savings.js`      | 100% | 100% |
| `schema.js`       | 100% | 96%  |
| `transactions.js` | 54%  | 66%  |
| **Total**         | **88%** | **89%** |

---

## Linting & Formatting

```bash
# Cek lint
npm run lint

# Auto-fix lint
npm run lint:fix

# Format semua file
npm run format
```

---

## Arsitektur

```
┌─────────────────────────────────────────────────────┐
│  index.html  (markup + tab panels + bottom nav)      │
│                    │                                  │
│              app.js (entry point)                     │
│          ┌────┬────┬────┬────┬────┐                  │
│       trans  analyt budget saving recur              │
│          │       │                   │               │
│       storage   insights          toast              │
│          │                                            │
│       schema  (migrasi localStorage)                  │
│                                                       │
│  ui.js  ← render DOM ← data dari modul-modul atas    │
│  charts.js ← wrapper Chart.js                         │
└─────────────────────────────────────────────────────┘
```

**Prinsip desain:**
- **`analytics.js`, `insights.js`** — fungsi murni (*pure*), tidak menyentuh DOM atau storage → mudah diuji
- **`storage.js`** — satu-satunya pintu masuk ke localStorage, dengan error handling quota dan korupsi data
- **`schema.js`** — semua key localStorage terpusat, versi skema mencegah breaking change saat upgrade
- **`ui.js`** — render-only, tidak ada logika bisnis
- **`app.js`** — menyatukan semua modul; state filter disimpan dalam satu object `state`

---

## Skema Data localStorage

| Key | Tipe | Isi |
|-----|------|-----|
| `cu_schema_version` | `string` | Versi integer (`"2"`) |
| `cu_transactions`   | `Array` | `[{ id, type, date, amount, category, note, createdAt }]` |
| `cu_budgets`        | `Array` | `[{ id, yearMonth, category, limit }]` |
| `cu_savings`        | `Array` | `[{ id, name, target, deadline, createdAt }]` |
| `cu_recurring`      | `Array` | `[{ id, type, category, amount, note, freq, startDate, lastRun }]` |
| `cu_custom_categories` | `Object` | `{ income: string[], expense: string[] }` |
| `cu_dark_mode`      | `string` | `'system' \| 'on' \| 'off'` |

---

## Kontribusi

Project ini dibuat sebagai capstone project. Untuk mengembangkan lebih lanjut:

1. Fork repository
2. Buat branch fitur: `git checkout -b feat/nama-fitur`
3. Pastikan semua test lulus: `npm test`
4. Buat Pull Request

---

*Dibuat oleh Muhammad Restu Firmansyah — UPN "Veteran" Yogyakarta*
