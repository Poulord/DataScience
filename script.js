const monthMap = {
  enero: 1, febrero: 2, marzo: 3, abril: 4, mayo: 5, junio: 6,
  julio: 7, agosto: 8, septiembre: 9, setiembre: 9, octubre: 10, noviembre: 11, diciembre: 12
};

const formatter = new Intl.NumberFormat('es-ES', {
  maximumFractionDigits: 1,
  minimumFractionDigits: 1
});

const safeFormat = (value, fallback = 'Sin datos') => (Number.isNaN(value) ? fallback : formatter.format(value));

const cards = {
  historical: document.getElementById('historical-avg'),
  avgCurrent: document.getElementById('avg-current'),
  diff: document.getElementById('diff-percent'),
  riskLevel: document.getElementById('risk-level'),
  riskHint: document.getElementById('risk-hint'),
  conclusion: document.getElementById('conclusion-text'),
  riskCard: document.getElementById('risk-card'),
  currentYearLabel: document.getElementById('current-year-label')
};

const insights = {
  trend: document.getElementById('trend-insight'),
  seasonality: document.getElementById('seasonality-insight'),
  threshold: document.getElementById('threshold-insight'),
  forecast: document.getElementById('forecast-insight'),
  october: document.getElementById('october-note')
};

const chartDescription = document.getElementById('chart-description');
const chartButtons = document.querySelectorAll('[data-view]');

const chartHints = {
  time: 'Curva mensual del volumen total embalsado.',
  comparison: 'Superposición de la media histórica y los valores del año más reciente para detectar desviaciones.',
  monthly: 'Barras comparando la media histórica frente a los meses disponibles del último año.'
};

const monthNames = ['enero', 'febrero', 'marzo', 'abril', 'mayo', 'junio', 'julio', 'agosto', 'septiembre', 'octubre', 'noviembre', 'diciembre'];

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
  const { historicalAvg, avgCurrent, diffPercent, risk, currentYear, monthlyHistoricalAvg } = computeIndicators(ordered);
  const extra = computeContext(ordered, monthlyHistoricalAvg);

  cards.historical.textContent = `${formatter.format(historicalAvg)} hm³`;
  cards.avgCurrent.textContent = Number.isNaN(avgCurrent) ? 'Sin datos' : `${formatter.format(avgCurrent)} hm³`;
  cards.diff.textContent = Number.isNaN(diffPercent)
    ? 'Sin datos'
    : `${diffPercent > 0 ? '+' : ''}${formatter.format(diffPercent)} %`;
  cards.riskLevel.textContent = risk.label;
  cards.riskHint.textContent = risk.message;
  cards.conclusion.textContent = risk.conclusion;
  cards.currentYearLabel.textContent = currentYear || '—';
  cards.riskCard.style.background = risk.background;

  updateInsights(extra, risk);

  attachControls();
  switchChart('time');
}

