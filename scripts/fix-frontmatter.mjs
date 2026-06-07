#!/usr/bin/env node
/**
 * fix-frontmatter.mjs — opraví YAMLParseError v MDX souborech pod content/
 *   • odstraní trailing whitespace a CR (\r) na řádcích frontmatteru  (řeší publishedAt: "...")
 *   • obalí holá čísla u vybraných polí do uvozovek                    (řeší founded: 2008)
 *
 *   node scripts/fix-frontmatter.mjs --dry-run
 *   node scripts/fix-frontmatter.mjs
 */
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, "..");
const CONTENT = path.join(ROOT, "content");
const DRY = process.argv.includes("--dry-run");
const QUOTE_FIELDS = ["founded"]; // ONLY fields that need string values — year is number in contentlayer schema

let changed = 0;
walk(CONTENT);
console.log(`\n${DRY ? "[dry-run] " : ""}Upraveno souborů: ${changed}`);

function walk(dir) {
  for (const e of safeRead(dir)) {
    const p = path.join(dir, e.name);
    if (e.isDirectory()) walk(p);
    else if (e.name.endsWith(".mdx")) fixFile(p);
  }
}
function fixFile(p) {
  const raw = fs.readFileSync(p, "utf8");
  const lines = raw.split("\n");
  if (lines[0].replace(/\r$/, "").trim() !== "---") return;
  let end = -1;
  for (let i = 1; i < lines.length; i++) if (lines[i].replace(/\r$/, "").trim() === "---") { end = i; break; }
  if (end < 0) return;

  let local = false;
  for (let i = 1; i < end; i++) {
    let nl = lines[i].replace(/\r$/, "").replace(/[ \t]+$/, "");           // CR + trailing whitespace
    for (const f of QUOTE_FIELDS) nl = nl.replace(new RegExp(`^(\\s*${f}:\\s*)(\\d+)\\s*$`), '$1"$2"'); // číslo -> string
    if (nl !== lines[i]) { lines[i] = nl; local = true; }
  }
  for (const idx of [0, end]) { const nl = lines[idx].replace(/\r$/, ""); if (nl !== lines[idx]) { lines[idx] = nl; local = true; } }

  if (local) {
    changed++;
    if (DRY) console.log(`  ~ ${path.relative(ROOT, p)}`);
    else fs.writeFileSync(p, lines.join("\n"), "utf8");
  }
}
function safeRead(dir) { try { return fs.readdirSync(dir, { withFileTypes: true }); } catch { return []; } }
