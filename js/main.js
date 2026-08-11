/**
 * @file main.js
 * @description Main application entry point that initializes data fetching, aggregation, and chart rendering on page load.
 */
import { fetchAllCaseStudies } from "./data-fetch.js?v=2";
import {
  computeOverviewKpis,
  buildWorkloadSeries,
  buildBloomPerCaseSeries,
  buildBloomGlobalSeries,
  buildCompetencySeries,
  buildDataFlowSeries,
  buildTypeGroupSummaries
} from "./aggregate.js?v=2";
import {
  renderWorkloadChart,
  renderBloomPerCaseChart,
  renderBloomGlobalChart,
  renderCompetencyChart,
  renderDataFlowChart,
  renderTeilnahmenCharts
} from "./charts.js?v=2";
import { 
  renderNutzung,
  renderRecommendations,
  renderTypeGroupCards,
  renderTeilnahmenRegion
} from "./dashboard-widgets.js?v=2";

/**
 * Renders the Bloom's taxonomy charts (both per-case and global) based on the selected case study type filter.
 * @param {Array} caseStudies - Array of all fetched case study data.
 * @param {string} type - The selected case study type (e.g., "all", "tabelle").
 */
function renderBloomCharts(caseStudies, type) {
  const { categories: bCat, series: bSer } = buildBloomPerCaseSeries(caseStudies, type);
  renderBloomPerCaseChart(bCat, bSer);

  const { labels: bgLabels, values: bgValues } = buildBloomGlobalSeries(caseStudies, type);
  renderBloomGlobalChart(bgLabels, bgValues);
}

/**
 * Renders the Competency and DataFlow charts based on the selected type and sort filters.
 * @param {Array} caseStudies - Array of all fetched case study data.
 * @param {string} type - The selected case study type.
 * @param {string} sortMode - The selected sort mode (e.g., "alpha", "count").
 */
function renderFilteredCharts(caseStudies, type, sortMode) {
  const { categories: compCat, values: compVal } = buildCompetencySeries(caseStudies, type, sortMode);
  renderCompetencyChart(compCat, compVal);

  const { categories: dfCat, values: dfVal } = buildDataFlowSeries(caseStudies, type, sortMode);
  renderDataFlowChart(dfCat, dfVal);
}



/**
 * Main initialization function that orchestrates the dashboard loading sequence.
 * Fetches required data, computes KPIs, and sets up charts and filters.
 */
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
    
    const completeRatioEl = document.getElementById("kpi-complete-ratio");
    if (completeRatioEl) {
      completeRatioEl.textContent = kpis.completeRatio;
    }

    const headerMetadataEl = document.getElementById("header-metadata-count");
    if (headerMetadataEl) {
      headerMetadataEl.textContent = kpis.completeRatio;
    }

    // Fetch and aggregate stats
    try {
      const statsRes = await fetch("stats.json?v=" + new Date().getTime());
      if (statsRes.ok) {
        const statsData = await statsRes.json();
        let totalWords = 0;
        let totalAssessments = 0;
        let totalZenodoDownloads = 0;
        
        for (const key in statsData) {
          const wc = statsData[key].wordCount || 0;
          totalWords += wc;
          
          if (statsData[key].zenodoDownloadsVersion) {
            totalZenodoDownloads += statsData[key].zenodoDownloadsVersion;
          }
          
          const cs = caseStudies.find(c => c.id === key);
          if (cs) cs.wordCount = wc;
          
          if (statsData[key].chapterCounts) {
            for (const chap of statsData[key].chapterCounts) {
              if (chap.chapter && chap.chapter.toLowerCase().includes('assessment')) {
                totalAssessments++;
              }
            }
          }
        }
        
        document.getElementById("kpi-total-words").textContent = totalWords.toLocaleString("de-DE");
        const assessmentEl = document.getElementById("kpi-total-assessments");
        if (assessmentEl) assessmentEl.textContent = totalAssessments;
        const zenodoEl = document.getElementById("kpi-zenodo-downloads");
        if (zenodoEl) zenodoEl.textContent = totalZenodoDownloads.toLocaleString("de-DE");
      }
    } catch (e) {
      console.warn("Could not fetch stats.json", e);
    }

    // Feature 2
    const { categories: wCat, series: wSer } = buildWorkloadSeries(caseStudies);
    renderWorkloadChart(wCat, wSer);

    // Feature 3a & 3b - Bloom's taxonomy (filterable)
    renderBloomCharts(caseStudies, "all");
    document.getElementById("bloom-type-filter").addEventListener("change", (e) => {
      renderBloomCharts(caseStudies, e.target.value);
    });

    // Feature 4a & 4b – competency & data-flow (filterable & sortable)
    const typeFilterEl = document.getElementById("type-filter");
    const sortFilterEl = document.getElementById("sort-filter");
    
    renderFilteredCharts(caseStudies, typeFilterEl.value, sortFilterEl.value);

    typeFilterEl.addEventListener("change", () => {
      renderFilteredCharts(caseStudies, typeFilterEl.value, sortFilterEl.value);
    });
    
    sortFilterEl.addEventListener("change", () => {
      renderFilteredCharts(caseStudies, typeFilterEl.value, sortFilterEl.value);
    });

    // Feature 4c – heatmap
    // const heatSeries = buildBloomHeatmapSeries(caseStudies);
    // renderBloomHeatmapChart(heatSeries);

    // const cdSeries = buildCompetencyDataFlowMatrix(caseStudies);
    // renderCompetencyDataFlowHeatmap(cdSeries);

    const groupSummaries = buildTypeGroupSummaries(caseStudies);
    renderTypeGroupCards(groupSummaries);

    await renderNutzung();
    await renderRecommendations();

    let teilnahmenData = null;
    try {
      const res = await fetch("data/Teilnahmen_an_Lernangeboten.json?v=" + new Date().getTime());
      if (res.ok) teilnahmenData = await res.json();
    } catch (err) {
      console.warn("Could not fetch Teilnahmen_an_Lernangeboten.json", err);
    }

    if (teilnahmenData) {
      renderTeilnahmenCharts(teilnahmenData);
      renderTeilnahmenRegion(teilnahmenData);
    }

    loadingEl.classList.add("d-none");
  } catch (err) {
    loadingEl.classList.add("d-none");
    errorEl.classList.remove("d-none");
    errorEl.textContent = `Fehler beim Laden der Daten: ${err.message}`;
  }
  
}


init();