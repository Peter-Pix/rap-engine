import type { MetadataRoute } from "next";
import { readEntities } from "@/lib/content/cache-reader";
import { TYPE_ROUTE_MAP, type EntityType } from "@/lib/content/constants";

/**
 * Dynamický sitemap.xml pro 4rap.cz.
 *
 * Generuje se z cache (.content-cache/entities.json) — žádný FS scan v runtime,
 * protože cache je build-time artefakt a statický import by ho rozbil.
 *
 * Tier-based priority (per HEARTBEAT.md):
 *   1.0 — homepage
 *   0.9 — artist, album, track (core entity, nejvíce navštěvované)
 *   0.8 — label, collective, scene
 *   0.7 — genre, style, theme, mood, location, producer
 *   0.6 — article, event
 *   0.5 — listing pages (/raperi, /alba, atd.)
 *
 * Vynecháváme:
 *   - Draft entity (status: draft, isStub: true) — noindex v meta → nedává smysl
 *     je posílat do sitemap
 *
 * changefreq + lastmod:
 *   - lastmod: publishedAt || updatedAt || dnes
 *   - changefreq: artist/album = weekly, zbytek = monthly
 */

const BASE_URL = "https://4rap.cz";

const TIER_PRIORITY: Record<EntityType, number> = {
  artist: 0.9,
  album: 0.9,
  track: 0.9,
  label: 0.8,
  collective: 0.8,
  scene: 0.8,
  genre: 0.7,
  style: 0.7,
  theme: 0.7,
  mood: 0.7,
  location: 0.7,
  producer: 0.7,
  article: 0.6,
  event: 0.6,
};

const TIER_CHANGEFREQ: Record<EntityType, "weekly" | "monthly"> = {
  artist: "weekly",
  album: "weekly",
  track: "weekly",
  label: "monthly",
  collective: "monthly",
  scene: "monthly",
  genre: "monthly",
  style: "monthly",
  theme: "monthly",
  mood: "monthly",
  location: "monthly",
  producer: "monthly",
  article: "monthly",
  event: "weekly",
};

function isIndexable(entity: any): boolean {
  const em = entity.extraMeta ?? {};
  if (em.status === "draft") return false;
  if (em.isStub === true) return false;
  return true;
}

function lastMod(entity: any): string {
  // ISO 8601, bez času (sitemap stačí datum)
  const ts = entity.updatedAt || entity.publishedAt || new Date().toISOString();
  try {
    return new Date(ts).toISOString().slice(0, 10);
  } catch {
    return new Date().toISOString().slice(0, 10);
  }
}

function entityUrl(entity: any): string {
  const type = entity.type as EntityType;
  const prefix = TYPE_ROUTE_MAP[type] ?? `/${type}`;
  return `${BASE_URL}${prefix}/${entity.slug}`;
}

export default function sitemap(): MetadataRoute.Sitemap {
  const entities = readEntities() ?? {};
  const today = new Date().toISOString().slice(0, 10);

  // ── 1. Homepage + listing pages (stabilní, ne z cache) ─────────────
  const staticRoutes: MetadataRoute.Sitemap = [
    {
      url: `${BASE_URL}/`,
      lastModified: today,
      changeFrequency: "daily",
      priority: 1.0,
    },
    {
      url: `${BASE_URL}/mapa`,
      lastModified: today,
      changeFrequency: "weekly",
      priority: 0.8,
    },
    // Listing pages
    { url: `${BASE_URL}/raperi`, lastModified: today, changeFrequency: "weekly", priority: 0.5 },
    { url: `${BASE_URL}/alba`, lastModified: today, changeFrequency: "weekly", priority: 0.5 },
    { url: `${BASE_URL}/skladby`, lastModified: today, changeFrequency: "weekly", priority: 0.5 },
    { url: `${BASE_URL}/labely`, lastModified: today, changeFrequency: "monthly", priority: 0.5 },
    { url: `${BASE_URL}/kolektivy`, lastModified: today, changeFrequency: "monthly", priority: 0.5 },
    { url: `${BASE_URL}/zanry`, lastModified: today, changeFrequency: "monthly", priority: 0.5 },
    { url: `${BASE_URL}/styly`, lastModified: today, changeFrequency: "monthly", priority: 0.5 },
    { url: `${BASE_URL}/temata`, lastModified: today, changeFrequency: "monthly", priority: 0.5 },
    { url: `${BASE_URL}/nalady`, lastModified: today, changeFrequency: "monthly", priority: 0.5 },
    { url: `${BASE_URL}/sceny`, lastModified: today, changeFrequency: "monthly", priority: 0.5 },
    { url: `${BASE_URL}/lokality`, lastModified: today, changeFrequency: "monthly", priority: 0.5 },
    { url: `${BASE_URL}/producenti`, lastModified: today, changeFrequency: "monthly", priority: 0.5 },
    { url: `${BASE_URL}/clanky`, lastModified: today, changeFrequency: "weekly", priority: 0.5 },
    { url: `${BASE_URL}/akce`, lastModified: today, changeFrequency: "weekly", priority: 0.5 },
  ];

  // ── 2. Entity routes (z cache, přeskoč drafty) ─────────────────────
  const entityRoutes: MetadataRoute.Sitemap = [];

  for (const entity of Object.values(entities)) {
    if (!entity || !entity.type || !entity.slug) continue;
    if (!isIndexable(entity)) continue;

    const type = entity.type as EntityType;
    const priority = TIER_PRIORITY[type];
    if (priority == null) continue; // neznámý typ → přeskoč

    entityRoutes.push({
      url: entityUrl(entity),
      lastModified: lastMod(entity),
      changeFrequency: TIER_CHANGEFREQ[type],
      priority,
    });
  }

  return [...staticRoutes, ...entityRoutes];
}
