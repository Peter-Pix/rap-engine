#!/usr/bin/env -S npx tsx
/**
 * FÁZE 3b — Doplnění RELEASED_BY hran z meta.label.
 *
 * Problém: 527 alb má v meta.json vyplněný `label`, ale jen 359 má odpovídající
 * RELEASED_BY hranu v grafu → 218 alb má label "na papíře", ale není propojený.
 *
 * Postup:
 *   1. Projde alba, vezme meta.label
 *   2. Namapuje ho na existující `label_*` entitu (title / slug / aliasy)
 *   3. Zapíše `labels` array do album relations.json (merge, idempotentní)
 *
 * Nezakládá nové labely — jen propojuje existující. Nerozpoznané se jen reportují.
 *
 * Použití:
 *   npx tsx scripts/link-album-labels-from-meta.ts
 *   DRY_RUN=0 npx tsx scripts/link-album-labels-from-meta.ts
 */
import * as fs from "node:fs";
import * as path from "node:path";

const ROOT = path.resolve(__dirname, "..");
const ENTITIES = path.join(ROOT, "content", "entities");
const DRY_RUN = process.env.DRY_RUN !== "0";

const norm = (s: string) =>
  (s || "").toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/[^a-z0-9]+/g, " ").trim();

/** Aliasy meta.label → kanonické jméno existující label entity. */
const ALIASES: Record<string, string> = {
  "bigg boss": "biggboss",
  "milion entertainment": "milion",
  "milion ent": "milion",
  "milion plus entertainment": "milion-plus",
  "blakkwood records s r o": "blakkwood-records",
  "mafia records": "mafia-records",
  "dms records": "dms-records",
  "ptk music": "ptk",
  "golden touch": "golden-touch-records",
  "kali records": "kali-records",
  "kvlt records": "kvlt-records",
};

const labelByKey = new Map<string, string>();
for (const d of fs.readdirSync(ENTITIES)) {
  if (!d.startsWith("label_")) continue;
  const mp = path.join(ENTITIES, d, "meta.json");
  if (!fs.existsSync(mp)) continue;
  const m = JSON.parse(fs.readFileSync(mp, "utf8"));
  for (const k of [m.title, m.slug, d.replace(/^label_/, "").replace(/-/g, " "), ...(m.aliases ?? [])]) {
    if (k) { const n = norm(String(k)); if (!labelByKey.has(n)) labelByKey.set(n, m.id); }
  }
}

let written = 0, edges = 0, skipped = 0;
const unresolved = new Map<string, number>();

for (const d of fs.readdirSync(ENTITIES)) {
  if (!d.startsWith("album_")) continue;
  const mp = path.join(ENTITIES, d, "meta.json");
  if (!fs.existsSync(mp)) continue;
  const meta = JSON.parse(fs.readFileSync(mp, "utf8"));
  const raw = meta.label;
  if (!raw) continue;

  const n = norm(raw);
  const id = labelByKey.get(norm(ALIASES[n] ?? n));
  if (!id) { unresolved.set(String(raw), (unresolved.get(String(raw)) ?? 0) + 1); continue; }

  const rp = path.join(ENTITIES, d, "relations.json");
  if (!fs.existsSync(rp)) continue;
  const rel = JSON.parse(fs.readFileSync(rp, "utf8"));
  const cur: string[] = rel.labels ?? [];
  if (cur.includes(id)) { skipped++; continue; }
  if (!DRY_RUN) { rel.labels = [...cur, id]; fs.writeFileSync(rp, JSON.stringify(rel, null, 2) + "\n"); }
  written++; edges++;
}

console.log(`alb k propojení s existujícím labelem: ${written} (už mělo: ${skipped})`);
console.log(`nerozpoznaných labelů: ${unresolved.size}`);
for (const [l, c] of [...unresolved].sort((a, b) => b[1] - a[1]).slice(0, 15)) console.log(`   ${l} (${c})`);
console.log(DRY_RUN ? "\n[DRY-RUN] Nic nezapsáno." : `\n✅ Zapsáno ${edges} RELEASED_BY hran.`);
