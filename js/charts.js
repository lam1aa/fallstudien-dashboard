/**
 * @file charts.js
 * @description Contains functions to configure and render ApexCharts visualizations for dashboard data.
 */

// ── Shared color palette ────────────────────────────────────────────────────
const PALETTE = {
  indigo: "#638ecb",
  indigoDark: "#b1c9ef",
};

// ── Category-number → color mapping (used across Bloom, competency, data-flow) ─
const CATEGORY_NUMBER_COLORS = {
  1: "#8e83a5",
  2: "#8ebeca",
  3: "#9fc796",
  4: "#f5c998",
  5: "#e89f7f",
  6: "#e57b7f",
};
const CATEGORY_DEFAULT_COLOR = "#abb0bc";

function getColorForCategoryLabel(label) {
  const match = String(label).trim().match(/^(\d)/);
  if (match && CATEGORY_NUMBER_COLORS[match[1]]) {
    return CATEGORY_NUMBER_COLORS[match[1]];
  }
  return CATEGORY_DEFAULT_COLOR;
}

// Bloom levels are numbered 1–5 (Erinnern...Bewerten), so reuse the same palette
const BLOOM_COLORS = [
  CATEGORY_NUMBER_COLORS[1],
  CATEGORY_NUMBER_COLORS[2],
  CATEGORY_NUMBER_COLORS[3],
  CATEGORY_NUMBER_COLORS[4],
  CATEGORY_NUMBER_COLORS[5],
  CATEGORY_NUMBER_COLORS[6],
  CATEGORY_DEFAULT_COLOR,
];

const HEATMAP_SCALE_WARM = [
  { from: 0, to: 0, color: "#f5f2ec", name: "0" },
  { from: 1, to: 1, color: "#F0B95B" },
  { from: 2, to: 2, color: "#F2996B" },
  { from: 3, to: 99, color: "#ec6925" },
];
const HEATMAP_SCALE_COOL = [
  { from: 0, to: 0, color: "#f5f2ec", name: "0" },
  { from: 1, to: 4, color: "#a5a6f0", name: "1–4" },
  { from: 5, to: 7, color: "#6C6FE0", name: "5–7" },
  { from: 8, to: 10, color: "#494dbd", name: "8–10" },
  { from: 11, to: 99, color: "#494c96", name: "11+ Lernziele" },
];

function formatToHours(minutes) {
  const hours = (minutes / 60).toFixed(1).replace(/\.0$/, "");
  return `${hours} h`;
}

// ── Workload two-tone palette generator ─────────────────────────────────────
// Alternates light/dark shades of one base hue across stacked segments
function buildWorkloadColors(count) {
  return Array.from({ length: count }, (_, i) =>
    i % 2 === 0 ? PALETTE.indigoDark : PALETTE.indigo
  );
}

/**
 * Renders the Teilnahmen (participation) radial and bar charts.
 * @param {Array} data - The raw participation JSON data.
 */
