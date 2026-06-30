/**
 * Tests for sitemap-generator.ts
 * Run with: node --test --import=tsx src/lib/indexation/__tests__/sitemap-generator.test.ts
 */

import { describe, it } from "node:test";
import assert from "node:assert";
import {
  scoredEntityToEntry,
  generateSitemapEntries,
  sliceSitemap,
  STATIC_ROUTES,
} from "../sitemap-generator";
import { IndexationState } from "../types";

describe("scoredEntityToEntry", () => {
  const baseScored = {
    entity: {
      id: "artist_a",
      type: "artist",
      slug: "a",
      title: "Artist A",
      description: "Desc",
      image: null,
      outbound: {},
    } as any,
    signals: {} as any,
    seoScore: 85,
    state: IndexationState.AUTHORITATIVE,
    graphUpdatedAt: "2024-06-15",
  };

  it("returns null for non-AUTHORITATIVE", () => {
    assert.strictEqual(
      scoredEntityToEntry({ ...baseScored, state: IndexationState.INDEXABLE }),
      null
    );
    assert.strictEqual(
      scoredEntityToEntry({ ...baseScored, state: IndexationState.CANDIDATE }),
      null
    );
    assert.strictEqual(
      scoredEntityToEntry({ ...baseScored, state: IndexationState.NOINDEX }),
      null
    );
  });

  it("produces a valid entry for AUTHORITATIVE", () => {
    const entry = scoredEntityToEntry(baseScored);
    assert.notStrictEqual(entry, null);
    assert.strictEqual(entry!.url, "https://4rap.cz/raperi/a");
    assert.strictEqual(entry!.priority, 0.9);
    assert.strictEqual(entry!.changeFrequency, "weekly");
    assert.strictEqual(entry!.lastModified, "2024-06-15");
  });

  it("includes image for artist with image", () => {
    const scored = {
      ...baseScored,
      entity: {
        ...baseScored.entity,
        extraMeta: { profileImageUrl: "/images/artists/a.webp" },
      },
    };
    const entry = scoredEntityToEntry(scored);
    assert.strictEqual(entry!.images!.length, 1);
    assert.ok(entry!.images![0].loc.includes("/images/artists/a.webp"));
  });
});

describe("generateSitemapEntries", () => {
  it("includes static routes plus AUTHORITATIVE entities", () => {
    const scored = [
      {
        entity: {
          id: "artist_a",
          type: "artist",
          slug: "a",
          title: "A",
          description: "",
          image: null,
          outbound: {},
        },
        signals: {} as any,
        seoScore: 85,
        state: IndexationState.AUTHORITATIVE,
        graphUpdatedAt: "2024-06-15",
      },
      {
        entity: {
          id: "artist_b",
          type: "artist",
          slug: "b",
          title: "B",
          description: "",
          image: null,
          outbound: {},
        },
        signals: {} as any,
        seoScore: 30,
        state: IndexationState.NOINDEX,
        graphUpdatedAt: "2024-06-15",
      },
    ];
    const entries = generateSitemapEntries(scored as any);
    const staticCount = STATIC_ROUTES.length;
    assert.strictEqual(entries.length, staticCount + 1); // +1 only artist_a
    assert.ok(entries.some((e) => e.url.includes("/raperi/a")));
    assert.strictEqual(entries.some((e) => e.url.includes("/raperi/b")), false);
  });
});

describe("sliceSitemap", () => {
  it("groups entities into named slices", () => {
    const scored = [
      {
        entity: { type: "artist", slug: "a", title: "A" },
        state: IndexationState.AUTHORITATIVE,
      },
      {
        entity: { type: "album", slug: "b", title: "B" },
        state: IndexationState.AUTHORITATIVE,
      },
      {
        entity: { type: "genre", slug: "c", title: "C" },
        state: IndexationState.AUTHORITATIVE,
      },
      {
        entity: { type: "article", slug: "d", title: "D" },
        state: IndexationState.INDEXABLE, // not authoritative -> excluded
      },
    ];
    const slices = sliceSitemap(scored as any);
    assert.strictEqual(slices.get("artists")?.length, 1);
    assert.strictEqual(slices.get("albums")?.length, 1);
    assert.strictEqual(slices.get("taxonomy")?.length, 1);
    assert.strictEqual(slices.get("content")?.length ?? 0, 0);
  });
});