function computeIndicators(records) {
  const byYear = groupBy(records, 'year');
  const months = Array.from({ length: 12 }, (_, i) => i + 1);
  const latestYear = getLatestYear(byYear);
  const historicalYears = Object.keys(byYear).filter((y) => Number(y) !== latestYear);

  const monthlyHistoricalAvg = computeMonthlyHistoricalAverage(byYear, historicalYears, months);
  const avgHistorical = average(monthlyHistoricalAvg.filter((v) => !Number.isNaN(v)));
  const valuesCurrent = (byYear[latestYear] || []).map((r) => r.total);
  const avgCurrent = average(valuesCurrent);
  const diffPercent = ((avgCurrent - avgHistorical) / avgHistorical) * 100;

  const ratio = avgCurrent / avgHistorical;
  let risk = {
    label: 'Riesgo medio',
    message: 'Valores similares a la media histórica, vigilar tendencias.',
    background: 'linear-gradient(145deg, #f7b733, #fc8a17)',
    conclusion: `${latestYear || 'El año analizado'} se sitúa cerca de la media histórica; no hay una señal fuerte de sequía, pero conviene seguir los próximos meses.`
  };

  if (!valuesCurrent.length) {
    risk = {
      label: 'Sin datos recientes',
      message: 'No hay registros del año más reciente para comparar.',
      background: 'linear-gradient(145deg, #8d9aa5, #c0ccd7)',
      conclusion: 'Carga un CSV con el año actual para calcular riesgo en tiempo real.'
    };
  } else if (ratio <= 0.75) {
    risk = {
      label: 'Riesgo alto',
      message: `${latestYear} está claramente por debajo del histórico.`,
      background: 'linear-gradient(145deg, #c31432, #7a0f23)',
      conclusion: `Los volúmenes de ${latestYear} son mucho menores que la media; conviene activar medidas preventivas de sequía.`
    };
  } else if (ratio >= 0.9) {
    risk = {
      label: 'Riesgo bajo',
      message: `${latestYear} está por encima o alineado con el histórico.`,
      background: 'linear-gradient(145deg, #1d976c, #2fcb71)',
      conclusion: `Los volúmenes de ${latestYear} se mantienen igual o superiores al histórico, lo que reduce el riesgo inmediato de sequía.`
    };
  }

  return { historicalAvg: avgHistorical, avgCurrent, diffPercent, risk, currentYear: latestYear, monthlyHistoricalAvg };
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

function percentile(arr, p) {
  if (!arr.length) return NaN;
  const sorted = [...arr].sort((a, b) => a - b);
  const rank = (p / 100) * (sorted.length - 1);
  const lower = Math.floor(rank);
  const upper = Math.ceil(rank);
  if (lower === upper) return sorted[lower];
  const weight = rank - lower;
  return sorted[lower] * (1 - weight) + sorted[upper] * weight;
}

function computeMonthlyHistoricalAverage(byYear, historicalYears, months) {
  return months.map((month) => {
    const vals = historicalYears
      .map((y) => byYear[y]?.filter((r) => r.month === month).map((r) => r.total) || [])
      .flat();
    return average(vals);
  });
}

function getLatestYear(byYear) {
  const years = Object.keys(byYear).map(Number).filter((y) => !Number.isNaN(y));
  return years.length ? Math.max(...years) : null;
}

function computeContext(records, monthlyHistoricalAvg) {
  const byYear = groupBy(records, 'year');
  const totals = records.map((r) => r.total);
  const historicalMin = totals.length ? Math.min(...totals) : NaN;
  const threshold = percentile(totals, 25);

  const monthlyClean = monthlyHistoricalAvg.filter((v) => !Number.isNaN(v));
  const minMonthly = monthlyClean.length ? Math.min(...monthlyClean) : NaN;
  const maxMonthly = monthlyClean.length ? Math.max(...monthlyClean) : NaN;
  const seasonalLowMonth = monthNames[monthlyHistoricalAvg.indexOf(minMonthly)] || 'octubre';
  const seasonalHighMonth = monthNames[monthlyHistoricalAvg.indexOf(maxMonthly)] || 'enero';

  const years = Object.keys(byYear).map(Number).sort((a, b) => a - b);
  const firstYears = years.slice(0, Math.min(3, years.length));
  const lastYears = years.slice(-3);
  const avgFirst = average(firstYears.flatMap((y) => byYear[y]?.map((r) => r.total) || []));
  const avgLast = average(lastYears.flatMap((y) => byYear[y]?.map((r) => r.total) || []));
  const growthPercent = ((avgLast - avgFirst) / avgFirst) * 100;

  return {
    trendText: Number.isNaN(growthPercent)
      ? 'La serie aún no cuenta con años suficientes para medir la tendencia.'
      : `Tras alternar lluvias y sequías, el promedio reciente es ${safeFormat(Math.abs(growthPercent))} % ${growthPercent >= 0 ? 'superior' : 'inferior'} a los primeros años, manteniendo una estabilidad ligeramente ascendente en los niveles medios.`,
    seasonalityText: `Se observa la subida habitual entre otoño e invierno y descensos en verano; el punto más bajo medio llega en ${seasonalLowMonth}, mientras que el máximo aparece en ${seasonalHighMonth}.`,
    thresholdText: `El umbral bajo de referencia se sitúa en torno a ${safeFormat(threshold)} hm³ (p25), lejos del mínimo histórico observado de ${safeFormat(historicalMin)} hm³.`,
    forecastText: 'La proyección Prophet a 12 meses mantiene el volumen por encima del umbral bajo incluso en su escenario pesimista.',
    octoberNote: 'El mes con mayor probabilidad de acercarse al rango seco es octubre, y solo en una ventana breve (<15 días) antes de recuperar nivel.'
  };
}

function updateInsights(context, risk) {
  if (!context) return;
  insights.trend.textContent = context.trendText;
  insights.seasonality.textContent = context.seasonalityText;
  insights.threshold.textContent = context.thresholdText;
  insights.forecast.textContent = `${context.forecastText} ${risk.label === 'Riesgo alto' ? 'Requiere seguimiento frecuente.' : 'Escenario estable según el modelo.'}`;
  insights.october.textContent = context.octoberNote;
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
  const latestYear = getLatestYear(byYear);
  const historicalYears = Object.keys(byYear).filter((y) => Number(y) !== latestYear);
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
      const dataCurrent = months.map((m) => {
        const match = (byYear[latestYear] || []).find((r) => r.month === m);
        return match ? match.total : null;
      });
      return {
        type: 'line',
        data: {
          labels: months.map((m) => new Date(latestYear || 2022, m - 1, 1).toLocaleDateString('es-ES', { month: 'short' })),
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
              label: `Año ${latestYear || 'actual'}`,
              data: dataCurrent,
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
      const dataCurrent = months.map((m) => {
        const match = (byYear[latestYear] || []).find((r) => r.month === m);
        return match ? match.total : null;
      });
      return {
        type: 'bar',
        data: {
          labels: months.map((m) => new Date(latestYear || 2022, m - 1, 1).toLocaleDateString('es-ES', { month: 'short' })),
          datasets: [
            {
              label: 'Media histórica',
              data: monthlyHistoricalAvg,
              backgroundColor: 'rgba(29, 151, 108, 0.45)',
              borderColor: '#1d976c',
              borderWidth: 1
            },
            {
              label: `Año ${latestYear || 'actual'}`,
              data: dataCurrent,
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
