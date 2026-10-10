#!/usr/bin/env -S npx tsx
/**
 * Sjednotí noindex flag u všech generovaných entit bez obsahu.
 *
 * Fáze 0/1 (feat skladby) přidávaly `generatedFrom` bez `noindex`.
 * Fáze 4 (import) přidávala oboje. Tenhle skript dorovná fáze 0/1 —
 * každá generovaná entita s minimálním obsahem (< 500 znaků) dostane
 * noindex:true + isStub:true, aby se nedostala do sitemapy.
 *
 * Idempotentní. DRY_RUN default.
 */
import * as fs from "node:fs";
import * as path from "node:path";

const ROOT = path.resolve(__dirname, "..");
const ENTITIES = path.join(ROOT, "content", "entities");
const DRY_RUN = process.env.DRY_RUN !== "0";
const MIN_CONTENT = 500;

let fixed = 0, already = 0, skippedRich = 0;
const touched: string[] = [];

for (const d of fs.readdirSync(ENTITIES, { withFileTypes: true })) {
  if (!d.isDirectory()) continue;
  const mp = path.join(ENTITIES, d.name, "meta.json");
  if (!fs.existsSync(mp)) continue;
  const meta = JSON.parse(fs.readFileSync(mp, "utf8"));
  const em = meta.extraMeta ?? {};
  if (!em.generatedFrom) continue;

  // má už flag?
  if (em.noindex === true && em.isStub === true) { already++; continue; }

  // má reálný obsah? (MDX nad threshold = není stub)
  const mdxPath = path.join(ENTITIES, d.name, "entity.mdx");
  const content = fs.existsSync(mdxPath) ? fs.readFileSync(mdxPath, "utf8") : "";
  if (content.length >= MIN_CONTENT) { skippedRich++; continue; }

  touched.push(d.name);
  if (DRY_RUN) continue;

  meta.extraMeta = { ...em, noindex: true, isStub: true };
  fs.writeFileSync(mp, JSON.stringify(meta, null, 2) + "\n");
  fixed++;
}

console.log(`Už má flag: ${already}`);
console.log(`Bohatý obsah (přeskočeno): ${skippedRich}`);
console.log(`K opravě: ${touched.length}`);
for (const t of touched.slice(0, 10)) console.log(`  · ${t}`);

if (DRY_RUN) {
  console.log("\n[DRY-RUN] DRY_RUN=0 pro zápis.");
} else {
  console.log(`\n✅ Opraveno ${fixed} entit.`);
}
