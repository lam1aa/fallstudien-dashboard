const fs = require('fs');
const jsyaml = require('js-yaml');

function extractTocFiles(tocObj) {
  let files = [];
  if (Array.isArray(tocObj)) {
    for (const item of tocObj) files = files.concat(extractTocFiles(item));
  } else if (typeof tocObj === 'object' && tocObj !== null) {
    if (tocObj.file) files.push(tocObj.file);
    if (tocObj.root) files.push(tocObj.root);
    if (tocObj.chapters) files = files.concat(extractTocFiles(tocObj.chapters));
    if (tocObj.sections) files = files.concat(extractTocFiles(tocObj.sections));
    if (tocObj.parts) files = files.concat(extractTocFiles(tocObj.parts));
  }
  return files;
}

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

async function getStats(repo, owner = 'quadriga-dk', branch = 'main') {
  const treeUrl = `https://api.github.com/repos/${owner}/${repo}/git/trees/${branch}?recursive=1`;
  const treeRes = await fetch(treeUrl);
  if (!treeRes.ok) return `Failed to fetch tree for ${repo}`;
  const treeData = await treeRes.json();

  const fileMap = {};
  for (const item of treeData.tree) {
    if (item.type === 'blob' && (item.path.endsWith('.md') || item.path.endsWith('.ipynb'))) {
      fileMap[item.path.replace(/\.(md|ipynb)$/, '')] = item.path;
    }
  }

  let tocUrl = fileMap['Markdown/_toc'] ? `https://raw.githubusercontent.com/${owner}/${repo}/${branch}/Markdown/_toc.yml` :
    fileMap['_toc'] ? `https://raw.githubusercontent.com/${owner}/${repo}/${branch}/_toc.yml` :
      `https://raw.githubusercontent.com/${owner}/${repo}/${branch}/_toc.yml`;

  let res = await fetch(tocUrl);
  if (!res.ok) {
    tocUrl = `https://raw.githubusercontent.com/${owner}/${repo}/${branch}/Markdown/_toc.yml`;
    res = await fetch(tocUrl);
  }
  if (!res.ok) return `Failed to fetch TOC for ${repo}`;

  const tocText = await res.text();
  const docnames = extractTocFiles(jsyaml.load(tocText));

  let md = `### ${repo}\n\n`;
  md += `| Chapter (Page) | Words |\n`;
  md += `|---|---|\n`;

  let totalW = 0;
  for (let doc of docnames) {
    const cleanDoc = doc.replace(/\.(md|ipynb)$/, '');
    let actualPath = fileMap[cleanDoc];
    if (!actualPath) {
      const matches = Object.keys(fileMap).filter(k => k.endsWith('/' + cleanDoc) || k === cleanDoc);
      if (matches.length > 0) actualPath = fileMap[matches[0]];
    }

    if (!actualPath) {
      md += `| ${doc} | (Not Found) |\n`;
      continue;
    }

    const pageUrl = `https://raw.githubusercontent.com/${owner}/${repo}/${branch}/${actualPath}`;
    const pageRes = await fetch(pageUrl);
    if (!pageRes.ok) continue;
    const content = await pageRes.text();
    let words = 0;

    if (actualPath.endsWith('.ipynb')) {
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

    md += `| ${doc} | ${words} |\n`;
    totalW += words;
  }
  md += `| **Total** | **${totalW}** |\n\n`;
  return md;
}

async function main() {
  const md1 = await getStats('Tabelle-Fallstudie-1');
  const md2 = await getStats('Bewegtes-Bild-Fallstudie-1');
  fs.writeFileSync('chapter_breakdown.md', md1 + md2);
  console.log("Done");
}
main();
