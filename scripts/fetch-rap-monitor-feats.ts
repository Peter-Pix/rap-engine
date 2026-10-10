#!/usr/bin/env -S npx tsx
/**
 * FÁZE 1 — Stáhne feat. data z Rap Monitoru a uloží jako JSON snapshot.
 *
 * Rap Monitor (/api/entities/Song, ~3090 záznamů) má feat hosty ve dvou
 * podobách: strukturované `featuring_names[]` (málo) a text v titulu
 * ("4 (feat. Lvcas Dope)"). Tenhle skript stáhne raw songy a vytáhne obě.
 *
 * Výstup: .data/rap-monitor-feats.json
 *   { fetched_at, total, songs: [{ title, artist_name, album, featuring_names,
 *     title_feats, release_date, deezer? }] }
 *
 * Použití:
 *   npx tsx scripts/fetch-rap-monitor-feats.ts
 */
import * as fs from "node:fs";
import * as path from "node:path";

const API = "https://rap-monitor.base44.app/api";
const KEY = process.env.RAP_MONITOR_API_KEY || "b9d03638f3df4fe49ee5e75ab26d0803";
const PAGE = 500;
const ROOT = path.resolve(__dirname, "..");
const OUT = path.join(ROOT, ".data", "rap-monitor-feats.json");

const FEAT_RE =
  /\s*(?:\(|\[)?\s*(?:feat\.?|ft\.?|featuring|with)\s+([^)\]\-–]+)/i;

const SPLIT = /\s*(?:,|&|\+|\bx\b|\bvs\.?\b|\ba\b)\s*/i;

function parseTitleFeats(title: string): string[] {
  const m = title.match(FEAT_RE);
  if (!m) return [];
  return m[1]
    .split(SPLIT)
    .map((s) => s.trim())
    .filter((s) => s.length > 0 && s.length < 40);
}

async function fetchPage(skip: number): Promise<unknown[]> {
  const url = `${API}/entities/Song?limit=${PAGE}&skip=${skip}`;
  const res = await fetch(url, { headers: { api_key: KEY } });
  if (!res.ok) throw new Error(`HTTP ${res.status} at skip=${skip}`);
  const json = await res.json();
  return Array.isArray(json) ? json : [];
}

async function main() {
  const all: Record<string, unknown>[] = [];
  for (let skip = 0; skip < 20000; skip += PAGE) {
    const page = await fetchPage(skip);
    all.push(...page);
    process.stdout.write(`\r  staženo: ${all.length}`);
    if (page.length < PAGE) break;
  }
  console.log();

  const songs = all.map((s) => {
    const title = String(s.title ?? "");
    const structural = Array.isArray(s.featuring_names)
      ? (s.featuring_names as string[])
      : [];
    const fromTitle = parseTitleFeats(title);
    return {
      title,
      artist_name: String(s.artist_name ?? ""),
      album: s.album ? String(s.album) : null,
      release_date: s.release_date ?? null,
      featuring_names: structural,
      title_feats: fromTitle,
      // sjednoceno
      feats: [...new Set([...structural, ...fromTitle])],
    };
  });

  const withFeats = songs.filter((s) => s.feats.length > 0);

  const payload = {
    fetched_at: new Date().toISOString(),
    total: songs.length,
    with_feats: withFeats.length,
    songs,
  };
  fs.mkdirSync(path.dirname(OUT), { recursive: true });
  fs.writeFileSync(OUT, JSON.stringify(payload, null, 2));

  console.log(`✓ RM songů: ${songs.length}`);
  console.log(`✓ s feat (field nebo titul): ${withFeats.length}`);
  console.log(`✓ uloženo: ${OUT}`);
}

main().catch((e) => {
  console.error("CHYBA:", e);
  process.exit(1);
});
