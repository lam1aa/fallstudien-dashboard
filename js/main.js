import { fetchAllCaseStudies } from "./data-fetch.js";
import {
  computeOverviewKpis,
  buildWorkloadSeries,
  buildBloomPerCaseSeries,
  buildBloomGlobalSeries,
  buildCompetencySeries,
  buildDataFlowSeries,
  buildBloomHeatmapSeries,
  buildCompetencyDataFlowMatrix,
  buildTypeGroupSummaries
} from "./aggregate.js";
import {
  renderWorkloadChart,
  renderBloomPerCaseChart,
  renderBloomGlobalChart,
  renderCompetencyChart,
  renderDataFlowChart,
  renderBloomHeatmapChart,
  renderCompetencyDataFlowHeatmap,
  renderTypeGroupCards
} from "./charts.js";

function renderBloomCharts(caseStudies, type) {
  const { categories: bCat, series: bSer } = buildBloomPerCaseSeries(caseStudies, type);
  renderBloomPerCaseChart(bCat, bSer);

  const { labels: bgLabels, values: bgValues } = buildBloomGlobalSeries(caseStudies, type);
  renderBloomGlobalChart(bgLabels, bgValues);
}

function renderFilteredCharts(caseStudies, type) {
  const { categories: compCat, values: compVal } = buildCompetencySeries(caseStudies, type);
  renderCompetencyChart(compCat, compVal);

  const { categories: dfCat, values: dfVal } = buildDataFlowSeries(caseStudies, type);
  renderDataFlowChart(dfCat, dfVal);
}

async function init() {
  const loadingEl = document.getElementById("loading");
  const errorEl   = document.getElementById("error");

  try {
    const caseStudies = await fetchAllCaseStudies();

    // Feature 1
    const kpis = computeOverviewKpis(caseStudies);
    document.getElementById("kpi-total-cases").textContent      = kpis.totalCases;
    document.getElementById("kpi-total-chapters").textContent   = kpis.totalChapters;
    document.getElementById("kpi-total-objectives").textContent = kpis.totalObjectives;
    document.getElementById("kpi-complete-ratio").textContent   = kpis.completeRatio;

    // Feature 2
    const { categories: wCat, series: wSer } = buildWorkloadSeries(caseStudies);
    renderWorkloadChart(wCat, wSer);

    // Feature 3a & 3b - Bloom's taxonomy (filterable)
    renderBloomCharts(caseStudies, "all");
    document.getElementById("bloom-type-filter").addEventListener("change", (e) => {
      renderBloomCharts(caseStudies, e.target.value);
    });

    // Feature 4a & 4b – competency & data-flow (filterable)
    renderFilteredCharts(caseStudies, "all");

    document.getElementById("type-filter").addEventListener("change", (e) => {
      renderFilteredCharts(caseStudies, e.target.value);
    });

    // Feature 4c – heatmap
    const heatSeries = buildBloomHeatmapSeries(caseStudies);
    renderBloomHeatmapChart(heatSeries);

    const cdSeries = buildCompetencyDataFlowMatrix(caseStudies);
    renderCompetencyDataFlowHeatmap(cdSeries);

    const groupSummaries = buildTypeGroupSummaries(caseStudies);
    renderTypeGroupCards(groupSummaries);

    loadingEl.classList.add("d-none");
  } catch (err) {
    loadingEl.classList.add("d-none");
    errorEl.classList.remove("d-none");
    errorEl.textContent = `Fehler beim Laden der Daten: ${err.message}`;
  }
  
}


init();