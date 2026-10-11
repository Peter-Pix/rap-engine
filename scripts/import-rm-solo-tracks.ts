#!/usr/bin/env -S npx tsx
/**
 * Import sólovek z Rap Monitoru (skladby BEZ feat hosta).
 *
 * Proč: `generate-rm-feat-tracks.ts` generuje jen skladby s feat
 * (`if (!s.feats?.length) continue`). Sólovky z RM (které u nás chybí)
 * se proto nikdy neimportovaly.
 *
 * Co dělá: pro interpreta zadaného `RM_ARTIST` vezme RM záznamy s bohatou
 * analýzou (ai_analysis nebo lyrics_text), vytvoří track entity, pokud
 * ještě neexistují. Obsah píše z RM analýzy do 5 sekcí.
 *
 * Bezpečnost:
 *  - Idempotentní (existující slug → skip).
 *  - Slug VŽDY `track_<artistSlug>-<titleSlug>` (žádná kolize podle titulu).
 *  - RM duplikáty: bere záznam s analýzou/textem (ne prázdný pending).
 *  - Nevymýšlí album/rok — jen co je v datech.
 *  - DRY_RUN default; zápis jen s DRY_RUN=0.
 *
 * Použití:
 *   RM_ARTIST=SHIMMI npx tsx scripts/import-rm-solo-tracks.ts            # dry-run
 *   RM_ARTIST=SHIMMI DRY_RUN=0 npx tsx scripts/import-rm-solo-tracks.ts  # zápis
 */
import * as fs from "node:fs";
import * as path from "node:path";

const ROOT = path.resolve(__dirname, "..");
const ENTITIES = path.join(ROOT, "content", "entities");
const SNAPSHOT = path.join(ROOT, ".data", "phase3", "rm-songs.json");
const DRY_RUN = process.env.DRY_RUN !== "0";
const RM_ARTIST = process.env.RM_ARTIST || "SHIMMI";

const norm = (s: string) =>
  (s || "").toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").trim();

function slugify(s: string): string {
  return norm(s)
    .replace(/\s*[\(\[]?\s*(?:feat\.?|ft\.?|featuring|with)\s+.*$/i, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 70);
}

/** Odstraní feat část z titulu (pro čistý display title). */
function cleanTitle(s: string): string {
  return s
    .replace(/\s*[\(\[]\s*(?:feat\.?|ft\.?|featuring|with)\s+[^\)\]]*[\)\]]/i, "")
    .replace(/\s+(?:feat\.?|ft\.?|featuring|with)\s+.+$/i, "")
    .trim();
}

/** Vytáhne feat hosty z titulu, pokud jsou (regex). */
function titleFeats(title: string): string[] {
  const m = title.match(/\s*(?:\(|\[)?\s*(?:feat\.?|ft\.?|featuring|with)\s+([^)\]\-–]+)/i);
  if (!m) return [];
  return m[1].split(/\s*(?:,|&|\+|\bx\b|\bvs\.?\b)\s*/i).map((x) => x.trim()).filter((x) => x && x.length < 40);
}

function shorten(s: string, max: number): string {
  if (!s) return "";
  if (s.length <= max) return s;
  const cut = s.slice(0, max);
  const sp = cut.lastIndexOf(" ");
  return cut.slice(0, sp > max * 0.6 ? sp : max).replace(/[.,;:!?]$/, "") + "…";
}

/** 5 sekcí MDX z RM analýzy. Parafráze/kompozice, ne 1:1 kopie. */
function mdxFromRm(rm: any, title: string): string {
  const sec = (h: string, body?: string) =>
    body && body.trim() ? `## ${h}\n\n${body.trim()}\n\n` : "";
  let out = `## O čem je\n\n${(rm.ai_summary_long || rm.ai_main_idea || rm.ai_analysis || "").trim()}\n\n`;
  out += sec("Kontext", [rm.ai_message, rm.year ? `Rok ${rm.year}.` : ""].filter(Boolean).join(" "));
  out += sec("Produkce", [rm.ai_atmosphere, ...(rm.tags_style || []), ...(rm.tags_genre || [])].filter(Boolean).join(" "));
  out += sec("Interpretace", [rm.ai_analysis, ...(rm.ai_motifs || []).length ? `Motivy: ${(rm.ai_motifs || []).join(", ")}.` : ""].filter(Boolean).join(" "));
  out += sec("Dopad", [rm.ai_analysis_recommendation, rm.ai_analysis_rating ? `Hodnocení analýzy: ${rm.ai_analysis_rating}/10.` : ""].filter(Boolean).join(" "));
  return out.trimEnd() + "\n";
}

// ─── Indexy RKG ───────────────────────────────────────────────────────────
const artistByName = new Map<string, string>();
const existingSlugs = new Set<string>();
for (const d of fs.readdirSync(ENTITIES, { withFileTypes: true })) {
  if (!d.isDirectory()) continue;
  const mp = path.join(ENTITIES, d.name, "meta.json");
  if (!fs.existsSync(mp)) continue;
  const meta = JSON.parse(fs.readFileSync(mp, "utf8"));
  if (d.name.startsWith("artist_")) {
    artistByName.set(norm(meta.title), meta.id);
    artistByName.set(norm(meta.slug ?? ""), meta.id);
  } else if (d.name.startsWith("track_")) {
    existingSlugs.add(meta.slug ?? d.name.replace(/^track_/, ""));
  }
}

