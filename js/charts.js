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
  // Ensure we clear previous instance if we re-render dynamically
  if (window.workloadChartInstance) window.workloadChartInstance.destroy();
  window.workloadChartInstance = new ApexCharts(document.querySelector("#workload-chart"), options);
  window.workloadChartInstance.render();
}

// ── Feature 3a, 3b: Bloom ────────────────────────────────────────────────────
export function renderBloomPerCaseChart(categories, series) {
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
  window.bloomPerCaseInstance = new ApexCharts(
    document.querySelector("#bloom-per-case-chart"),
    options
  );
  window.bloomPerCaseInstance.render();
}

export function renderBloomGlobalChart(labels, values) {
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
  window.bloomGlobalInstance = new ApexCharts(
    document.querySelector("#bloom-global-chart"),
    options
  );
  window.bloomGlobalInstance.render();
}

// ── Feature 4a: competency bar ───────────────────────────────────────────────
export function renderCompetencyChart(categories, values) {
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
  window.competencyChartInstance = new ApexCharts(
    document.querySelector("#competency-chart"),
    options
  );
  window.competencyChartInstance.render();
}

// ── Feature 4b: data-flow bar (sorted highest first) ─────────────────────────
export function renderDataFlowChart(categories, values) {
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
  window.dataflowChartInstance = new ApexCharts(
    document.querySelector("#dataflow-chart"),
    options
  );
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

// ── Feature 7: type-group cards ──────────────────────────────────────────────
function issueBadge(count) {
  if (count === null || count === undefined) {
    return `<span class="badge bg-secondary">n/a</span>`;
  }
  if (count === 0) return `<span class="badge bg-success">✅ 0</span>`;
  if (count <= 10) return `<span class="badge bg-warning text-dark">🟡 ${count}</span>`;
  return `<span class="badge bg-danger">🔴 ${count}</span>`;
}

function headerIssuesText(count) {
  if (count === null || count === undefined) {
    return `<span class="fst-italic text-muted">Open Issues: n/a</span>`;
  }
  return `<span class="fst-italic text-muted">Open Issues: <span class="fw-bold fst-normal text-dark">${count}</span></span>`;
}

function shortIndexLabel(fullLabel) {
  const match = fullLabel.match(/(\d+)$/);
  return match ? `FS${match[1]}:` : fullLabel;
}

function caseStudyLink(fullLabel, bookUrl) {
  const label = shortIndexLabel(fullLabel);
  if (!bookUrl) {
    return `<span class="fst-italic">${label}</span>`;
  }
  return `<a href="${bookUrl}" target="_blank" class="fst-italic" title="Jupyter Book öffnen">📖 ${label}</a>`;
}

function doiBadge(doi) {
  if (!doi || doi.includes("TODO")) return "";
  const cleanDoi = doi.replace(/^https?:\/\/doi\.org\//i, "");
  return `<a href="https://doi.org/${cleanDoi}" target="_blank" class="doi-badge"><span class="doi-label">DOI</span><span class="doi-value">${cleanDoi}</span></a>`;
}

export function renderTypeGroupCards(summaries) {
  const container = document.getElementById("type-group-cards");
  container.innerHTML = summaries
    .map(
      (group) => `<div class="col-md-4">
        <div class="card h-100 shadow-sm">
          <div class="card-header d-flex justify-content-between align-items-center">
            <span>${group.icon} <strong>${group.label}</strong></span>
            ${headerIssuesText(group.totalOpenIssues)}
          </div>
          <ul class="list-group list-group-flush">
            ${group.repos
          .map(
            (r) => `<li class="list-group-item d-flex justify-content-between align-items-center small">
                  <span>${caseStudyLink(r.label, r.bookUrl)} v${r.version} ${doiBadge(r.doi)}</span>
                  <span>${issueBadge(r.openIssues)}</span>
                </li>`
          )
          .join("")}
          </ul>
        </div>
      </div>`
    )
    .join("");
}