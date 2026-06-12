import type { UnifiedEntity } from "./types";
import { BaseMetaSchema, RelationsSchema, MetaSchemaMap } from "./schemas";
import { getRegistryEntry, RELATION_REGISTRY, validateRelationTarget } from "./relation-registry";
import { ENTITY_TYPES, TYPE_ROUTE_MAP, type EntityType } from "./constants";
import { listEntityIds, entityDir, mdxPath, metaPath, relationsPath } from "./paths";
import fs from "node:fs";
import { ZodError } from "zod";

// ─── Report types ──────────────────────────────────────────────────────────

export interface ValidationError {
  /** Entity ID this error relates to, or `null` for global/system errors */
  entityId: string | null;
  /** Machine-readable rule identifier */
  rule: string;
  /** Human-readable message */
  message: string;
  /** Optional file path where the issue was found */
  path?: string;
}

export interface ValidationWarning {
  entityId: string | null;
  rule: string;
  message: string;
  path?: string;
}

export interface ValidationReport {
  errors: ValidationError[];
  warnings: ValidationWarning[];
  /** `true` when zero errors exist (warnings don't block) */
  isValid: boolean;
  errorCount: number;
  warningCount: number;
}

// ─── Helpers ──────────────────────────────────────────────────────────────

const ISO_DATE_RE = /^\d{4}-\d{2}-\d{2}(T\d{2}:\d{2}:\d{2}.*)?$/;
const VALID_SLUG_RE = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;

function isValidDate(s: string): boolean {
  if (!ISO_DATE_RE.test(s)) return false;
  const d = new Date(s);
  return !isNaN(d.getTime());
}

/**
 * Strip YAML frontmatter from an MDX string.
 * Mirrors the logic in `mdx.tsx` — kept here to avoid coupling the
 * validator to the React renderer module.
 */
const FRONTMATTER_RE = /^---\n[\s\S]*?\n---\n?/;

function stripFrontmatter(mdx: string): string {
  return mdx.replace(FRONTMATTER_RE, "").trim();
}

// ─── 1. Graph-folder filesystem checks ────────────────────────────────────

/**
 * Scan `content/entities/` and validate that every entity folder has
 * the three required files: `entity.mdx`, `meta.json`, `relations.json`.
 *
 * This runs BEFORE entity loading — it catches missing files that would
 * cause `loadEntity()` to return null (silently skipping the entity).
 */
export function validateGraphFolderFiles(): {
  errors: ValidationError[];
  warnings: ValidationWarning[];
} {
  const errors: ValidationError[] = [];
  const warnings: ValidationWarning[] = [];
  const ids = listEntityIds();

  for (const id of ids) {
    // entity.mdx
    const mdx = mdxPath(id);
    if (!fs.existsSync(mdx)) {
      errors.push({
        entityId: id,
        rule: "MISSING_MDX",
        message: `Required file "entity.mdx" is missing`,
        path: mdx,
      });
    } else {
      const raw = fs.readFileSync(mdx, "utf-8");
      const body = stripFrontmatter(raw);
      if (!body) {
        errors.push({
          entityId: id,
          rule: "EMPTY_MDX",
          message: `entity.mdx has no content after stripping frontmatter`,
          path: mdx,
        });
      }
    }

    // meta.json
    const meta = metaPath(id);
    if (!fs.existsSync(meta)) {
      errors.push({
        entityId: id,
        rule: "MISSING_META",
        message: `Required file "meta.json" is missing`,
        path: meta,
      });
    } else {
      // ── Validate meta.json against BaseMetaSchema ────────────────
      // Catches zombie entities where the filesystem has a folder but
      // the meta.json is structurally invalid (e.g. bad `type` value
      // that Zod's enum would reject). Without this check, the entity
      // is silently dropped by loadEntity() and never appears in
      // any error report.
      let rawMeta: unknown;
      try {
        rawMeta = JSON.parse(fs.readFileSync(meta, "utf-8"));
      } catch (e) {
        errors.push({
          entityId: id,
          rule: "INVALID_META_JSON",
          message: `meta.json contains invalid JSON: ${(e as Error).message}`,
          path: meta,
        });
      }
      if (rawMeta !== undefined) {
        const result = BaseMetaSchema.safeParse(rawMeta);
        if (!result.success) {
          const zodError = result.error as ZodError;
          for (const issue of zodError.issues) {
            const field = issue.path.join(".");
            errors.push({
              entityId: id,
              rule: "INVALID_META",
              message: `meta.json: ${field ? `"${field}": ` : ""}${issue.message}`,
              path: meta,
            });
          }
        }
      }
    }

    // relations.json
    const rels = relationsPath(id);
    if (!fs.existsSync(rels)) {
      errors.push({
        entityId: id,
        rule: "MISSING_RELATIONS",
        message: `Required file "relations.json" is missing`,
        path: rels,
      });
    }
  }

  return { errors, warnings };
}