export function renderTeilnahmenCharts(data) {
  if (!Array.isArray(data)) return;

  const total = data.length;
  const positions = {};
  const disciplines = {};
  
  data.forEach(item => {
    const pos = item["Position der Person"];
    const disc = item["Disziplin der Person"];
    if (pos) positions[pos] = (positions[pos] || 0) + 1;
    if (disc) disciplines[disc] = (disciplines[disc] || 0) + 1;
  });
  
  const sortedPositions = Object.entries(positions).sort((a, b) => b[1] - a[1]);
  const sortedDisciplines = Object.entries(disciplines).sort((a, b) => b[1] - a[1]);

  const colorPalette = ["#1b4f8c", "#00b8c4", "#334155", "#85b9e0", "#a0aec0", "#475569", "#0ea5e9"];

  // 1. Radial Bar Chart for Career Positions
  const posLabels = sortedPositions.map(p => p[0]);
  const maxCount = sortedPositions.length > 0 ? sortedPositions[0][1] : 1;
  const posSeries = sortedPositions.map(p => Math.round((p[1] / maxCount) * 100)); // Proportional to max
  
  const container = document.querySelector("#teilnahmen-position-chart");
  if (container) {
    container.innerHTML = `<div id="teilnahmen-position-apex" class="w-100 d-flex justify-content-center"></div>`;

    const radialOptions = {
      series: posSeries,
      chart: {
        height: 380,
        type: 'radialBar',
      },
      plotOptions: {
        radialBar: {
          startAngle: -135, // Centered gauge style
          endAngle: 135,    // 270 degrees total
          hollow: {
            size: '40%',
          },
          track: {
            background: '#f1f5f9',
            margin: 6 
          },
          dataLabels: {
            name: {
              fontSize: '13px',
              color: '#334155',
              offsetY: 20
            },
            value: {
              fontSize: '28px',
              fontWeight: 'bold',
              color: '#1b4f8c',
              formatter: function (val) {
                // The val is the percentage (val = (count / maxCount) * 100). 
                // We reverse the math to show the true absolute count when hovered.
                return Math.round((val / 100) * maxCount);
              },
              offsetY: -10
            },
            total: {
              show: true,
              label: 'Teilnahmen',
              color: '#888',
              formatter: function () {
                return total;
              }
            }
          }
        }
      },
      colors: colorPalette,
      labels: posLabels,
      legend: {
        show: false
      },
      stroke: {
        lineCap: 'round'
      }
    };
    const radialEl = document.querySelector("#teilnahmen-position-apex");
    if (radialEl) new ApexCharts(radialEl, radialOptions).render();
  }

  // 2. Vertical Bar Chart for Disciplines
  const discContainer = document.querySelector("#teilnahmen-discipline-chart");
  if (discContainer) {
    const discLabels = sortedDisciplines.map(d => d[0]);
    const discSeries = sortedDisciplines.map(d => d[1]);
    
    const barOptions = {
      series: [{ name: 'Anzahl', data: discSeries }],
      chart: { type: 'bar', height: 350, toolbar: { show: false } },
      plotOptions: {
        bar: {
          borderRadius: 4,
          dataLabels: { position: 'center' }
        }
      },
      dataLabels: {
        enabled: true,
        style: { colors: ['#fff'] }
      },
      xaxis: { categories: discLabels },
      colors: ["#1b4f8c"],
      yaxis: { show: false },
      grid: { show: false }
    };
    new ApexCharts(discContainer, barOptions).render();
  }
}

/**
 * Renders the workload stacked line/area chart.
 * @param {Array} categories - The x-axis category labels (case study names).
 * @param {Array} series - The chart series data containing workload and word counts.
 */
export function renderWorkloadChart(categories, series) {
  const options = {
    chart: { type: "line", height: 420, stacked: true, toolbar: { show: true } },
    stroke: {
      width: series.map(s => {
        if (s.type === 'line') return 3;
        return 0;
      }),
      curve: 'smooth'
    },
    fill: {
      type: 'solid',
      opacity: series.map(s => s.type === 'area' ? 0.2 : 1)
    },
    markers: {
      size: series.map(s => s.type === 'line' ? 6 : 0),
      strokeWidth: 0,
      hover: { sizeOffset: 2 }
    },
    plotOptions: {
      bar: {
        horizontal: false,
        borderRadius: 4,
        dataLabels: {
          total: {
            enabled: true,
            formatter: function (val) {
              return formatToHours(val);
            },
            style: { color: "#373d3f", fontSize: "12px", fontWeight: 600 }
          }
        }
      }
    },
    xaxis: { categories },
    yaxis: series.map((s, index) => {
      if (s.name === 'Wörter (Hintergrund)' || s.name === 'Wörter') {
        return {
          show: s.name === 'Wörter',
          opposite: true,
          title: { text: "Wörter", style: { color: "#36b9cc", fontWeight: 600 } },
          labels: { formatter: (value) => Math.round(value).toLocaleString("de-DE"), style: { colors: "#36b9cc" } },
        };
      } else {
        const firstColIndex = series.findIndex(col => col.type !== 'area' && col.type !== 'line');
        return {
          seriesName: series[firstColIndex].name,
          show: index === firstColIndex,
          title: { text: "Zeitaufwand (Stunden)", style: { color: PALETTE.indigo } },
          labels: { formatter: (value) => formatToHours(Math.round(value)), style: { colors: PALETTE.indigo } },
        };
      }
    }),
    tooltip: {
      shared: false,
      intersect: true,
      y: {
        formatter: function (y, { seriesIndex, w }) {
           if(typeof y !== "undefined") {
            const sName = w.config.series[seriesIndex].name;
            if(sName === 'Wörter' || sName === 'Wörter (Hintergrund)') return Math.round(y).toLocaleString("de-DE") + " Wörter";
            return formatToHours(Math.round(y));
          }
          return y;
        }
      }
    },
    legend: { show: false },
    series,
    dataLabels: { enabled: false },
    colors: ["#36b9cc"].concat(buildWorkloadColors(series.length - 2)).concat(["#36b9cc"]),
  };
  const container = document.querySelector("#workload-chart");
  if (!container) return;
  if (window.workloadChartInstance) window.workloadChartInstance.destroy();
  window.workloadChartInstance = new ApexCharts(container, options);
  window.workloadChartInstance.render();
}

