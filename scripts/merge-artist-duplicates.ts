#!/usr/bin/env -S npx tsx
/**
 * Sloučí duplicitní artist entity do kanonické.
 *
 * 1. artist_dj-mike-trafik → artist_mike-trafik (alias "DJ Mike Trafik" už existuje)
 * 2. artist_7krt3          → artist_7krat3 (překlep)
 *
 * Postup:
 *   - najde všechny references na duplikát ve všech relations.json
 *   - nahradí je kanonickým id
 *   - smaže duplicitní složku (přesune do .data/original-content-backup)
 *
 * Bezpečnost: DRY_RUN default. Zálohuje složku před smazáním.
 */
import * as fs from "node:fs";
import * as path from "node:path";

const ROOT = path.resolve(__dirname, "..");
const ENTITIES = path.join(ROOT, "content", "entities");
const BACKUP = path.join(ROOT, ".data", "original-content-backup");
const DRY_RUN = process.env.DRY_RUN !== "0";

const MERGES: Record<string, string> = {
  "artist_dj-mike-trafik": "artist_mike-trafik",
  "artist_7krt3": "artist_7krat3",
};

let refsFixed = 0;
const filesChanged = new Set<string>();

// projdi všechny relations.json a nahraď reference
for (const d of fs.readdirSync(ENTITIES)) {
  const rp = path.join(ENTITIES, d, "relations.json");
  if (!fs.existsSync(rp)) continue;
  let raw = fs.readFileSync(rp, "utf8");
  let changed = false;
  for (const [dup, canon] of Object.entries(MERGES)) {
    if (raw.includes(`"${dup}"`)) {
      raw = raw.split(`"${dup}"`).join(`"${canon}"`);
      changed = true;
      refsFixed += (raw.match(new RegExp(`"${canon}"`, "g"))?.length ?? 0) - (raw.match(new RegExp(`"${canon}"`, "g"))?.length ?? 0) || 0;
    }
  }
  // přesněji spočítat
  if (changed && !DRY_RUN) {
    fs.writeFileSync(rp, raw);
    filesChanged.add(d);
  } else if (changed) {
    filesChanged.add(d);
  }
}

// přesně spočítat počet nahrazených referencí
let count = 0;
for (const d of fs.readdirSync(ENTITIES)) {
  const rp = path.join(ENTITIES, d, "relations.json");
  if (!fs.existsSync(rp)) continue;
  const raw = fs.readFileSync(rp, "utf8");
  for (const [dup, canon] of Object.entries(MERGES)) {
    count += (raw.match(new RegExp(`"${canon}"`, "g")) ?? []).length;
  }
}

console.log(`Reference k nahrazení: ${Object.keys(MERGES).length} duplikátů`);
console.log(`Soubory se změnou: ${filesChanged.size}`);
console.log(`Duplicitní složky k přesunu:`);
for (const dup of Object.keys(MERGES)) {
  const dir = path.join(ENTITIES, dup);
  console.log(`   ${dup} (existuje: ${fs.existsSync(dir)})`);
}

if (DRY_RUN) { console.log("\n[DRY-RUN] Nic nezapsáno."); process.exit(0); }

// přesuň duplicitní složky do backupu
for (const dup of Object.keys(MERGES)) {
  const dir = path.join(ENTITIES, dup);
  if (!fs.existsSync(dir)) continue;
  fs.mkdirSync(BACKUP, { recursive: true });
  fs.renameSync(dir, path.join(BACKUP, dup));
  console.log(`   přesunuto: ${dup} → backup`);
}

console.log(`\n✅ Sloučeno. Reference přesměrovány v ${filesChanged.size} souborech.`);
