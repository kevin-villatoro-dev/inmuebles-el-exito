const fs = require("node:fs");
const path = require("node:path");

const root = path.resolve(__dirname, "..");
const ignoredDirectories = new Set(["node_modules", "dist", "coverage", ".git", ".vite", "data"]);
const ignoredFiles = new Set(["example.txt", "package-lock.json"]);
const patterns = [
  { name: "OpenAI API key", expression: /sk-[A-Za-z0-9_-]{20,}/ },
  { name: "OpenAI API key assignment", expression: /OPENAI_API_KEY\s*=\s*(?!replace_with|your_|\s*$)[^\s#]+/ },
  { name: "Catalog API key assignment", expression: /CATALOG_API_KEY\s*=\s*(?!replace_with|your_|\s*$)[^\s#]+/ }
];

function visit(directory, matches) {
  for (const entry of fs.readdirSync(directory, { withFileTypes: true })) {
    if (ignoredDirectories.has(entry.name) || ignoredFiles.has(entry.name)) continue;
    if (entry.name === ".env" || (entry.name.startsWith(".env.") && !entry.name.endsWith(".example"))) continue;
    const filePath = path.join(directory, entry.name);
    if (entry.isDirectory()) {
      visit(filePath, matches);
      continue;
    }
    if (!entry.isFile() || path.extname(entry.name) === ".svg") continue;
    const content = fs.readFileSync(filePath, "utf8");
    for (const pattern of patterns) {
      if (pattern.expression.test(content)) matches.push(`${path.relative(root, filePath)}: ${pattern.name}`);
    }
  }
}

const matches = [];
visit(root, matches);
if (matches.length) {
  console.error("Se detectaron posibles secretos:");
  for (const match of matches) console.error(`- ${match}`);
  process.exitCode = 1;
} else {
  console.log("No se detectaron secretos en archivos versionables.");
}
