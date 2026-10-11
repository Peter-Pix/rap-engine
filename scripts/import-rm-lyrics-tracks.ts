#!/usr/bin/env -S npx tsx
/**
 * Import chybějících skladeb z Rap Monitoru, kde RM má POUZE text (bez AI analýzy).
 *
 * Proč: audit 11. 10. 2026. RM má 128 skladeb jen s lyrics_text, z toho ~12
 * skutečně chybí u nás (ověřeno proti DB včetně scope kontroly).
 * → vlastní AI analýza (Ollama Cloud) → kvalitativní gate → teprve pak noindex dolů.
 *
 * Bezpečnost:
 *  - Idempotentní (existující slug → skip).
 *  - Slug VŽDY `track_<artistSlug>-<titleSlug>`.
 *  - SCOPE: zpracuje jen interprety, kteří jsou v RKG jako artist entita
 *    (ochrana proti záměně jmen — RM „Smack One"/„Ego"/„Orion" = jiní umělci).
 *  - Texty skladeb se do entit NEZAPISUJÍ (autorská práva) — jen jako AI vstup.
 *  - noindex: true VŽDY. Sundá ho až kvalitativní gate (totalLen ≥ 400, ≥3/5 sekcí,
 *    hedge < 30 %, bez zakázaných frází).
 *  - DRY_RUN default; zápis jen s DRY_RUN=0.
 *
 * Použití:
 *   RM_ARTIST="Hugo Toxxx" npx tsx scripts/import-rm-lyrics-tracks.ts
 *   RM_ARTIST="Hugo Toxxx" DRY_RUN=0 npx tsx scripts/import-rm-lyrics-tracks.ts
 */
import * as fs from "node:fs";
import * as path from "node:path";

const ROOT = path.resolve(__dirname, "..");
const ENTITIES = path.join(ROOT, "content", "entities");
const SNAPSHOT = path.join(ROOT, ".data", "phase3", "rm-songs.json");
const DRY_RUN = process.env.DRY_RUN !== "0";
const RM_ARTIST = process.env.RM_ARTIST || "Hugo Toxxx";
const CONCURRENCY = Number(process.env.CONCURRENCY || 4);

const norm = (s: string) =>
  (s || "").toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/[^a-z0-9]+/g, " ").trim();

/** Čistý title bez feat části. */
function cleanTitle(s: string): string {
  return s
    .replace(/\s*[\(\[]\s*(?:feat\.?|ft\.?|featuring|with)\s+[^\)\]]*[\)\]]/i, "")
    .replace(/\s*[-–]?\s*(?:feat\.?|ft\.?|featuring|with)\s+.*$/i, "")
    .trim();
}
function slugify(s: string): string {
  return norm(cleanTitle(s)).replace(/\s+/g, "-").slice(0, 70);
}
function titleFeats(title: string): string[] {
  const m = title.match(/(?:feat\.?|ft\.?|featuring|with)\s+([^\)\]\-–]+)/i);
  if (!m) return [];
  return m[1].split(/\s*(?:,|&|\+|\ba\b|\bx\b|\bvs\.?\b)\s*/i).map((x) => x.trim()).filter((x) => x && x.length < 40);
}
function shorten(s: string, max: number): string {
  if (!s) return "";
  if (s.length <= max) return s;
  const cut = s.slice(0, max);
  const sp = cut.lastIndexOf(" ");
  return cut.slice(0, sp > max * 0.6 ? sp : max).replace(/[.,;:!?]$/, "") + "…";
}

