/**
 * @file dashboard-widgets.js
 * @description Fetches data and renders secondary dashboard UI components such as usage statistics, recommendations, badges, and region lists.
 */

/**
 * Fetches and renders the QUADRIGA OER usage statistics (Nutzung).
 */
export async function renderNutzung() {
  try {
    const res = await fetch("data/Nutzung_der_QUADRIGA_OER.json?v=" + new Date().getTime());
    if (!res.ok) return;
    const data = await res.json();

    let einbindungen = 0;
    let uebernahmen = 0;
    let anfragen = 0;

    data.forEach(item => {
      const art = item["Art der Nutzung"];
      if (art === "Einbindungen in Lehrveranstaltungen") einbindungen++;
      else if (art === "Uebernahmen durch andere Institutionen") uebernahmen++;
      else if (art === "Anfragen zur Nachnutzung") anfragen++;
    });

    const kpiEinbindungen = document.getElementById("kpi-einbindungen");
    const kpiUebernahmen = document.getElementById("kpi-uebernahmen");
    const kpiAnfragen = document.getElementById("kpi-anfragen");

    if (kpiEinbindungen) kpiEinbindungen.textContent = einbindungen;
    if (kpiUebernahmen) kpiUebernahmen.textContent = uebernahmen;
    if (kpiAnfragen) kpiAnfragen.textContent = anfragen;

  } catch (err) {
    console.warn("Could not fetch Nutzung_der_QUADRIGA_OER.json", err);
  }
}

/**
 * Fetches and renders the user recommendation statistics and visualizes the score distribution.
 */
export async function renderRecommendations() {
  try {
    const res = await fetch("data/Weiterempfehlung_QUADRIGA_OER.json?v=" + new Date().getTime());
    if (!res.ok) return;
    const data = await res.json();

    let totalScore = 0;
    const counts = { 5: 0, 4: 0, 3: 0, 2: 0, 1: 0 };
    let validCount = 0;

    data.forEach(item => {
      const score = item["Empfehlungsscore (1–5)"];
      if (score >= 1 && score <= 5) {
        counts[score]++;
        totalScore += score;
        validCount++;
      }
    });

    if (validCount === 0) return;

    const average = totalScore / validCount;
    const recAverageEl = document.getElementById("rec-average");
    const recCountEl = document.getElementById("rec-count");
    const recStarsEl = document.getElementById("rec-stars");
    const barsContainer = document.getElementById("rec-bars");

    if (!recAverageEl || !recCountEl || !recStarsEl || !barsContainer) return;

    recAverageEl.textContent = average.toLocaleString("de-DE", { minimumFractionDigits: 1, maximumFractionDigits: 1 });
    recCountEl.textContent = validCount;

    const fullStars = Math.round(average);
    let starsHtml = "";
    for (let i = 0; i < fullStars; i++) starsHtml += "★ ";
    for (let i = fullStars; i < 5; i++) starsHtml += "☆ ";
    recStarsEl.textContent = starsHtml.trim();

    barsContainer.innerHTML = "";
    for (let i = 5; i >= 1; i--) {
      const count = counts[i];
      const maxCount = Math.max(...Object.values(counts));
      const percent = maxCount > 0 ? (count / maxCount) * 100 : 0;
      barsContainer.innerHTML += `
        <div class="d-flex align-items-center mb-1 rec-bar-row">
          <div class="text-muted text-end pe-2 rec-bar-label">${i}</div>
          <div class="flex-grow-1 mx-2">
            <div class="progress rec-progress">
              <div class="progress-bar rec-progress-bar" role="progressbar" style="width: ${percent}%;"></div>
            </div>
          </div>
          <div class="text-muted text-end rec-bar-count">${count}</div>
        </div>
      `;
    }
  } catch (err) {
    console.warn("Could not fetch Weiterempfehlung_QUADRIGA_OER.json", err);
  }
}