// ─── 2. Duplicate ID check ────────────────────────────────────────────────

export function checkDuplicateIds(
  entities: Map<string, UnifiedEntity>,
): ValidationError[] {
  const errors: ValidationError[] = [];

  // Check graph-folder IDs (filesystem-level duplicates)
  const graphIds = listEntityIds();
  const seenGraph = new Set<string>();
  for (const id of graphIds) {
    if (seenGraph.has(id)) {
      errors.push({
        entityId: id,
        rule: "DUPLICATE_ID",
        message: `Duplicate entity ID "${id}" in content/entities/ (two folders with the same name)`,
      });
    }
    seenGraph.add(id);
  }

  // Check legacy ID collisions — two legacy entities that produce the same
  // derived ID (e.g. two artists both with slug "test" → both "artist_test").
  // The resolver silently picks the first one; we flag the collision here.
  const legacyIds = new Map<string, string>(); // id → first entity's source info
  for (const [id, entity] of entities) {
    if (entity.sourceFormat !== "legacy-flat") continue;
    const existing = legacyIds.get(id);
    if (existing) {
      errors.push({
        entityId: id,
        rule: "DUPLICATE_ID",
        message: `Legacy entity ID "${id}" collides with another legacy entity (${existing}). One will be silently overridden by the resolver.`,
      });
    } else {
      legacyIds.set(id, `${entity.type}/${entity.slug}`);
    }
  }

  return errors;
}

// ─── 3. Duplicate slug within same type ───────────────────────────────────

export function checkDuplicateSlugs(
  entities: Map<string, UnifiedEntity>,
): ValidationError[] {
  const errors: ValidationError[] = [];
  const seen = new Map<string, string>(); // `${type}/${slug}` → first entity ID

  for (const [id, entity] of entities) {
    const key = `${entity.type}/${entity.slug}`;
    const existing = seen.get(key);
    if (existing) {
      errors.push({
        entityId: id,
        rule: "DUPLICATE_SLUG",
        message: `Slug "${entity.slug}" is already used by entity "${existing}" for type "${entity.type}"`,
      });
    } else {
      seen.set(key, id);
    }
  }

  return errors;
}

// ─── 4. Meta.json validation ──────────────────────────────────────────────

