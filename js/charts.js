function formatMinutesWithHours(minutes) {
  const hours = (minutes / 60).toFixed(1).replace(/\.0$/, "");
  return `${minutes} (${hours} h)`;
}

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
    xaxis: {
      categories
    },
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
    colors: [
      "#0d6efd", "#6610f2", "#6f42c1", "#d63384",
      "#fd7e14", "#ffc107", "#198754", "#20c997", "#0dcaf0",
    ],
  };

  const chart = new ApexCharts(document.querySelector("#workload-chart"), options);
  chart.render();
}

// ── Bloom palette (ordered low → high) ──────────────────────────────────────
const BLOOM_COLORS = ["#adb5bd", "#74c0fc", "#51cf66", "#ff922b", "#f03e3e"];

// ── Feature 3a, 3b: Bloom ───────────────────────────────────
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
  window.bloomPerCaseInstance = new ApexCharts(document.querySelector("#bloom-per-case-chart"), options);
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
  window.bloomGlobalInstance = new ApexCharts(document.querySelector("#bloom-global-chart"), options);
  window.bloomGlobalInstance.render();
}

// ── Feature 4a: competency bar ───────────────────────────────────────────────
export function renderCompetencyChart(categories, values) {
  const options = {
    chart: { type: "bar", height: 460, toolbar: { show: true } },
    plotOptions: { bar: { horizontal: true, borderRadius: 3 } },
    xaxis: { title: { text: "Anzahl Lernziele" } },
    yaxis: { labels: { style: { fontSize: "12px" } } },
    series: [{ name: "Lernziele", data: categories.map((cat, i) => ({ x: cat, y: values[i] })) }],
    colors: ["#0d6efd"],
    dataLabels: { enabled: true },
    grid: { xaxis: { lines: { show: true } } },
  };
  if (window.competencyChartInstance) window.competencyChartInstance.destroy();
  window.competencyChartInstance = new ApexCharts(document.querySelector("#competency-chart"), options);
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
    colors: ["#0d6efd", "#6610f2", "#198754", "#fd7e14", "#dc3545"],
    dataLabels: { enabled: true },
    legend: { show: false },
  };
  if (window.dataflowChartInstance) window.dataflowChartInstance.destroy();
  window.dataflowChartInstance = new ApexCharts(document.querySelector("#dataflow-chart"), options);
  window.dataflowChartInstance.render();
}

// ── Feature 4c: Bloom × Chapter heatmap ─────────────────────────────────────
export function renderBloomHeatmapChart(series) {
  const options = {
    chart: {
      type: "heatmap",
      height: Math.max(220, series[0]?.data.length * 14 + 80),
      toolbar: { show: true },
    },
    dataLabels: { enabled: false },
    colors: ["#f03e3e"],   // ApexCharts heatmap shades this automatically
    series,
    xaxis: { type: "category", labels: { rotate: -45, style: { fontSize: "10px" } } },
    yaxis: { labels: { style: { fontSize: "11px" } } },
    legend: { position: "bottom" },
    plotOptions: {
      heatmap: {
        shadeIntensity: 0.6,
        colorScale: {
          ranges: [
            { from: 0, to: 0, color: "#f8f9fa", name: "0" },
            { from: 1, to: 1, color: "#ffd8a8" },
            { from: 2, to: 2, color: "#ff922b" },
            { from: 3, to: 99, color: "#e03131" },
          ],
        },
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
      tickAmount: DATAFLOW_STAGE_ORDER.length,   // force one tick per category
      labels: {
        rotate: -45,
        hideOverlappingLabels: false,            // stop auto-hiding
        trim: false,
        style: { fontSize: "10px" },
      },
    },
    yaxis: { labels: { style: { fontSize: "11px" } } },
    legend: {
      show: false
    },
    plotOptions: {
      heatmap: {
        shadeIntensity: 0.6,
        colorScale: {
          ranges: [
            { from: 0, to: 0, color: "#f8f9fa", name: "Keine Lernziele" },
            { from: 1, to: 2, color: "#a5d8ff", name: "1–2 Lernziele" },
            { from: 3, to: 5, color: "#4dabf7", name: "3–5 Lernziele" },
            { from: 6, to: 99, color: "#1864ab", name: "6+ Lernziele" },
          ],
        },
      },
    },
  };
  new ApexCharts(document.querySelector("#competency-dataflow-heatmap"), options).render();
}

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
  return `<a href="https://doi.org/${cleanDoi}" target="_blank" class="doi-badge">
    <span class="doi-label">DOI</span><span class="doi-value">${cleanDoi}</span>
  </a>`;
}

function bookIcon(url) {
  if (!url) return "";
  return `<a href="${url}" target="_blank" style="text-decoration:none;" title="Jupyter Book">📖</a>`;
}


export function renderTypeGroupCards(summaries) {
  const container = document.getElementById("type-group-cards");
  container.innerHTML = summaries
    .map((group) => `
      <div class="col-md-4">
        <div class="card h-100 shadow-sm">
          <div class="card-header d-flex justify-content-between align-items-center">
            <span>${group.icon} <strong>${group.label}</strong></span>
            ${headerIssuesText(group.totalOpenIssues)}
          </div>
          <ul class="list-group list-group-flush">
            ${group.repos.map((r) => `
              <li class="list-group-item d-flex justify-content-between align-items-center small">
                <span>
                  ${shortIndexLabel(r.label)} · v${r.version}
                  ${bookIcon(r.bookUrl)}
                  ${doiBadge(r.doi)}
                </span>
                ${issueBadge(r.openIssues)}
              </li>
            `).join("")}
          </ul>
        </div>
      </div>
    `)
    .join("");
}