/**
 * Generates an HTML badge for the open issue count.
 * @param {number|null} count - The number of open issues.
 * @returns {string} The HTML string for the issue badge.
 */
function issueBadge(count) {
  if (count === null || count === undefined) {
    return `<span class="badge bg-secondary">n/a</span>`;
  }
  if (count === 0) return `<span class="badge bg-success">✅ 0</span>`;
  if (count <= 10) return `<span class="badge bg-warning text-dark">🟡 ${count}</span>`;
  return `<span class="badge bg-danger">🔴 ${count}</span>`;
}

/**
 * Generates an HTML span indicating the open issue count for card headers.
 * @param {number|null} count - The number of open issues.
 * @returns {string} The HTML string for the header text.
 */
function headerIssuesText(count) {
  if (count === null || count === undefined) {
    return `<span class="fst-italic text-muted">Open Issues: n/a</span>`;
  }
  return `<span class="fst-italic text-muted">Open Issues: <span class="fw-bold fst-normal text-dark">${count}</span></span>`;
}

/**
 * Simplifies a full case study label to a shorter index prefix (e.g., "FS1:").
 * @param {string} fullLabel - The full case study label.
 * @returns {string} The shortened label.
 */
function shortIndexLabel(fullLabel) {
  const match = fullLabel.match(/(\d+)$/);
  return match ? `FS${match[1]}:` : fullLabel;
}

/**
 * Generates an HTML link to a case study's Jupyter Book, using the short index label.
 * @param {string} fullLabel - The full case study label.
 * @param {string} bookUrl - The URL to the case study's Jupyter Book.
 * @returns {string} The HTML anchor tag or span for the case study.
 */
function caseStudyLink(fullLabel, bookUrl) {
  const label = shortIndexLabel(fullLabel);
  if (!bookUrl) {
    return `<span class="fst-italic">${label}</span>`;
  }
  return `<a href="${bookUrl}" target="_blank" class="fst-italic" title="Jupyter Book öffnen">📖 ${label}</a>`;
}

/**
 * Generates an HTML badge linking to the case study's DOI.
 * @param {string} doi - The Digital Object Identifier string.
 * @returns {string} The HTML string for the DOI badge.
 */