export function checkMetaValidity(
  entities: Map<string, UnifiedEntity>,
): { errors: ValidationError[]; warnings: ValidationWarning[] } {
  const errors: ValidationError[] = [];
  const warnings: ValidationWarning[] = [];

  for (const [id, entity] of entities) {
    // Validate against type-specific schema
    const schema = MetaSchemaMap[entity.type] ?? BaseMetaSchema;
    const result = schema.safeParse(entity.meta);

    if (!result.success) {
      const zodError = result.error as ZodError;
      for (const issue of zodError.issues) {
        const field = issue.path.join(".");
        errors.push({
          entityId: id,
          rule: "INVALID_META",
          message: `meta.json: ${field ? `"${field}": ` : ""}${issue.message}`,
          path:
            entity.sourceFormat === "graph-folder"
              ? metaPath(id)
              : undefined,
        });
      }
    }

    // Check that meta.id matches the entity's canonical id
    if (entity.meta.id !== id) {
      errors.push({
        entityId: id,
        rule: "ID_MISMATCH",
        message: `meta.json "id" field ("${entity.meta.id}") does not match entity ID ("${id}")`,
        path:
          entity.sourceFormat === "graph-folder" ? metaPath(id) : undefined,
      });
    }

    // Check slug format
    if (!VALID_SLUG_RE.test(entity.slug)) {
      errors.push({
        entityId: id,
        rule: "INVALID_SLUG_FORMAT",
        message: `Slug "${entity.slug}" contains invalid characters (only [a-z0-9-] allowed)`,
      });
    }

    // Check dates
    if (entity.meta.publishedAt && !isValidDate(entity.meta.publishedAt)) {
      errors.push({
        entityId: id,
        rule: "INVALID_DATE",
        message: `publishedAt "${entity.meta.publishedAt}" is not a valid ISO 8601 date`,
      });
    }
    if (entity.meta.updatedAt && !isValidDate(entity.meta.updatedAt)) {
      errors.push({
        entityId: id,
        rule: "INVALID_DATE",
        message: `updatedAt "${entity.meta.updatedAt}" is not a valid ISO 8601 date`,
      });
    }

    // Warnings
    if (!entity.meta.description || entity.meta.description.trim() === "") {
      warnings.push({
        entityId: id,
        rule: "EMPTY_DESCRIPTION",
        message: `Description is empty — entity will have no SEO description or preview text`,
      });
    }

    if (!entity.meta.publishedAt) {
      warnings.push({
        entityId: id,
        rule: "MISSING_PUBLISHED_AT",
        message: `No publishedAt date set`,
      });
    }
  }

  return { errors, warnings };
}

// ─── 5. Relations.json validation ─────────────────────────────────────────

export function checkRelationsValidity(
  entities: Map<string, UnifiedEntity>,
): { errors: ValidationError[]; warnings: ValidationWarning[] } {
  const errors: ValidationError[] = [];
  const warnings: ValidationWarning[] = [];

  for (const [id, entity] of entities) {
    // Validate against Zod schema (now with .passthrough() so unknown keys survive)
    const result = RelationsSchema.safeParse(entity.relations);

    if (!result.success) {
      const zodError = result.error as ZodError;
      for (const issue of zodError.issues) {
        const field = issue.path.join(".");
        errors.push({
          entityId: id,
          rule: "INVALID_RELATIONS",
          message: `relations.json: ${field ? `"${field}": ` : ""}${issue.message}`,
          path:
            entity.sourceFormat === "graph-folder"
              ? relationsPath(id)
              : undefined,
        });
      }
    }

    // Check for unknown relation keys (not in registry).
    // Because RelationsSchema now uses .passthrough(), unknown keys survive
    // into the parsed object and we can detect them here.
    const rawKeys = Object.keys(entity.relations);
    const knownKeys = new Set(RELATION_REGISTRY.map((e) => e.authoringKey));
    for (const key of rawKeys) {
      if (!knownKeys.has(key)) {
        warnings.push({
          entityId: id,
          rule: "UNKNOWN_RELATION_KEY",
          message: `relations.json contains unknown key "${key}" — not in relation registry. Data will be silently ignored. Known keys: [${[...knownKeys].join(", ")}]`,
        });
      }
    }
  }

  return { errors, warnings };
}

// ─── 6. Dangling relation targets ─────────────────────────────────────────

/**
 * Build a type→slug→id index for resolving legacy raw slugs.
 * Mirrors the logic in cache-builder.ts.
 */
function buildSlugIndex(
  entities: Map<string, UnifiedEntity>,
): Map<string, Map<string, string>> {
  const index = new Map<string, Map<string, string>>();
  for (const [id, entity] of entities) {
    const type = entity.meta.type;
    let typeMap = index.get(type);
    if (!typeMap) {
      typeMap = new Map();
      index.set(type, typeMap);
    }
    typeMap.set(entity.meta.slug, id);
  }
  return index;
}

/**
 * Resolve a raw target value to a canonical entity ID for validation.
 *
 * Strategy (mirrors cache-builder.ts resolveTargetId):
 * 1. If the value is already a known entity ID → return as-is.
 * 2. If the relation key has an `expectsType` constraint, try `{expectedType}_{raw}`.
 * 3. Fall back: try all known types for `{type}_{raw}`.
 * 4. If nothing matches, return `null` (dangling).
 *
 * Returns `null` unlike cache-builder's version (which returns the raw value
 * as-is for unresolved targets). The validator treats unresolved targets as
 * errors; the cache builder is lenient (future entities may not exist yet).
 */
