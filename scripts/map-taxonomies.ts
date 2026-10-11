#!/usr/bin/env npx tsx
/**
 * map-taxonomies.ts — převede volný text (RM themes/moods) na hrany našeho grafu.
 *
 * Problém: 1 826 tracků má `extraMeta.themes` / `extraMeta.moods` (volný český
 * text), ale NULU hran HAS_THEME / HAS_MOOD. Data jsou odpojená — `/temata/flex`
 * ukazuje 176 skladeb, i když jich téma „flex" má reálně víc.
 *
 * Řešení: použij kurátorovaný slovník (scripts/data/taxonomy-map.ts) a vytvoř
 * hrany. NIKDY nemapuje na neexistující entitu (validace před zápisem).
 *
 * Usage:
 *   npx tsx scripts/map-taxonomies.ts            # dry-run
 *   DRY_RUN=0 npx tsx scripts/map-taxonomies.ts # zápis do graph.json
 */
import fs from "node:fs";
import path from "node:path";
import { MOOD_MAP, THEME_MAP, lookup, normKey } from "./data/taxonomy-map.js";
import { mayOverwrite } from "./lib/content-guard.js";

const ROOT = process.cwd();
const CACHE = path.join(ROOT, ".content-cache");
const ENTITIES = path.join(ROOT, "content", "entities");
const DRY_RUN = process.env.DRY_RUN !== "0";

type Ent = { id: string; type: string; slug: string; title: string; extraMeta?: Record<string, unknown> };
type Edge = { from: string; to: string; relation: string; [k: string]: unknown };

const entsJson = JSON.parse(fs.readFileSync(path.join(CACHE, "entities.json"), "utf8"));
const ents: Record<string, Ent> = entsJson.entities ?? entsJson;

// ── Validace slovníku: každý cíl musí existovat ────────────────────────────
let badTargets: string[] = [];
for (const [srcLabel, map] of [["MOOD_MAP", MOOD_MAP], ["THEME_MAP", THEME_MAP]] as const) {
  for (const [key, target] of Object.entries(map)) {
    if (!ents[target]) badTargets.push(`${srcLabel}["${key}"] → ${target} (NEEXISTUJE)`);
  }
}
if (badTargets.length > 0) {
  console.error("🚨 SLOVNÍK OBSAHUJE NEEXISTUJÍCÍ CÍLE:\n");
  badTargets.forEach((b) => console.error("   " + b));
  console.error(`\nOprav scripts/data/taxonomy-map.ts. Nic nebylo zapsáno.`);
  process.exit(1);
}
console.log(`✅ Slovník validní: ${Object.keys(MOOD_MAP).length} nálad + ${Object.keys(THEME_MAP).length} témat → existující entity.`);

// ── Načti existující hrany (nesmíme duplikovat) ────────────────────────────
const graph: Edge[] = JSON.parse(fs.readFileSync(path.join(CACHE, "graph.json"), "utf8"));
const existing = new Set(graph.map((e) => `${e.from}|${e.relation}|${e.to}`));

// ── Projdi tracky s volným textem ───────────────────────────────────────────
const tracks = Object.values(ents).filter((e) => e.type === "track");
const newEdges: Edge[] = [];
const stats = {
  tracksTotal: tracks.length,
  tracksWithFreeText: 0,
  themesMatched: 0, themesUnmatched: 0,
  moodsMatched: 0, moodsUnmatched: 0,
  tracksEnriched: new Set<string>(),
};
const unmatched = new Map<string, number>();

