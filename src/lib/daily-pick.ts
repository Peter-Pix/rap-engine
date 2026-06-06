/**
 * daily-pick.ts
 *
 * SSR-safe deterministický náhodný výběr seedovaný datem.
 * Každý den se seed změní → každý den jiný výběr.
 *
 * Použitý PRNG: mulberry32 (deterministický, rychlý, bez allocation).
 */

/** Mulberry32 – simple seeded PRNG, vrací [0..1) */
function mulberry32(seed: number): () => number {
  return () => {
    seed |= 0
    seed = (seed + 0x6d2b79f5) | 0
    let t = Math.imul(seed ^ (seed >>> 15), 1 | seed)
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}

/** Vytvoří seed z ISO data (YYYY-MM-DD) */
function dateSeed(dateStr: string): number {
  let hash = 0
  for (let i = 0; i < dateStr.length; i++) {
    const ch = dateStr.charCodeAt(i)
    hash = ((hash << 5) - hash) + ch
    hash |= 0 // convert to 32bit int
  }
  return hash
}

/** Vrátí dnešní datum jako YYYY-MM-DD (podle server timezone) */
export function todayStr(): string {
  const d = new Date()
  const y = d.getFullYear()
  const m = String(d.getMonth() + 1).padStart(2, '0')
  const day = String(d.getDate()).padStart(2, '0')
  return `${y}-${m}-${day}`
}

/**
 * Fisher-Yates shuffle na kopii pole, seedovaný.
 * Vrací nové pole (nereaguje originál).
 */
export function seededShuffle<T>(arr: T[], seed: number): T[] {
  const copy = arr.slice()
  const rng = mulberry32(seed)
  for (let i = copy.length - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1))
    ;[copy[i], copy[j]] = [copy[j], copy[i]]
  }
  return copy
}

/**
 * Vybere `n` náhodných položek z pole, deterministicky podle seedu.
 * Pokud pole obsahuje méně než `n` položek, vrátí vše.
 */
export function pickDaily<T>(arr: T[], n: number, dateStr?: string): T[] {
  if (!arr?.length) return []
  const seed = dateSeed(dateStr ?? todayStr())
  const shuffled = seededShuffle(arr, seed)
  return shuffled.slice(0, Math.min(n, shuffled.length))
}

/**
 * Vybere 1 položku denně (pro featured rotaci).
 * Vrací null pokud je pole prázdné.
 */
export function pickDailyOne<T>(arr: T[], dateStr?: string): T | null {
  if (!arr?.length) return null
  return pickDaily(arr, 1, dateStr)[0] ?? null
}