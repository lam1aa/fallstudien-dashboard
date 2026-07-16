function parseIsoDurationToMinutes(iso) {
  if (!iso || typeof iso !== "string") return 0;
  const match = iso.match(/PT(?:(\d+)H)?(?:(\d+)M)?/);
  if (!match) return 0;
  const hours = parseInt(match[1] || "0", 10);
  const minutes = parseInt(match[2] || "0", 10);
  return hours * 60 + minutes;
}

function getShortLabel(repoName) {
  return repoName
    .replace(/-?Fallstudie-?/i, "-")
    .replace(/^-|-$/g, "")
    .replace(/--+/g, "-");
}

export function computeOverviewKpis(caseStudies) {
  const complete = caseStudies.filter((cs) => cs.status === "complete");

  const totalCases = caseStudies.length;
  const totalChapters = complete.reduce(
    (sum, cs) => sum + (cs.metadata.chapters?.length || 0),
    0
  );
  const totalObjectives = complete.reduce((sum, cs) => {
    const chapterObjectives = (cs.metadata.chapters || []).reduce(
      (s, ch) => s + (ch["learning-objectives"]?.length || 0),
      0
    );
    return sum + chapterObjectives;
  }, 0);

  const completeRatio = `${complete.length}/${totalCases}`;

  return { totalCases, totalChapters, totalObjectives, completeRatio };
}

export function buildWorkloadSeries(caseStudies) {
  const complete = caseStudies.filter((cs) => cs.status === "complete");

  const analyzed = complete
    .map((cs) => {
      const chapters = cs.metadata.chapters || [];
      const chapterMinutes = chapters.map((ch) =>
        parseIsoDurationToMinutes(ch["time-required"])
      );
      const allChaptersHaveTime =
        chapters.length > 0 && chapterMinutes.every((m) => m > 0);

      const caseLevelMinutes = parseIsoDurationToMinutes(cs.metadata["time-required"]);

      let mode = "none";
      let totalMinutes = 0;

      if (allChaptersHaveTime) {
        mode = "per-chapter";
        totalMinutes = chapterMinutes.reduce((a, b) => a + b, 0);
      } else if (caseLevelMinutes > 0) {
        mode = "total-only";
        totalMinutes = caseLevelMinutes;
      }

      return { cs, chapterMinutes, mode, totalMinutes };
    })
    .filter((entry) => entry.mode !== "none");

  const categories = analyzed.map((entry) => getShortLabel(entry.cs.repo));

  const maxChapters = Math.max(
    ...analyzed.filter((e) => e.mode === "per-chapter").map((e) => e.chapterMinutes.length),
    0
  );

  const series = [];

  series.push({
    name: "Gesamtzeit (keine Kapitelaufteilung)",
    data: analyzed.map((entry) => (entry.mode === "total-only" ? entry.totalMinutes : 0)),
  });

  for (let i = 0; i < maxChapters; i++) {
    series.push({
      name: `Kapitel ${i + 1}`,
      data: analyzed.map((entry) =>
        entry.mode === "per-chapter" ? entry.chapterMinutes[i] || 0 : 0
      ),
    });
  }

  return { categories, series };
}


// ── Feature 3 & 4 helpers ────────────────────────────────────────────────────

const BLOOM_ORDER = [
  "1 Erinnern",
  "2 Verstehen",
  "3 Anwenden",
  "4 Analysieren",
  "5 Bewerten",
];

// Normalise the raw blooms-category value to a canonical label
function normaliseBloom(raw) {
  if (!raw || typeof raw !== "string") return null;
  const found = BLOOM_ORDER.find((b) => raw.trim().startsWith(b.split(" ")[0]));
  return found || raw.trim();
}

// Collect all learning-objectives across chapters of one case study
function allObjectives(cs) {
  if (!cs.metadata?.chapters) return [];
  return cs.metadata.chapters.flatMap((ch) => ch["learning-objectives"] || []);
}

// ── Feature 3a, 3b: Bloom ───────────────────────────────────
function hasBloomData(cs) {
  return allObjectives(cs).some((o) => BLOOM_ORDER.includes(normaliseBloom(o["blooms-category"])));
}

export function buildBloomPerCaseSeries(caseStudies, type = "all") {
  const filtered = filterByType(caseStudies, type)
    .filter((cs) => cs.status === "complete")
    .filter(hasBloomData);
  const categories = filtered.map((cs) => getShortLabel(cs.repo));
  const series = BLOOM_ORDER.map((level) => ({
    name: level,
    data: filtered.map((cs) => allObjectives(cs).filter((o) => normaliseBloom(o["blooms-category"]) === level).length),
  }));
  return { categories, series };
}

export function buildBloomGlobalSeries(caseStudies, type = "all") {
  const filtered = filterByType(caseStudies, type).filter((cs) => cs.status === "complete");
  const counts = Object.fromEntries(BLOOM_ORDER.map((l) => [l, 0]));
  filtered.forEach((cs) => {
    allObjectives(cs).forEach((o) => {
      const level = normaliseBloom(o["blooms-category"]);
      if (level && counts[level] !== undefined) counts[level]++;
    });
  });
  return { labels: BLOOM_ORDER, values: BLOOM_ORDER.map((l) => counts[l]) };
}

// ── Feature 4a, 4b: competency coverage ─────────────────────────────────────────
function filterByType(caseStudies, type) {
  if (!type || type === "all") return caseStudies;
  const group = TYPE_GROUPS.find((g) => g.key === type);
  return group ? caseStudies.filter((cs) => group.match(cs.repo)) : caseStudies;
}

