/**
 * migration-mappers.ts
 *
 * Type-specific mapping rules for converting legacy flat-format entities
 * into the graph-folder format (`content/entities/<id>/`).
 *
 * Each legacy entity consists of:
 *   - `index.mdx`  → frontmatter + MDX body
 *   - `relations.json` → (optional) pre-existing relations
 *
 * The migration produces three files:
 *   - `meta.json`      → standard BaseMeta + type-specific extras
 *   - `relations.json`  → existing relations + frontmatter-derived edges
 *   - `entity.mdx`      → body with title heading stripped
 */

import type { BaseMeta, Relations } from "./schemas";
import type { UnifiedEntity } from "./types";
import { sanitiseId } from "./paths";

// ─── Frontmatter → Meta extras (per entity type) ──────────────────────────

/**
 * Extra frontmatter fields that go into `meta.json` beyond the standard
 * BaseMeta keys.  These are type-specific.
 *
 * All other non-standard frontmatter keys are silently dropped (they can
 * be re‑added later when per‑type meta schemas diverge).
 */
export const META_EXTRAS: Record<string, string[]> = {
  artist: ["realName", "active", "aliases"],
  album: ["year", "coverUrl"],
  track: ["duration", "trackNumber", "albumSlug"],
  genre: ["origin", "era"],
  style: [],
  theme: [],
  mood: [],
  scene: [],
  label: ["founded", "founder"],
  location: ["region", "country"],
  article: ["author", "category"],
  collective: ["founded", "members"],
  producer: ["realName"],
  event: ["date", "venue"],
};

// ─── Frontmatter → Relations mapping (per entity type) ────────────────────

/**
 * Maps legacy frontmatter keys → canonical relation keys for each entity type.
 *
 * When a frontmatter field matches one of these keys its value is added
 * to the target relation array in `relations.json`.
 *
 * Values are always treated as single strings; if the value contains commas
 * it's split into multiple targets.
 */
export const FM_TO_RELATION: Record<string, Record<string, string>> = {
  artist: {
    genre: "genres",
    genres: "genres",
    labelSlug: "labels",
    labels: "labels",
    relatedRappers: "artists",
    relatedArtists: "artists",
    relatedAlbums: "albums",
    albums: "albums",
    scenes: "scenes",
    scene: "scenes",
    moods: "moods",
    mood: "moods",
    styles: "styles",
    style: "styles",
    themes: "themes",
    theme: "themes",
    locations: "locations",
    location: "locations",
  },
  album: {
    artist: "artists",
    artistSlug: "artists",
    rapperSlug: "artists",
    labelSlug: "labels",
    labels: "labels",
    genre: "genres",
    genres: "genres",
    styles: "styles",
    style: "styles",
    moods: "moods",
    mood: "moods",
  },
  track: {
    artist: "artists",
    artistSlug: "artists",
    album: "albums",
    albumSlug: "albums",
    genre: "genres",
    genres: "genres",
    labelSlug: "labels",
    labels: "labels",
  },
  genre: {
    subgenres: "related",
    related: "related",
    influencedBy: "influencedBy",
    partOf: "partOf",
    parentGenre: "partOf",
  },
  style: {
    genres: "genres",
    related: "related",
  },
  theme: {
    related: "related",
  },
  mood: {
    related: "related",
  },
  scene: {
    locations: "locations",
    labels: "labels",
    artists: "artists",
    related: "related",
  },
  label: {
    artists: "artists",
    genres: "genres",
    scenes: "scenes",
    locations: "locations",
    related: "related",
  },
  location: {
    scenes: "scenes",
    labels: "labels",
    artists: "artists",
    related: "related",
  },
  article: {
    artists: "artists",
    albums: "albums",
    genres: "genres",
    labels: "labels",
    related: "related",
    themes: "themes",
  },
  collective: {
    artists: "artists",
    labels: "labels",
    genres: "genres",
    scenes: "scenes",
    related: "related",
  },
  producer: {
    artists: "artists",
    genres: "genres",
    labels: "labels",
    related: "related",
  },
  event: {
    artists: "artists",
    labels: "labels",
    locations: "locations",
    related: "related",
  },
};

// ─── Meta builder ─────────────────────────────────────────────────────────

/**
 * Build `meta.json` content from legacy frontmatter.
 *
 * Standard BaseMeta fields (title, slug, description, publishedAt, updatedAt)
 * are mapped 1:1.  Type-specific extras are pulled from `META_EXTRAS`.
 *
 * The `type` field from frontmatter is normalised through the same legacy
 * type map used in the loader.
 */
