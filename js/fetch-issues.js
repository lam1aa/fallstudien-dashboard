const fs = require("fs");
const config = require("../config.json");


async function main() {
  const results = {};
  for (const cs of config) {
    const res = await fetch(`https://api.github.com/repos/${cs.owner}/${cs.repo}`, {
      headers: { Authorization: `token ${process.env.GH_TOKEN}` },
    });
    const data = await res.json();
    results[cs.id] = data.open_issues_count ?? null;
  }
  fs.writeFileSync("issues.json", JSON.stringify(results, null, 2));
}
main();