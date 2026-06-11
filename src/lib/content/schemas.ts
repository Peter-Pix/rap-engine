import { z } from "zod";
import { ENTITY_TYPES, type EntityType } from "./constants";

// ─── Base Metadata ────────────────────────────────────────────────────────

/**
 * Every entity carries `meta.json` with this exact shape.
 * `id` is the canonical identity (folder name).
 * `slug` is the URL-friendly variant.
 */
export const BaseMetaSchema = z.object({
  id: z.string().min(1),
  type: z.enum(ENTITY_TYPES),
  slug: z.string().min(1),
  title: z.string().min(1),
  description: z.string().default(""),
  /** @example "2024-01-15" */
  publishedAt: z.string().optional(),
  /** @example "2024-06-01" */
  updatedAt: z.string().optional(),
});

export type BaseMeta = z.infer<typeof BaseMetaSchema>;

// ─── Per-Type Meta (forward-compatible, currently same as base) ───────────

export const ArtistMetaSchema = BaseMetaSchema;
export const AlbumMetaSchema = BaseMetaSchema;
export const TrackMetaSchema = BaseMetaSchema;
export const GenreMetaSchema = BaseMetaSchema;
export const StyleMetaSchema = BaseMetaSchema;
export const ThemeMetaSchema = BaseMetaSchema;
export const MoodMetaSchema = BaseMetaSchema;
export const SceneMetaSchema = BaseMetaSchema;
export const LabelMetaSchema = BaseMetaSchema;
export const LocationMetaSchema = BaseMetaSchema;
export const ArticleMetaSchema = BaseMetaSchema;
export const CollectiveMetaSchema = BaseMetaSchema;
export const ProducerMetaSchema = BaseMetaSchema;
export const EventMetaSchema = BaseMetaSchema;

/**
 * Map from entity `type` string → Zod schema for its `meta.json`.
 * Currently every type shares the same base schema; this map exists
 * so individual types can diverge later without refactoring callers.
 *
 * Keyed by `string` (not `EntityType`) so callers with runtime `string`
 * types don't need casts. The keys are guaranteed to cover all EntityType
 * values — if a new type is added to ENTITY_TYPES without a corresponding
 * entry here, `validateMeta` falls back to BaseMetaSchema.
 */
export const MetaSchemaMap: Record<string, z.ZodSchema> = {
  artist: ArtistMetaSchema,
  album: AlbumMetaSchema,
  track: TrackMetaSchema,
  genre: GenreMetaSchema,
  style: StyleMetaSchema,
  theme: ThemeMetaSchema,
  mood: MoodMetaSchema,
  scene: SceneMetaSchema,
  label: LabelMetaSchema,
  location: LocationMetaSchema,
  article: ArticleMetaSchema,
  collective: CollectiveMetaSchema,
  producer: ProducerMetaSchema,
  event: EventMetaSchema,
};

/**
 * Runtime-safe meta validator that picks the right schema (or falls back to base).
 */
export function validateMeta(type: string, data: unknown): BaseMeta {
  const schema = MetaSchemaMap[type] ?? BaseMetaSchema;
  return schema.parse(data) as BaseMeta;
}

// ─── Relations ────────────────────────────────────────────────────────────

/**
 * Outbound graph edges.
 * Every value is a `string[]` of target entity IDs.
 * The Zod schema provides a `default([])` so consumers never deal with undefined.
 *
 * Uses `.passthrough()` so unknown keys survive into the parsed object.
 * This allows the validator to warn about typos / unknown relation keys
 * before they are silently ignored by the normalizer.
 */
export const RelationsSchema = z.object({
  genres: z.array(z.string()).default([]),
  styles: z.array(z.string()).default([]),
  themes: z.array(z.string()).default([]),
  moods: z.array(z.string()).default([]),
  scenes: z.array(z.string()).default([]),
  locations: z.array(z.string()).default([]),
  labels: z.array(z.string()).default([]),
  artists: z.array(z.string()).default([]),
  albums: z.array(z.string()).default([]),
  tracks: z.array(z.string()).default([]),
  related: z.array(z.string()).default([]),
  influencedBy: z.array(z.string()).default([]),
  partOf: z.array(z.string()).default([]),
}).passthrough();

export type Relations = z.infer<typeof RelationsSchema>;
