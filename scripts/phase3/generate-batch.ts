#!/usr/bin/env -S npx tsx
/**
 * ⚠️ DEPRECATED (14. 10. 2026) — NESPOUŠTĚT bez ověření dat.
 *
 * Pracuje s daty z Rap Monitoru = interní AI sběrná apka → AI-generated,
 * vyžaduje ověření. Vygenerovaný AI obsah byl z DB odstraněn (Fáze 2.2).
 * Viz scripts/phase3/README-DEPRECATED.md a PLAN-AI-SLOP-TRACKS.md.
 */
/**
 * Fáze 3 — vygeneruje obsah pro dávku skladeb (current-batch.json).
 *
 * Pipeline pro každou skladbu:
 *   A: RM analýza + texty → vlastní MDX (formulace naše, fakta z RM)
 *   B: texty (RM/LRCLIB) → vlastní AI analýza → MDX
 *   C: pokus o LRCLIB → hit = B; miss = poctivé metadata MDX (noindex zůstává)
 *
 * Zápisy:
 *   - entity.mdx (5 sekcí / metadata)
 *   - meta.json (description 160+, image=obal alba, extraMeta: phase3Done,
 *     sundání noindex/isStub PO kvalitativním filtru)
 *   - relations.json (žánry z alba, themes/moods match na taxonomii)
 *   - relations.json PŘÍSLUŠNÉHO ALBA (tracks[] → HAS_TRACK backlink)
 *
 * Texty skladeb se do entit NEZAPISUJÍ (autorská práva) — jen jako AI vstup.
 *
 * Použití:
 *   npx tsx scripts/phase3/generate-batch.ts          # procesuje current-batch
 *   DRY_RUN=1 npx tsx scripts/phase3/generate-batch.ts
 */
import * as fs from "node:fs";
import * as path from "node:path";
import {
  DATA, ENTITIES, ROOT, ensureData, loadEntities, artistOf, norm,
  readJson, writeJson, ollamaKey, lrclibLyrics, sleep, makeSemaphore,
  OLLAMA_URL, OLLAMA_MODEL,
} from "./lib";

const DRY_RUN = process.env.DRY_RUN === "1";
const CONCURRENCY = Number(process.env.CONCURRENCY || 6);
const LYRICS_DIR = path.join(DATA, "lyrics");
/** LRCLIB rate-limit ochrana — max 2 souběžné requesty. */
const LYRC_SEM = makeSemaphore(2);

// ── Quality gate ────────────────────────────────────────────────────────
const HEDGE_WORDS = ["pravděpodobně", "pravdepodobne", "možná", "mozna", "patrně", "patrne",
  "neznámý", "neznamy", "neznámo", "nelze", "nejsou dostupné", "bez textu nelze",
  "nejsou k dispozici", "nemáme", "bohužel", "asi "];
const FORBIDDEN = ["nelze určit", "nejsou dostupné informace", "bez dalších informací",
  "nejsou k dispozici žádné", "bohužel"];

export interface Analysis {
  about: string; context: string; production: string;
  interpretation: string; impact: string;
  themes?: string[]; moods?: string[];
}

function qualityGate(a: Analysis): { pass: boolean; reasons: string[] } {
  const reasons: string[] = [];
  const sections = [a.about, a.context, a.production, a.interpretation, a.impact]
    .filter((s) => (s ?? "").trim().length > 60);
  const totalLen = [a.about, a.context, a.production, a.interpretation, a.impact]
    .join(" ").length;

  if (totalLen < 400) reasons.push(`krátký obsah (${totalLen} znaků < 400)`);
  if (sections.length < 3) reasons.push(`jen ${sections.length}/5 naplněných sekcí`);
  for (const f of FORBIDDEN) {
    const blob = JSON.stringify(a).toLowerCase();
    if (blob.includes(f)) reasons.push(`zakázaná fráze: "${f}"`);
  }
  // hedge ratio — počítá výskyty hedge slov na 100 slov
  const words = JSON.stringify(a).toLowerCase().split(/\s+/);
  const hedgeHits = words.filter((w) => HEDGE_WORDS.some((h) => w.includes(h))).length;
  const hedgeRatio = words.length ? hedgeHits / words.length : 1;
  if (hedgeRatio > 0.30) reasons.push(`hedge ratio ${(hedgeRatio * 100).toFixed(0)} % > 30 %`);

  return { pass: reasons.length === 0, reasons };
}

