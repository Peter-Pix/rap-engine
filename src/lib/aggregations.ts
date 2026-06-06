// ═══════════════════════════════════════════════════════════════
// RAPENGINE — Programmatic SEO Aggregations
//
// Vrací filtrované entity pro agregační stránky.
// Každá funkce je čistá / deterministická — výsledky lze cachovat.
// ═══════════════════════════════════════════════════════════════

import { allRappers, allAlbums, allSkladbas, allLabels, allZanrs } from 'contentlayer/generated'


// ─── HELPER — SLUG NORMALIZATION ─────────────────────────
// Safety net pro inkonzistentní data v entity MDX souborech.
// "Hip Hop" / "hip hop" / "hip-hop" — všechno se zmatchne na "hip-hop"
function normalizeGenreSlug(g: string): string {
  return g
    .toLowerCase()
    .trim()
    .replace(/&/g, 'n')
    .replace(/\s+/g, '-')
}

function genreMatches(entityGenre: string[], targetSlug: string): boolean {
  const normalized = entityGenre.map(normalizeGenreSlug)
  return normalized.includes(targetSlug)
}

// ─── ŽÁNROVÉ AGREGACE ─────────────────────────────────────
export function rappersByZanr(zanrSlug: string) {
  return allRappers
    .filter((r) => r.genre && genreMatches(r.genre, zanrSlug))
    .sort((a, b) => a.title.localeCompare(b.title, 'cs'))
}

export function albumsByZanr(zanrSlug: string) {
  return allAlbums
    .filter((a) => a.genre && genreMatches(a.genre, zanrSlug))
    .sort((a, b) => b.year - a.year)
}

export function skladbyByZanr(zanrSlug: string) {
  return allSkladbas
    .filter((s) => s.genre && genreMatches(s.genre, zanrSlug))
    .sort((a, b) => (b.year || 0) - (a.year || 0))
}

// ─── LABELOVÉ AGREGACE ────────────────────────────────────
export function rappersByLabel(labelSlug: string) {
  const label = allLabels.find((l) => l.slug === labelSlug)
  if (!label) return []
  
  // 1) Via label.artists array
  const viaArtistsList = allRappers.filter((r) =>
    label.artists?.includes(r.slug)
  )
  
  // 2) Via rapper.label field (display name match — fallback)
  const labelDisplayNames = [label.title]
  const viaLabelField = allRappers.filter(
    (r) =>
      r.label &&
      labelDisplayNames.some((name) => r.label!.toLowerCase().includes(name.toLowerCase())) &&
      !viaArtistsList.find((x) => x.slug === r.slug)
  )
  
  return [...viaArtistsList, ...viaLabelField].sort((a, b) =>
    a.title.localeCompare(b.title, 'cs')
  )
}

export function albumsByLabel(labelSlug: string) {
  return allAlbums
    .filter((a) => a.labelSlug === labelSlug)
    .sort((a, b) => b.year - a.year)
}

// ─── RAPPER AGREGACE ──────────────────────────────────────
export function albumsByRapper(rapperSlug: string) {
  return allAlbums
    .filter((a) => a.rapperSlug === rapperSlug)
    .sort((a, b) => b.year - a.year)
}

export function allReleasesByRapper(rapperSlug: string) {
  return albumsByRapper(rapperSlug)
}

export function skladbyByRapper(rapperSlug: string) {
  // Primary artist + features
  return allSkladbas
    .filter(
      (s) =>
        s.rapperSlug === rapperSlug ||
        s.features?.includes(rapperSlug)
    )
    .sort((a, b) => (b.year || 0) - (a.year || 0))
}

// ─── STATS ────────────────────────────────────────────────
export function getAggregationStats(zanrSlug: string) {
  return {
    rappers: rappersByZanr(zanrSlug).length,
    albums: albumsByZanr(zanrSlug).length,
    skladby: skladbyByZanr(zanrSlug).length,
  }
}

export function getLabelStats(labelSlug: string) {
  return {
    rappers: rappersByLabel(labelSlug).length,
    albums: albumsByLabel(labelSlug).length,
  }
}

export function getRapperStats(rapperSlug: string) {
  return {
    albums: albumsByRapper(rapperSlug).length,
    skladby: skladbyByRapper(rapperSlug).length,
  }
}

// ─── ITEMLIST SCHEMA.ORG HELPER ───────────────────────────
export function buildItemListSchema(
  name: string,
  description: string,
  items: Array<{ title: string; canonicalUrl: string }>
) {
  return {
    '@context': 'https://schema.org',
    '@type': 'CollectionPage',
    name,
    description,
    mainEntity: {
      '@type': 'ItemList',
      numberOfItems: items.length,
      itemListElement: items.map((item, i) => ({
        '@type': 'ListItem',
        position: i + 1,
        url: item.canonicalUrl,
        name: item.title,
      })),
    },
  }
}