function resolveTargetForValidation(
  raw: string,
  authoringKey: string,
  entities: Map<string, UnifiedEntity>,
  slugIndex: Map<string, Map<string, string>>,
): string | null {
  if (entities.has(raw)) return raw;

  const entry = getRegistryEntry(authoringKey);

  if (entry && entry.expectsType.length > 0) {
    for (const expectedType of entry.expectsType) {
      const candidateId = `${expectedType}_${raw}`;
      if (entities.has(candidateId)) return candidateId;
    }
  }

  for (const [type] of slugIndex) {
    const candidateId = `${type}_${raw}`;
    if (entities.has(candidateId)) return candidateId;
  }

  return null;
}

export function checkDanglingRelations(
  entities: Map<string, UnifiedEntity>,
): { errors: ValidationError[]; warnings: ValidationWarning[] } {
  const errors: ValidationError[] = [];
  const warnings: ValidationWarning[] = [];
  const slugIndex = buildSlugIndex(entities);

  for (const [id, entity] of entities) {
    for (const [authoringKey, targets] of Object.entries(entity.relations)) {
      if (!Array.isArray(targets) || targets.length === 0) continue;

      // Skip unknown relation keys — they're already reported as
      // UNKNOWN_RELATION_KEY warnings by checkRelationsValidity.
      const registryEntry = getRegistryEntry(authoringKey);
      if (!registryEntry) continue;

      for (const targetId of targets) {
        if (typeof targetId !== "string" || !targetId) continue;

        // Resolve raw slug → canonical ID (legacy compat)
        const resolved = resolveTargetForValidation(
          targetId,
          authoringKey,
          entities,
          slugIndex,
        );

        if (!resolved) {
          warnings.push({
            entityId: id,
            rule: "DANGLING_RELATION",
            message: `Relation "${authoringKey}" references "${targetId}" which does not exist in the entity map (unresolved slug or missing entity)`,
          });
          continue;
        }

        // Check target type validity
        const targetEntity = entities.get(resolved)!;
        const typeCheck = validateRelationTarget(
          authoringKey,
          targetEntity.type,
        );

        if (!typeCheck.valid) {
          errors.push({
            entityId: id,
            rule: "INVALID_RELATION_TARGET_TYPE",
            message:
              typeCheck.message ??
              `Relation "${authoringKey}" target "${resolved}" has invalid type "${targetEntity.type}"`,
          });
        }
      }
    }
  }

  return { errors, warnings };
}

// ─── 7. Legacy-specific checks ────────────────────────────────────────────

/**
 * Validate legacy entities for issues specific to the legacy format.
 *
 * - Legacy has no `meta.json` (meta is derived from frontmatter)
 * - Legacy uses `index.mdx` instead of `entity.mdx`
 * - Legacy `relations.json` is optional (falls back to empty)
 * - Legacy frontmatter may have `type: "rapper"` which normalizes to `artist`
 */
export function checkLegacySpecifics(
  entities: Map<string, UnifiedEntity>,
): { errors: ValidationError[]; warnings: ValidationWarning[] } {
  const errors: ValidationError[] = [];
  const warnings: ValidationWarning[] = [];

  for (const [id, entity] of entities) {
    if (entity.sourceFormat !== "legacy-flat") continue;

    // Check that the derived type is valid
    if (!ENTITY_TYPES.includes(entity.type as EntityType)) {
      errors.push({
        entityId: id,
        rule: "INVALID_LEGACY_TYPE",
        message: `Legacy entity has unrecognized type "${entity.type}". Valid types: [${ENTITY_TYPES.join(", ")}]`,
      });
    }

    // Check that content (index.mdx) is not empty after frontmatter
    const body = stripFrontmatter(entity.content);
    if (!body) {
      errors.push({
        entityId: id,
        rule: "EMPTY_MDX",
        message: `Legacy index.mdx has no content after stripping frontmatter`,
      });
    }

    // Warn about legacy format — encourage migration
    warnings.push({
      entityId: id,
      rule: "LEGACY_FORMAT",
      message: `Entity uses legacy format (content/<type>/<slug>/). Consider migrating to graph-folder format (content/entities/<id>/)`,
    });
  }

  return { errors, warnings };
}

