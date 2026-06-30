/**
 * Indexation Engine — Sitemap Generator
 *
 * Converts AUTHORITATIVE scored entities into XML-sitemap entries.
 * Supports image sitemap extensions and future multi-sitemap slicing.
 */

import type { MetadataRoute } from "next";
import { TYPE_ROUTE_MAP, type EntityType } from "@/lib/content/constants";
import { getArtistImage } from "@/lib/content/images";
import type {
  ScoredEntity,
  SitemapEntry,
  SitemapSlice,
} from "./types";
import { IndexationState } from "./types";

const BASE_URL = "https://4rap.cz";

// ─── Tier Configuration ───────────────────────────────────────────────────

/** Priority per entity type — same semantic as current sitemap. */
export const TYPE_PRIORITY: Record<EntityType, number> = {
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

/** Change frequency per entity type. */
export const TYPE_CHANGEFREQ: Record<EntityType, "daily" | "weekly" | "monthly"> = {
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

// ─── Static Routes ────────────────────────────────────────────────────────

export interface StaticRouteConfig {
  url: string;
  priority: number;
  changeFrequency: "daily" | "weekly" | "monthly";
}

/** Stable pages that always appear in the sitemap. */
export const STATIC_ROUTES: StaticRouteConfig[] = [
  { url: `${BASE_URL}/`, priority: 1.0, changeFrequency: "daily" },
  { url: `${BASE_URL}/mapa`, priority: 0.8, changeFrequency: "weekly" },
  // Listing pages
  { url: `${BASE_URL}/raperi`, priority: 0.5, changeFrequency: "weekly" },
  { url: `${BASE_URL}/alba`, priority: 0.5, changeFrequency: "weekly" },
  { url: `${BASE_URL}/skladby`, priority: 0.5, changeFrequency: "weekly" },
  { url: `${BASE_URL}/labely`, priority: 0.5, changeFrequency: "monthly" },
  { url: `${BASE_URL}/kolektivy`, priority: 0.5, changeFrequency: "monthly" },
  { url: `${BASE_URL}/zanry`, priority: 0.5, changeFrequency: "monthly" },
  { url: `${BASE_URL}/styly`, priority: 0.5, changeFrequency: "monthly" },
  { url: `${BASE_URL}/temata`, priority: 0.5, changeFrequency: "monthly" },
  { url: `${BASE_URL}/nalady`, priority: 0.5, changeFrequency: "monthly" },
  { url: `${BASE_URL}/sceny`, priority: 0.5, changeFrequency: "monthly" },
  { url: `${BASE_URL}/lokality`, priority: 0.5, changeFrequency: "monthly" },
  { url: `${BASE_URL}/producenti`, priority: 0.5, changeFrequency: "monthly" },
  { url: `${BASE_URL}/clanky`, priority: 0.5, changeFrequency: "weekly" },
  { url: `${BASE_URL}/akce`, priority: 0.5, changeFrequency: "weekly" },
];

// ─── Entity → SitemapEntry ──────────────────────────────────────────────

function entityUrl(type: EntityType, slug: string): string {
  const prefix = TYPE_ROUTE_MAP[type] ?? `/${type}`;
  return `${BASE_URL}${prefix}/${slug}`;
}

function resolveImageUrl(entity: ScoredEntity["entity"]): string | null {
  // Artist images from the central image map
  if (entity.type === "artist") {
    const artistImg = getArtistImage(entity.slug);
    if (artistImg) {
      return artistImg.startsWith("http")
        ? artistImg
        : `${BASE_URL}${artistImg}`;
    }
  }

  // Album cover from entity.image
  if (entity.type === "album" && entity.image) {
    return entity.image.startsWith("http")
      ? entity.image
      : `${BASE_URL}${entity.image}`;
  }

  // Profile image from extraMeta
  const profileImg = (entity as any).extraMeta?.profileImageUrl;
  if (typeof profileImg === "string" && profileImg.length > 0) {
    return profileImg.startsWith("http")
      ? profileImg
      : `${BASE_URL}${profileImg}`;
  }

  return null;
}

/**
 * Convert a scored entity into a sitemap entry.
 * Returns `null` if the entity is not AUTHORITATIVE.
 */
export function scoredEntityToEntry(
  scored: ScoredEntity,
): SitemapEntry | null {
  if (scored.state !== IndexationState.AUTHORITATIVE) return null;

  const type = scored.entity.type as EntityType;
  const priority = TYPE_PRIORITY[type];
  const changefreq = TYPE_CHANGEFREQ[type];

  if (priority == null) return null; // unknown type

  const entry: SitemapEntry = {
    url: entityUrl(type, scored.entity.slug),
    lastModified: scored.graphUpdatedAt,
    changeFrequency: changefreq,
    priority,
  };

  // Image sitemap extension
  const imageUrl = resolveImageUrl(scored.entity);
  if (imageUrl) {
    entry.images = [
      {
        loc: imageUrl,
        caption: scored.entity.title,
      },
    ];
  }

  return entry;
}

// ─── Sitemap Assembly ─────────────────────────────────────────────────────

/**
 * Build the full sitemap array for Next.js MetadataRoute.Sitemap.
 *
 * @param scoredEntities All scored results from the engine
 */
export function generateSitemapEntries(
  scoredEntities: ScoredEntity[],
): MetadataRoute.Sitemap {
  const today = new Date().toISOString().slice(0, 10);

  // Static routes
  const staticEntries: MetadataRoute.Sitemap = STATIC_ROUTES.map((r) => ({
    url: r.url,
    lastModified: today,
    changeFrequency: r.changeFrequency,
    priority: r.priority,
  }));

  // Entity routes — only AUTHORITATIVE
  const entityEntries: MetadataRoute.Sitemap = [];
  for (const scored of scoredEntities) {
    const entry = scoredEntityToEntry(scored);
    if (entry) {
      entityEntries.push({
        url: entry.url,
        lastModified: entry.lastModified,
        changeFrequency: entry.changeFrequency,
        priority: entry.priority,
        ...(entry.images && entry.images.length > 0
          ? {
              images: entry.images.map((img) => img.loc),
            }
          : {}),
      });
    }
  }

  return [...staticEntries, ...entityEntries];
}

// ─── Multi-sitemap Slices (future-proof) ────────────────────────────────

/**
 * Pre-defined slice descriptors for splitting the sitemap by entity type.
 * Not wired up yet — but ready for the day the sitemap exceeds 50k URLs.
 */
export const SITEMAP_SLICES: SitemapSlice[] = [
  {
    name: "artists",
    predicate: (s) => s.entity.type === "artist",
    priorityBase: 0.9,
    changefreq: "weekly",
  },
  {
    name: "albums",
    predicate: (s) => s.entity.type === "album",
    priorityBase: 0.9,
    changefreq: "weekly",
  },
  {
    name: "tracks",
    predicate: (s) => s.entity.type === "track",
    priorityBase: 0.9,
    changefreq: "weekly",
  },
  {
    name: "labels",
    predicate: (s) =>
      s.entity.type === "label" ||
      s.entity.type === "collective" ||
      s.entity.type === "scene",
    priorityBase: 0.8,
    changefreq: "monthly",
  },
  {
    name: "taxonomy",
    predicate: (s) =>
      ["genre", "style", "theme", "mood", "location", "producer"].includes(
        s.entity.type,
      ),
    priorityBase: 0.7,
    changefreq: "monthly",
  },
  {
    name: "content",
    predicate: (s) =>
      s.entity.type === "article" || s.entity.type === "event",
    priorityBase: 0.6,
    changefreq: "weekly",
  },
];

/**
 * Split scored entities into named sitemap slices.
 * Useful for generating `/sitemap-[name].xml` files.
 */
export function sliceSitemap(
  scoredEntities: ScoredEntity[],
): Map<string, ScoredEntity[]> {
  const slices = new Map<string, ScoredEntity[]>();

  for (const scored of scoredEntities) {
    if (scored.state !== IndexationState.AUTHORITATIVE) continue;

    for (const slice of SITEMAP_SLICES) {
      if (slice.predicate(scored)) {
        const list = slices.get(slice.name) ?? [];
        list.push(scored);
        slices.set(slice.name, list);
        break; // one entity → one slice
      }
    }
  }

  return slices;
}
