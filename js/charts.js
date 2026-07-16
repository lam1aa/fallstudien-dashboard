// ── Shared color palette (vibrant dashboard scheme) ─────────────────────────
const PALETTE = {
  indigo: "#6C6FE0",
  indigoDark: "#2d31d3",
  indigoLight: "#d8d9f4",
  coral: "#F2996B",
  coralDark: "#ec6925",
  amber: "#F0B95B",
  amberDark: "#db9214",
  slate: "#5B6B8C",
  slateDark: "#3d485e",
  categorical: ["#6C6FE0", "#F2996B", "#F0B95B", "#5B6B8C", "#2d31d3", "#ec6925", "#db9214", "#3d485e", "#d8d9f4"],
};

const BLOOM_COLORS = ["#abb0bc", "#6C6FE0", "#F0B95B", "#F2996B", "#ec6925"];

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

function formatMinutesWithHours(minutes) {
  const hours = (minutes / 60).toFixed(1).replace(/\.0$/, "");
  return `${minutes} (${hours} h)`;
}

// ── Feature 2: Workload stacked bar ─────────────────────────────────────────
export function renderWorkloadChart(categories, series) {
  const options = {
    chart: {
      type: "bar",
      height: 420,
      stacked: true,
      toolbar: { show: true },
    },
    plotOptions: {
      bar: { horizontal: false, borderRadius: 4 },
    },
    xaxis: { categories },
    yaxis: {
      title: { text: "Zeitaufwand (Minuten)" },
      labels: {
        formatter: (value) => formatMinutesWithHours(Math.round(value)),
      },
    },
    tooltip: {
      y: {
        formatter: (value) => formatMinutesWithHours(Math.round(value)),
      },
    },
    legend: { show: false },
    series,
    dataLabels: { enabled: false },
    colors: PALETTE.categorical,
  };
  const chart = new ApexCharts(document.querySelector("#workload-chart"), options);
  chart.render();
}

// ── Feature 3a, 3b: Bloom ────────────────────────────────────────────────────
export function renderBloomPerCaseChart(categories, series) {
  const options = {
    chart: { type: "bar", height: 380, stacked: true, toolbar: { show: true } },
    plotOptions: { bar: { horizontal: false, borderRadius: 3 } },
    xaxis: { categories },
    yaxis: { title: { text: "Anzahl Lernziele" }, min: 0, forceNiceScale: true },
    legend: { position: "bottom" },
    colors: BLOOM_COLORS,
    series,
    dataLabels: { enabled: false },
    tooltip: { shared: true, intersect: false },
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
    legend: { position: "bottom" },
    plotOptions: { pie: { donut: { size: "55%" } } },
    dataLabels: {
      formatter: (val, opts) =>
        `${opts.w.globals.series[opts.seriesIndex]} (${Math.round(val)}%)`,
    },
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
    plotOptions: { bar: { horizontal: true, borderRadius: 3 } },
    xaxis: { title: { text: "Anzahl Lernziele" } },
    yaxis: { labels: { style: { fontSize: "12px" } } },
    series: [
      { name: "Lernziele", data: categories.map((cat, i) => ({ x: cat, y: values[i] })) },
    ],
    colors: [PALETTE.indigo],
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

// ── Feature 4b: data-flow bar ────────────────────────────────────────────────
export function renderDataFlowChart(categories, values) {
  const options = {
    chart: { type: "bar", height: 460, toolbar: { show: false } },
    plotOptions: { bar: { horizontal: false, borderRadius: 3, distributed: true } },
    xaxis: { categories, labels: { style: { fontSize: "11px" } } },
    yaxis: { title: { text: "Anzahl Lernziele" }, min: 0, forceNiceScale: true },
    series: [{ name: "Lernziele", data: values }],
    colors: PALETTE.categorical.slice(0, 5),
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
export function renderBloomHeatmapChart(series) {
  const options = {
    chart: {
      type: "heatmap",
      height: Math.max(220, series[0]?.data.length * 14 + 80),
      toolbar: { show: true },
    },
    dataLabels: { enabled: false },
    colors: [PALETTE.orange],
    series,
    xaxis: { type: "category", labels: { rotate: -45, style: { fontSize: "10px" } } },
    yaxis: { labels: { style: { fontSize: "11px" } } },
    legend: { position: "bottom" },
    plotOptions: {
      heatmap: {
        shadeIntensity: 0.6,
        colorScale: { ranges: HEATMAP_SCALE_WARM },
      },
    },
  };
  new ApexCharts(document.querySelector("#bloom-heatmap-chart"), options).render();
}

const DATAFLOW_STAGE_ORDER = [
  "1 Planung",
  "2 Erhebung und Aufbereitung",
  "3 Management",
  "4 Analyse",
  "5 Publikation und Nachnutzung",
  "übergreifend",
];

export function renderCompetencyDataFlowHeatmap(series) {
  const options = {
    chart: {
      type: "heatmap",
      height: Math.max(300, series.length * 32 + 100),
      toolbar: { show: true },
    },
    dataLabels: { enabled: true, style: { fontSize: "11px" } },
    series,
    xaxis: {
      type: "category",
      categories: DATAFLOW_STAGE_ORDER,
      tickAmount: DATAFLOW_STAGE_ORDER.length,
      labels: {
        rotate: -45,
        hideOverlappingLabels: false,
        trim: false,
        style: { fontSize: "10px" },
      },
    },
    yaxis: { labels: { style: { fontSize: "11px" } } },
    legend: { show: false },
    tooltip: {
      y: {
        formatter: (value) => `${value} Lernziele`,
      },
    },
    plotOptions: {
      heatmap: {
        shadeIntensity: 0,
        colorScale: { ranges: HEATMAP_SCALE_COOL },
      },
    },
  };
  new ApexCharts(document.querySelector("#competency-dataflow-heatmap"), options).render();
}

// ── Feature 7: type-group cards ──────────────────────────────────────────────
function issueBadge(count) {
  if (count === null || count === undefined) return `<span class="badge bg-secondary">n/a</span>`;
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
  return match ? match[1] : fullLabel;
}

function doiBadge(doi) {
  if (!doi || doi.includes("TODO")) return "";
  const cleanDoi = doi.replace(/^https?:\/\/doi\.org\//i, "");
  return `<a href="https://doi.org/${cleanDoi}" target="_blank" class="doi-badge"><span class="doi-label">DOI</span><span class="doi-value">${cleanDoi}</span></a>`;
}

function bookIcon(url) {
  if (!url) return "";
  return `<a href="${url}" target="_blank" style="text-decoration:none" title="Jupyter Book">📖</a>`;
}

export function renderTypeGroupCards(summaries) {
  const container = document.getElementById("type-group-cards");
  container.innerHTML = summaries
    .map(
      (group) => `
    <div class="col-md-4">
      <div class="card h-100 shadow-sm">
        <div class="card-header d-flex justify-content-between align-items-center">
          <span>${group.icon} <strong>${group.label}</strong></span>
          ${headerIssuesText(group.totalOpenIssues)}
        </div>
        <ul class="list-group list-group-flush">
          ${group.repos
            .map(
              (r) => `
            <li class="list-group-item d-flex justify-content-between align-items-center small">
              <span>${shortIndexLabel(r.label)} · v${r.version} ${bookIcon(r.bookUrl)} ${doiBadge(r.doi)}</span>
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