for (const t of tracks) {
  const em = t.extraMeta ?? {};
  const themes = (em.themes as string[]) ?? [];
  const moods = (em.moods as string[]) ?? [];
  if (themes.length === 0 && moods.length === 0) continue;
  stats.tracksWithFreeText++;

  for (const raw of themes) {
    const target = lookup(THEME_MAP, raw);
    if (target) {
      const key = `${t.id}|HAS_THEME|${target}`;
      if (!existing.has(key)) { newEdges.push({ from: t.id, to: target, relation: "HAS_THEME" }); existing.add(key); }
      stats.themesMatched++; stats.tracksEnriched.add(t.id);
    } else { stats.themesUnmatched++; unmatched.set(raw, (unmatched.get(raw) ?? 0) + 1); }
  }
  for (const raw of moods) {
    const target = lookup(MOOD_MAP, raw);
    if (target) {
      const key = `${t.id}|HAS_MOOD|${target}`;
      if (!existing.has(key)) { newEdges.push({ from: t.id, to: target, relation: "HAS_MOOD" }); existing.add(key); }
      stats.moodsMatched++; stats.tracksEnriched.add(t.id);
    } else { stats.moodsUnmatched++; unmatched.set(raw, (unmatched.get(raw) ?? 0) + 1); }
  }
}

console.log("");
console.log(`Tracků s volným textem: ${stats.tracksWithFreeText} / ${stats.tracksTotal}`);
console.log(`Témata:  ${stats.themesMatched} namapováno, ${stats.themesUnmatched} nenamapováno (${(100*stats.themesMatched/(stats.themesMatched+stats.themesUnmatched||1)).toFixed(1)} %)`);
console.log(`Nálady:  ${stats.moodsMatched} namapováno, ${stats.moodsUnmatched} nenamapováno (${(100*stats.moodsMatched/(stats.moodsMatched+stats.moodsUnmatched||1)).toFixed(1)} %)`);
console.log(`Nových hran: ${newEdges.length}`);
console.log(`Tracků, které dostanou aspoň jednu hranu: ${stats.tracksEnriched.size}`);
console.log("");
console.log("=== Top 15 nenamapovaných frází (kandidáti na rozšíření slovníku) ===");
[...unmatched.entries()].sort((a, b) => b[1] - a[1]).slice(0, 15).forEach(([t, n]) => console.log(`  ${String(n).padStart(4)}  ${t}`));
console.log("");
const byTarget = new Map<string, number>();
for (const e of newEdges) byTarget.set(e.to, (byTarget.get(e.to) ?? 0) + 1);
console.log("=== Nejsilnější nové vazby (top 12) ===");
[...byTarget.entries()].sort((a, b) => b[1] - a[1]).slice(0, 12).forEach(([id, n]) =>
  console.log(`  ${String(n).padStart(4)}  ${id}  (${ents[id]?.title})`));

if (DRY_RUN) {
  console.log("\n[DRY-RUN] Nic nezapsáno. DRY_RUN=0 pro zápis.");
} else {
  // Zápis do relations.json jednotlivých entit — ODTUD se staví graf.
  // (graph.json je generovaný cache builderem, zápis tam se přepíše.)
  const byTrack = new Map<string, { themes: Set<string>; moods: Set<string> }>();
  for (const e of newEdges) {
    if (!byTrack.has(e.from)) byTrack.set(e.from, { themes: new Set(), moods: new Set() });
    const rec = byTrack.get(e.from)!;
    if (e.relation === "HAS_THEME") rec.themes.add(e.to);
    else if (e.relation === "HAS_MOOD") rec.moods.add(e.to);
  }

  let written = 0, skipped = 0;
  for (const [trackId, rec] of byTrack) {
    const dir = path.join(ENTITIES, trackId);
    const relPath = path.join(dir, "relations.json");
    if (!fs.existsSync(relPath)) { skipped++; continue; }
    const rel = JSON.parse(fs.readFileSync(relPath, "utf8"));
    rel.themes = [...new Set([...(rel.themes ?? []), ...rec.themes])].sort();
    rel.moods = [...new Set([...(rel.moods ?? []), ...rec.moods])].sort();
    fs.writeFileSync(relPath, JSON.stringify(rel, null, 2) + "\n");
    written++;
  }
  console.log(`\n✅ Zapsáno do relations.json: ${written} tracků (${skipped} přeskočeno bez souboru).`);
  console.log(`   Nových hran celkem: ${newEdges.length}`);
  console.log("   Spusť `npm run cache:build` pro přepočet grafu a indexace.");
}
