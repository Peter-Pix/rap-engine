/**
 * Sdílené utility pro fázi 3 — doplňování obsahu skladeb.
 *
 * Tři pásy podle kvality dat:
 *   A = RM má AI analýzu + texty  → MDX, nejvyšší kvalita
 *   B = máme text (RM/LRCLIB)     → vlastní AI analýza → extraMeta
 *   C = jen holá metadata         → extraMeta, noindex zůstává
 */
import * as fs from "node:fs";
import * as path from "node:path";

export const ROOT = path.resolve(__dirname, "..", "..");
export const DATA = path.join(ROOT, ".data", "phase3");
export const ENTITIES = path.join(ROOT, "content", "entities");

export const RM_KEY = process.env.RAP_MONITOR_KEY || "b9d03638f3df4fe49ee5e75ab26d0803";
export const RM_BASE = "https://rap-monitor.base44.app/api";
export const OLLAMA_URL = "https://ollama.com/api/chat";
export const OLLAMA_MODEL = process.env.OLLAMA_MODEL || "deepseek-v4.1-flash";

export function ollamaKey(): string {
  if (process.env.OLLAMA_API_KEY) return process.env.OLLAMA_API_KEY;
  const env = path.join(ROOT, ".env.local");
  if (fs.existsSync(env)) {
    const m = fs.readFileSync(env, "utf8").match(/OLLAMA_API_KEY\s*=\s*["']?([^"'\n]+)/);
    if (m) return m[1].trim();
  }
  throw new Error("OLLAMA_API_KEY nenalezen (env ani .env.local)");
}

/** Normalizace pro párování názvů — bez diakritiky, bez feat/bracketů. */
export function norm(s: unknown): string {
  return String(s ?? "")
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/\(feat[^)]*\)/gi, "")
    .replace(/\[[^\]]*\]/g, "")
    .replace(/[^a-z0-9]+/g, " ")
    .trim();
}

export function slugify(s: string): string {
  return norm(s).replace(/\s+/g, "-");
}

export function ensureData(): void {
  fs.mkdirSync(DATA, { recursive: true });
}

export function readJson<T>(p: string): T {
  return JSON.parse(fs.readFileSync(p, "utf8")) as T;
}

export function writeJson(p: string, v: unknown): void {
  fs.mkdirSync(path.dirname(p), { recursive: true });
  fs.writeFileSync(p, JSON.stringify(v, null, 1) + "\n");
}

/** Načte naše entity z cache. */
export function loadEntities(): Record<string, any> {
  return readJson<Record<string, any>>(path.join(ROOT, ".content-cache", "entities.json"));
}

/** Vrátí primárního interpreta skladby (HAS_ARTIST → FEATURES → ""). */
export function artistOf(t: any, entities: Record<string, any>): string {
  const id = (t.outbound?.HAS_ARTIST ?? [])[0] ?? (t.outbound?.FEATURES ?? [])[0];
  return id ? entities[id]?.title ?? "" : "";
}

/** Stáhne všechny RM Song entity (stránkování po 500). */
export async function fetchRmSongs(): Promise<any[]> {
  const out: any[] = [];
  let skip = 0;
  for (;;) {
    const r = await fetch(`${RM_BASE}/entities/Song?limit=500&skip=${skip}`, {
      headers: { api_key: RM_KEY },
    });
    if (!r.ok) break;
    const j: any = await r.json();
    const arr = Array.isArray(j) ? j : (j.data ?? j.items ?? []);
    if (!arr.length) break;
    out.push(...arr);
    skip += 500;
    if (arr.length < 500) break;
  }
  return out;
}

/**
 * Hledá text skladby na LRCLIB. Vrací text nebo null.
 *
 * Rate-limit: LRCLIB občas vrací 503 — s exponential backoffem (2 pokusy)
 * a respektem k Retry-After. Volající by měl dodržovat malou souběžnost
 * (makeSemaphore) a rozestupy mezi requesty.
 */
export async function lrclibLyrics(
  artist: string,
  title: string,
  attempt = 1,
): Promise<{ lyrics: string | null; status: number }> {
  const url = `https://lrclib.net/api/search?artist_name=${encodeURIComponent(artist)}&track_name=${encodeURIComponent(title)}`;
  try {
    const r = await fetch(url, {
      headers: { "User-Agent": "rap-knowledge-graph/1.0 (4rap.cz)" },
    });
    if (r.status === 503 || r.status === 429) {
      if (attempt >= 2) return { lyrics: null, status: 503 };
      const retryAfter = Number(r.headers.get("retry-after")) || 5 * attempt;
      await sleep(retryAfter * 1000);
      return lrclibLyrics(artist, title, attempt + 1);
    }
    if (!r.ok) return { lyrics: null, status: r.status };
    const j: any = await r.json();
    if (!Array.isArray(j)) return { lyrics: null, status: r.status };
    // preferuj přesnou shodu interpreta, jinak první s dost textem
    const good = j.filter((x) => typeof x.plainLyrics === "string" && x.plainLyrics.length > 100);
    const exact = good.find((x) => norm(x.artistName) === norm(artist));
    return { lyrics: (exact ?? good[0])?.plainLyrics ?? null, status: r.status };
  } catch {
    return { lyrics: null, status: 0 };
  }
}

/** Jednoduchý semafor — max N souběžných LRCLIB requestů. */
export function makeSemaphore(limit: number) {
  let active = 0;
  const queue: Array<() => void> = [];
  const acquire = async () => {
    if (active < limit) { active++; return; }
    await new Promise<void>((res) => queue.push(res));
    active++;
  };
  const release = () => {
    active--;
    queue.shift()?.();
  };
  return { acquire, release };
}

export function sleep(ms: number): Promise<void> {
  return new Promise((r) => setTimeout(r, ms));
}
