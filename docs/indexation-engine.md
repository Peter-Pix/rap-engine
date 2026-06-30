# Indexation Engine — Architecture & Migration Guide

## Overview

The Indexation Engine replaces the legacy flat sitemap with a scored, stateful pipeline that determines which entities deserve search-engine visibility.

```
Entity (cache)
    ↓
SEO Analyzer  ──▶  signals (description, image, FAQ, schema, relations, ...)
    ↓
Indexation Engine  ──▶  seoScore (0–100) + IndexationState
    ↓
Sitemap Generator  ──▶  MetadataRoute.Sitemap
```

---

## File Structure

```
src/lib/indexation/
├── index.ts              # Public barrel export
├── types.ts              # IndexationState, SeoSignals, ScoredEntity, SitemapSlice
├── config.ts             # DEFAULT_CONFIG, createConfig(), validateConfig()
├── seo-score.ts          # extractSignals() + computeSeoScore()
├── graph-lastmod.ts      # computeGraphLastMod() + buildGraphLastModMap()
├── indexation-engine.ts  # runIndexationEngine() + gateByScore()
├── sitemap-generator.ts  # scoredEntityToEntry() + generateSitemapEntries() + sliceSitemap()
└── __tests__/
    ├── seo-score.test.ts
    ├── indexation-engine.test.ts
    ├── graph-lastmod.test.ts
    └── sitemap-generator.test.ts

src/lib/content/
├── cache-indexation.ts   # Build-time: writes indexation-state.json

src/app/
├── sitemap.ts            # Refactored: uses the engine
```

---

## IndexationState

| State | Meaning | robots | In sitemap |
|---|---|---|---|
| **DRAFT** | Under construction | noindex | No |
| **PRIVATE** | Explicit opt-out | noindex | No |
| **NOINDEX** | Force noindex (stub, draft, manual flag) | noindex | No |
| **CANDIDATE** | Scored but too low | noindex | No |
| **INDEXABLE** | Good enough for canonical | index,follow | No |
| **AUTHORITATIVE** | High quality — full inclusion | index,follow | **Yes** |

The state machine is deterministic. Same entity + same config → same state.

---

## SEO Scoring (0–100)

### Signals Extracted

| Signal | Normalisation | Full Score At |
|---|---|---|
| descriptionLength | `/ 160` | 160 chars |
| hasImage | boolean | any image |
| hasFaq | boolean | FAQ markdown or JSON-LD |
| hasSchema | boolean | non-stub, non-draft |
| relationCount | `/ 10` | 10 outbound edges |
| backlinkCount | `/ 5` | 5 inbound references |
| contentLength | `/ 2000` | 2000 chars |
| profileCompleteness | `/ 100` | 100% filled profile |

### Default Weights

```ts
{ description: 15, image: 10, faq: 5, schema: 10, relations: 25,
  backlinks: 15, content: 10, profile: 10 }
```

### Thresholds

```ts
{ candidate: 20, indexable: 40, authoritative: 70 }
```

- **< 20** → NOINDEX
- **20–39** → CANDIDATE (eligible but held back)
- **40–69** → INDEXABLE (canonical, not in sitemap)
- **≥ 70** → AUTHORITATIVE (included in sitemap)

---

## Graph-Aware lastModified

Instead of relying only on `entity.updatedAt`, the engine computes:

```
graphUpdatedAt = max(
  entity.updatedAt,
  newest linked album.updatedAt,
  newest linked track.updatedAt,
  newest linked article.updatedAt,
  newest linked label.updatedAt
)
```

Only follows temporal edge types (`HAS_ALBUM`, `BELONGS_TO_ALBUM`, `HAS_TRACK`, `PRODUCED_BY`, `FEATURES`, `RELEASED_BY`, `SIGNED_TO`, `PART_OF`). Genre/style/theme/mood edges are ignored — they rarely carry independent update timestamps.

---

## Build-Time Cache

The cache builder now emits `indexation-state.json` alongside the existing cache files:

```json
{
  "generatedAt": "2026-06-30T17:26:02.213Z",
  "summary": {
    "total": 1238,
    "authoritative": 108,
    "indexable": 583,
    "candidate": 432,
    "noindex": 108,
    "draft": 115,
    "avgScore": 40
  },
  "entities": [...]
}
```

