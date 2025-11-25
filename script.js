const monthMap = {
  enero: 1, febrero: 2, marzo: 3, abril: 4, mayo: 5, junio: 6,
  julio: 7, agosto: 8, septiembre: 9, setiembre: 9, octubre: 10, noviembre: 11, diciembre: 12
};

const formatter = new Intl.NumberFormat('es-ES', {
  maximumFractionDigits: 1,
  minimumFractionDigits: 1
});

const cards = {
  historical: document.getElementById('historical-avg'),
  avg2022: document.getElementById('avg-2022'),
  diff: document.getElementById('diff-percent'),
  riskLevel: document.getElementById('risk-level'),
  riskHint: document.getElementById('risk-hint'),
  conclusion: document.getElementById('conclusion-text'),
  riskCard: document.getElementById('risk-card')
};

const chartDescription = document.getElementById('chart-description');
const chartButtons = document.querySelectorAll('[data-view]');

const chartHints = {
  time: 'Curva mensual del volumen total embalsado.',
  comparison: 'Superposición de la media histórica y los valores de 2022 para detectar desviaciones.',
  monthly: 'Barras comparando la media histórica frente a los meses disponibles de 2022.'
};

let charts = {};
let cachedRecords = [];
let currentView = 'time';

document.addEventListener('DOMContentLoaded', () => {
  loadCsv();
});

function loadCsv() {
  Papa.parse('data/df_embalses_medio_limpio.csv', {
    download: true,
    header: true,
    skipEmptyLines: true,
    complete: (results) => {
      const cleaned = sanitizeRows(results.data);
      renderDashboard(cleaned);
    },
    error: (err) => {
      console.error('Error al cargar el CSV, usando datos simulados', err);
      renderDashboard(sampleData());
    }
  });
}

function sanitizeRows(rows) {
  return rows
    .map((row) => {
      const year = parseInt(row.anio || row.year || row.Year || row.Año, 10);
      const month = parseMonth(row.mes || row.Month || row.month);
      if (!year || !month) return null;

      let total = parseNumber(row.total || row.Total);
      if (Number.isNaN(total)) {
        total = sumEmbalses(row);
      }

      return { year, month, total };
    })
    .filter((row) => row && !Number.isNaN(row.total));
}

function parseMonth(value) {
  if (value === undefined || value === null) return null;
  if (!isNaN(Number(value))) return Number(value);
  const normalized = String(value).trim().toLowerCase();
  return monthMap[normalized] || null;
}

function parseNumber(value) {
  if (value === undefined || value === null || value === '') return NaN;
  const cleaned = String(value).replace(/\./g, '').replace(',', '.');
  return Number.parseFloat(cleaned);
}

function sumEmbalses(row) {
  const skipKeys = new Set(['anio', 'year', 'Year', 'Año', 'mes', 'Month', 'month', 'fecha', 'date', 'total', 'Total']);
  return Object.entries(row).reduce((acc, [key, val]) => {
    if (skipKeys.has(key)) return acc;
    const num = parseNumber(val);
    return Number.isNaN(num) ? acc : acc + num;
  }, 0);
}

function renderDashboard(records) {
  const ordered = records.sort((a, b) => a.year === b.year ? a.month - b.month : a.year - b.year);
  cachedRecords = ordered;
  const { historicalAvg, avg2022, diffPercent, risk } = computeIndicators(ordered);

  cards.historical.textContent = `${formatter.format(historicalAvg)} hm³`;
  cards.avg2022.textContent = `${formatter.format(avg2022)} hm³`;
  cards.diff.textContent = `${diffPercent > 0 ? '+' : ''}${formatter.format(diffPercent)} %`;
  cards.riskLevel.textContent = risk.label;
  cards.riskHint.textContent = risk.message;
  cards.conclusion.textContent = risk.conclusion;
  cards.riskCard.style.background = risk.background;

  attachControls();
  switchChart('time');
}

function computeIndicators(records) {
  const byYear = groupBy(records, 'year');
  const historicalYears = Object.keys(byYear).filter((y) => Number(y) !== 2022);
  const months = Array.from({ length: 12 }, (_, i) => i + 1);

  const monthlyHistoricalAvg = computeMonthlyHistoricalAverage(byYear, historicalYears, months);
  const avgHistorical = average(monthlyHistoricalAvg.filter((v) => !Number.isNaN(v)));
  const values2022 = (byYear[2022] || []).map((r) => r.total);
  const avg2022 = average(values2022);
  const diffPercent = ((avg2022 - avgHistorical) / avgHistorical) * 100;

  const ratio = avg2022 / avgHistorical;
  let risk = {
    label: 'Riesgo medio',
    message: 'Valores similares a la media histórica, vigilar tendencias.',
    background: 'linear-gradient(145deg, #f7b733, #fc8a17)',
    conclusion: '2022 se sitúa cerca de la media histórica; no hay una señal fuerte de sequía, pero conviene seguir los próximos meses.'
  };

  if (ratio <= 0.75) {
    risk = {
      label: 'Riesgo alto',
      message: '2022 está claramente por debajo del histórico.',
      background: 'linear-gradient(145deg, #c31432, #7a0f23)',
      conclusion: 'Los volúmenes de 2022 son mucho menores que la media; conviene activar medidas preventivas de sequía.'
    };
  } else if (ratio >= 0.9) {
    risk = {
      label: 'Riesgo bajo',
      message: '2022 está por encima o alineado con el histórico.',
      background: 'linear-gradient(145deg, #1d976c, #2fcb71)',
      conclusion: 'Los volúmenes de 2022 se mantienen igual o superiores al histórico, lo que reduce el riesgo inmediato de sequía.'
    };
  }

  return { historicalAvg: avgHistorical, avg2022, diffPercent, risk };
}

