/**
 * Tests for graph-lastmod.ts
 * Run with: node --test --import=tsx src/lib/indexation/__tests__/graph-lastmod.test.ts
 */

import { describe, it } from "node:test";
import assert from "node:assert";
import { computeGraphLastMod, buildGraphLastModMap } from "../graph-lastmod";

const baseEntity = {
  id: "artist_a",
  type: "artist",
  slug: "a",
  title: "A",
  description: "",
  content: "",
  outbound: {},
};

describe("computeGraphLastMod", () => {
  it("returns own updatedAt when no links", () => {
    const all: any = {
      artist_a: { ...baseEntity, updatedAt: "2024-06-01" },
    };
    assert.strictEqual(computeGraphLastMod(all.artist_a, all), "2024-06-01");
  });

  it("picks the newest date from linked entities", () => {
    const all: any = {
      artist_a: {
        ...baseEntity,
        updatedAt: "2024-01-01",
        outbound: { HAS_ALBUM: ["album_x"] },
      },
      album_x: {
        id: "album_x",
        type: "album",
        slug: "x",
        title: "X",
        description: "",
        content: "",
        outbound: {},
        updatedAt: "2024-12-25",
      },
    };
    assert.strictEqual(computeGraphLastMod(all.artist_a, all), "2024-12-25");
  });

  it("falls back to publishedAt when updatedAt is missing", () => {
    const all: any = {
      artist_a: {
        ...baseEntity,
        publishedAt: "2024-03-15",
        outbound: {},
      },
    };
    assert.strictEqual(computeGraphLastMod(all.artist_a, all), "2024-03-15");
  });

  it("ignores non-temporal edge types", () => {
    const all: any = {
      artist_a: {
        ...baseEntity,
        updatedAt: "2024-01-01",
        outbound: { HAS_GENRE: ["genre_trap"], HAS_STYLE: ["style_old"] },
      },
      genre_trap: {
        id: "genre_trap",
        type: "genre",
        slug: "trap",
        title: "Trap",
        description: "",
        content: "",
        outbound: {},
        updatedAt: "2024-12-31",
      },
    };
    // Genre updatedAt is ignored (non-temporal edge)
    assert.strictEqual(computeGraphLastMod(all.artist_a, all), "2024-01-01");
  });
});

describe("buildGraphLastModMap", () => {
  it("produces a map for every entity", () => {
    const all: any = {
      a: { ...baseEntity, id: "a", updatedAt: "2024-01-01" },
      b: { ...baseEntity, id: "b", updatedAt: "2024-06-01" },
    };
    const map = buildGraphLastModMap(all);
    assert.strictEqual(map.get("a"), "2024-01-01");
    assert.strictEqual(map.get("b"), "2024-06-01");
  });
});
