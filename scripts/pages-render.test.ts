/**
 * Pages render test (D2) — ověří, že homepage, /raperi/ a /lokality/
 * mají správná data po rebuild cache.
 *
 * Kontroluje:
 *   1. Homepage: cache má entity všech typů (artist, album, location, label, genre, track)
 *   2. Homepage: graph.json má edges (pro trending/connectivity)
 *   3. Homepage: graph-layout.json existuje (pro NetworkCanvasMini)
 *   4. /raperi/: existuje ≥1 artist entita s outbound (HAS_GENRE, ORIGINATES_FROM)
 *   5. /raperi/: artisti mají image (getArtistImage) — aspoň někteří
 *   6. /lokality/: existují location entity
 *   7. /lokality/: lokality mají rapperCount (kolik artistů na ně ukazuje)
 *
 * Run with: node --test --import=tsx scripts/pages-render.test.ts
 */

import { describe, it } from "node:test";
import assert from "node:assert";
import { readFileSync, existsSync } from "node:fs";
import { join } from "node:path";

const ROOT = process.cwd();
const CACHE_DIR = join(ROOT, ".content-cache");

function readJson(name: string): any {
  const p = join(CACHE_DIR, name);
  assert.ok(existsSync(p), `Cache file missing: ${name}`);
  return JSON.parse(readFileSync(p, "utf-8"));
}

describe("Pages render after rebuild (D2)", () => {
  it("homepage: cache has all entity types", () => {
    const entities = readJson("entities.json");
    const types = new Set(Object.values(entities).map((e: any) => e.type));
    for (const t of ["artist", "album", "track", "location", "label", "genre"]) {
      assert.ok(types.has(t), `Missing entity type for homepage: ${t}`);
    }
  });

  it("homepage: graph.json has edges (for trending/connectivity)", () => {
    const graph = readJson("graph.json");
    assert.ok(Array.isArray(graph), "graph.json should be an array");
    assert.ok(graph.length > 0, "graph.json has no edges — homepage trending would be empty");
  });

  it("homepage: graph-layout.json exists (for NetworkCanvasMini)", () => {
    const p = join(CACHE_DIR, "graph-layout.json");
    assert.ok(existsSync(p), "graph-layout.json missing — NetworkCanvasMini would fail");
    const layout = JSON.parse(readFileSync(p, "utf-8"));
    assert.ok(Array.isArray(layout.nodes) && layout.nodes.length > 0, "graph-layout has no nodes");
  });

  it("/raperi/: at least one artist with outbound relations", () => {
    const entities = readJson("entities.json");
    const artists = Object.values(entities).filter((e: any) => e.type === "artist");
    assert.ok(artists.length > 0, "No artist entities — /raperi/ would be empty");

    const withGenre = artists.filter((a: any) => (a.outbound?.HAS_GENRE ?? []).length > 0);
    const withOrigin = artists.filter((a: any) => (a.outbound?.ORIGINATES_FROM ?? []).length > 0);
    assert.ok(withGenre.length > 0, "No artist has HAS_GENRE — genre filter would be empty");
    assert.ok(withOrigin.length > 0, "No artist has ORIGINATES_FROM — location filter would be empty");
  });

  it("/raperi/: some artists have images (getArtistImage)", () => {
    const entities = readJson("entities.json");
    const artists = Object.values(entities).filter((e: any) => e.type === "artist");
    const withImage = artists.filter((a: any) => Boolean(a.image));
    // Not all artists need images, but at least a few should have them
    assert.ok(withImage.length > 0, "No artist has an image — /raperi/ grid would be all placeholders");
  });

  it("/lokality/: location entities exist", () => {
    const entities = readJson("entities.json");
    const locations = Object.values(entities).filter((e: any) => e.type === "location");
    assert.ok(locations.length > 0, "No location entities — /lokality/ would be empty");
  });

  it("/lokality/: locations have rapperCount (artists pointing to them)", () => {
    const entities = readJson("entities.json");
    const locations = Object.values(entities).filter((e: any) => e.type === "location");

    // Replicate createListingPage rapperCount logic: count artist_ entities
    // whose extraMeta.origin/city matches the location title
    const rapperCounts: Record<string, number> = {};
    for (const e of Object.values(entities)) {
      if (!String(e.id).startsWith("artist_")) continue;
      const em = e.extraMeta ?? {};
      const origin = em.origin || em.city;
      if (origin) rapperCounts[origin] = (rapperCounts[origin] ?? 0) + 1;
    }

    const withRappers = locations.filter((l: any) => (rapperCounts[l.title] ?? 0) > 0);
    assert.ok(withRappers.length > 0, "No location has rapperCount — /lokality/ would show all zeros");
  });

  it("homepage: labels have artists (via SIGNED_TO or RELEASED_BY)", () => {
    const entities = readJson("entities.json");
    const graph = readJson("graph.json");
    const artistByLabel: Record<string, number> = {};
    for (const e of graph) {
      if (e.relation === "SIGNED_TO" || e.relation === "RELEASED_BY") {
        const fromEntity = entities[e.from];
        if (fromEntity && fromEntity.type === "artist") {
          artistByLabel[e.to] = (artistByLabel[e.to] ?? 0) + 1;
        }
      }
    }
    const labelsWithArtists = Object.keys(artistByLabel).filter(
      (id) => entities[id] && artistByLabel[id] > 0,
    );
    assert.ok(
      labelsWithArtists.length > 0,
      "No label has artists via SIGNED_TO/RELEASED_BY — DiscoverScene labels would be empty",
    );
  });
});
