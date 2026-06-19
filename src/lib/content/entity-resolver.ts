import type { UnifiedEntity, SourceFormat } from "./types";
import { loadEntity, loadAllEntities } from "./loader";
import { loadLegacyEntity, listLegacyEntities, type LegacyEntityRef } from "./legacy-loader";
import { entityExists } from "./paths";

// ─── Re-export ────────────────────────────────────────────────────────────

export { EntityLoadError } from "./loader";

// ─── Legacy-lookup indexes ────────────────────────────────────────────────

/**
 * Build two fast-lookup indexes from the legacy listing:
 * - bySlug:  `<type>/<slug>` → legacy dir+slug
 * - byId:    legacy-derived `id` → legacy dir+slug
 *
 * These are cheap to rebuild — called once per session.
 */
function buildLegacyIndexes(): {
  bySlug: Map<string, LegacyEntityRef>;
  byId: Map<string, LegacyEntityRef>;
} {
  const refs = listLegacyEntities();
  const bySlug = new Map<string, LegacyEntityRef>();
  const byId = new Map<string, LegacyEntityRef>();

  for (const ref of refs) {
    const slugKey = `${ref.type}/${ref.slug}`;
    // In case of duplicates, first wins (deterministic, stable across runs)
    if (!bySlug.has(slugKey)) bySlug.set(slugKey, ref);
    if (!byId.has(ref.id)) byId.set(ref.id, ref);
  }

  return { bySlug, byId };
}

// ─── Convert Entity → UnifiedEntity ───────────────────────────────────────

function toUnified(
  entity: ReturnType<typeof loadEntity>,
): UnifiedEntity | null {
  if (!entity) return null;
  return {
    id: entity.id,
    type: entity.meta.type,
    slug: entity.meta.slug,
    meta: entity.meta,
    content: entity.mdx,
    relations: entity.relations,
    sourceFormat: "graph-folder",
    profile: entity.profile,
  };
}

// ─── Resolver: ID-based ───────────────────────────────────────────────────

/**
 * Load an entity by its canonical `id`.
 *
 * Strategy:
 * 1. Try `content/entities/<id>/` (graph-folder format).
 * 2. If not found, resolve via legacy-derived ID → legacy loader.
 * 3. If still not found, return `null`.
 */
export function loadEntityById(id: string): UnifiedEntity | null {
  // 1. Try new graph-folder format first
  const result = toUnified(loadEntity(id));
  if (result) return result;

  // 2. Try legacy fallback via ID → legacy mapping
  const { byId } = buildLegacyIndexes();
  const legacyRef = byId.get(id);
  if (legacyRef) {
    return loadLegacyEntity(legacyRef.legacyDir, legacyRef.slug);
  }

  return null;
}

// ─── Resolver: slug-based ─────────────────────────────────────────────────

/**
 * Load an entity by type + slug.
 *
 * Strategy:
 * 1. Derive `id = {type}_{slug}` and try `loadEntity()` (graph-folder first).
 * 2. If not found, try legacy-lookup by `<type>/<slug>` directly.
 */
export function loadEntityBySlug(
  type: string,
  slug: string,
): UnifiedEntity | null {
  // 1. Try graph-folder format via derived id
  const id = `${type}_${slug}`;
  const graphResult = toUnified(loadEntity(id));
  if (graphResult) return graphResult;

  // 2. Legacy fallback by type/slug
  const { bySlug, byId } = buildLegacyIndexes();
  const legacyRef = bySlug.get(`${type}/${slug}`) ?? byId.get(id);
  if (legacyRef) {
    return loadLegacyEntity(legacyRef.legacyDir, legacyRef.slug);
  }

  return null;
}

// ─── Bulk listing ─────────────────────────────────────────────────────────

/**
 * List all entities across both formats.
 *
 * - Graph-folder entities take precedence over legacy when an ID conflict exists.
 * - Returns a deduplicated `Map<string, UnifiedEntity>` keyed by entity ID.
 */
export function listAllEntities(): Map<string, UnifiedEntity> {
  const result = new Map<string, UnifiedEntity>();

  // 1. Legacy entities first (loaded but will be overridden by graph-folder)
  const legacyRefs = listLegacyEntities();
  for (const ref of legacyRefs) {
    const entity = loadLegacyEntity(ref.legacyDir, ref.slug);
    if (entity) {
      result.set(entity.id, entity);
    }
  }

  // 2. Graph-folder entities override (prefer new format)
  const { entities } = loadAllEntities();
  for (const [id, entity] of entities) {
    result.set(id, {
      id: entity.id,
      type: entity.meta.type,
      slug: entity.meta.slug,
      meta: entity.meta,
      content: entity.mdx,
      relations: entity.relations,
      sourceFormat: "graph-folder",
      profile: entity.profile,
    });
  }

  return result;
}

// ─── Filtered listing ─────────────────────────────────────────────────────

/** List all entities of a given type (across both formats). */
export function listEntitiesByType(type: string): UnifiedEntity[] {
  const all = listAllEntities();
  return [...all.values()].filter((e) => e.type === type);
}

// ─── Resolve source format ────────────────────────────────────────────────

/**
 * Determine an entity's source format without loading the full entity.
 * Returns `null` when the entity doesn't exist in any format.
 */
export function resolveSourceFormat(id: string): SourceFormat | null {
  if (entityExists(id)) return "graph-folder";

  const { byId } = buildLegacyIndexes();
  if (byId.has(id)) return "legacy-flat";

  return null;
}
