/**
 * Sitemap — Indexation Engine Integration
 *
 * Replaces the legacy flat sitemap with a pipeline-driven approach:
 *
 *   Cache → SEO Analyzer → Indexation Engine → Sitemap Generator
 *
 * Only AUTHORITATIVE entities (seoScore ≥ 70 by default) are included.
 * Graph-aware lastModified ensures freshness when linked content changes.
 *
 * Backward compatibility: the public URL `/sitemap.xml` is unchanged.
 * Future multi-sitemap splitting is supported via the slice API.
 *
 * Performance: prefers pre-computed `indexation-state.json` (build time).
 * Falls back to live computation if the cache slice is missing.
 */

import type { MetadataRoute } from "next";
import { readEntities, readInbound } from "@/lib/content/cache-reader";
import { readIndexationCache } from "@/lib/content/cache-indexation";
import {
  runIndexationEngine,
  generateSitemapEntries,
} from "@/lib/indexation";
import type { ScoredEntity } from "@/lib/indexation";

const BASE_URL = "https://4rap.cz";

export default function sitemap(): MetadataRoute.Sitemap {
  const entities = readEntities();
  const inbound = readInbound();

  if (!entities || !inbound) {
    // Cache not built — return only static routes to avoid build failure
    const today = new Date().toISOString().slice(0, 10);
    return [
      { url: `${BASE_URL}/`, lastModified: today, changeFrequency: "daily", priority: 1.0 },
      { url: `${BASE_URL}/mapa`, lastModified: today, changeFrequency: "weekly", priority: 0.8 },
    ];
  }

  // Prefer pre-computed indexation state (fast path)
  const cached = readIndexationCache();
  let scored: ScoredEntity[];

  if (cached) {
    // Re-hydrate lightweight scored entities from the build cache
    scored = cached.entities.map((c) => {
      const entity = entities[c.id];
      return {
        entity,
        signals: c.signals,
        seoScore: c.seoScore,
        state: c.state as import("@/lib/indexation").IndexationState,
        graphUpdatedAt: c.graphUpdatedAt,
      };
    }).filter((s): s is ScoredEntity => s.entity != null);
  } else {
    // Fallback: compute at request time (slower, but safe)
    const result = runIndexationEngine(entities, inbound);
    scored = result.scored;
  }

  // Generate sitemap entries from AUTHORITATIVE entities
  return generateSitemapEntries(scored);
}
