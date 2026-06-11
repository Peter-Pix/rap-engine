import fs from "node:fs";
import { metaPath, mdxPath, relationsPath, listEntityIds } from "./paths";
import { RelationsSchema, validateMeta } from "./schemas";
import type { BaseMeta } from "./schemas";
import type { Relations } from "./schemas";
import type { Entity } from "./types";

// ─── Error types ──────────────────────────────────────────────────────────

export class EntityLoadError extends Error {
  constructor(
    public entityId: string,
    public reason: string,
  ) {
    super(`[${entityId}] ${reason}`);
    this.name = "EntityLoadError";
  }
}

// ─── Core loader ──────────────────────────────────────────────────────────

/**
 * Load a single entity from the filesystem.
 *
 * Reads 3 files:
 * - `meta.json`    → validated Zod-safe `BaseMeta`
 * - `relations.json` → validated Zod-safe `Relations` (defaults fill empty arrays)
 * - `entity.mdx`    → raw string (frontmatter + MDX body)
 *
 * Throws `EntityLoadError` on validation failure or missing `meta.json`.
 * Returns `null` when the entity folder simply doesn't exist.
 */
export function loadEntity(entityId: string): Entity | null {
  const mdxFile = mdxPath(entityId);
  const metaFile = metaPath(entityId);
  const relsFile = relationsPath(entityId);

  if (!fs.existsSync(metaFile)) {
    if (!fs.existsSync(mdxFile) && !fs.existsSync(relsFile)) {
      // Folder doesn't exist at all → null (not an error)
      return null;
    }
    // Folder exists but no meta.json → error
    throw new EntityLoadError(
      entityId,
      `meta.json not found at ${metaFile}`,
    );
  }

  // ── Parse meta.json ──────────────────────────────────────────────────
  let rawMeta: unknown;
  try {
    rawMeta = JSON.parse(fs.readFileSync(metaFile, "utf-8"));
  } catch (e) {
    throw new EntityLoadError(
      entityId,
      `Invalid JSON in meta.json: ${(e as Error).message}`,
    );
  }

  // Extract type first so we can use the per-type schema
  const type =
    typeof rawMeta === "object" && rawMeta !== null && "type" in rawMeta
      ? String((rawMeta as Record<string, unknown>).type)
      : "unknown";

  const meta: BaseMeta = validateMeta(type, rawMeta);

  // Guard: meta.id must match folder name (the source of truth)
  if (meta.id !== entityId) {
    throw new EntityLoadError(
      entityId,
      `meta.json.id "${meta.id}" does not match folder name "${entityId}"`,
    );
  }

  // ── Parse relations.json ─────────────────────────────────────────────
  let relations: Relations;
  if (fs.existsSync(relsFile)) {
    let rawRels: unknown;
    try {
      rawRels = JSON.parse(fs.readFileSync(relsFile, "utf-8"));
    } catch (e) {
      throw new EntityLoadError(
        entityId,
        `Invalid JSON in relations.json: ${(e as Error).message}`,
      );
    }
    relations = RelationsSchema.parse(rawRels);
  } else {
    // Missing relations.json → treat as empty relations
    relations = RelationsSchema.parse({});
  }

  // ── Read MDX ────────────────────────────────────────────────────────
  let mdx = "";
  if (fs.existsSync(mdxFile)) {
    mdx = fs.readFileSync(mdxFile, "utf-8");
  }

  return { id: entityId, meta, mdx, relations };
}

// ─── Batch loader ─────────────────────────────────────────────────────────

/**
 * Load all entities in `content/entities/`.
 *
 * Errors are **collected**, not thrown — a single broken entity doesn't stop
 * the entire build. The returned `errors` array lets the caller decide how
 * to handle them (log, fail CI, etc.).
 */
export interface BatchLoadResult {
  entities: Map<string, Entity>;
  errors: EntityLoadError[];
}

export function loadAllEntities(): BatchLoadResult {
  const ids = listEntityIds();
  const entities = new Map<string, Entity>();
  const errors: EntityLoadError[] = [];

  for (const id of ids) {
    try {
      const entity = loadEntity(id);
      if (entity) {
        entities.set(id, entity);
      }
    } catch (e) {
      if (e instanceof EntityLoadError) {
        errors.push(e);
      } else {
        errors.push(new EntityLoadError(id, `Unexpected error: ${String(e)}`));
      }
    }
  }

  return { entities, errors };
}
