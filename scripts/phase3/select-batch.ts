#!/usr/bin/env -S npx tsx
/**
 * Vybere dávku skladeb k obohacení a určí jejich pás (A/B/C).
 *
 * Pás A = RM má AI analýzu (+texty) — nejkvalitnější, MDX
 * Pás B = máme text (RM lyrics nebo LRCLIB) — vlastní analýza, extraMeta
 * Pás C = jen holá metadata — extraMeta, noindex zůstává
 *
 * Použití:
 *   npx tsx scripts/phase3/select-batch.ts           # 100 skladeb, pás A→B→C
 *   BATCH_SIZE=50 npx tsx scripts/phase3/select-batch.ts
 *   PAS=a npx tsx scripts/phase3/select-batch.ts     # jen pás A
 */
import {
  DATA, ensureData, loadEntities, artistOf, fetchRmSongs, norm, writeJson, readJson,
} from "./lib";
import * as fs from "node:fs";
import * as path from "node:path";

const PAS = (process.env.PAS || "all").toLowerCase();
const BATCH_SIZE = Number(process.env.BATCH_SIZE || 100);
const CACHE = path.join(DATA, "rm-songs.json");

async function main() {
  ensureData();
  const entities = loadEntities();
  const tracks = Object.values(entities).filter((e: any) => e.type === "track");

  // skladby, které ještě potřebují obsah — včetně C-metadata (možný lyrics-upgrade)
  const pending = tracks.filter((t: any) => {
    const em = t.extraMeta ?? {};
    if (em.phase3Pas === "C" && (em.lyricsAttempts ?? 0) < 2) return true; // lyrics-upgrade pokus
    if (em.phase3Done) return false;
    const content = t.content ?? "";
    if (content.length > 600) return false;
    return em.noindex === true || content.length < 600;
  });

  // RM data (cache, ať se nestahují pořád)
  let rmSongs: any[] = fs.existsSync(CACHE) ? readJson<any[]>(CACHE) : [];
  if (!rmSongs.length) {
    console.log("Stahuji RM Song entity…");
    rmSongs = await fetchRmSongs();
    writeJson(CACHE, rmSongs);
  }
  // index RM: přesný (artist+title) i title fallback (77 skladeb matchne jen přes titul)
  const rmByKey = new Map<string, any>();
  const rmByTitle = new Map<string, any[]>();
  for (const s of rmSongs) {
    rmByKey.set(`${norm(s.artist_name)}|${norm(s.title)}`, s);
    const list = rmByTitle.get(norm(s.title)) ?? [];
    list.push(s);
    rmByTitle.set(norm(s.title), list);
  }
  function findRm(artist: string, title: string): any | null {
    const direct = artist ? rmByKey.get(`${norm(artist)}|${norm(title)}`) : null;
    if (direct) return direct;
    const cands = rmByTitle.get(norm(title)) ?? [];
    if (cands.length === 1) return cands[0];
    return cands.find((c) => norm(c.artist_name) === norm(artist)) ?? null;
  }

  // roztřiď do pásů
  const pasA: any[] = [], pasB: any[] = [], pasC: any[] = [];
  for (const t of pending) {
    const artist = artistOf(t, entities);
    const rm = findRm(artist, t.title);
    const hasRmAnalysis = !!rm?.ai_analysis;
    const hasRmLyrics = (rm?.lyrics_text?.length ?? 0) > 100;
    if (hasRmAnalysis) pasA.push({ id: t.id, artist, title: t.title, pas: "A", rmId: rm.id, hasLyrics: hasRmLyrics });
    else if (hasRmLyrics) pasB.push({ id: t.id, artist, title: t.title, pas: "B", rmId: rm.id, hasLyrics: true });
    else pasC.push({ id: t.id, artist, title: t.title, pas: "C", rmId: rm?.id ?? null, hasLyrics: false });
  }

  console.log(`\n=== FRONTA ===`);
  console.log(`  Pás A (RM analýza):      ${pasA.length}`);
  console.log(`  Pás B (máme text):       ${pasB.length}`);
  console.log(`  Pás C (holá metadata):   ${pasC.length}`);
  console.log(`  Celkem pending:          ${pending.length}`);

  // sestav dávku dle priority
  const order = PAS === "a" ? ["A"] : PAS === "b" ? ["B"] : PAS === "c" ? ["C"] : ["A", "B", "C"];
  const pool = { A: pasA, B: pasB, C: pasC };
  const batch: any[] = [];
  for (const p of order) {
    for (const item of pool[p]) {
      if (batch.length >= BATCH_SIZE) break;
      batch.push(item);
    }
  }

  const meta = {
    createdAt: new Date().toISOString(),
    pas: PAS,
    size: batch.length,
    composition: {
      A: batch.filter((b) => b.pas === "A").length,
      B: batch.filter((b) => b.pas === "B").length,
      C: batch.filter((b) => b.pas === "C").length,
    },
    batch,
  };
  writeJson(path.join(DATA, "current-batch.json"), meta);

  console.log(`\n✅ Vybráno ${batch.length} skladeb → .data/phase3/current-batch.json`);
  console.log(`   složení: A=${meta.composition.A} B=${meta.composition.B} C=${meta.composition.C}`);
  console.log(`\n   vzorek:`);
  batch.slice(0, 8).forEach((b: any) => console.log(`   [${b.pas}] ${b.artist} — ${b.title}`));
}

main().catch((e) => { console.error(e); process.exit(1); });