export function buildMeta(
  entity: UnifiedEntity,
  rawFm: Record<string, unknown>,
): Record<string, unknown> {
  const { meta: source } = entity;

  // Standard BaseMeta fields
  const result: Record<string, unknown> = {
    id: entity.id,
    type: entity.type,
    slug: entity.slug,
    title: source.title,
    description: source.description ?? "",
  };

  if (source.publishedAt) result.publishedAt = source.publishedAt;
  if (source.updatedAt) result.updatedAt = source.updatedAt;

  // Type-specific extras — read from raw frontmatter (not parsed BaseMeta)
  // because Zod strips unknown keys during validation.
  const extras = META_EXTRAS[entity.type] ?? [];
  for (const key of extras) {
    const value = rawFm[key];
    if (value !== undefined && value !== null && value !== "") {
      result[key] = String(value);
    }
  }

  return result;
}

// ─── Relations builder ────────────────────────────────────────────────────

/**
 * Split a comma‑separated frontmatter value into an array of trimmed slugs.
 */
function splitValues(raw: unknown): string[] {
  if (raw === undefined || raw === null || raw === "") return [];
  const str = String(raw);
  return str
    .split(",")
    .map((s) => s.trim())
    .filter((s) => s.length > 0);
}

/**
 * Build `relations.json` content for a migrated entity.
 *
 * Starts from the existing `entity.relations` (Zod‑parsed) and merges in
 * any frontmatter‑derived relation entries.
 *
 * Frontmatter‑derived values are *appended* (not replaced) so manually
 * authored `relations.json` takes precedence and isn't lost.
 */
export function buildRelations(
  entity: UnifiedEntity,
  rawFm: Record<string, unknown>,
): Record<string, string[]> {
  // Start with existing relations (clone)
  const rels: Record<string, string[]> = {};
  for (const [key, values] of Object.entries(entity.relations)) {
    if (Array.isArray(values)) {
      rels[key] = [...values];
    }
  }

  const mapper = FM_TO_RELATION[entity.type] ?? {};

  for (const [fmKey, relKey] of Object.entries(mapper)) {
    const fmValue = rawFm[fmKey];
    if (fmValue === undefined || fmValue === null || fmValue === "") continue;

    const values = splitValues(fmValue);
    if (values.length === 0) continue;

    // Ensure relation array exists
    if (!rels[relKey]) rels[relKey] = [];

    for (const v of values) {
      // If value looks like a slug (not an ID), keep as-is — the cache
      // builder resolves slugs to IDs at build time.
      if (!rels[relKey].includes(v)) {
        rels[relKey].push(v);
      }
    }
  }

  return rels;
}

// ─── MDX body cleanup ─────────────────────────────────────────────────────

/**
 * Strip the first `# Title` heading from MDX content if it matches the
 * entity title.  In the new format the title is rendered from meta.json,
 * so keeping it would produce a double heading.
 */
export function stripTitleHeading(content: string, title: string): string {
  // Pattern: optional whitespace/newline, then `# Title` possibly followed
  // by newline with more content.
  const escaped = title.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  const patterns = [
    // `# Title` on its own line (with optional trailing content)
    new RegExp(`^# ${escaped}\\s*\\n+`),
    // `# Title\n\n` with possible whitespace
    new RegExp(`^\\s*# ${escaped}\\s*\\n*`),
    // `# "Title"` (quoted)
    new RegExp(`^\\s*# ["']${escaped}["']\\s*\\n*`),
  ];

  for (const re of patterns) {
    const stripped = content.replace(re, "");
    if (stripped !== content) return stripped.trimStart();
  }

  return content;
}

// ─── Entity ID derivation ─────────────────────────────────────────────────

/**
 * Derive the entity ID from type + slug.
 * Pattern: `{type}_{slug}` → e.g. `artist_yzomandias`, `genre_trap`
 */
export function deriveEntityId(type: string, slug: string): string {
  const safe = sanitiseId(slug);
  if (!safe) throw new Error(`Cannot derive entity ID: empty slug for type "${type}"`);
  return `${type}_${safe}`;
}

// ─── Validity checks ──────────────────────────────────────────────────────

export interface MigrationError {
  entity: string;
  field: string;
  message: string;
}

/**
 * Lightweight pre‑flight check before writing.
 * Returns errors for missing required fields, invalid slugs, etc.
 */
export function validateForMigration(entity: UnifiedEntity): MigrationError[] {
  const errors: MigrationError[] = [];
  const label = `${entity.type}/${entity.slug}`;

  if (!entity.meta.title || entity.meta.title.trim().length === 0) {
    errors.push({ entity: label, field: "title", message: "Title is required" });
  }

  if (!entity.slug || entity.slug.trim().length === 0) {
    errors.push({ entity: label, field: "slug", message: "Slug is required" });
  } else if (!/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(entity.slug)) {
    errors.push({
      entity: label,
      field: "slug",
      message: `Invalid slug "${entity.slug}" — must be [a-z0-9] with dashes`,
    });
  }

  if (!entity.type || entity.type.trim().length === 0) {
    errors.push({ entity: label, field: "type", message: "Type is required" });
  }

  return errors;
}
