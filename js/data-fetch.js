import { CONFIG_PATH, GITHUB_RAW_BASE, GITHUB_API_BASE } from "./config.js";

export async function loadCaseStudyList() {
  const res = await fetch(CONFIG_PATH);
  if (!res.ok) throw new Error("Konnte case-studies.json nicht laden.");
  return res.json();
}

export async function fetchMetadataYml(caseStudy) {
  const { owner, repo, branch, metadataPath } = caseStudy;
  const url = `${GITHUB_RAW_BASE}/${owner}/${repo}/${branch}/${metadataPath}`;

  try {
    const res = await fetch(url);
    if (!res.ok) {
      return { ...caseStudy, status: "missing", metadata: null };
    }
    const text = await res.text();
    const parsed = jsyaml.load(text);

    if (!isMetadataComplete(parsed)) {
      return { ...caseStudy, status: "incomplete", metadata: parsed };
    }
    return { ...caseStudy, status: "complete", metadata: parsed };
  } catch (err) {
    return { ...caseStudy, status: "error", metadata: null, error: err.message };
  }
}

function isMetadataComplete(meta) {
  if (!meta) return false;
  const requiredTopLevel = ["title", "chapters", "date-issued", "version"];
  const hasTopLevel = requiredTopLevel.every(
    (key) => meta[key] !== undefined && meta[key] !== null
  );
  const hasChapters = Array.isArray(meta.chapters) && meta.chapters.length > 0;
  return hasTopLevel && hasChapters;
}

export async function fetchOpenIssues(caseStudy) {
  const { owner, repo } = caseStudy;
  const url = `${GITHUB_API_BASE}/repos/${owner}/${repo}`;
  try {
    const res = await fetch(url);
    if (!res.ok) return { ...caseStudy, openIssues: null };
    const data = await res.json();
    return { ...caseStudy, openIssues: data.open_issues_count };
  } catch (err) {
    return { ...caseStudy, openIssues: null };
  }
}

export async function fetchAllCaseStudies() {
  const list = await loadCaseStudyList();
  const metaResults = await Promise.all(list.map(fetchMetadataYml));
  const withIssues = await Promise.all(
    metaResults.map(async (cs) => {
      const { openIssues } = await fetchOpenIssues(cs);
      return { ...cs, openIssues };
    })
  );
  return withIssues;
}