export function buildCompetencySeries(caseStudies, type = "all") {
  const complete = filterByType(caseStudies, type).filter((cs) => cs.status === "complete");
  const counts = {};
  complete.forEach((cs) => {
    allObjectives(cs).forEach((o) => {
      const raw = o["competency"];
      if (!raw || raw === "nicht anwendbar") return;
      const key = raw.trim();
      counts[key] = (counts[key] || 0) + 1;
    });
  });
  const sorted = Object.entries(counts).sort((a, b) => b[1] - a[1]);
  return { categories: sorted.map(([k]) => k), values: sorted.map(([, v]) => v) };
}

export function buildDataFlowSeries(caseStudies, type = "all") {
  const complete = filterByType(caseStudies, type).filter((cs) => cs.status === "complete");
  const counts = {};
  complete.forEach((cs) => {
    allObjectives(cs).forEach((o) => {
      const raw = o["data-flow"];
      if (!raw || raw === "nicht anwendbar") return;
      const key = raw.trim();
      counts[key] = (counts[key] || 0) + 1;
    });
  });
  const sorted = Object.entries(counts).sort((a, b) => (parseInt(a[0]) || 99) - (parseInt(b[0]) || 99));
  return { categories: sorted.map(([k]) => k), values: sorted.map(([, v]) => v) };
}

// ── Feature 4c: Bloom × Chapter heatmap ─────────────────────────────────────
export function buildBloomHeatmapSeries(caseStudies) {
  const complete = caseStudies.filter((cs) => cs.status === "complete");

  // series: one per Bloom level; each data point = {x: chapterLabel, y: count}
  const series = BLOOM_ORDER.map((level) => {
    const data = [];
    complete.forEach((cs) => {
      const csLabel = getShortLabel(cs.repo);
      (cs.metadata.chapters || []).forEach((ch, idx) => {
        const label = `${csLabel} / K${idx + 1}`;
        const count = (ch["learning-objectives"] || []).filter(
          (o) => normaliseBloom(o["blooms-category"]) === level
        ).length;
        data.push({ x: label, y: count });
      });
    });
    return { name: level, data };
  });

  return series;
}

const DATAFLOW_STAGE_ORDER = [
  "1 Planung",
  "2 Erhebung und Aufbereitung",
  "3 Management",
  "4 Analyse",
  "5 Publikation und Nachnutzung",
  "übergreifend",
];

function deriveDataFlowStage(competencyRaw) {
  if (!competencyRaw || competencyRaw === "nicht anwendbar") return null;
  const c = competencyRaw.trim();

  if (c === "Orientierungswissen") return "übergreifend";
  if (c.startsWith("1.")) return "1 Planung";
  if (c.startsWith("2.")) return "2 Erhebung und Aufbereitung";
  if (c.startsWith("3.")) return "3 Management";
  if (c.startsWith("4.")) return "4 Analyse";
  if (c.startsWith("5.")) return "5 Publikation und Nachnutzung";
  return null;
}

// ── Feature 4d: Competency × Data-flow dependency heatmap ──────────────────
export function buildCompetencyDataFlowMatrix(caseStudies) {
  const complete = caseStudies.filter((cs) => cs.status === "complete");
  const matrix = {}; // { competency: { stage: count } }

  complete.forEach((cs) => {
    allObjectives(cs).forEach((o) => {
      const competency = o["competency"]?.trim();
      if (!competency || competency === "nicht anwendbar") return;

      const stage = deriveDataFlowStage(competency);
      if (!stage) return;

      if (!matrix[competency]) matrix[competency] = {};
      matrix[competency][stage] = (matrix[competency][stage] || 0) + 1;
    });
  });

  // Sort competencies by their stage order, then alphabetically within stage
  const competencies = Object.keys(matrix).sort((a, b) => {
    const stageA = DATAFLOW_STAGE_ORDER.indexOf(deriveDataFlowStage(a));
    const stageB = DATAFLOW_STAGE_ORDER.indexOf(deriveDataFlowStage(b));
    return stageA - stageB || a.localeCompare(b);
  });

  const series = competencies.map((comp) => ({
    name: comp,
    data: DATAFLOW_STAGE_ORDER.map((stage) => ({
      x: stage,
      y: matrix[comp][stage] || 0,
    })),
  }));

  return series;
}

const TYPE_GROUPS = [
  { key: "tabelle", label: "Tabelle", icon: "📊", match: (repo) => /^Tabelle-/i.test(repo) },
  { key: "text", label: "Text", icon: "📝", match: (repo) => /^Text-/i.test(repo) },
  { key: "bild", label: "Bewegtes Bild", icon: "🎬", match: (repo) => /^Bewegtes-Bild-/i.test(repo) },
];

export function buildTypeGroupSummaries(caseStudies) {
  return TYPE_GROUPS.map((group) => {
    const members = caseStudies.filter((cs) => group.match(cs.repo));

    const totalOpenIssues = members.reduce(
      (sum, cs) => sum + (cs.openIssues ?? 0),
      0
    );

    const repos = members.map((cs) => ({
      label: getShortLabel(cs.repo),
      version: cs.metadata?.version ?? "–",
      doi: cs.metadata?.identifier ?? null,
      bookUrl: cs.metadata?.url ?? null,
      openIssues: cs.openIssues,
    }));

    return {
      key: group.key,
      label: group.label,
      icon: group.icon,
      totalOpenIssues,
      repoCount: members.length,
      repos,
    };
  });
}