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

    // Placeholder for GitHub stats until API integration is available
    const kpiGithub = document.getElementById("kpi-github");
    if (kpiGithub) kpiGithub.textContent = "15"; // e.g. 10 downloads, 5 forks

  } catch (err) {
    console.warn("Could not fetch Nutzung_der_QUADRIGA_OER.json", err);
  }
}

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
    document.getElementById("rec-average").textContent = average.toLocaleString("de-DE", { minimumFractionDigits: 1, maximumFractionDigits: 1 });
    document.getElementById("rec-count").textContent = validCount;

    const fullStars = Math.round(average);
    let starsHtml = "";
    for (let i = 0; i < fullStars; i++) starsHtml += "★ ";
    for (let i = fullStars; i < 5; i++) starsHtml += "☆ ";
    document.getElementById("rec-stars").textContent = starsHtml.trim();

    const barsContainer = document.getElementById("rec-bars");
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
