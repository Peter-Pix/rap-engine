/**
 * Deezer full artist index + album matching (v2).
 *
 * Projdi všechny RKG artisty, najdi je na Deezeru.
 * Pro každý RKG album najdi artist_name z relations.json.artists,
 * pak search /search/album?q={title} artist:{name}.
 *
 * POUZE ČTENÍ RKG, ZÁPIS DO CACHE.
 */

import { readdir, readFile, writeFile, mkdir } from "fs/promises";
import { join } from "path";

const DEEZER_BASE = "https://api.deezer.com";
const CONTENT_ROOT = "/Users/petrpiskacek/.openclaw/workspace/rap-knowledge-graph/content/entities";
const CACHE_ROOT = "/Users/petrpiskacek/.openclaw/workspace/rap-knowledge-graph/.content-cache";

function normalize(s: string): string {
  return s
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, " ")
    .trim();
}

function slugify(s: string): string {
  return s
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");
}

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

let lastRequest = 0;
async function rateLimitedFetch(url: string): Promise<Response> {
  const elapsed = Date.now() - lastRequest;
  if (elapsed < 150) await sleep(150 - elapsed);
  lastRequest = Date.now();
  return fetch(url);
}

async function deezer<T>(path: string, params: Record<string, string | number> = {}): Promise<T> {
  const qs = new URLSearchParams(params as Record<string, string>).toString();
  const url = `${DEEZER_BASE}${path}${qs ? `?${qs}` : ""}`;
  const res = await rateLimitedFetch(url);
  if (!res.ok) throw new Error(`Deezer ${res.status}: ${url}`);
  return res.json() as Promise<T>;
}

interface RkgArtist {
  slug: string;
  title: string;
  realName?: string;
}

interface RkgAlbum {
  slug: string;
  title: string;
  year?: number;
  artistSlugs: string[];
}

interface DeezerArtistRef {
  id: number;
  name: string;
  picture_big?: string;
  nb_album?: number;
}

interface DeezerAlbum {
  id: number;
  title: string;
  release_date: string;
  cover_big?: string;
  nb_tracks: number;
  duration: number;
  artist: { id: number; name: string };
}

async function loadRkgArtists(): Promise<Map<string, RkgArtist>> {
  const out = new Map<string, RkgArtist>();
  const dirs = await readdir(CONTENT_ROOT, { withFileTypes: true });

  for (const dir of dirs) {
    if (!dir.isDirectory() || !dir.name.startsWith("artist_")) continue;
    const slug = dir.name.replace(/^artist_/, "");
    try {
      const metaPath = join(CONTENT_ROOT, dir.name, "meta.json");
      const meta = JSON.parse(await readFile(metaPath, "utf-8"));
      out.set(slug, {
        slug,
        title: meta.title || slug,
        realName: meta.realName || meta.birthName,
      });
    } catch {
      // skip
    }
  }
  return out;
}

async function loadRkgAlbums(artistsBySlug: Map<string, RkgArtist>): Promise<RkgAlbum[]> {
  const dirs = await readdir(CONTENT_ROOT, { withFileTypes: true });
  const albums: RkgAlbum[] = [];

  for (const dir of dirs) {
    if (!dir.isDirectory() || !dir.name.startsWith("album_")) continue;
    const slug = dir.name.replace(/^album_/, "");
    try {
      const metaPath = join(CONTENT_ROOT, dir.name, "meta.json");
      const relPath = join(CONTENT_ROOT, dir.name, "relations.json");
      const meta = JSON.parse(await readFile(metaPath, "utf-8"));
      let artistSlugs: string[] = [];
      try {
        const rel = JSON.parse(await readFile(relPath, "utf-8"));
        artistSlugs = rel.artists || [];
      } catch {}
      albums.push({
        slug,
        title: meta.title || slug,
        year: meta.year || (meta.releaseDate ? new Date(meta.releaseDate).getFullYear() : undefined),
        artistSlugs,
      });
    } catch {
      // skip
    }
  }
  return albums;
}

