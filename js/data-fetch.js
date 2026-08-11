/**
 * @file data-fetch.js
 * @description Responsible for fetching case study lists, metadata from GitHub, and open issues statistics.
 */
import { CONFIG_PATH, GITHUB_RAW_BASE, GITHUB_API_BASE } from "./config.js";

/**
 * Fetches the list of case studies from the local configuration file.
 * @returns {Promise<Array>} The parsed JSON array of case studies.
 */
export async function loadCaseStudyList() {
  const res = await fetch(CONFIG_PATH);
  if (!res.ok) throw new Error("Konnte case-studies.json nicht laden.");
  return res.json();
}

/**
 * Fetches and parses the YAML metadata for a specific case study from GitHub.
 * @param {Object} caseStudy - The case study configuration object.
 * @returns {Promise<Object>} The case study object augmented with metadata and status.
 */
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

/**
 * Validates if the fetched metadata contains all required top-level fields and chapters.
 * @param {Object} meta - The parsed metadata object.
 * @returns {boolean} True if the metadata is complete, false otherwise.
 */
function isMetadataComplete(meta) {
  if (!meta) return false;
  const requiredTopLevel = ["title", "chapters", "date-issued", "version"];
  const hasTopLevel = requiredTopLevel.every(
    (key) => meta[key] !== undefined && meta[key] !== null
  );
  const hasChapters = Array.isArray(meta.chapters) && meta.chapters.length > 0;
  return hasTopLevel && hasChapters;
}

/**
 * Fetches open issue counts from the locally generated stats.json file.
 * @returns {Promise<Object>} A map of case study IDs to their open issue counts.
 */
export async function fetchOpenIssuesMap() {
  const res = await fetch("stats.json?v=" + new Date().getTime());
  if (!res.ok) return {};
  const stats = await res.json();
  const issuesMap = {};
  for (const key in stats) {
    issuesMap[key] = stats[key].openIssues;
  }
  return issuesMap;
}

/**
 * Orchestrates fetching all case studies, their metadata, and issue counts.
 * @returns {Promise<Array>} The fully assembled array of case studies with metadata and issues.
 */
export async function fetchAllCaseStudies() {
  const list = await loadCaseStudyList();
  const metaResults = await Promise.all(list.map(fetchMetadataYml));
  const issuesMap = await fetchOpenIssuesMap();
  return metaResults.map((cs) => ({ ...cs, openIssues: issuesMap[cs.id] ?? null }));
}