The sitemap generator prefers this pre-computed file and falls back to live computation only if the cache slice is missing.

---

## Current Stats (after build)

| Metric | Count | % of Total |
|---|---|---|
| Total entities | 1,238 | 100% |
| AUTHORITATIVE (sitemap) | 108 | 8.7% |
| INDEXABLE | 583 | 47.1% |
| CANDIDATE | 432 | 34.9% |
| NOINDEX | 108 | 8.7% |
| DRAFT | 115 | 9.3% |
| Average SEO score | 40 | — |

---

## Multi-Sitemap Architecture (Future)

The `SITEMAP_SLICES` array defines how to split AUTHORITATIVE entities into named groups:

| Slice | Predicate | Priority | changefreq |
|---|---|---|---|
| artists | `type === "artist"` | 0.9 | weekly |
| albums | `type === "album"` | 0.9 | weekly |
| tracks | `type === "track"` | 0.9 | weekly |
| labels | type in label/collective/scene | 0.8 | monthly |
| taxonomy | genre/style/theme/mood/location/producer | 0.7 | monthly |
| content | article/event | 0.6 | weekly |

When the total sitemap exceeds 50,000 URLs, implement `app/sitemap-[name].ts` files that consume `sliceSitemap()`.

---

## Backward Compatibility

| Aspect | Before | After |
|---|---|---|
| URL | `/sitemap.xml` | unchanged |
| Format | `MetadataRoute.Sitemap` | unchanged |
| Static routes | 16 hardcoded | 16 hardcoded (extracted to config) |
| Entity filtering | `isStub === true \|\| status === "draft"` | `IndexationState` gate |
| lastModified | `entity.updatedAt` | `graphUpdatedAt` |
| Image inclusion | none | `<image:loc>` for artists/albums |

The old `isStub` / `status` booleans are still read by the engine as hard overrides (`NOINDEX` / `DRAFT`). They are not replaced — they feed into the new state machine.

---

## Migration Strategy

### Step 1 — Code (✅ done)
- [x] Create `src/lib/indexation/` modules
- [x] Write `cache-indexation.ts` build-time extension
- [x] Refactor `src/app/sitemap.ts` to use the engine
- [x] Wire `buildIndexationCache()` into `scripts/build-content-cache.ts`
- [x] Add unit tests

### Step 2 — Build
```bash
npm run cache:build
# Verify .content-cache/indexation-state.json exists
```

### Step 3 — Verify sitemap
```bash
# Local dev
npm run dev
curl http://localhost:3000/sitemap.xml

# Count URLs
curl -s http://localhost:3000/sitemap.xml | grep "<loc>" | wc -l
# Expected: ~124 (16 static + 108 authoritative entities)
```

### Step 4 — Tune thresholds (optional)
If 108 AUTHORITATIVE feels too restrictive, lower the threshold in `config.ts`:

```ts
const PROD_THRESHOLDS = {
  candidate: 15,
  indexable: 30,
  authoritative: 55,   // was 70
};
```

Re-run cache build and observe summary changes.

### Step 5 — Deploy
```bash
git add -A
git commit -m "feat(indexation): modular SEO scoring engine"
git push origin main
```

---

## Unit Tests

Run with Node.js built-in test runner:

```bash
node --test --import=tsx \
  src/lib/indexation/__tests__/seo-score.test.ts \
  src/lib/indexation/__tests__/indexation-engine.test.ts \
  src/lib/indexation/__tests__/graph-lastmod.test.ts \
  src/lib/indexation/__tests__/sitemap-generator.test.ts
```

All tests are deterministic and require no external services.

---

## Determinism Guarantees

1. **No AI** — all scoring is arithmetic on extractable signals.
2. **No randomness** — no `Math.random()`, no hash-based jitter.
3. **Stable sort** — output is sorted by `type, slug` before emission.
4. **Config-driven** — same config + same input → same output, bit-for-bit.
5. **Signal normalisation** — caps at 1.0 to prevent outliers from dominating.

---

## Future Work

- [ ] `/sitemap-[name].xml` split (when >50k URLs)
- [ ] Image sitemap standalone file (`/sitemap-images.xml`)
- [ ] News sitemap for articles (`/sitemap-news.xml`)
- [ ] Config hot-reload via environment variables
- [ ] Dashboard: expose `indexation-state.json` summary in admin UI
