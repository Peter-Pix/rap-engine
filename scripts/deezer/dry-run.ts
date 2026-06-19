/**
 * Deezer dry-run diagnostika.
 *
 * Pro vybrané testovací artisty:
 *  1. Najde je na Deezeru (search/artist)
 *  2. Stáhne jejich alba
 *  3. Matchne album.title s RKG albumy (case + diacritics insensitive)
 *  4. Stáhne tracklist prvního matcha
 *  5. Vypíše souhrn: kolik matchlo, kolik chybí, sample dat
 *
 * ŽÁDNÝ WRITE — pouze čtení. Read-only diagnostika.
 */

import { readdir, readFile } from "fs/promises";
import { join } from "path";

const DEEZER_BASE = "https://api.deezer.com";
const CONTENT_ROOT = "/Users/petrpiskacek/.openclaw/workspace/rap-knowledge-graph/content/entities";

// 5 top artistů pro pilot
const TEST_ARTISTS = ["Yzomandias", "Separ", "Calin", "Nik Tendo", "Porsche Boy"];

function normalize(s: string): string {
  return s
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "") // strip diacritics
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

async function deezer<T>(path: string, params: Record<string, string | number> = {}): Promise<T> {
  const qs = new URLSearchParams(params as Record<string, string>).toString();
  const url = `${DEEZER_BASE}${path}${qs ? `?${qs}` : ""}`;
  const res = await fetch(url);
  if (!res.ok) throw new Error(`Deezer ${res.status}: ${url}`);
  return res.json() as Promise<T>;
}