// ── Ollama ──────────────────────────────────────────────────────────────
function buildPrompt(input: {
  title: string; artist: string; album?: string; year?: string;
  label?: string; features?: string[]; duration?: number;
  rmMotifs?: string[]; rmAtmosphere?: string; rmEmotions?: string[];
  rmTags?: { genre?: string[]; mood?: string[]; style?: string[] };
  producer?: string; lyrics?: string;
}): { system: string; user: string } {
  const hasLyrics = !!input.lyrics && input.lyrics.length > 100;
  const system = `Jsi hudební publicista pro databázi českého a slovenského rapu 4rap.cz.
Píšeš věcné, konkrétní analýzy skladeb — čtenář je fanoušek, co chce vědět, o čem skladba je a co v ní umělec říká.

PRAVIDLA:
- Piš KONKRÉTNĚ. ${hasLyrics ? "Vycházej z přiloženého TEXTU — cituj ho, odkazuj na něj, pojmenuj motivy a punchlines." : "Vycházej z metadat. Nepsaná fakta nedoplňuj — ani jména, ani data."}
- ŽÁDNÝ hedge. Nejsou povolené obraty jako "pravděpodobně", "možná", "patrně", "nelze určit", "nejsou dostupné informace". Když něco nevíš, prostě to nenapiš.
- Žádná reklama, žádné "tato skladba je skvělá". Názor je fajn, když je podložený.
- Sekci Produkce piš jen z toho, co plyne ze ${hasLyrics ? "stylu textu" : "dostupných dat"} (typ beatu, energie) — NEVYMÝŠLEJ jména producentů.
- Sekce Interpretace je nejdůležitější — 3-4 věty o motivech, technice, co autor říká.
- Česky (slovenské skladby česky, názvy originál).
- Vrať POUZE validní JSON s klíči: about, context, production, interpretation, impact, themes (pole 3-6), moods (pole 2-4). Nic jiného.`;

  const facts: string[] = [`SKLADBA: "${input.title}"`, `UMĚLEC: ${input.artist}`];
  if (input.album) facts.push(`ALBUM: ${input.album}`);
  if (input.year) facts.push(`ROK: ${input.year}`);
  if (input.label) facts.push(`LABEL: ${input.label}`);
  if (input.features?.length) facts.push(`HOSTÉ (feat): ${input.features.join(", ")}`);
  if (input.duration) facts.push(`DÉLKA: ${Math.floor(input.duration / 60)}:${String(input.duration % 60).padStart(2, "0")}`);
  if (input.producer) facts.push(`PRODUCENT/BEATMAKER: ${input.producer}`);
  if (input.rmMotifs?.length) facts.push(`MOTIVY (z analýzy): ${input.rmMotifs.join(", ")}`);
  if (input.rmAtmosphere) facts.push(`ATMOSFÉRA: ${input.rmAtmosphere}`);
  if (input.rmEmotions?.length) facts.push(`EMOCE: ${input.rmEmotions.join(", ")}`);
  if (input.rmTags?.genre?.length) facts.push(`ŽÁNR: ${input.rmTags.genre.join(", ")}`);
  if (input.rmTags?.style?.length) facts.push(`STYL: ${input.rmTags.style.join(", ")}`);

  const user = facts.join("\n") + (hasLyrics ? `\n\nTEXT SKLADBY:\n${input.lyrics!.slice(0, 3500)}` : "\n\n(Text skladby není k dispozici — piš jen z metadat, krátce a věcně. Sekce o textu formuluj opatrně obecně, bez spekulací.)");
  return { system, user };
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
      // model občas zabalí JSON do ```json fences navzdory format:"json"
      const fence = content.match(/```(?:json)?\s*([\s\S]*?)```/);
      if (fence) content = fence[1];
      content = content.trim();
      const parsed = JSON.parse(content);
      if (!parsed.about || !parsed.interpretation) throw new Error("chybí about/interpretation");
      return { analysis: parsed as Analysis };
    } catch (e: any) {
      if (attempt === 2) return { analysis: null, error: e.message };
      await sleep(1500);
    }
  }
  return { analysis: null, error: "unreachable" };
}

