#!/usr/bin/env -S npx tsx
/**
 * Backfill Deezer URL do track entit.
 *
 * Track entity v extraMeta.sources[] aktuálně obsahuje jen Spotify + YouTube.
 * Chceme přidat Deezer URL aby EmbedPlayer mohl použít oficiální Deezer widget.
 *
 * Match strategie:
 *   1. Track entita má primaryArtist[0] + title
 *   2. Najdeme alba kde je artist
 *   3. V album tracks.json najdeme match (title, case-insensitive)
 *   4. Přidáme t.link do extraMeta.sources[] (pokud tam ještě není)
 *
 * Idempotent: pokud deezer URL už je v sources, skip.
 * DRY_RUN=1: jen log, nezapisuje.
 */
import * as fs from "node:fs";
import * as path from "node:path";

const REPO = path.resolve(__dirname, "..");
const ENTITIES = path.join(REPO, "content/entities");
const DRY_RUN = !!process.env.DRY_RUN;

interface TrackMeta {
  id: string;
  title?: string;
  extraMeta?: { sources?: string[]; [k: string]: unknown };
}
interface Relations {
  primaryArtist?: string[];
  featuring?: string[];
  belongsToAlbum?: string[];
  [k: string]: unknown;
}

// 1. Build artist → albums index
const artistAlbums = new Map<string, string[]>();
const albums = fs.readdirSync(ENTITIES).filter((d) => d.startsWith("album_"));

for (const albumId of albums) {
  const relPath = path.join(ENTITIES, albumId, "relations.json");
  if (!fs.existsSync(relPath)) continue;
  const rels: Relations = JSON.parse(fs.readFileSync(relPath, "utf8"));
  const artists: string[] = (rels as any).artists || [];
  for (const a of artists) {
    if (!artistAlbums.has(a)) artistAlbums.set(a, []);
    artistAlbums.get(a)!.push(albumId);
  }
}

console.log(`📚 Artist→albums index: ${artistAlbums.size} artists, ${albums.length} albums`);

// 2. Iterate tracks, match, enrich
const tracks = fs.readdirSync(ENTITIES).filter((d) => d.startsWith("track_"));
let total = 0,
  alreadyHas = 0,
  matched = 0,
  noMatch = 0,
  skipped = 0,
  written = 0;

for (const trackId of tracks) {
  total++;
  const metaPath = path.join(ENTITIES, trackId, "meta.json");
  if (!fs.existsSync(metaPath)) {
    skipped++;
    continue;
  }

  const meta: TrackMeta = JSON.parse(fs.readFileSync(metaPath, "utf8"));
  const sources: string[] = meta.extraMeta?.sources || [];

  if (sources.some((s) => s.includes("deezer.com"))) {
    alreadyHas++;
    continue;
  }

  const title: string = (meta.title || "").trim();
  if (!title) {
    noMatch++;
    continue;
  }

  // Load relations
  const relPath = path.join(ENTITIES, trackId, "relations.json");
  const rels: Relations = fs.existsSync(relPath)
    ? JSON.parse(fs.readFileSync(relPath, "utf8"))
    : {};

  const primary: string = (rels.primaryArtist || [])[0] || "";

  // Try primary artist first, then featuring
  const candidateArtists = [primary, ...((rels.featuring || []) as string[])].filter(Boolean);

  let foundLink: string | null = null;
  let foundAlbum: string | null = null;

  for (const artistId of candidateArtists) {
    const candidateAlbums = artistAlbums.get(artistId) || [];
    for (const albumId of candidateAlbums) {
      const tracksPath = path.join(ENTITIES, albumId, "tracks.json");
      if (!fs.existsSync(tracksPath)) continue;
      const tdata = JSON.parse(fs.readFileSync(tracksPath, "utf8"));
      const t = (tdata.tracks || []).find(
        (x: any) => (x.title || "").toLowerCase() === title.toLowerCase() && x.link,
      );
      if (t) {
        foundLink = t.link;
        foundAlbum = albumId;
        break;
      }
    }
    if (foundLink) break;
  }

  if (!foundLink) {
    noMatch++;
    continue;
  }

  matched++;
  console.log(`  ✅ ${trackId} → ${foundAlbum}: ${foundLink}`);

  if (!DRY_RUN) {
    const newSources = [...sources, foundLink];
    // Deduplicate by URL
    const unique = Array.from(new Set(newSources));
    const updated: TrackMeta = {
      ...meta,
      extraMeta: {
        ...(meta.extraMeta || {}),
        sources: unique,
      },
    };
    fs.writeFileSync(metaPath, JSON.stringify(updated, null, 2) + "\n");
    written++;
  }
}

console.log(
  `\n${DRY_RUN ? "[DRY RUN] " : ""}Total: ${total} | already has deezer: ${alreadyHas} | matched: ${matched} | written: ${written} | no match: ${noMatch} | skipped: ${skipped}`,
);