async function findDeezerArtist(name: string, realName?: string): Promise<DeezerArtistRef | null> {
  const candidates = [name];
  if (realName && realName !== name) candidates.push(realName);

  for (const candidate of candidates) {
    try {
      const search = await deezer<{ data: DeezerArtistRef[] }>("/search/artist", { q: candidate, limit: 5 });
      const exact = search.data.find((a) => normalize(a.name) === normalize(candidate));
      if (exact) return exact;
      const startsWith = search.data.find((a) => normalize(a.name).startsWith(normalize(candidate)));
      if (startsWith) return startsWith;
      if (search.data.length > 0) {
        const first = search.data[0];
        if (normalize(first.name).split(" ")[0] === normalize(candidate).split(" ")[0]) {
          return first;
        }
      }
    } catch (e) {
      console.error(`  ⚠️  Search failed for "${candidate}":`, (e as Error).message);
    }
  }
  return null;
}

function normalizeTitle(s: string): string {
  return s
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, "")
    .trim();
}

function matchTitle(rkgTitle: string, deezerTitle: string): "exact" | "fuzzy" | null {
  const normRkg = normalizeTitle(rkgTitle);
  const normDz = normalizeTitle(deezerTitle);
  if (normRkg === normDz) return "exact";
  // Fuzzy: startsWith (for "Album (Deluxe Edition)" vs "Album")
  if (normDz.startsWith(normRkg) || normRkg.startsWith(normDz)) {
    if (Math.abs(normDz.length - normRkg.length) <= 20) return "fuzzy";
  }
  return null;
}

async function findDeezerAlbum(
  albumTitle: string,
  artistNames: string[]
): Promise<{ album: DeezerAlbum; match_type: "exact" | "fuzzy" } | null> {
  // Try each artist name
  for (const artistName of artistNames) {
    try {
      const search = await deezer<{ data: DeezerAlbum[] }>("/search/album", {
        q: albumTitle,
        artist: artistName,
        limit: 5,
      });
      for (const dAlbum of search.data) {
        const match = matchTitle(albumTitle, dAlbum.title);
        if (match && dAlbum.artist) {
          return { album: dAlbum, match_type: match };
        }
      }
    } catch (e) {
      // continue
    }
  }

  // Fallback: search just by album title
  try {
    const search = await deezer<{ data: DeezerAlbum[] }>("/search/album", { q: albumTitle, limit: 10 });
    for (const dAlbum of search.data) {
      const match = matchTitle(albumTitle, dAlbum.title);
      if (match && dAlbum.artist) {
        return { album: dAlbum, match_type: match };
      }
    }
  } catch {}

  return null;
}

