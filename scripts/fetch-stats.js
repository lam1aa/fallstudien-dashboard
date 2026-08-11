/**
 * @file fetch-stats.js
 * @description Node.js script to fetch metadata, word counts, and open issues across GitHub repositories, outputting to stats.json.
 */
const fs = require("fs");
const jsyaml = require("js-yaml");
const config = require("../config.json");

/**
 * Recursively extracts all document paths from a _toc.yml object structure.
 * @param {Object|Array} tocObj - The Table of Contents object from js-yaml.
 * @returns {Array<string>} A flat list of file paths.
 */
function extractTocFiles(tocObj) {
  let files = [];
  
  if (Array.isArray(tocObj)) {
    for (const item of tocObj) {
      files = files.concat(extractTocFiles(item));
    }
  } else if (typeof tocObj === 'object' && tocObj !== null) {
    if (tocObj.file) files.push(tocObj.file);
    if (tocObj.root) files.push(tocObj.root);
    if (tocObj.chapters) files = files.concat(extractTocFiles(tocObj.chapters));
    if (tocObj.sections) files = files.concat(extractTocFiles(tocObj.sections));
    if (tocObj.parts) files = files.concat(extractTocFiles(tocObj.parts));
  }
  return files;
}

/**
 * Counts words in a text string, stripping out HTML/Markdown/MyST formatting.
 * @param {string} text - The raw markdown or text string.
 * @returns {number} The estimated word count.
 */
function countWords(text) {
  let clean = text
    .replace(/<!--[\s\S]*?-->/g, ' ')       // HTML comments
    .replace(/```{[^}]+}/g, ' ')            // MyST blocks
    .replace(/^:[a-zA-Z0-9_-]+:.*/gm, ' ')  // MyST attributes
    .replace(/\]\([^\)]+\)/g, ' ')          // Markdown link URLs
    .replace(/<[^>]+>/g, ' ');              // HTML tags

  // Match sequences of letters, numbers, hyphens, and umlauts
  let matches = clean.match(/[a-zA-ZäöüÄÖÜß0-9-]+/g) || [];
  
  // Filter out standalone hyphens
  let words = matches.filter(w => w !== '-');
  return words.length;
}

/**
 * Main script execution: Iterates through configured repositories, fetches stats, and writes stats.json.
 */
async function main() {
  const results = {};

  for (const cs of config) {
    const owner = cs.owner;
    const repo = cs.repo;
    const branch = cs.branch || "main";
    console.log(`Fetching stats for ${cs.id} (${repo})...`);

      let wordCount = 0;
      let chapterCounts = [];

      try {
        // Fetch _toc.yml
        let tocUrl = `https://raw.githubusercontent.com/${owner}/${repo}/${branch}/_toc.yml`;

        let res = await fetch(tocUrl);
        if (!res.ok) {
          // Try fallback
          tocUrl = `https://raw.githubusercontent.com/${owner}/${repo}/${branch}/Markdown/_toc.yml`;
          res = await fetch(tocUrl);
        }

        if (!res.ok) {
          console.warn(`[WARN] Could not fetch _toc.yml for ${repo}`);
          results[cs.id] = { wordCount: 0, chapterCounts: [] };
          continue;
        }

        const tocText = await res.text();
        const tocObj = jsyaml.load(tocText);
        const docnames = extractTocFiles(tocObj);

        if (docnames.length === 0) {
          console.warn(`[WARN] No documents found in _toc.yml for ${repo}`);
          results[cs.id] = { wordCount: 0, chapterCounts: [] };
          continue;
        }

        // Fetch each document
        for (let doc of docnames) {
          // Strip extension if it was explicitly provided in toc.yml
          const cleanDoc = doc.replace(/\.(md|ipynb)$/, '');
          
          let pageRes = null;
          let pageUrl = `https://raw.githubusercontent.com/${owner}/${repo}/${branch}/${cleanDoc}.md`;
          let isIpynb = false;
          
          pageRes = await fetch(pageUrl);
          
          if (!pageRes.ok) {
            pageUrl = `https://raw.githubusercontent.com/${owner}/${repo}/${branch}/${cleanDoc}.ipynb`;
            pageRes = await fetch(pageUrl);
            isIpynb = true;
          }

          if (!pageRes || !pageRes.ok) {
            console.warn(`  [WARN] Could not find source file for toc entry: ${doc}`);
            continue;
          }

          try {
            let words = 0;
            const content = await pageRes.text();

            if (isIpynb) {
              const ipynb = JSON.parse(content);
              for (const cell of ipynb.cells || []) {
                if (cell.cell_type === 'markdown' || cell.cell_type === 'code') {
                  const source = Array.isArray(cell.source) ? cell.source.join('') : cell.source;
                  words += countWords(source);
                }
              }
            } else {
              words = countWords(content);
            }

            wordCount += words;
            chapterCounts.push({ chapter: doc, words: words });
          } catch (err) {
            console.warn(`  [WARN] Error processing ${actualPath}:`, err.message);
          }
        }

        // Fetch open issues
        const issueUrl = `https://api.github.com/repos/${owner}/${repo}`;
        const issueRes = await fetch(issueUrl, {
          headers: process.env.GH_TOKEN ? { Authorization: `token ${process.env.GH_TOKEN}` } : {}
        });
        let openIssues = null;
        if (issueRes.ok) {
          const issueData = await issueRes.json();
          openIssues = issueData.open_issues_count;
        }

        // Fetch Zenodo stats
        let zenodoDownloadsAll = 0;
        let zenodoDownloadsVersion = 0;
        try {
          const metaPath = cs.metadataPath || "metadata.yml";
          const metaUrl = `https://raw.githubusercontent.com/${owner}/${repo}/${branch}/${metaPath}`;
          const metaRes = await fetch(metaUrl);
          if (metaRes.ok) {
            const metaText = await metaRes.text();
            const metaObj = jsyaml.load(metaText);
            if (metaObj && metaObj.identifier) {
              const match = String(metaObj.identifier).match(/zenodo\.(\d+)/i);
              if (match && match[1]) {
                const zenodoId = match[1];
                const zenodoRes = await fetch(`https://zenodo.org/api/records/${zenodoId}`);
                if (zenodoRes.ok) {
                  const zenodoData = await zenodoRes.json();
                  if (zenodoData.stats) {
                    zenodoDownloadsAll = zenodoData.stats.unique_downloads || 0;
                    zenodoDownloadsVersion = zenodoData.stats.version_unique_downloads || 0;
                  }
                }
              }
            }
          }
        } catch (err) {
          console.warn(`  [WARN] Error fetching Zenodo stats for ${repo}:`, err.message);
        }

        console.log(`  -> Words: ${wordCount}, Issues: ${openIssues}, Zenodo Downloads (Version): ${zenodoDownloadsVersion}, Zenodo Downloads (All): ${zenodoDownloadsAll}`);
        results[cs.id] = { wordCount, openIssues, chapterCounts, zenodoDownloadsAll, zenodoDownloadsVersion };

    } catch (err) {
      console.warn(`[ERROR] Failed processing ${repo}:`, err.message);
      results[cs.id] = { wordCount: 0 };
    }
  }

  fs.writeFileSync("stats.json", JSON.stringify(results, null, 2));
  console.log("Successfully wrote stats.json");
}

main();