const primaryId = artistByName.get(norm(RM_ARTIST));
if (!primaryId) {
  console.error(`❌ Interpret "${RM_ARTIST}" není v RKG jako artist entita.`);
  process.exit(1);
}
const primarySlug = primaryId.replace(/^artist_/, "");

// ─── Bezpečný výběr z RM ───────────────────────────────────────────────────
// RM má pro skladbu 2 záznamy (complete + pending). Vezmi ten s obsahem.
const rm: any[] = JSON.parse(fs.readFileSync(SNAPSHOT, "utf8"));
const best = new Map<string, any>();
for (const s of rm) {
  if (String(s.artist_name || "").toLowerCase() !== RM_ARTIST.toLowerCase()) continue;
  const title = s.title || s.name || "";
  if (!title) continue;
  const rich = (s.ai_analysis?.length ?? 0) > 50 || (s.lyrics_text?.length ?? 0) > 100;
  const cur = best.get(title);
  const curRich = cur ? ((cur.ai_analysis?.length ?? 0) > 50 || (cur.lyrics_text?.length ?? 0) > 100) : false;
  if (!cur || (rich && !curRich)) best.set(title, s);
}

const seen = new Set<string>();
const candidates: any[] = [];
let skippedNoContent = 0, skippedExist = 0;

for (const [title, s] of best) {
  // Přímý import obsahu JEN když RM má hotovou AI analýzu. Skladby s pouhým
  // textem (status pending, ai_analysis prázdná) patří do P2 (vlastní AI analýza),
  // ne sem — jinak by vznikl prázdný/stub MDX s nepravdivým phase3Pas="A".
  const hasAnalysis = (s.ai_analysis?.length ?? 0) > 50;
  if (!hasAnalysis) { skippedNoContent++; continue; }
  const titleSlug = slugify(title);
  if (!titleSlug) continue;
  const trackSlug = `${primarySlug}-${titleSlug}`;
  if (existingSlugs.has(trackSlug) || seen.has(trackSlug)) { skippedExist++; continue; }
  seen.add(trackSlug);
  candidates.push({
    id: `track_${trackSlug}`,
    slug: trackSlug,
    title: cleanTitle(title),
    rmTitle: title,
    feats: titleFeats(title),
    hasAnalysis: (s.ai_analysis?.length ?? 0) > 50,
    mdxLen: mdxFromRm(s, title).length,
    rm: s,
  });
}

console.log(`Interpret: ${RM_ARTIST} (${primaryId})`);
console.log(`RM záznamů pro interpreta (unikátních titulů): ${best.size}`);
console.log(`Kandidátů k importu: ${candidates.length}`);
console.log(`Přeskočeno (existuje slug): ${skippedExist}`);
console.log(`Přeskočeno (bez obsahu): ${skippedNoContent}`);
console.log("\nVzorek:");
for (const c of candidates.slice(0, 25)) {
  console.log(`  + ${c.id} | „${c.title}" | MDX ${c.mdxLen}B | analýza: ${c.hasAnalysis} | feats: ${JSON.stringify(c.feats)}`);
}

if (DRY_RUN) {
  console.log("\n[DRY-RUN] Nic nezapsáno. DRY_RUN=0 pro zápis.");
  process.exit(0);
}

let written = 0;
for (const c of candidates) {
  const dir = path.join(ENTITIES, c.id);
  if (fs.existsSync(dir)) continue;
  fs.mkdirSync(dir, { recursive: true });
  const rm = c.rm;
  const meta = {
    id: c.id,
    type: "track",
    slug: c.slug,
    title: c.title,
    description: shorten(rm.ai_summary_short || rm.ai_summary_long || `Skladba „${c.title}" od ${RM_ARTIST}.`, 200),
    ...(rm.year ? { publishedAt: `${rm.year}-01-01` } : {}),
    extraMeta: {
      generatedFrom: "rap-monitor",
      phase3Done: true,
      phase3Pas: "A",
      ...(rm.ai_motifs?.length ? { themes: rm.ai_motifs } : {}),
      ...(rm.ai_emotions?.length ? { moods: rm.ai_emotions } : {}),
      ...(rm.spotify_url ? { spotifyUrl: rm.spotify_url } : {}),
      ...(rm.youtube_url ? { youtubeUrl: rm.youtube_url } : {}),
      ...(rm.ai_analysis_rating ? { rmRating: rm.ai_analysis_rating } : {}),
    },
  };
  fs.writeFileSync(path.join(dir, "meta.json"), JSON.stringify(meta, null, 2) + "\n");
  const relations = {
    primaryArtist: [primaryId],
    featuring: [],
    belongsToAlbum: [],
    producers: [],
    labels: [],
    genres: [],
    styles: [],
    themes: [],
    moods: [],
    related: [],
  };
  fs.writeFileSync(path.join(dir, "relations.json"), JSON.stringify(relations, null, 2) + "\n");
  fs.writeFileSync(path.join(dir, "entity.mdx"), mdxFromRm(rm, c.rmTitle));
  written++;
}
console.log(`\n✅ Zapsáno ${written} nových track entit.`);
console.log(`   Další krok: npm run cache:build → ověřit → kvalitativní filtr.`);
