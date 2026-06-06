/**
 * track-lookup.ts — Match tracklist entries to skladby pages
 * Uses fuzzy matching: normalize diacritics, lowercase, compare
 */

import { allSkladbas } from 'contentlayer/generated'

function normalize(str: string): string {
  return str
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, '')
    .trim()
}

/**
 * Find skladba slug for a track name + rapper combination
 */
export function findTrackSlug(
  trackName: string,
  rapperSlug: string
): string | null {
  const normalized = normalize(trackName)

  // Exact match by title AND rapperSlug
  const exact = allSkladbas.find(
    (s) => normalize(s.title) === normalized && s.rapperSlug === rapperSlug
  )
  if (exact) return exact.slug

  // Fuzzy match by same rapper
  const fuzzy = allSkladbas.filter((s) => s.rapperSlug === rapperSlug)
  const match = fuzzy.find(
    (s) =>
      normalized.includes(normalize(s.title)) ||
      normalize(s.title).includes(normalized)
  )
  if (match) return match.slug

  // Any rapper
  const anyRapper = allSkladbas.find((s) => {
    const sNorm = normalize(s.title)
    return sNorm === normalized || normalized.includes(sNorm) || sNorm.includes(normalized)
  })
  if (anyRapper) return anyRapper.slug

  return null
}

/**
 * Build a lookup map for an album's tracklist to slugs
 */
export function buildTrackMap(
  tracklist: string[],
  rapperSlug: string
): Map<string, string | null> {
  const map = new Map<string, string | null>()
  for (const track of tracklist) {
    map.set(track, findTrackSlug(track, rapperSlug))
  }
  return map
}