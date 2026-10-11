#!/usr/bin/env -S npx tsx
/**
 * FÁZE 1 — Popisy artistů z faktů grafu (bez halucinací).
 *
 * Pro vybrané interprety (s reálným obsahem) vygeneruje description jen z dat,
 * která graf dokládá: počet tracků, alba, featy, spolupráce.
 * AI jen formuluje — prompt striktně zakazuje vymýšlet biografii, roky, labely.
 *
 * Použití:
 *   npx tsx scripts/enrich-artist-descriptions.ts
 *   DRY_RUN=0 npx tsx scripts/enrich-artist-descriptions.ts
 */
import * as fs from "node:fs";
import * as path from "node:path";

const ROOT = path.resolve(__dirname, "..");
const ENTITIES = path.join(ROOT, "content", "entities");
const DRY_RUN = process.env.DRY_RUN !== "0";

function ollamaKey(): string {
  const env = path.join(ROOT, ".env.local");
  const m = fs.readFileSync(env, "utf8").match(/OLLAMA_API_KEY\s*=\s*["']?([^"'\n]+)/);
  if (!m) throw new Error("OLLAMA_API_KEY nenalezen");
  return m[1].trim();
}

const TARGETS = [
  "artist_prago-union",
  "artist_jckpt",
  "artist_irit",
  "artist_slipo",
  "artist_grimaso",
];

// fakta z grafu (načteno z cache — vygenerováno níže)
const graph = JSON.parse(fs.readFileSync(path.join(ROOT, ".content-cache", "graph.json"), "utf8"));
const ents = JSON.parse(fs.readFileSync(path.join(ROOT, ".content-cache", "entities.json"), "utf8"));

function factsFor(aid: string) {
  const edges = graph.filter((e: any) => e.from === aid || e.to === aid);
  const tracks = [...new Set(edges.filter((e: any) => e.relation === "HAS_ARTIST" && e.to === aid).map((e: any) => ents[e.from]?.title))].filter(Boolean);
  const albums = [...new Set(edges.filter((e: any) => e.relation === "HAS_ALBUM" && e.from === aid).map((e: any) => ents[e.to]?.title))].filter(Boolean);
  const feats = [...new Set(edges.filter((e: any) => e.relation === "FEATURES" && e.to === aid).map((e: any) => ents[e.from]?.title))].filter(Boolean);
  const collab = [...new Set(edges.filter((e: any) => (e.relation === "RELATED_ARTIST" || e.relation === "RELATED_TO") && e.from === aid).map((e: any) => ents[e.to]?.title))].filter(Boolean);
  return { tracks, albums, feats, collab };
}

const SYSTEM = `Jsi editor databáze českého a slovenského rapu 4rap.cz.
Napiš krátký, věcný popis interpreta (2-4 věty) pro meta description.

PRAVIDLA:
- Piš POUZE z poskytnutých FAKT (seznam tracků, alb, featů, spoluprací).
- ZAKÁZÁNO vymýšlet: roky, labely, města, biografii, "legendární", "ikonický", "nejvlivnější".
- Když nevíš žánr/scénu, NEZMIŇUJ ji. Piš jen co fakta dokládají.
- Nesmíš říct "nemám informace" ani "bez dalších údajů".
- Vrať JEDINÝ odstavec, česky (slovenské interprety česky, názvy originál), max 160 znaků.`;

async function main() {
  const key = ollamaKey();
  for (const aid of TARGETS) {
    const meta = JSON.parse(fs.readFileSync(path.join(ENTITIES, aid, "meta.json"), "utf8"));
    const f = factsFor(aid);
    const facts = [
      `INTERPRET: ${meta.title}`,
      `TRACKY (${f.tracks.length}): ${f.tracks.join(", ")}`,
      f.albums.length ? `ALBA: ${f.albums.join(", ")}` : "",
      f.feats.length ? `FEATY: ${f.feats.join(", ")}` : "",
      f.collab.length ? `SPOLUPRÁCE: ${f.collab.join(", ")}` : "",
    ].filter(Boolean).join("\n");

    const r = await fetch("https://ollama.com/api/chat", {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${key}` },
      body: JSON.stringify({ model: "deepseek-v4.1-flash", messages: [{ role: "system", content: SYSTEM }, { role: "user", content: facts }], stream: false, think: false }),
    });
    const j: any = await r.json();
    const desc = (j.message?.content ?? "").trim().replace(/^["']|["']$/g, "");
    console.log(`\n=== ${meta.title} ===`);
    console.log(desc);
    if (!DRY_RUN && desc.length >= 60 && desc.length <= 220) {
      meta.description = desc;
      fs.writeFileSync(path.join(ENTITIES, aid, "meta.json"), JSON.stringify(meta, null, 2) + "\n");
      console.log("   → zapsáno");
    } else if (!DRY_RUN) {
      console.log(`   → PŘESKOČENO (délka ${desc.length})`);
    }
  }
}
main();