// ─── 8. Route map consistency ─────────────────────────────────────────────

export function checkRouteConsistency(
  entities: Map<string, UnifiedEntity>,
): { errors: ValidationError[]; warnings: ValidationWarning[] } {
  const errors: ValidationError[] = [];
  const warnings: ValidationWarning[] = [];

  for (const [id, entity] of entities) {
    // Check that the entity's type has a route prefix in TYPE_ROUTE_MAP
    if (!TYPE_ROUTE_MAP[entity.type as EntityType]) {
      errors.push({
        entityId: id,
        rule: "UNMAPPED_TYPE",
        message: `Entity type "${entity.type}" has no route prefix in TYPE_ROUTE_MAP`,
      });
    }
  }

  return { errors, warnings };
}

// ─── Combined validation ──────────────────────────────────────────────────

/**
 * Run all entity-map-level checks (everything except filesystem scan).
 * Extracted to avoid duplication between `validateAllEntities` and
 * `validateEntityMap`.
 */
function runEntityMapChecks(
  entities: Map<string, UnifiedEntity>,
): { errors: ValidationError[]; warnings: ValidationWarning[] } {
  const errors: ValidationError[] = [];
  const warnings: ValidationWarning[] = [];

  errors.push(...checkDuplicateIds(entities));
  errors.push(...checkDuplicateSlugs(entities));

  const meta = checkMetaValidity(entities);
  errors.push(...meta.errors);
  warnings.push(...meta.warnings);

  const rels = checkRelationsValidity(entities);
  errors.push(...rels.errors);
  warnings.push(...rels.warnings);

  const dang = checkDanglingRelations(entities);
  errors.push(...dang.errors);
  warnings.push(...dang.warnings);

  const leg = checkLegacySpecifics(entities);
  errors.push(...leg.errors);
  warnings.push(...leg.warnings);

  const routes = checkRouteConsistency(entities);
  errors.push(...routes.errors);
  warnings.push(...routes.warnings);

  return { errors, warnings };
}

/**
 * Run ALL validation rules against the full entity map.
 *
 * This is the main entry point. It:
 * 1. Checks graph-folder filesystem (missing files, empty MDX)
 * 2. Checks duplicate IDs (graph-folder + legacy collisions)
 * 3. Checks duplicate slugs per type
 * 4. Validates meta.json against type schemas
 * 5. Validates relations.json structure (including unknown keys via .passthrough())
 * 6. Checks all relation targets exist and have valid types
 * 7. Checks legacy-specific issues
 * 8. Checks route map consistency
 *
 * @returns ValidationReport with all errors and warnings combined
 */
export function validateAllEntities(
  entities: Map<string, UnifiedEntity>,
): ValidationReport {
  const allErrors: ValidationError[] = [];
  const allWarnings: ValidationWarning[] = [];

  // 1. Graph-folder filesystem (only in full mode)
  const fs = validateGraphFolderFiles();
  allErrors.push(...fs.errors);
  allWarnings.push(...fs.warnings);

  // 2–8. Entity map checks
  const map = runEntityMapChecks(entities);
  allErrors.push(...map.errors);
  allWarnings.push(...map.warnings);

  return {
    errors: allErrors,
    warnings: allWarnings,
    isValid: allErrors.length === 0,
    errorCount: allErrors.length,
    warningCount: allWarnings.length,
  };
}

/**
 * Quick validation that only checks the loaded entity map (no filesystem scan).
 * Use when you've already validated files separately or for incremental checks.
 */
export function validateEntityMap(
  entities: Map<string, UnifiedEntity>,
): ValidationReport {
  const { errors, warnings } = runEntityMapChecks(entities);

  return {
    errors,
    warnings,
    isValid: errors.length === 0,
    errorCount: errors.length,
    warningCount: warnings.length,
  };
}