// ── Zápis entity ────────────────────────────────────────────────────────
function mdxOf(a: Analysis, title: string): string {
  const sec = (h: string, body: string) =>
    (body ?? "").trim() ? `## ${h}\n\n${(body ?? "").trim()}\n\n` : "";
  let mdx = `## O čem je\n\n${(a.about ?? "").trim()}\n\n`;
  mdx += sec("Kontext", a.context);
  mdx += sec("Produkce", a.production);
  mdx += sec("Interpretace", a.interpretation);
  mdx += sec("Dopad", a.impact);
  return mdx.trimEnd() + "\n";
}

function shorten(s: string, max: number): string {
  if (s.length <= max) return s;
  const cut = s.slice(0, max);
  const lastSpace = cut.lastIndexOf(" ");
  return cut.slice(0, lastSpace > max * 0.6 ? lastSpace : max).replace(/[.,;:!?]$/, "") + "…";
}

async function main() {
  ensureData();
  fs.mkdirSync(LYRICS_DIR, { recursive: true });
  const batchMeta = readJson<any>(path.join(DATA, "current-batch.json"));
  const batch: any[] = batchMeta.batch;
  const entities = loadEntities();
  const rmSongs = readJson<any[]>(path.join(DATA, "rm-songs.json"));
  const rmById = new Map(rmSongs.map((s) => [s.id, s]));
  const taxonomy = Object.values(entities).filter((e: any) =>
    ["genre", "style", "theme", "mood"].includes(e.type));

  console.log(`Dávka: ${batch.length} skladeb (A=${batch.filter(b=>b.pas==="A").length} B=${batch.filter(b=>b.pas==="B").length} C=${batch.filter(b=>b.pas==="C").length})`);
  console.log(`Model: ${OLLAMA_MODEL} | Souběžnost: ${CONCURRENCY} | DRY_RUN: ${DRY_RUN}\n`);

  const stats = { A: { ok: 0, fail: 0 }, B: { ok: 0, fail: 0 }, C: { upgraded: 0, meta: 0, fail: 0 } };
  const results: any[] = [];
  const albumsTouched = new Set<string>();

  // zpracuj vlny po CONCURRENCY
  for (let i = 0; i < batch.length; i += CONCURRENCY) {
    const wave = batch.slice(i, i + CONCURRENCY);
    const waveResults = await Promise.all(wave.map(async (b) => {
      const entity = entities[b.id];
      if (!entity) return { id: b.id, status: "skip", reason: "entita v cache nenalezena" };
      const dir = path.join(ENTITIES, b.id);
      if (!fs.existsSync(path.join(dir, "meta.json"))) return { id: b.id, status: "skip", reason: "složka neexistuje" };

      const meta = readJson<any>(path.join(dir, "meta.json"));
      // C-metadata skladba čeká na lyrics-upgrade (max 2 pokusy o LRCLIB)
      const isCmeta = meta.extraMeta?.phase3Pas === "C";
      const attempts = meta.extraMeta?.lyricsAttempts ?? 0;
      if (meta.extraMeta?.phase3Done && !(isCmeta && attempts < 2)) {
        return { id: b.id, status: "skip", reason: "už hotovo" };
      }
      if ((entity.content ?? "").length > 600) return { id: b.id, status: "skip", reason: "už má obsah" };

      // sběr vstupů
      const artist = artistOf(entity, entities);
      const albumId = (entity.outbound?.BELONGS_TO_ALBUM ?? [])[0];
      const album = albumId ? entities[albumId] : null;
      const albumMeta = albumId ? readJson<any>(path.join(ENTITIES, albumId, "meta.json")) : null;
      const featIds = entity.outbound?.FEATURES ?? [];
      const featNames = featIds.map((id: string) => entities[id]?.title).filter(Boolean);
      const rm = b.rmId ? rmById.get(b.rmId) : null;

      let lyrics: string | null = null;
      let lrcStatus = 0; // 200 = genuine miss, 503/0 = transient
      const lyricsFile = path.join(LYRICS_DIR, `${b.id}.txt`);
      if (fs.existsSync(lyricsFile)) {
        lyrics = fs.readFileSync(lyricsFile, "utf8");
      } else if (rm?.lyrics_text?.length > 100) {
        lyrics = rm.lyrics_text;
        if (!DRY_RUN) fs.writeFileSync(lyricsFile, lyrics);
      } else {
        // C (a upgrade i už zapsaných C-metadata skladeb) — LRCLIB přes semafor
        await LYRC_SEM.acquire();
        try {
          await sleep(150);
          const lrc = await lrclibLyrics(artist, entity.title);
          lyrics = lrc.lyrics; lrcStatus = lrc.status;
        } finally { LYRC_SEM.release(); }
        if (lyrics && !DRY_RUN) fs.writeFileSync(lyricsFile, lyrics);
      }

      // AI analýza — pro A, B, i C s nalezeným textem
      let analysis: Analysis | null = null;
      let aiError: string | undefined;
      const needsAi = !!lyrics && (b.pas === "A" || b.pas === "B" || b.pas === "C");
      if (needsAi) {
        const { system, user } = buildPrompt({
          title: entity.title, artist,
          album: album?.title, year: albumMeta?.year ? String(albumMeta.year) : meta.publishedAt?.slice(0, 4),
          label: albumMeta?.label,
          features: featNames, duration: meta.extraMeta?.duration,
          producer: rm?.producer || rm?.beatmaker || undefined,
          rmMotifs: rm?.ai_motifs?.length ? rm.ai_motifs : undefined,
          rmAtmosphere: rm?.ai_atmosphere || undefined,
          rmEmotions: rm?.ai_emotions?.length ? rm.ai_emotions : undefined,
          rmTags: rm ? { genre: rm.tags_genre, mood: rm.tags_mood, style: rm.tags_style } : undefined,
          lyrics: lyrics ?? undefined,
        });
        const res = await ollamaJson(system, user);
        analysis = res.analysis; aiError = res.error;
      }

      // kvalitativní filtr
      let gate = { pass: false, reasons: ["bez analýzy"] };
      if (analysis) gate = qualityGate(analysis);

      const status = analysis
        ? (gate.pass ? "ok" : "gate-fail")
        : (needsAi ? "ai-fail" : "c-meta");
      return {
        id: b.id, pas: b.pas, artist, title: entity.title,
        status, lrcStatus,
        gateReasons: gate.reasons, aiError,
        analysis, lyricsFound: !!lyrics,
        meta, dir, albumId, albumMeta, album, featIds,
      };
    }));

    for (const r of waveResults) {
      results.push(r);
      if (r.status === "ok" || r.status === "gate-fail") {
        if (r.pas === "C") r.pas = "B"; // C s textem → B
        (stats as any)[r.pas]?.ok !== undefined
          ? ((stats as any)[r.pas].ok += r.status === "ok" ? 1 : 0, (stats as any)[r.pas].fail += r.status === "gate-fail" ? 1 : 0)
          : null;
      }
    }

    // zápis vlny
    if (!DRY_RUN) {
      for (const r of waveResults) {
        if (r.status === "skip") continue;
        const a: Analysis | null = r.analysis;

        // ── entity.mdx ──
        if (a) {
          fs.writeFileSync(path.join(r.dir, "entity.mdx"), mdxOf(a, r.title));
        }

        // ── meta.json ──
        const meta = r.meta;
        if (a && r.status === "ok") {
          meta.description = shorten(a.about, 158);
          const albumImage = r.albumMeta?.image;
          if (albumImage && !meta.image) meta.image = albumImage;
          delete meta.extraMeta.noindex;
          delete meta.extraMeta.isStub;
          delete meta.extraMeta.phase3GateFail; // stale flag z předchozího gate-fail pokusu
          meta.extraMeta.phase3Done = true;
          meta.extraMeta.phase3Pas = r.pas === "C" ? "B" : r.pas; // upgrade C→B
          if (r.pas === "C") meta.extraMeta.phase3Upgraded = true;
          if (a.themes?.length) meta.extraMeta.themes = a.themes.slice(0, 6);
          if (a.moods?.length) meta.extraMeta.moods = a.moods.slice(0, 4);
        } else if (a && r.status === "gate-fail") {
          // obsah se zapíše, ale noindex zůstává (do opravy)
          meta.extraMeta.phase3Done = false;
          meta.extraMeta.phase3GateFail = true;
        } else if (!a && r.pas === "C") {
          // C miss → poctivé metadata MDX
          const lines: string[] = [`## O skladbě`, ``];
          const bits: string[] = [];
          if (r.album?.title) bits.push(`pochází z alba ${r.album.title}`);
          if (r.albumMeta?.year) bits.push(`z roku ${r.albumMeta.year}`);
          if (r.albumMeta?.label) bits.push(`vydalo ${r.albumMeta.label}`);
          if (meta.extraMeta?.duration) bits.push(`délka ${Math.floor(meta.extraMeta.duration/60)}:${String(meta.extraMeta.duration%60).padStart(2,"0")}`);
          lines.push(`"${r.title}" ${bits.length ? "je skladba, která " + bits.join(", ") + "." : "je součástí diskografie interpreta."}`);
          lines.push(``, `Detailnější popis postupně doplňujeme.`);
          fs.writeFileSync(path.join(r.dir, "entity.mdx"), lines.join("\n") + "\n");
          meta.extraMeta.phase3Done = true;
          meta.extraMeta.phase3Pas = "C";
          meta.extraMeta.lyricsAttempts = (meta.extraMeta.lyricsAttempts ?? 0) + 1;
          meta.extraMeta.lyricsLastStatus = r.lrcStatus ?? 0;
        }
        fs.writeFileSync(path.join(r.dir, "meta.json"), JSON.stringify(meta, null, 2) + "\n");

        // ── relations.json — žánry z alba ──
        if (r.albumId) {
          const relsPath = path.join(r.dir, "relations.json");
          const rels = fs.existsSync(relsPath) ? readJson<any>(relsPath) : {};
          const albumRelsPath = path.join(ENTITIES, r.albumId, "relations.json");
          const albumRels = fs.existsSync(albumRelsPath) ? readJson<any>(albumRelsPath) : {};
          if (albumRels.genres?.length && !rels.genres?.length) {
            rels.genres = albumRels.genres;
            fs.writeFileSync(relsPath, JSON.stringify(rels, null, 2) + "\n");
          }
          // album tracks[] → HAS_TRACK backlink (jednorázově)
          if (!albumRels.tracks?.includes(r.id)) {
            albumRels.tracks = [...(albumRels.tracks ?? []), r.id];
            fs.writeFileSync(albumRelsPath, JSON.stringify(albumRels, null, 2) + "\n");
            albumsTouched.add(r.albumId);
          }
        }
      }
    }

    process.stdout.write(`  [${Math.min(i + CONCURRENCY, batch.length)}/${batch.length}] ` +
      waveResults.map((r: any) => `${r.status}`).join(",") + "\n");
  }

  // souhrn
  const ok = results.filter((r) => r.status === "ok").length;
  const gateFail = results.filter((r) => r.status === "gate-fail").length;
  const aiFail = results.filter((r) => r.status === "ai-fail").length;
  const cMeta = results.filter((r) => r.status === "c-meta").length;
  const skipped = results.filter((r) => r.status === "skip").length;
  console.log(`\n=== SOUHRN dávky ===`);
  console.log(`  ✅ kvalita OK (noindex sundán): ${ok}`);
  console.log(`  📋 C-metadata zapsána (noindex zůstává): ${cMeta}`);
  console.log(`  ⚠️  gate-fail (obsah zapsán, noindex zůstává): ${gateFail}`);
  console.log(`  ❌ AI selhala: ${aiFail}`);
  console.log(`  ⏭️  přeskočeno: ${skipped}`);
  if (aiFail) results.filter((r) => r.status === "ai-fail").forEach((r) =>
    console.log(`     · ${r.artist} — ${r.title}: ${r.aiError}`));
  if (gateFail) results.filter((r) => r.status === "gate-fail").forEach((r) =>
    console.log(`     · ${r.artist} — ${r.title}: ${r.gateReasons.join("; ")}`));

  writeJson(path.join(DATA, `batch-result-${new Date().toISOString().slice(0, 10)}.json`), {
    at: new Date().toISOString(), ok, gateFail, aiFail, skipped,
    albumsTouched: [...albumsTouched],
    results: results.map((r) => ({ id: r.id, pas: r.pas, status: r.status, reasons: r.gateReasons })),
  });
  if (!DRY_RUN) {
    console.log(`\nDalší krok: npm run cache:build && ověř noindex stav`);
  }
}

main().catch((e) => { console.error(e); process.exit(1); });