function groupBy(list, key) {
  return list.reduce((acc, item) => {
    const groupKey = item[key];
    if (!acc[groupKey]) acc[groupKey] = [];
    acc[groupKey].push(item);
    return acc;
  }, {});
}

function average(arr) {
  if (!arr.length) return NaN;
  const sum = arr.reduce((acc, v) => acc + v, 0);
  return sum / arr.length;
}

function computeMonthlyHistoricalAverage(byYear, historicalYears, months) {
  return months.map((month) => {
    const vals = historicalYears
      .map((y) => byYear[y]?.filter((r) => r.month === month).map((r) => r.total) || [])
      .flat();
    return average(vals);
  });
}

function attachControls() {
  chartButtons.forEach((btn) => {
    btn.addEventListener('click', () => switchChart(btn.dataset.view));
  });
}

function switchChart(view) {
  currentView = view;
  chartButtons.forEach((btn) => {
    btn.classList.toggle('active', btn.dataset.view === view);
  });
  chartDescription.textContent = chartHints[view];
  renderChart(view, cachedRecords);
}

function renderChart(view, records) {
  destroyChart('main');
  const ctx = document.getElementById('main-chart');
  const byYear = groupBy(records, 'year');
  const months = Array.from({ length: 12 }, (_, i) => i + 1);
  const historicalYears = Object.keys(byYear).filter((y) => Number(y) !== 2022);
  const monthlyHistoricalAvg = computeMonthlyHistoricalAverage(byYear, historicalYears, months);

  const chartBuilders = {
    time: () => {
      const labels = records.map((r) => `${r.year}-${String(r.month).padStart(2, '0')}`);
      const totals = records.map((r) => r.total);
      return {
        type: 'line',
        data: {
          labels,
          datasets: [{
            label: 'Total embalsado (hm³)',
            data: totals,
            borderColor: '#0a6ebd',
            backgroundColor: 'rgba(10, 110, 189, 0.12)',
            tension: 0.25,
            fill: true,
            pointRadius: 2.5,
            pointBackgroundColor: '#0a6ebd'
          }]
        }
      };
    },
    comparison: () => {
      const data2022 = months.map((m) => {
        const match = (byYear[2022] || []).find((r) => r.month === m);
        return match ? match.total : null;
      });
      return {
        type: 'line',
        data: {
          labels: months.map((m) => new Date(2022, m - 1, 1).toLocaleDateString('es-ES', { month: 'short' })),
          datasets: [
            {
              label: 'Media histórica',
              data: monthlyHistoricalAvg,
              borderColor: '#1d976c',
              backgroundColor: 'rgba(29, 151, 108, 0.12)',
              tension: 0.25,
              fill: true,
              pointRadius: 3,
              pointBackgroundColor: '#1d976c'
            },
            {
              label: 'Año 2022',
              data: data2022,
              borderColor: '#c31432',
              backgroundColor: 'rgba(195, 20, 50, 0.12)',
              tension: 0.25,
              fill: true,
              pointRadius: 3,
              pointBackgroundColor: '#c31432'
            }
          ]
        }
      };
    },
    monthly: () => {
      const data2022 = months.map((m) => {
        const match = (byYear[2022] || []).find((r) => r.month === m);
        return match ? match.total : null;
      });
      return {
        type: 'bar',
        data: {
          labels: months.map((m) => new Date(2022, m - 1, 1).toLocaleDateString('es-ES', { month: 'short' })),
          datasets: [
            {
              label: 'Media histórica',
              data: monthlyHistoricalAvg,
              backgroundColor: 'rgba(29, 151, 108, 0.45)',
              borderColor: '#1d976c',
              borderWidth: 1
            },
            {
              label: '2022',
              data: data2022,
              backgroundColor: 'rgba(10, 110, 189, 0.55)',
              borderColor: '#0a6ebd',
              borderWidth: 1
            }
          ]
        },
        options: {
          scales: {
            x: { stacked: false },
            y: { stacked: false, ticks: { callback: (val) => `${val} hm³` } }
          }
        }
      };
    }
  };

  const baseOptions = {
    responsive: true,
    maintainAspectRatio: false,
    scales: {
      y: {
        ticks: {
          callback: (val) => `${val} hm³`
        },
        grid: { color: 'rgba(82, 117, 138, 0.15)' }
      },
      x: {
        grid: { display: false },
        ticks: { autoSkip: true, maxTicksLimit: 12 }
      }
    },
    plugins: {
      legend: { display: true },
      tooltip: {
        callbacks: {
          label: (ctx) => `${ctx.dataset.label}: ${formatter.format(ctx.parsed.y)} hm³`
        }
      }
    }
  };

  const config = chartBuilders[view]();
  config.options = { ...baseOptions, ...(config.options || {}) };

  charts.main = new Chart(ctx, config);
}

function destroyChart(key) {
  if (charts[key]) {
    charts[key].destroy();
  }
}

function sampleData() {
  return [
    { year: 2020, month: 1, total: 520 },
    { year: 2020, month: 2, total: 505 },
    { year: 2020, month: 3, total: 498 },
    { year: 2021, month: 1, total: 540 },
    { year: 2021, month: 2, total: 538 },
    { year: 2021, month: 3, total: 510 },
    { year: 2022, month: 1, total: 430 },
    { year: 2022, month: 2, total: 420 },
    { year: 2022, month: 3, total: 410 }
  ];
}
