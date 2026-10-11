#!/usr/bin/env -S npx tsx
/**
 * FÁZE 2 — Producenti: doplnění PRODUCED_BY vazeb z Rap Monitoru.
 *
 * Problém: 4 411 / 4 509 tracků nemá producenta. RM má producenta u 185 skladeb.
 * Postup:
 *   1. Načte RM snapshot (.data/phase3/rm-songs.json)
 *   2. Namapuje RM skladbu → track entitu (podle normalizovaného titulu)
 *   3. Parsuje producenty (split na "," / "/" / "&" / " a ")
 *   4. Normalizuje jméno (aliasy: "Decky Beats"→Decky, "DJ Mike Trafik"→Mike Trafik)
 *   5. Najde cílovou entitu (artist_* / producer_*)
 *   6. Zapíše `producers` array do track relations.json (merge, idempotentní)
 *
 * Bezpečnost: DRY_RUN default. Zapisuje jen když cíl existuje a vazba chybí.
 *
 * Použití:
 *   npx tsx scripts/enrich-producers-from-rm.ts
 *   DRY_RUN=0 npx tsx scripts/enrich-producers-from-rm.ts
 */
import * as fs from "node:fs";
import * as path from "node:path";

const ROOT = path.resolve(__dirname, "..");
const ENTITIES = path.join(ROOT, "content", "entities");
const RM = path.join(ROOT, ".data", "phase3", "rm-songs.json");
const DRY_RUN = process.env.DRY_RUN !== "0";

const norm = (s: string) =>
  (s || "").toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/[^a-z0-9]+/g, " ").trim();

/** Aliasy producentů → kanonické jméno (ověřeno 11. 10. 2026). */
const ALIASES: Record<string, string> = {
  "decky beats": "decky",
  "dj mike trafik": "mike trafik",
  "specialbeatz": "special beatz",
  "d kop": "d kop",
  "podoj kravu": "podojkravu",
  "haarp": "haarp",
  "clint murphy, marcus tran": "marcus tran",
};

// ── Index entity podle jména/slug/aliasů ───────────────────────────────────
const byName = new Map<string, string>();
for (const d of fs.readdirSync(ENTITIES)) {
  if (!d.startsWith("artist_") && !d.startsWith("producer_")) continue;
  const mp = path.join(ENTITIES, d, "meta.json");
  if (!fs.existsSync(mp)) continue;
  const m = JSON.parse(fs.readFileSync(mp, "utf8"));
  const keys = [m.title, m.slug, d.replace(/^(artist|producer)_/, "").replace(/-/g, " "), ...(m.aliases ?? [])];
  for (const k of keys) if (k) { const n = norm(String(k)); if (!byName.has(n)) byName.set(n, m.id); }
}

const resolveProducer = (raw: string): string | null => {
  const n = norm(ALIASES[norm(raw)] ?? raw);
  return byName.get(n) ?? null;
};

// ── Track entity index podle normalizovaného titulu ────────────────────────
const trackByTitle = new Map<string, string>();
for (const d of fs.readdirSync(ENTITIES)) {
  if (!d.startsWith("track_")) continue;
  const mp = path.join(ENTITIES, d, "meta.json");
  if (!fs.existsSync(mp)) continue;
  const m = JSON.parse(fs.readFileSync(mp, "utf8"));
  if (m.title) trackByTitle.set(norm(m.title), m.id);
}

// ── Projdi RM ──────────────────────────────────────────────────────────────
const rm: any[] = JSON.parse(fs.readFileSync(RM, "utf8"));
const planned: { trackId: string; producers: string[]; rmTitle: string }[] = [];
const unresolved = new Set<string>();
let noTrack = 0;

for (const s of rm) {
  const rawProd = s.producer || s.beatmaker;
  if (!rawProd) continue;
  const trackId = trackByTitle.get(norm(String(s.title ?? "")));
  if (!trackId) { noTrack++; continue; }

  const parts = String(rawProd).split(/[,/&]|\s+a\s+/i).map((x) => x.trim()).filter(Boolean);
  const resolved: string[] = [];
  for (const p of parts) {
    const id = resolveProducer(p);
    if (id) resolved.push(id);
    else unresolved.add(p);
  }
  if (resolved.length) planned.push({ trackId, producers: [...new Set(resolved)], rmTitle: String(s.title) });
}

// ── Zápis ──────────────────────────────────────────────────────────────────
let written = 0, edges = 0, skipped = 0;
for (const p of planned) {
  const rp = path.join(ENTITIES, p.trackId, "relations.json");
  if (!fs.existsSync(rp)) continue;
  const rel = JSON.parse(fs.readFileSync(rp, "utf8"));
  const cur: string[] = rel.producers ?? [];
  const add = p.producers.filter((x) => !cur.includes(x));
  if (!add.length) { skipped++; continue; }
  const next = [...cur, ...add];
  if (DRY_RUN) { written++; edges += add.length; continue; }
  rel.producers = next;
  fs.writeFileSync(rp, JSON.stringify(rel, null, 2) + "\n");
  written++; edges += add.length;
}

console.log(`RM skladeb s producentem: ${rm.filter((s) => s.producer || s.beatmaker).length}`);
console.log(`  — bez mapování na track entitu: ${noTrack}`);
console.log(`  — tracků k obohacení: ${written} (nových hran: ${edges}, už mělo: ${skipped})`);
if (unresolved.size) {
  console.log(`\n⚠️ Nerozpoznaní producenti (${unresolved.size}) — chybí entita:`);
  for (const u of [...unresolved].sort()) console.log(`   ${u}`);
}
console.log(DRY_RUN ? "\n[DRY-RUN] Nic nezapsáno. DRY_RUN=0 pro zápis." : `\n✅ Zapsáno ${edges} PRODUCED_BY hran do ${written} tracků.`);
