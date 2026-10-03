// community.js  –  Data loading & chart rendering for community.html

const DATA_BASE = 'data/';

// ── helpers ──────────────────────────────────────────────────────────────────

async function loadJSON(filename) {
  const res = await fetch(DATA_BASE + filename);
  if (!res.ok) throw new Error(`Could not fetch ${filename}`);
  return res.json();
}

function countBy(arr, key) {
  const map = {};
  arr.forEach(item => {
    const raw = item[key];
    if (!raw) return;
    const parts = String(raw).split(/[;,]/).map(s => s.trim()).filter(Boolean);
    parts.forEach(p => { map[p] = (map[p] || 0) + 1; });
  });
  return map;
}

function uniqueValues(arr, key) {
  const set = new Set();
  arr.forEach(item => {
    const raw = item[key];
    if (!raw) return;
    String(raw).split(/[;,]/).map(s => s.trim()).filter(Boolean).forEach(v => set.add(v));
  });
  return [...set].sort();
}

// Project palette – matches styles.css tokens and charts.js PALETTE/BLOOM_COLORS
// Does NOT use the category-number colors (those mean specific Bloom/competency things)
const COMM_PALETTE = [
  '#00305e',   // quadriga-main
  '#638ecb',   // PALETTE.indigo
  '#b1c9ef',   // PALETTE.indigoDark
  '#818bac',   // quadriga-main-45
  '#9fc796',   // green tone
  '#f5c998',   // yellow tone
  '#c1d3e0',   // quadriga-main-web
  '#8e83a5',   // muted purple
  '#8ebeca',   // soft teal
  '#e89f7f',   // warm orange
  '#e57b7f',   // soft red
  '#abb0bc',   // default grey
];

// ── KPI counter-up ────────────────────────────────────────────────────────────
function setKPI(id, value) {
  const el = document.getElementById(id);
  if (!el) return;
  const target = parseInt(value, 10);
  if (isNaN(target)) { el.textContent = value; return; }
  let current = 0;
  const step = Math.ceil(target / 40);
  const timer = setInterval(() => {
    current = Math.min(current + step, target);
    el.textContent = current;
    if (current >= target) clearInterval(timer);
  }, 30);
}

// ── Donut chart ───────────────────────────────────────────────────────────────
function renderDonut(elId, labels, series, colors) {
  const el = document.getElementById(elId);
  if (!el) return;
  new ApexCharts(el, {
    chart: { type: 'donut', height: 350, fontFamily: 'inherit' },
    series, labels,
    colors: colors || COMM_PALETTE,
    legend: { position: 'bottom', fontSize: '12px', itemMargin: { horizontal: 6, vertical: 4 } },
    plotOptions: { pie: { donut: { size: '62%',
      labels: { show: true, total: { show: true, label: 'Gesamt', color: '#00305e', fontSize: '13px', fontWeight: 700 } }
    } } },
    dataLabels: { enabled: false },
    stroke: { width: 0 },
    tooltip: { y: { formatter: v => v } }
  }).render();
}

// ── Horizontal bar chart ──────────────────────────────────────────────────────
function renderHBar(elId, categories, data, color, height) {
  const el = document.getElementById(elId);
  if (!el) return;
  const paired = categories.map((c, i) => ({ c, v: data[i] })).sort((a, b) => b.v - a.v);
  new ApexCharts(el, {
    chart: { type: 'bar', height: height || Math.max(200, paired.length * 38), fontFamily: 'inherit', toolbar: { show: false } },
    plotOptions: { bar: { horizontal: true, borderRadius: 4, barHeight: '60%', dataLabels: { position: 'center' } } },
    series: [{ name: 'Anzahl', data: paired.map(p => p.v) }],
    xaxis: { categories: paired.map(p => p.c), labels: { style: { fontSize: '11px' } } },
    yaxis: { labels: { style: { fontSize: '11px', colors: '#2c3e50' }, maxWidth: 220 } },
    colors: [color || '#00305e'],
    dataLabels: { enabled: true, style: { fontSize: '11px', colors: ['#ffffff'] }, offsetX: 0, dropShadow: { enabled: false } },
    grid: { borderColor: '#f0f0f0', xaxis: { lines: { show: true } } },
    tooltip: { y: { formatter: v => `${v}` } }
  }).render();
}