// ── Ollama ────────────────────────────────────────────────────────────────
function ollamaKey(): string {
  const env = path.join(ROOT, ".env.local");
  if (fs.existsSync(env)) {
    const m = fs.readFileSync(env, "utf8").match(/OLLAMA_API_KEY\s*=\s*["']?([^"'\n]+)/);
    if (m) return m[1].trim();
  }
  if (process.env.OLLAMA_API_KEY) return process.env.OLLAMA_API_KEY;
  throw new Error("OLLAMA_API_KEY nenalezen");
}
const OLLAMA_URL = "https://ollama.com/api/chat";
const OLLAMA_MODEL = process.env.OLLAMA_MODEL || "deepseek-v4.1-flash";

interface Analysis {
  about: string; context: string; production: string;
  interpretation: string; impact: string;
  themes?: string[]; moods?: string[];
}

const HEDGE_WORDS = ["pravděpodobně", "pravdepodobne", "možná", "mozna", "patrně", "patrne",
  "neznámý", "neznamy", "neznámo", "nelze", "nejsou dostupné", "bez textu nelze",
  "nejsou k dispozici", "nemáme", "bohužel", "asi "];
const FORBIDDEN = ["nelze určit", "nejsou dostupné informace", "bez dalších informací",
  "nejsou k dispozici žádné", "bohužel"];

function qualityGate(a: Analysis): { pass: boolean; reasons: string[] } {
  const reasons: string[] = [];
  const sections = [a.about, a.context, a.production, a.interpretation, a.impact].filter((s) => (s ?? "").trim().length > 60);
  const totalLen = [a.about, a.context, a.production, a.interpretation, a.impact].join(" ").length;
  if (totalLen < 400) reasons.push(`krátký obsah (${totalLen} znaků < 400)`);
  if (sections.length < 3) reasons.push(`jen ${sections.length}/5 naplněných sekcí`);
  for (const f of FORBIDDEN) if (JSON.stringify(a).toLowerCase().includes(f)) reasons.push(`zakázaná fráze: "${f}"`);
  const words = JSON.stringify(a).toLowerCase().split(/\s+/);
  const hedgeHits = words.filter((w) => HEDGE_WORDS.some((h) => w.includes(h))).length;
  const hedgeRatio = words.length ? hedgeHits / words.length : 1;
  if (hedgeRatio > 0.30) reasons.push(`hedge ratio ${(hedgeRatio * 100).toFixed(0)} % > 30 %`);
  return { pass: reasons.length === 0, reasons };
}

async function ollamaJson(system: string, user: string): Promise<{ analysis: Analysis | null; error?: string }> {
  for (let attempt = 1; attempt <= 2; attempt++) {
    try {
      const r = await fetch(OLLAMA_URL, {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${ollamaKey()}` },
        body: JSON.stringify({
          model: OLLAMA_MODEL,
          messages: [{ role: "system", content: system }, { role: "user", content: user }],
          stream: false, think: false, format: "json",
        }),
      });
      if (!r.ok) throw new Error(`HTTP ${r.status}`);
      const j: any = await r.json();
      let content: string = j.message?.content ?? "";
      if (!content) throw new Error("prázdný content");
      const fence = content.match(/```(?:json)?\s*([\s\S]*?)```/);
      if (fence) content = fence[1];
      const parsed = JSON.parse(content.trim());
      if (!parsed.about || !parsed.interpretation) throw new Error("chybí about/interpretation");
      return { analysis: parsed as Analysis };
    } catch (e: any) {
      if (attempt === 2) return { analysis: null, error: e.message };
      await new Promise((r) => setTimeout(r, 1500));
    }
  }
  return { analysis: null, error: "unreachable" };
}

function buildPrompt(input: { title: string; artist: string; album?: string; year?: string; label?: string; lyrics: string }): { system: string; user: string } {
  const system = `Jsi hudební publicista pro databázi českého a slovenského rapu 4rap.cz.
Píšeš věcné, konkrétní analýzy skladeb — čtenář je fanoušek, co chce vědět, o čem skladba je a co v ní umělec říká.

PRAVIDLA:
- Piš KONKRÉTNĚ. Vycházej z přiloženého TEXTU — odkazuj na motivy, pojmenuj, co autor říká. NECITUJ celé verše.
- ŽÁDNÝ hedge. Nejsou povolené obraty jako "pravděpodobně", "možná", "patrně", "nelze určit", "nejsou dostupné informace". Když něco nevíš, prostě to nenapiš.
- Žádná reklama, žádné "tato skladba je skvělá". Názor je fajn, když je podložený.
- Sekci Produkce piš jen z toho, co plyne ze stylu textu (typ beatu, energie) — NEVYMÝŠLEJ jména producentů.
- Sekce Interpretace je nejdůležitější — 3-4 věty o motivech, technice, co autor říká.
- Česky (slovenské skladby česky, názvy originál).
- Vrať POUZE validní JSON s klíči: about, context, production, interpretation, impact, themes (pole 3-6), moods (pole 2-4). Nic jiného.`;
  const facts: string[] = [`SKLADBA: "${input.title}"`, `UMĚLEC: ${input.artist}`];
  if (input.album) facts.push(`ALBUM: ${input.album}`);
  if (input.year) facts.push(`ROK: ${input.year}`);
  if (input.label) facts.push(`LABEL: ${input.label}`);
  const user = facts.join("\n") + `\n\nTEXT SKLADBY:\n${input.lyrics.slice(0, 3500)}`;
  return { system, user };
}

function mdxOf(a: Analysis): string {
  const sec = (h: string, body: string) => (body ?? "").trim() ? `## ${h}\n\n${(body ?? "").trim()}\n\n` : "";
  let mdx = `## O čem je\n\n${(a.about ?? "").trim()}\n\n`;
  mdx += sec("Kontext", a.context) + sec("Produkce", a.production) + sec("Interpretace", a.interpretation) + sec("Dopad", a.impact);
  return mdx.trimEnd() + "\n";
}

// ── Indexy ─────────────────────────────────────────────────────────────────
const artistByName = new Map<string, string>();
const existingSlugs = new Set<string>();
const albumsByTitle = new Map<string, { id: string; year?: number; label?: string }>();
for (const d of fs.readdirSync(ENTITIES, { withFileTypes: true })) {
  if (!d.isDirectory()) continue;
  const mp = path.join(ENTITIES, d.name, "meta.json");
  if (!fs.existsSync(mp)) continue;
  const meta = JSON.parse(fs.readFileSync(mp, "utf8"));
  if (d.name.startsWith("artist_")) {
    for (const k of [norm(meta.title), norm(meta.slug ?? ""), norm(d.name.replace(/^artist_/, ""))]) {
      if (k && !artistByName.has(k)) artistByName.set(k, meta.id);
    }
  } else if (d.name.startsWith("track_")) {
    existingSlugs.add(meta.slug ?? d.name.replace(/^track_/, ""));
  } else if (d.name.startsWith("album_")) {
    const year = meta.publishedAt ? Number(String(meta.publishedAt).slice(0, 4)) : undefined;
    albumsByTitle.set(norm(meta.title), { id: meta.id, year });
  }
}

const primaryId = artistByName.get(norm(RM_ARTIST));
if (!primaryId) { console.error(`❌ Interpret "${RM_ARTIST}" není v RKG.`); process.exit(1); }
const primarySlug = primaryId.replace(/^artist_/, "");

// ── Výběr kandidátů ────────────────────────────────────────────────────────
const rm: any[] = JSON.parse(fs.readFileSync(SNAPSHOT, "utf8"));
// pozn.: RM má pro skladbu víc záznamů; bereme nejdelší text
const best = new Map<string, any>();
for (const s of rm) {
  if (String(s.artist_name || "").toLowerCase() !== RM_ARTIST.toLowerCase()) continue;
  const t = cleanTitle(s.title || "");
  if (!t) continue;
  const hasAnalysis = (s.ai_analysis?.length ?? 0) > 50;
  if (hasAnalysis) continue; // pás A řeší jiný skript
  if ((s.lyrics_text?.length ?? 0) <= 100) continue;
  const k = norm(t);
  const cur = best.get(k);
  if (!cur || (s.lyrics_text?.length ?? 0) > (cur.lyrics_text?.length ?? 0)) best.set(k, s);
}

const candidates: any[] = [];
let skippedExist = 0;
for (const [, s] of best) {
  const ct = cleanTitle(s.title || "");
  const ts = slugify(ct);
  if (!ts) continue;
  const trackSlug = `${primarySlug}-${ts}`;
  if (existingSlugs.has(trackSlug)) { skippedExist++; continue; }
  const album = s.album ? albumsByTitle.get(norm(s.album)) : undefined;
  candidates.push({ id: `track_${trackSlug}`, slug: trackSlug, title: ct, rm: s, album, feats: titleFeats(s.title || "") });
}

console.log(`Interpret: ${RM_ARTIST} (${primaryId})`);
console.log(`Kandidátů k importu (RM text, bez analýzy): ${candidates.length}`);
console.log(`Přeskočeno (existuje slug): ${skippedExist}\n`);
for (const c of candidates) console.log(`  + ${c.id} | „${c.title}" | text ${c.rm.lyrics_text.length} zn. | album ${c.album?.id ?? "—"}`);

if (DRY_RUN) { console.log("\n[DRY-RUN] Nic nezapsáno. DRY_RUN=0 pro zápis."); process.exit(0); }

// ── Zpracování + zápis ─────────────────────────────────────────────────────
async function main() {
  let written = 0, gateFail = 0, aiFail = 0;
  for (let i = 0; i < candidates.length; i += CONCURRENCY) {
    const wave = candidates.slice(i, i + CONCURRENCY);
    await Promise.all(wave.map(async (c) => {
      const dir = path.join(ENTITIES, c.id);
      if (fs.existsSync(dir)) return;
      const { system, user } = buildPrompt({
        title: c.title, artist: RM_ARTIST,
        album: c.album ? c.rm.album : undefined,
        year: c.album?.year ? String(c.album.year) : undefined,
        lyrics: c.rm.lyrics_text,
      });
      const { analysis, error } = await ollamaJson(system, user);
      if (!analysis) { console.log(`  ❌ AI selhala: ${c.title} — ${error}`); aiFail++; return; }
      const gate = qualityGate(analysis);
      if (!gate.pass) console.log(`  ⚠️  gate-fail: ${c.title} — ${gate.reasons.join("; ")}`);
      else console.log(`  ✅ ${c.title}`);

      fs.mkdirSync(dir, { recursive: true });
      const relAlbum = c.album?.id;
      const albumRels = relAlbum ? JSON.parse(fs.readFileSync(path.join(ENTITIES, relAlbum, "relations.json"), "utf8")) : null;
      const meta: any = {
        id: c.id, type: "track", slug: c.slug, title: c.title,
        description: shorten(analysis.about, 200),
        ...(c.album?.year ? { publishedAt: `${c.album.year}-01-01` } : {}),
        extraMeta: {
          generatedFrom: "rap-monitor",
          phase3Done: true,
          phase3Pas: "B",
          noindex: !gate.pass,          // gate prošel → indexovatelné
          ...(gate.pass ? {} : { phase3GateFail: true }),
          ...(analysis.themes?.length ? { themes: analysis.themes.slice(0, 6) } : {}),
          ...(analysis.moods?.length ? { moods: analysis.moods.slice(0, 4) } : {}),
          sourceLyrics: "rap-monitor",
        },
      };
      fs.writeFileSync(path.join(dir, "meta.json"), JSON.stringify(meta, null, 2) + "\n");
      const relations = {
        primaryArtist: [primaryId],
        featuring: c.feats.map((f: string) => artistByName.get(norm(f))).filter(Boolean).sort(),
        belongsToAlbum: relAlbum ? [relAlbum] : [],
        producers: [], labels: albumRels?.labels ?? [], genres: albumRels?.genres ?? [],
        styles: [], themes: [], moods: [], related: [],
      };
      fs.writeFileSync(path.join(dir, "relations.json"), JSON.stringify(relations, null, 2) + "\n");
      fs.writeFileSync(path.join(dir, "entity.mdx"), mdxOf(analysis));
      // backlink na albu
      if (relAlbum && albumRels) {
        if (!albumRels.tracks?.includes(c.id)) {
          albumRels.tracks = [...(albumRels.tracks ?? []), c.id];
          fs.writeFileSync(path.join(ENTITIES, relAlbum, "relations.json"), JSON.stringify(albumRels, null, 2) + "\n");
        }
      }
      written++;
      if (!gate.pass) gateFail++;
    }));
  }

  console.log(`\n✅ Zapsáno ${written} entit (indexovatelných: ${written - gateFail}, noindex: ${gateFail})`);
  console.log(`   AI selhala: ${aiFail}`);
  console.log(`   Další krok: npm run cache:build → ověřit → git commit`);

}

main().catch((e) => { console.error(e); process.exit(1); });