// ── Feature 3a, 3b: Bloom ────────────────────────────────────────────────────

/**
 * Renders a stacked bar chart showing the distribution of Bloom taxonomy levels per case study.
 * @param {Array} categories - The x-axis category labels.
 * @param {Array} series - The Bloom taxonomy series data.
 */
export function renderBloomPerCaseChart(categories, series) {
  const container = document.querySelector("#bloom-per-case-chart");
  if (!container) return;
  const options = {
    chart: { type: "bar", height: 380, stacked: true, toolbar: { show: true } },
    plotOptions: {
      bar: {
        horizontal: false,
        borderRadius: 3,
        dataLabels: {
          total: {
            enabled: true,
            style: { color: "#373d3f", fontSize: "12px", fontWeight: 600 }
          }
        }
      }
    },
    xaxis: { categories },
    yaxis: { title: { text: "Anzahl Lernziele" }, min: 0, forceNiceScale: true },
    legend: { position: "bottom" },
    colors: BLOOM_COLORS,
    series,
    dataLabels: { enabled: false }, // Hides labels inside segments
    tooltip: { shared: false, intersect: true },
  };
  if (window.bloomPerCaseInstance) window.bloomPerCaseInstance.destroy();
  window.bloomPerCaseInstance = new ApexCharts(container, options);
  window.bloomPerCaseInstance.render();
}

/**
 * Renders a global donut chart showing the overall distribution of Bloom taxonomy levels.
 * @param {Array} labels - The Bloom taxonomy labels.
 * @param {Array} values - The corresponding counts for each level.
 */
export function renderBloomGlobalChart(labels, values) {
  const container = document.querySelector("#bloom-global-chart");
  if (!container) return;
  const options = {
    chart: { type: "donut", height: 340 },
    labels,
    series: values,
    colors: BLOOM_COLORS,
    legend: {
      show: true,
      position: "right",
      offsetY: 10,
      formatter: function (seriesName, opts) {
        const count = opts.w.globals.series[opts.seriesIndex];
        return `${seriesName} (${count})`;
      },
      itemMargin: { vertical: 8 },
      markers: { width: 12, height: 12, radius: 12 }
    },
    plotOptions: {
      pie: { donut: { size: "55%" } }
    },
    dataLabels: {
      enabled: true,
      formatter: (val, opts) =>
        `${opts.w.globals.series[opts.seriesIndex]} (${Math.round(val)}%)`,
    },
    stroke: { width: 1, colors: ["#fff"] }
  };
  if (window.bloomGlobalInstance) window.bloomGlobalInstance.destroy();
  window.bloomGlobalInstance = new ApexCharts(container, options);
  window.bloomGlobalInstance.render();
}

// ── Feature 4a: competency bar ───────────────────────────────────────────────

/**
 * Renders a horizontal bar chart showing the coverage of data competencies.
 * @param {Array} categories - The competency labels.
 * @param {Array} values - The corresponding counts.
 */