async function main() {
  console.log("🎵 Deezer full index build (v2)\n");

  await mkdir(CACHE_ROOT, { recursive: true });

  console.log("📚 Loading RKG data...");
  const rkgArtistsMap = await loadRkgArtists();
  const rkgArtists = Array.from(rkgArtistsMap.values());
  const rkgAlbums = await loadRkgAlbums(rkgArtistsMap);
  console.log(`  Artists: ${rkgArtists.length}`);
  console.log(`  Albums: ${rkgAlbums.length}\n`);

  // === ARTIST INDEX ===
  console.log("━━━ PHASE 1: Artist index ━━━\n");
  const artistIndex: Record<string, {
    deezer_id: number;
    deezer_name: string;
    nb_album: number;
    picture: string | null;
    confidence: "exact" | "startswith" | "fuzzy";
    matched_via: "title" | "realName";
  }> = {};

  let found = 0;
  let notFound = 0;

  for (let i = 0; i < rkgArtists.length; i++) {
    const a = rkgArtists[i];
    const result = await findDeezerArtist(a.title, a.realName);

    if (result) {
      found++;
      const confidence =
        normalize(result.name) === normalize(a.title) || normalize(result.name) === normalize(a.realName || "")
          ? "exact"
          : normalize(result.name).startsWith(normalize(a.title))
          ? "startswith"
          : "fuzzy";

      const matchedVia = normalize(result.name) === normalize(a.realName || "") ? "realName" : "title";

      artistIndex[a.slug] = {
        deezer_id: result.id,
        deezer_name: result.name,
        nb_album: result.nb_album || 0,
        picture: result.picture_big || null,
        confidence,
        matched_via: matchedVia,
      };

      if (i % 25 === 0) {
        process.stdout.write(`  [${((i / rkgArtists.length) * 100).toFixed(1)}%] ${found}/${i + 1}\n`);
      }
    } else {
      notFound++;
    }
  }

  console.log(`\n  ✅ Found: ${found}/${rkgArtists.length} (${((found / rkgArtists.length) * 100).toFixed(1)}%)`);
  console.log(`  ❌ Not found: ${notFound}\n`);

  // === ALBUM MATCHING via /search/album ===
  console.log("━━━ PHASE 2: Album matching (search-based) ━━━\n");
  const albumIndex: Record<string, {
    deezer_id: number;
    deezer_title: string;
    release_date: string;
    cover: string | null;
    nb_tracks: number;
    duration_sec: number;
    deezer_artist_id: number;
    deezer_artist_name: string;
    match_type: "exact" | "fuzzy";
  }> = {};

  let matched = 0;
  let unmatched = 0;

  for (let i = 0; i < rkgAlbums.length; i++) {
    const al = rkgAlbums[i];

    // Get artist names from relations
    const artistNames: string[] = [];
    for (const slug of al.artistSlugs) {
      const artist = rkgArtistsMap.get(slug.replace(/^artist_/, ""));
      if (artist) artistNames.push(artist.title);
    }

    if (artistNames.length === 0) {
      // Album has no artist relation — skip with log
      unmatched++;
      continue;
    }

    const result = await findDeezerAlbum(al.title, artistNames);

    if (result) {
      matched++;
      albumIndex[al.slug] = {
        deezer_id: result.album.id,
        deezer_title: result.album.title,
        release_date: result.album.release_date,
        cover: result.album.cover_big || null,
        nb_tracks: result.album.nb_tracks,
        duration_sec: result.album.duration,
        deezer_artist_id: result.album.artist.id,
        deezer_artist_name: result.album.artist.name,
        match_type: result.match_type,
      };
    } else {
      unmatched++;
    }

    if (i % 50 === 0) {
      process.stdout.write(`  [${((i / rkgAlbums.length) * 100).toFixed(1)}%] ${matched}/${i + 1} matched (${al.slug})\n`);
    }
  }

  console.log(`\n  ✅ Albums matched: ${matched}/${rkgAlbums.length} (${((matched / rkgAlbums.length) * 100).toFixed(1)}%)`);
  console.log(`  ❌ Unmatched: ${unmatched}\n`);

  // === WRITE CACHE ===
  const cacheFile = join(CACHE_ROOT, "deezer-index.json");
  const cache = {
    built_at: new Date().toISOString(),
    stats: {
      rkg_artists: rkgArtists.length,
      rkg_albums: rkgAlbums.length,
      artists_found: found,
      artists_not_found: notFound,
      albums_matched: matched,
      albums_unmatched: unmatched,
      match_rate: ((matched / rkgAlbums.length) * 100).toFixed(1),
    },
    artists: artistIndex,
    albums: albumIndex,
  };

  await writeFile(cacheFile, JSON.stringify(cache, null, 2), "utf-8");
  console.log(`💾 Cache written: ${cacheFile}`);
  console.log(`\n✨ Hotovo!`);
}

main().catch((e) => {
  console.error("💥 Chyba:", e);
  process.exit(1);
});