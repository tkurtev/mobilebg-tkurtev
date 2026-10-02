// Fails when a long dash (U+2014) or en dash (U+2013) appears in tracked source, docs or config.
import { readdirSync, readFileSync, statSync } from "node:fs";
import { extname, join } from "node:path";

const ROOTS = ["src", "docs", "tests", "scripts", "public", "README.md", "package.json", "next.config.ts", "drizzle.config.ts", "playwright.config.ts", "vitest.config.mts", "vercel.json", ".env.example", "docker-compose.yml"];
const EXTENSIONS = new Set([".ts", ".tsx", ".mjs", ".js", ".json", ".md", ".css", ".sql", ".svg", ".yml", ".yaml", ".example", ""]);
const FORBIDDEN = [String.fromCodePoint(0x2014), String.fromCodePoint(0x2013)];
const problems = [];

function visit(path) {
  let stats;
  try {
    stats = statSync(path);
  } catch {
    return;
  }
  if (stats.isDirectory()) {
    for (const entry of readdirSync(path)) {
      if (entry === "node_modules" || entry.startsWith(".next")) continue;
      visit(join(path, entry));
    }
    return;
  }
  if (!EXTENSIONS.has(extname(path))) return;
  const lines = readFileSync(path, "utf8").split("\n");
  lines.forEach((line, index) => {
    if (FORBIDDEN.some((dash) => line.includes(dash))) problems.push(`${path}:${index + 1}`);
  });
}

ROOTS.forEach(visit);
if (problems.length > 0) {
  console.error(`Long dash characters are not allowed. Use a normal hyphen instead:\n${problems.join("\n")}`);
  process.exit(1);
}
console.log("No long dash characters found.");