function doiBadge(doi) {
  if (!doi || doi.includes("TODO")) return "";
  const cleanDoi = doi.replace(/^https?:\/\/doi\.org\//i, "");
  return `<a href="https://doi.org/${cleanDoi}" target="_blank" class="doi-badge"><span class="doi-label">DOI</span><span class="doi-value">${cleanDoi}</span></a>`;
}

/**
 * Renders the Type Group summary cards for different case study categories (Tabelle, Text, Bild).
 * @param {Array} summaries - Array of objects containing group summary data.
 */
export function renderTypeGroupCards(summaries) {
  const container = document.getElementById("type-group-cards");
  if (!container) return;
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

/**
 * Renders a list of regions (Bundesländer) and the participant count per region based on survey data.
 * @param {Array} data - Array of participation records containing region information.
 */
export function renderTeilnahmenRegion(data) {
  if (!Array.isArray(data)) return;

  const total = data.length;
  const regions = {};

  data.forEach(item => {
    const reg = item["Region der Institution (Bundesland)"];
    if (reg) regions[reg] = (regions[reg] || 0) + 1;
  });

  const sortedRegions = Object.entries(regions).sort((a, b) => b[1] - a[1]);

  const container = document.getElementById("teilnahmen-region-list");
  if (!container) return;

  container.innerHTML = "";

  sortedRegions.forEach(r => {
    const name = r[0];
    const count = r[1];
    const percentage = ((count / total) * 100).toFixed(1);

    container.innerHTML += `
      <div class="d-flex align-items-center justify-content-between p-2 rounded region-card">
        <div>
          <div class="fw-bold text-dark region-percent">${percentage}%</div>
          <div class="text-secondary small fw-medium">${name}</div>
        </div>
        <div class="text-end">
          <div class="badge rounded-pill text-dark region-count-badge">${count}</div>
        </div>
      </div>
    `;
  });
}

/**
 * Renders a grouped horizontal bar chart showing Zenodo downloads per Fallstudie type.
 * Responds to the #downloads-mode-select dropdown to toggle between
 * "Alle Downloads" (zenodoDownloadsAll) and "Letzte Version" (zenodoDownloadsVersion).
 * Default mode is 'version'.
 * @param {Object} statsData - The full stats.json data object, keyed by book ID.
 */
let _downloadsChart = null;

export function renderDownloadsChart(statsData) {
  const container = document.getElementById("downloads-chart");
  const select = document.getElementById("downloads-mode-select");
  if (!container || !select) return;

  // Set default to Letzte Version if not already set
  if (!select.dataset.defaultSet) {
    select.value = "version";
    select.dataset.defaultSet = "true";
  }

  /**
   * Build the bar chart data array for the given mode.
   * @param {"all"|"version"} mode
   */
  function buildData(mode) {
    const field = mode === "version" ? "zenodoDownloadsVersion" : "zenodoDownloadsAll";
    
    const categories = ['Tabelle', 'Text', 'Bewegtes Bild'];
    const prefixMap = {
      'Tabelle': 'tabelle',
      'Text': 'text',
      'Bewegtes Bild': 'bild'
    };
    
    const series = [
      { name: 'FS1', suffix: '01' },
      { name: 'FS2', suffix: '02' },
      { name: 'FS3', suffix: '03' },
      { name: 'FS4', suffix: '04' }
    ].map(s => ({
      name: s.name,
      data: categories.map(cat => {
        const key = `${prefixMap[cat]}-${s.suffix}`;
        return statsData[key] ? (statsData[key][field] || 0) : 0;
      })
    }));

    return { categories, series };
  }

  /**
   * Draw (or redraw) the chart with the given data.
   * @param {"all"|"version"} mode
   */
  function draw(mode) {
    const { categories, series } = buildData(mode);

    if (_downloadsChart) {
      _downloadsChart.destroy();
      _downloadsChart = null;
    }

    const options = {
      chart: {
        type: "bar",
        height: "80%",
        stacked: true,
        toolbar: { show: false },
        animations: { enabled: true, speed: 400 },
        parentHeightOffset: 0
      },
      series: series,
      plotOptions: {
        bar: {
          horizontal: true,
          borderRadius: 3,
          dataLabels: {
            position: 'center',
            hideOverflowingLabels: false
          },
        }
      },
      dataLabels: {
        enabled: true,
        style: {
          fontSize: '11px',
          fontWeight: 600,
          colors: ['#fff']
        },
        formatter: function (val) {
          return val > 0 ? val : '';
        }
      },
      stroke: {
        width: 1,
        colors: ['#fff']
      },
      tooltip: {
        shared: true,
        intersect: false,
        y: {
          formatter: val => `${val} Downloads`
        }
      },
      xaxis: {
        categories: categories,
        labels: { show: false },
        axisBorder: { show: false },
        axisTicks: { show: false }
      },
      yaxis: {
        labels: {
          style: {
            fontSize: '13px',
            fontWeight: 500,
            colors: '#2c3e50'
          }
        }
      },
      grid: {
        show: false,
        padding: { top: -15, right: 10, bottom: -15, left: 10 }
      },
      colors: [
        "#4A78B8", "#638ECB", "#8DB3E2", "#B1C9EF"
      ],
      legend: {
        show: false
      }
    };

    _downloadsChart = new ApexCharts(container, options);
    _downloadsChart.render();
  }

  // Initial render
  draw(select.value);

  // Dropdown listener (attach only once)
  if (!select.dataset.listenerAttached) {
    select.dataset.listenerAttached = "true";
    select.addEventListener("change", () => draw(select.value));
  }
}
