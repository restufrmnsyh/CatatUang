/**
 * charts.js
 * Tanggung jawab: membuat dan memperbarui tiga grafik Chart.js.
 * Mengimpor data dari analytics.js.
 * Chart.js tersedia sebagai global window.Chart dari CDN.
 */

// Instance grafik yang disimpan untuk diperbarui tanpa recreate
let donutChart = null;
let barChart   = null;
let lineChart  = null;

const DONUT_COLORS = [
  '#3b82f6', '#ef4444', '#f59e0b', '#10b981', '#8b5cf6', '#ec4899',
];

// ─── Helpers ──────────────────────────────────────────────────────────────────

function formatRp(val) {
  return new Intl.NumberFormat('id-ID', {
    style: 'currency', currency: 'IDR', minimumFractionDigits: 0,
  }).format(val);
}

// Destroy chart instance safely
function destroyIfExists(chartRef) {
  if (chartRef) { chartRef.destroy(); }
}

// ─── Donut: Pengeluaran per Kategori ─────────────────────────────────────────

/**
 * @param {Object} byCategory   { [category]: number }  dari getExpenseByCategory()
 */
export function updateDonutChart(byCategory) {
  const canvas = document.getElementById('chart-donut');
  if (!canvas) return;

  const labels = Object.keys(byCategory);
  const data   = Object.values(byCategory);
  const hasData = data.length > 0 && data.some(v => v > 0);

  const emptyEl = document.getElementById('chart-donut-empty');
  if (!hasData) {
    canvas.classList.add('hidden');
    if (emptyEl) emptyEl.classList.remove('hidden');
    destroyIfExists(donutChart);
    donutChart = null;
    return;
  }
  canvas.classList.remove('hidden');
  if (emptyEl) emptyEl.classList.add('hidden');

  if (donutChart) {
    donutChart.data.labels   = labels;
    donutChart.data.datasets[0].data = data;
    donutChart.update();
    return;
  }

  donutChart = new Chart(canvas, {
    type: 'doughnut',
    data: {
      labels,
      datasets: [{
        data,
        backgroundColor: DONUT_COLORS.slice(0, labels.length),
        borderWidth: 2,
        borderColor: '#ffffff',
      }],
    },
    options: {
      responsive: true,
      maintainAspectRatio: true,
      cutout: '60%',
      plugins: {
        legend: {
          position: 'bottom',
          labels: { font: { size: 11 }, boxWidth: 12, padding: 10 },
        },
        tooltip: {
          callbacks: {
            label: ctx => ` ${ctx.label}: ${formatRp(ctx.parsed)}`,
          },
        },
      },
    },
  });
}

// ─── Bar: Pemasukan vs Pengeluaran 6 Bulan ────────────────────────────────────

/**
 * @param {{ labels: string[], income: number[], expense: number[] }} trend
 */
export function updateBarChart(trend) {
  const canvas = document.getElementById('chart-bar');
  if (!canvas) return;

  if (barChart) {
    barChart.data.labels              = trend.labels;
    barChart.data.datasets[0].data   = trend.income;
    barChart.data.datasets[1].data   = trend.expense;
    barChart.update();
    return;
  }

  barChart = new Chart(canvas, {
    type: 'bar',
    data: {
      labels: trend.labels,
      datasets: [
        {
          label: 'Pemasukan',
          data: trend.income,
          backgroundColor: 'rgba(22, 163, 74, 0.75)',
          borderRadius: 4,
        },
        {
          label: 'Pengeluaran',
          data: trend.expense,
          backgroundColor: 'rgba(220, 38, 38, 0.75)',
          borderRadius: 4,
        },
      ],
    },
    options: {
      responsive: true,
      maintainAspectRatio: true,
      plugins: {
        legend: {
          position: 'bottom',
          labels: { font: { size: 11 }, boxWidth: 12, padding: 10 },
        },
        tooltip: {
          callbacks: {
            label: ctx => ` ${ctx.dataset.label}: ${formatRp(ctx.parsed.y)}`,
          },
        },
      },
      scales: {
        y: {
          beginAtZero: true,
          ticks: {
            font: { size: 10 },
            callback: val => formatRp(val),
          },
          grid: { color: '#f3f4f6' },
        },
        x: { ticks: { font: { size: 10 } }, grid: { display: false } },
      },
    },
  });
}

// ─── Line: Tren Saldo Harian ──────────────────────────────────────────────────

/**
 * @param {{ labels: string[], balances: number[] }} dailyTrend
 */
export function updateLineChart(dailyTrend) {
  const canvas = document.getElementById('chart-line');
  if (!canvas) return;

  if (lineChart) {
    lineChart.data.labels              = dailyTrend.labels;
    lineChart.data.datasets[0].data   = dailyTrend.balances;
    lineChart.update();
    return;
  }

  lineChart = new Chart(canvas, {
    type: 'line',
    data: {
      labels: dailyTrend.labels,
      datasets: [{
        label: 'Saldo',
        data: dailyTrend.balances,
        borderColor: '#3b82f6',
        backgroundColor: 'rgba(59,130,246,0.08)',
        fill: true,
        tension: 0.3,
        pointRadius: 2,
        pointHoverRadius: 5,
      }],
    },
    options: {
      responsive: true,
      maintainAspectRatio: true,
      plugins: {
        legend: { display: false },
        tooltip: {
          callbacks: {
            title: ctx => `Hari ke-${ctx[0].label}`,
            label: ctx => ` Saldo: ${formatRp(ctx.parsed.y)}`,
          },
        },
      },
      scales: {
        y: {
          ticks: {
            font: { size: 10 },
            callback: val => formatRp(val),
          },
          grid: { color: '#f3f4f6' },
        },
        x: { ticks: { font: { size: 10 }, maxTicksLimit: 10 }, grid: { display: false } },
      },
    },
  });
}

/**
 * Reset semua instance chart (dipanggil saat perlu full reinit, misal DOM direcreate).
 */
export function resetCharts() {
  destroyIfExists(donutChart); donutChart = null;
  destroyIfExists(barChart);   barChart   = null;
  destroyIfExists(lineChart);  lineChart  = null;
}
