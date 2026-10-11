#!/usr/bin/env npx tsx
/**
 * check-content-regression.ts — hlídá, že změny neubírají entitám obsah.
 *
 * Použití:
 *   npx tsx scripts/check-content-regression.ts        # staged změny
 *   npx tsx scripts/check-content-regression.ts --all  # celý strom vs HEAD
 *
 * Regrese = soubor měl >=200 B skutečného obsahu a ztratil >30 %.
 * Nenulový exit → commit se zablokuje (pre-commit hook).
 */
import { execSync } from "node:child_process";
import fs from "node:fs";
import { extractBody } from "./lib/content-guard.js";

const checkAll = process.argv.includes("--all");

function git(cmd: string): string {
  return execSync(cmd, { encoding: "utf8", maxBuffer: 256 * 1024 * 1024 });
}

/** Načte staré obsahy přes git diff --no-index proti HEAD (rychlý batch). */
function loadOldBodies(paths: string[]): Map<string, string> {
  const map = new Map<string, string>();
  if (paths.length === 0) return map;
  // git show HEAD:<path> pro každý soubor je pomalé; použijeme ls-tree+cat-file
  // přes dočasný soubor s hashi a parsování BINÁRNĚ (ne string) — jinak se rozbije
  // na velikosti. Jednodušší a spolehlivé: git cat-file --batch s --buffer.
  const tree = git("git ls-tree -r HEAD -- content/entities/");
  const wanted = new Set(paths);
  const list: { hash: string; path: string }[] = [];
  for (const line of tree.split("\n")) {
    const m = line.match(/^\d+ blob ([0-9a-f]+)\t(.+)$/);
    if (m && m[2].endsWith("/entity.mdx") && wanted.has(m[2])) {
      list.push({ hash: m[1], path: m[2] });
    }
  }
  if (list.length === 0) return map;
  const input = list.map((l) => l.hash).join("\n") + "\n";
  const buf: Buffer = execSync("git cat-file --batch", {
    input, maxBuffer: 512 * 1024 * 1024,
  });
  // Binární parsování: <hash> blob <size>\n<content>\n
  let pos = 0;
  for (const l of list) {
    const nl = buf.indexOf(0x0a, pos);
    if (nl < 0) break;
    const header = buf.subarray(pos, nl).toString("utf8");
    const size = parseInt(header.split(" ")[2] ?? "0", 10);
    const content = buf.subarray(nl + 1, nl + 1 + size).toString("utf8");
    map.set(l.path, content);
    pos = nl + 1 + size + 1;
  }
  return map;
}

function targetFiles(): string[] {
  if (checkAll) {
    return execSync("git ls-files content/entities/", { encoding: "utf8" })
      .split("\n").filter((f) => f.endsWith("/entity.mdx"));
  }
  return execSync("git diff --cached --name-only --diff-filter=ACM", { encoding: "utf8" })
    .split("\n").filter((f) => f.endsWith("/entity.mdx"));
}

/** Skutečná délka těla (bez frontmatteru/nadpisů/komentářů). */
function bodyLen(raw: string): number {
  return extractBody(raw)
    .replace(/<!--[\s\S]*?-->/g, "")
    .replace(/^#+\s.*$/gm, "")
    .replace(/^>\s.*$/gm, "")
    .replace(/\s+/g, " ").trim().length;
}

const files = targetFiles();
const oldMap = loadOldBodies(files);
const regressions: { file: string; before: number; after: number }[] = [];

for (const f of files) {
  const before = oldMap.get(f);
  if (before === undefined) continue; // nový soubor
  const after = fs.existsSync(f) ? fs.readFileSync(f, "utf8") : "";
  const lb = bodyLen(before), la = bodyLen(after);
  if (lb >= 200 && la < lb * 0.7) regressions.push({ file: f, before: lb, after: la });
}

if (regressions.length === 0) {
  console.log(`✅ Žádná regrese obsahu (${files.length} souborů).`);
  process.exit(0);
}
console.error("\n🚨 REGRESE OBSAHU — entity ztratily >30 % textu:\n");
for (const r of regressions.sort((a, b) => (b.before - b.after) - (a.before - a.after))) {
  const pct = Math.round((1 - r.after / r.before) * 100);
  console.error(`   ${r.before} → ${r.after} B (−${pct} %)  ${r.file}`);
}
console.error("\nZáměrné? → CONTENT_REGRESSION_OK=1 git commit ...\nJinak obnov: git checkout HEAD -- <cesta>\n");
process.exit(1);
