import path from "node:path";

/** Root directory where all entity folders live — flat, single-level */
export const CONTENT_ROOT = path.join(process.cwd(), "content", "entities");

/** All supported entity types as a const tuple */
export const ENTITY_TYPES = [
  "artist",
  "album",
  "track",
  "genre",
  "style",
  "theme",
  "mood",
  "scene",
  "label",
  "location",
  "article",
  "collective",
  "producer",
  "event",
] as const;

/** Union of all supported entity types */
export type EntityType = (typeof ENTITY_TYPES)[number];

// ─── URL Route Mapping ────────────────────────────────────────────────────

/**
 * Maps each entity type to its Czech URL prefix.
 * Used by the cache builder to generate `routes.json` and by the routing
 * layer to resolve `[type]/[slug]` → entity ID.
 */
export const TYPE_ROUTE_MAP: Record<EntityType, string> = {
  artist: "/raperi",
  album: "/alba",
  track: "/skladby",
  genre: "/zanry",
  style: "/styly",
  theme: "/temata",
  mood: "/nalady",
  scene: "/sceny",
  label: "/labely",
  location: "/lokality",
  article: "/clanky",
  collective: "/kolektivy",
  producer: "/producenti",
  event: "/akce",
} as const;