// ── Area timeline chart ───────────────────────────────────────────────────────
function renderTimeline(elId, yearData, color) {
  const el = document.getElementById(elId);
  if (!el) return;
  new ApexCharts(el, {
    chart: { type: 'area', height: 200, fontFamily: 'inherit', toolbar: { show: false } },
    series: [{ name: 'Anzahl', data: yearData.map(d => d.count) }],
    xaxis: { categories: yearData.map(d => d.year), labels: { style: { fontSize: '11px' } } },
    yaxis: { min: 0, tickAmount: 3, labels: { style: { fontSize: '11px' } } },
    colors: [color || '#00305e'],
    fill: { type: 'gradient', gradient: { shadeIntensity: 1, opacityFrom: 0.35, opacityTo: 0.05, stops: [0, 100] } },
    stroke: { curve: 'smooth', width: 2.5 },
    markers: { size: 4, hover: { size: 6 } },
    dataLabels: { enabled: true, style: { fontSize: '11px' }, background: { enabled: false }, offsetY: -8 },
    grid: { borderColor: '#f0f0f0' },
    tooltip: { y: { formatter: v => v } }
  }).render();
}

// ── Stacked bar chart ─────────────────────────────────────────────────────────
function renderStackedBar(elId, years, seriesData) {
  const el = document.getElementById(elId);
  if (!el) return;
  new ApexCharts(el, {
    chart: { type: 'bar', height: 260, fontFamily: 'inherit', toolbar: { show: false }, stacked: true },
    plotOptions: { 
      bar: { 
        borderRadius: 3, 
        columnWidth: '55%',
        dataLabels: {
          total: { enabled: true, style: { fontSize: '11px', color: '#2c3e50', fontWeight: 600 } }
        }
      } 
    },
    series: seriesData,
    xaxis: { categories: years, labels: { style: { fontSize: '11px' } } },
    yaxis: { labels: { style: { fontSize: '11px' } } },
    colors: COMM_PALETTE,
    legend: { position: 'bottom', fontSize: '11px', itemMargin: { horizontal: 6, vertical: 4 } },
    dataLabels: { enabled: false },
    grid: { borderColor: '#f0f0f0' },
    tooltip: { y: { formatter: v => v } }
  }).render();
}

// ── Tag cloud ─────────────────────────────────────────────────────────────────
function renderTagCloud(elId, values, cssClass) {
  const el = document.getElementById(elId);
  if (!el) return;
  el.innerHTML = values.length
    ? values.map(v => `<span class="comm-tag ${cssClass}">${v}</span>`).join('')
    : '<span class="text-muted small">Keine Daten</span>';
}

// ── Region horizontal bars ────────────────────────────────────────────────────
function renderRegionBars(elId, koopData) {
  const flat = {};
  koopData.forEach(d => {
    const raw = d['Region der Institution (Bundesland)'];
    if (!raw) return;
    raw.split(/[;,]/).map(s => s.trim()).filter(Boolean).forEach(r => { flat[r] = (flat[r] || 0) + 1; });
  });
  const sorted = Object.entries(flat).sort((a, b) => b[1] - a[1]);
  renderHBar(elId, sorted.map(s => s[0]), sorted.map(s => s[1]), '#818bac');
}