export function renderCompetencyChart(categories, values) {
  const container = document.querySelector("#competency-chart");
  if (!container) return;
  const options = {
    chart: { type: "bar", height: 460, toolbar: { show: true } },
    plotOptions: { bar: { horizontal: true, borderRadius: 3, distributed: true } },
    xaxis: { title: { text: "Anzahl Lernziele" } },
    yaxis: { labels: { style: { fontSize: "12px" } } },
    series: [
      { name: "Lernziele", data: categories.map((cat, i) => ({ x: cat, y: values[i] })) },
    ],
    colors: categories.map(getColorForCategoryLabel),
    dataLabels: { enabled: true },
    grid: { xaxis: { lines: { show: true } } },
    legend: { show: false },
  };
  if (window.competencyChartInstance) window.competencyChartInstance.destroy();
  window.competencyChartInstance = new ApexCharts(container, options);
  window.competencyChartInstance.render();
}

// ── Feature 4b: data-flow bar (sorted highest first) ─────────────────────────

/**
 * Renders a vertical bar chart showing the coverage of data-flow stages.
 * @param {Array} categories - The data-flow stage labels.
 * @param {Array} values - The corresponding counts.
 */
export function renderDataFlowChart(categories, values) {
  const container = document.querySelector("#dataflow-chart");
  if (!container) return;
  const options = {
    chart: { type: "bar", height: 460, toolbar: { show: false } },
    plotOptions: { bar: { horizontal: false, borderRadius: 3, distributed: true } },
    xaxis: { categories: categories, labels: { style: { fontSize: "11px" } } },
    yaxis: { title: { text: "Anzahl Lernziele" }, min: 0, forceNiceScale: true },
    series: [{ name: "Lernziele", data: values }],
    colors: categories.map(getColorForCategoryLabel),
    dataLabels: { enabled: true },
    legend: { show: false },
  };
  if (window.dataflowChartInstance) window.dataflowChartInstance.destroy();
  window.dataflowChartInstance = new ApexCharts(container, options);
  window.dataflowChartInstance.render();
}

// ── Feature 4c: Bloom × Chapter heatmap ──────────────────────────────────────
// export function renderBloomHeatmapChart(series) {
//   const options = {
//     chart: {
//       type: "heatmap",
//       height: Math.max(220, series[0]?.data.length * 14 + 80),
//       toolbar: { show: true },
//     },
//     dataLabels: { enabled: false },
//     colors: ["#ec6925"],
//     series,
//     xaxis: { type: "category", labels: { rotate: -45, style: { fontSize: "10px" } } },
//     yaxis: { labels: { style: { fontSize: "11px" } } },
//     legend: { position: "bottom" },
//     plotOptions: {
//       heatmap: { shadeIntensity: 0.6, colorScale: { ranges: HEATMAP_SCALE_WARM } },
//     },
//   };
//   new ApexCharts(document.querySelector("#bloom-heatmap-chart"), options).render();
// }

// const DATAFLOW_STAGE_ORDER = [
//   "1 Planung",
//   "2 Erhebung und Aufbereitung",
//   "3 Management",
//   "4 Analyse",
//   "5 Publikation und Nachnutzung",
//   "übergreifend",
// ];

// export function renderCompetencyDataFlowHeatmap(series) {
//   const options = {
//     chart: {
//       type: "heatmap",
//       height: Math.max(300, series.length * 32 + 100),
//       toolbar: { show: true },
//     },
//     dataLabels: { enabled: true, style: { fontSize: "11px" } },
//     series,
//     xaxis: {
//       type: "category",
//       categories: DATAFLOW_STAGE_ORDER,
//       tickAmount: DATAFLOW_STAGE_ORDER.length,
//       labels: {
//         rotate: -45,
//         hideOverlappingLabels: false,
//         trim: false,
//         style: { fontSize: "10px" },
//       },
//     },
//     yaxis: { labels: { style: { fontSize: "11px" } } },
//     legend: { show: false },
//     tooltip: { y: { formatter: (value) => `${value} Lernziele` } },
//     plotOptions: {
//       heatmap: { shadeIntensity: 0, colorScale: { ranges: HEATMAP_SCALE_COOL } },
//     },
//   };
//   new ApexCharts(document.querySelector("#competency-dataflow-heatmap"), options).render();
// }



