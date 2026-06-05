#!/usr/bin/env node
// find-duplicates.mjs — najde duplicitní slugy v content/**/*.mdx a data/**/*.json
// + nesoulad mezi názvem souboru a slugem uvnitř

import { readFileSync, readdirSync, existsSync } from "node:fs";
import { join, resolve } from "node:path";

const ROOT = resolve(process.cwd());
const SCOPE = [
  { dir: "content/raperi", kind: "mdx" },
  { dir: "content/alba", kind: "mdx" },
  { dir: "content/skladby", kind: "mdx" },
  { dir: "content/labely", kind: "mdx" },
  { dir: "content/zanry", kind: "mdx" },
  { dir: "data/rappers", kind: "json" },
  { dir: "data/albums", kind: "json" },
  { dir: "data/tracks", kind: "json" },
  { dir: "data/labels", kind: "json" },
  { dir: "data/genres", kind: "json" },
];

let dupCount = 0, mismatchCount = 0;
for (const { dir, kind } of SCOPE) {
  const full = join(ROOT, dir);
  if (!existsSync(full)) continue;
  const slugs = new Map();           // slug → [files]
  const mismatches = [];

  for (const f of readdirSync(full).filter((x) => x.endsWith(kind === "mdx" ? ".mdx" : ".json") && !x.startsWith("_"))) {
    const raw = readFileSync(join(full, f), "utf8");
    const slug = kind === "mdx" ? extractMdxSlug(raw) : extractJsonSlug(raw);
    if (!slug) continue;
    const fileBase = f.replace(/\.(mdx|json)$/, "");
    if (slug !== fileBase) mismatches.push({ file: f, slug });
    if (!slugs.has(slug)) slugs.set(slug, []);
    slugs.get(slug).push(f);
  }

  const dups = [...slugs.entries()].filter(([, fs]) => fs.length > 1);
  if (!dups.length && !mismatches.length) continue;

  console.log(`\n── ${dir} ──`);
  for (const [slug, files] of dups) {
    dupCount++;
    console.log(`  ⚠ DUP slug "${slug}"  v souborech: ${files.join(", ")}`);
  }
  for (const m of mismatches) {
    mismatchCount++;
    console.log(`  ⚠ mismatch: ${m.file}  obsahuje  slug: "${m.slug}"`);
  }
}

console.log(`\n${dupCount ? "⚠ " : "✓ "}${dupCount} duplicit, ${mismatchCount} názvosouboru↔slug nesouladů`);

function extractMdxSlug(raw) {
  const m = raw.match(/^---\r?\n([\s\S]*?)\r?\n---/);
  if (!m) return null;
  const s = m[1].match(/^slug:\s*["']?([^"'\r\n]+)["']?\s*$/m);
  return s ? s[1].trim() : null;
}
function extractJsonSlug(raw) {
  const m = raw.match(/"slug"\s*:\s*"([^"]+)"/);
  return m ? m[1] : null;
}
