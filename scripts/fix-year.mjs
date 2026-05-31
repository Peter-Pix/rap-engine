#!/usr/bin/env node
/**
 * fix-year.mjs — year ve frontmatteru zpět na ČÍSLO (Contentlayer čeká number, ne string)
 *   year: "2018"  ->  year: 2018
 *
 *   node scripts/fix-year.mjs --dry-run
 *   node scripts/fix-year.mjs
 */
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, "..");
const CONTENT = path.join(ROOT, "content");
const DRY = process.argv.includes("--dry-run");

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
    // year: "2018" -> year: 2018  (jen 4místné číslo v uvozovkách)
    const nl = lines[i].replace(/^(\s*year:\s*)["'](\d{4})["']\s*$/, "$1$2");
    if (nl !== lines[i]) { lines[i] = nl; local = true; }
  }
  if (local) {
    changed++;
    if (DRY) console.log(`  ~ ${path.relative(ROOT, p)}`);
    else fs.writeFileSync(p, lines.join("\n"), "utf8");
  }
}
function safeRead(dir) { try { return fs.readdirSync(dir, { withFileTypes: true }); } catch { return []; } }
