import type { EntityType } from "./constants";

// ─── Registry Entry ───────────────────────────────────────────────────────

export interface RelationRegistryEntry {
  /** Authoring key as it appears in `relations.json` */
  authoringKey: string;
  /** Normalized graph edge type (canonical, uppercase, snake_case) */
  edgeType: string;
  /**
   * Expected entity type(s) for the target of this relation.
   * An empty array means *any* entity type is accepted.
   */
  expectsType: EntityType[];
  /** Human-readable description of what this relation means */
  description: string;
}

// ─── The Registry (single source of truth) ────────────────────────────────

/**
 * Canonical mapping from `relations.json` authoring keys to graph edge types.
 *
 * Each entry defines:
 * 1. Which graph edge type this key produces
 * 2. What entity type(s) the target should be (for validation)
 *
 * This is the **only** place where authoring keys and edge types are linked.
 * All other code (normalizer, graph builder, UI) derives from this.
 */
export const RELATION_REGISTRY: readonly RelationRegistryEntry[] = [
  // ── Genre & style relations ──────────────────────────────────────────
  {
    authoringKey: "genres",
    edgeType: "HAS_GENRE",
    expectsType: ["genre"],
    description: "Source entity is associated with this genre",
  },
  {
    authoringKey: "styles",
    edgeType: "HAS_STYLE",
    expectsType: ["style"],
    description: "Source entity has this stylistic quality",
  },
  {
    authoringKey: "themes",
    edgeType: "HAS_THEME",
    expectsType: ["theme"],
    description: "Source entity deals with this lyrical/subject theme",
  },
  {
    authoringKey: "moods",
    edgeType: "HAS_MOOD",
    expectsType: ["mood"],
    description: "Source entity carries this emotional/aesthetic mood",
  },

  // ── Scene & location ─────────────────────────────────────────────────
  {
    authoringKey: "scenes",
    edgeType: "BELONGS_TO_SCENE",
    expectsType: ["scene"],
    description: "Source entity belongs to this scene",
  },
  {
    authoringKey: "locations",
    edgeType: "ORIGINATES_FROM",
    expectsType: ["location"],
    description: "Source entity originates from this location",
  },

  // ── Industry ─────────────────────────────────────────────────────────
  {
    authoringKey: "labels",
    edgeType: "SIGNED_TO",
    expectsType: ["label"],
    description: "Source entity is signed to this label",
  },

  // ── Entity-to-entity ─────────────────────────────────────────────────
  {
    authoringKey: "artists",
    edgeType: "RELATED_ARTIST",
    expectsType: ["artist"],
    description: "Source entity is related to this artist",
  },
  {
    authoringKey: "albums",
    edgeType: "HAS_ALBUM",
    expectsType: ["album"],
    description: "Source entity has/contains this album",
  },
  {
    authoringKey: "tracks",
    edgeType: "HAS_TRACK",
    expectsType: ["track"],
    description: "Source entity has/contains this track",
  },

  // ── Generic / cross-type ─────────────────────────────────────────────
  {
    authoringKey: "related",
    edgeType: "RELATED_TO",
    expectsType: [],
    description: "General-purpose bidirectional-ish reference (any type)",
  },
  {
    authoringKey: "influencedBy",
    edgeType: "INFLUENCED_BY",
    expectsType: [],
    description: "Source entity was influenced by this target (any type)",
  },
  {
    authoringKey: "partOf",
    edgeType: "PART_OF",
    expectsType: [],
    description:
      "Source entity is part of this larger entity (collective, scene, label, album, etc.)",
  },
] as const;

// ─── Derived types ────────────────────────────────────────────────────────

/** Union of all canonical graph edge types defined in the registry */
export type EdgeType = (typeof RELATION_REGISTRY)[number]["edgeType"];

// ─── Fast-lookup map ──────────────────────────────────────────────────────

const _byKey = new Map<string, RelationRegistryEntry>();
for (const entry of RELATION_REGISTRY) {
  _byKey.set(entry.authoringKey, entry);
}

/** O(1) lookup: authoring key → registry entry (or undefined if unknown) */
export function getRegistryEntry(
  authoringKey: string,
): RelationRegistryEntry | undefined {
  return _byKey.get(authoringKey);
}

/** O(1) lookup: authoring key → edge type string (or undefined) */
export function lookupEdgeType(authoringKey: string): string | undefined {
  return _byKey.get(authoringKey)?.edgeType;
}

/** Return every distinct edge type in the registry */
export function getAllEdgeTypes(): string[] {
  return [...new Set(RELATION_REGISTRY.map((e) => e.edgeType))];
}

// ─── Target-type validation ───────────────────────────────────────────────

export interface TargetValidationResult {
  valid: boolean;
  expectedTypes: string[];
  message?: string;
}

/**
 * Check whether a target entity's type is valid for a given relation key.
 *
 * Returns `{ valid: true }` when:
 * - The registry entry has no `expectsType` constraint (any type allowed), OR
 * - The target type matches one of the expected types.
 *
 * Returns `{ valid: false, message: "..." }` when:
 * - The authoring key is unknown, OR
 * - The target type is not in the expected set.
 */
export function validateRelationTarget(
  authoringKey: string,
  targetType: string,
): TargetValidationResult {
  const entry = getRegistryEntry(authoringKey);

  if (!entry) {
    const known = RELATION_REGISTRY.map((e) => e.authoringKey).join(", ");
    return {
      valid: false,
      expectedTypes: [],
      message: `Unknown relation key "${authoringKey}". Known keys: [${known}]`,
    };
  }

  // No constraint → any type passes
  if (entry.expectsType.length === 0) {
    return { valid: true, expectedTypes: ["*"] };
  }

  const expected = [...entry.expectsType];
  const valid = expected.includes(targetType as EntityType);

  return {
    valid,
    expectedTypes: expected,
    message: valid
      ? undefined
      : `Relation "${authoringKey}" (${entry.edgeType}) expects target type in [${expected.join(", ")}], got "${targetType}"`,
  };
}