interface DeezerArtist {
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

interface DeezerTrack {
  id: number;
  title: string;
  duration: number;
  track_position: number;
  contributors: { id: number; name: string; role: string }[];
  artist: { id: number; name: string };
  isrc?: string;
}

interface RkgAlbumDir {
  slug: string;
  title: string;
  year?: number;
}

async function loadRkgAlbums(): Promise<Map<string, RkgAlbumDir>> {
  const out = new Map<string, RkgAlbumDir>();
  const dirs = await readdir(CONTENT_ROOT, { withFileTypes: true });

  for (const dir of dirs) {
    if (!dir.isDirectory() || !dir.name.startsWith("album_")) continue;
    const slug = dir.name.replace(/^album_/, "");
    try {
      const metaPath = join(CONTENT_ROOT, dir.name, "meta.json");
      const meta = JSON.parse(await readFile(metaPath, "utf-8"));
      out.set(slug, {
        slug,
        title: meta.title || slug,
        year: meta.releaseDate ? new Date(meta.releaseDate).getFullYear() : undefined,
      });
    } catch {
      // skip broken albums
    }
  }
  return out;
}

function matchAlbum(deezerTitle: string, rkgAlbums: Map<string, RkgAlbumDir>): RkgAlbumDir | null {
  const normDt = normalize(deezerTitle);
  for (const rkg of rkgAlbums.values()) {
    if (normalize(rkg.title) === normDt) return rkg;
    if (slugify(rkg.title) === slugify(deezerTitle)) return rkg;
  }
  // loose: startsWith
  for (const rkg of rkgAlbums.values()) {
    if (normalize(rkg.title).startsWith(normDt) || normDt.startsWith(normalize(rkg.title))) {
      return rkg;
    }
  }
  return null;
}

async function main() {
  console.log("🎵 Deezer dry-run diagnostika\n");
  console.log(`Test artisti: ${TEST_ARTISTS.join(", ")}\n`);

  const rkgAlbums = await loadRkgAlbums();
  console.log(`📚 RKG albums loaded: ${rkgAlbums.size}\n`);

  const stats = {
    artistsSearched: 0,
    artistsFound: 0,
    albumsFetched: 0,
    albumsMatched: 0,
    albumsUnmatched: 0,
  };

  for (const artistName of TEST_ARTISTS) {
    stats.artistsSearched++;
    console.log(`\n━━━ ${artistName} ━━━`);

    // 1. Search artist
    const search = await deezer<{ data: DeezerArtist[] }>("/search/artist", { q: artistName, limit: 5 });
    const exact = search.data.find((a) => normalize(a.name) === normalize(artistName));
    const picked = exact || search.data[0];

    if (!picked) {
      console.log(`  ❌ Nenalezen na Deezeru`);
      continue;
    }
    stats.artistsFound++;

    console.log(`  ✅ Deezer: "${picked.name}" (id=${picked.id}, nb_album=${picked.nb_album || "?"})`);
    if (normalize(picked.name) !== normalize(artistName)) {
      console.log(`     ⚠️  Jméno se liší od RKG — ověřit ručně`);
    }

    // 2. Fetch albums
    const albums = await deezer<{ data: DeezerAlbum[]; total: number }>(`/artist/${picked.id}/albums`, { limit: 50 });
    stats.albumsFetched += albums.data.length;
    console.log(`  📀 Alb na Deezeru: ${albums.data.length}`);

    // 3. Match with RKG
    let matched = 0;
    let unmatched = 0;
    const sampleTracks: { rkgSlug: string; trackCount: number; firstFeat?: string }[] = [];

    for (const dAlbum of albums.data) {
      const rkgMatch = matchAlbum(dAlbum.title, rkgAlbums);
      if (rkgMatch) {
        matched++;
        stats.albumsMatched++;

        // Fetch tracks for first match
        if (sampleTracks.length < 2) {
          try {
            const tracks = await deezer<{ data: DeezerTrack[] }>(`/album/${dAlbum.id}/tracks`, { limit: 50 });
            const featArtists = new Set<string>();
            for (const t of tracks.data) {
              for (const c of t.contributors || []) {
                if (c.role === "Featuring" || c.role === "Main") {
                  featArtists.add(c.name);
                }
              }
            }
            sampleTracks.push({
              rkgSlug: rkgMatch.slug,
              trackCount: tracks.data.length,
              firstFeat: Array.from(featArtists).slice(0, 3).join(", "),
            });
          } catch (e) {
            // skip
          }
        }
      } else {
        unmatched++;
        stats.albumsUnmatched++;
      }
    }

    console.log(`     ✅ Matchlo v RKG: ${matched}/${albums.data.length}`);
    console.log(`     ⚠️  Unmatched: ${unmatched} (singly, deluxe edice, feat-only...)`);

    if (sampleTracks.length) {
      console.log(`     📋 Tracklisty (sample):`);
      for (const s of sampleTracks) {
        console.log(`        - ${s.rkgSlug}: ${s.trackCount} tracks${s.firstFeat ? ` (feat: ${s.firstFeat})` : ""}`);
      }
    }
  }

  console.log("\n━━━ SUMMARY ━━━");
  console.log(`  Artisti hledáno:    ${stats.artistsSearched}`);
  console.log(`  Artisti nalezeni:   ${stats.artistsFound}`);
  console.log(`  Alb fetchnuto:      ${stats.albumsFetched}`);
  console.log(`  Alb matchlo v RKG:  ${stats.albumsMatched}`);
  console.log(`  Alb bez matcha:     ${stats.albumsUnmatched}`);
  const matchRate = stats.albumsFetched ? ((stats.albumsMatched / stats.albumsFetched) * 100).toFixed(1) : "0";
  console.log(`  Match rate:         ${matchRate}%`);

  // Extrapolace
  const estimatedTotalMatches = Math.round((rkgAlbums.size * parseFloat(matchRate)) / 100);
  console.log(`\n📊 Extrapolace na celou RKG:`);
  console.log(`   ~${estimatedTotalMatches} alb může dostat tracklist z Deezeru`);
  console.log(`   (~${Math.round(estimatedTotalMatches * 0.7)} s reálnými tracklistama po filtraci unmatched deluxe edic)`);
}

main().catch((e) => {
  console.error("💥 Chyba:", e);
  process.exit(1);
});