// ── Main ──────────────────────────────────────────────────────────────────────
async function initCommunity() {
  try {
    const [koopData, veranstalData, beitraegeData, pubData] = await Promise.all([
      loadJSON('Aktive_Kooperationen.json'),
      loadJSON('Durchgef%C3%BChrte_externe_Veranstal.json'),
      loadJSON('Eigene_Beitr%C3%A4ge_extern.json'),
      loadJSON('Publikationen.json')
    ]);

    // ── KPIs ────────────────────────────────────────────────────────────────
    const activeKoop = koopData.filter(d => d['Aktiv (Ja/Nein)'] === 'Ja').length;
    setKPI('kpi-kooperationen', activeKoop);
    setKPI('kpi-beitraege', beitraegeData.length);
    setKPI('kpi-veranstaltungen', veranstalData.length);
    setKPI('kpi-publikationen', pubData.length);

    // ── Durchgeführte externe Veranstaltungen ────────────────────────────────
    // Typ der Veranstaltung – donut
    const typCounts = countBy(veranstalData, 'Typ der Veranstaltung');
    renderDonut('chart-veranstal-typ', Object.keys(typCounts), Object.values(typCounts), COMM_PALETTE);

    // Timeline
    const veranstalByYear = {};
    veranstalData.forEach(d => {
      const raw = d['Datum der Veranstaltung'];
      if (raw) { const y = raw.substring(0, 4); veranstalByYear[y] = (veranstalByYear[y] || 0) + 1; }
    });
    renderTimeline('chart-veranstal-timeline',
      Object.entries(veranstalByYear).sort((a, b) => a[0].localeCompare(b[0])).map(([year, count]) => ({ year, count })),
      '#00305e'); // quadriga-main

    // Externe Partner tag cloud
    renderTagCloud('tags-externe-partner', uniqueValues(veranstalData, 'Externe Partner (Liste)'), 'tag-indigo');

    // ── Eigene Beiträge extern ───────────────────────────────────────────────
    // Art des Beitrags – horizontal bar
    const artCounts = countBy(beitraegeData, 'Art des Beitrags (z.B. Vortrag, Poster, Panel)');
    const artEntries = Object.entries(artCounts).sort((a, b) => b[1] - a[1]);
    renderHBar('chart-beitraege-art', artEntries.map(e => e[0]), artEntries.map(e => e[1]), '#638ecb'); // indigo

    // Timeline
    const beitraegeByYear = {};
    beitraegeData.forEach(d => {
      const raw = d['Datum der Veranstaltung'];
      if (raw) { const y = raw.substring(0, 4); beitraegeByYear[y] = (beitraegeByYear[y] || 0) + 1; }
    });
    renderTimeline('chart-beitraege-timeline',
      Object.entries(beitraegeByYear).sort((a, b) => a[0].localeCompare(b[0])).map(([year, count]) => ({ year, count })),
      '#638ecb'); // indigo

    // Veranstaltende Organisation – tag cloud
    renderTagCloud('tags-org', uniqueValues(beitraegeData, 'Veranstaltende Organisation'), 'tag-web');

    // ── Publikationen ────────────────────────────────────────────────────────
    const pubTypeLabels = {
      conferencePaper: 'Konferenzpaper', journalArticle: 'Zeitschriftenartikel',
      presentation: 'Präsentation', dataset: 'Datensatz', computerProgram: 'Software',
      blogPost: 'Blogbeitrag', book: 'Buch', document: 'Dokument', videoRecording: 'Video'
    };
    const pubTypCounts = countBy(pubData, 'Art der Publikation');
    renderDonut('chart-pub-typ',
      Object.keys(pubTypCounts).map(k => pubTypeLabels[k] || k),
      Object.values(pubTypCounts), COMM_PALETTE);

    // Stacked bar: per year per type
    const pubYears = [...new Set(pubData.map(d => String(d['Datum der Publikation'])).filter(Boolean))].sort();
    const pubTypes = Object.keys(pubTypCounts);
    const seriesData = pubTypes.map(typ => ({
      name: pubTypeLabels[typ] || typ,
      data: pubYears.map(y => pubData.filter(d => String(d['Datum der Publikation']) === y && d['Art der Publikation'] === typ).length)
    }));
    renderStackedBar('chart-pub-year', pubYears, seriesData);

    // ── Kooperationen ────────────────────────────────────────────────────────
    const activeKoopData = koopData.filter(d => d['Aktiv (Ja/Nein)'] === 'Ja');
    renderRegionBars('chart-koop-region', activeKoopData); // uses quadriga-main-45 (#818bac)

    // By Disziplin
    const diszMap = {};
    activeKoopData.forEach(d => {
      const raw = d['Disziplin der Institution'];
      if (!raw) return;
      raw.split(/[;,]/).map(s => s.trim()).filter(Boolean).forEach(disc => { diszMap[disc] = (diszMap[disc] || 0) + 1; });
    });
    const discEntries = Object.entries(diszMap).sort((a, b) => b[1] - a[1]).slice(0, 10);
    renderHBar('chart-koop-disziplin', discEntries.map(e => e[0]), discEntries.map(e => e[1]), '#9fc796'); // green tone

    document.getElementById('comm-loading').classList.add('d-none');

  } catch (err) {
    console.error('Community page error:', err);
    const el = document.getElementById('comm-loading');
    if (el) { el.textContent = 'Fehler beim Laden: ' + err.message; el.className = 'alert alert-danger'; }
  }
}

document.addEventListener('DOMContentLoaded', initCommunity);
