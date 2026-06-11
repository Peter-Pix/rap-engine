import fs from "node:fs";
import path from "node:path";
import { RelationsSchema } from "./schemas";
import type { Relations } from "./schemas";
import type { BaseMeta } from "./schemas";
import type { UnifiedEntity, SourceFormat } from "./types";
import { sanitiseId } from "./paths";

// ─── Legacy content root ──────────────────────────────────────────────────

const LEGACY_ROOT = path.join(process.cwd(), "content");

// ─── Directory name → EntityType mapping ──────────────────────────────────

/**
 * Maps legacy Czech directory names to the canonical `EntityType`.
 * Any legacy dir not in this map is skipped.
 */
const LEGACY_DIR_TYPE_MAP: Record<string, string> = {
  raperi: "artist",
  alba: "album",
  zanry: "genre",
  styles: "style",
  themes: "theme",
  moods: "mood",
  scenes: "scene",
  labely: "label",
  lokality: "location",
};

/**
 * Legacy frontmatter `type` values can differ from the canonical EntityType enum.
 * This map normalizes known legacy types (e.g. "rapper" → "artist").
 */
const LEGACY_TYPE_NORMALIZE: Record<string, string> = {
  rapper: "artist",
  raperi: "artist",
  album: "album",
  alba: "album",
  genre: "genre",
  zanr: "genre",
  style: "style",
  theme: "theme",
  mood: "mood",
  scene: "scene",
  label: "label",
  location: "location",
};

// ─── Frontmatter parser ───────────────────────────────────────────────────

const FRONTMATTER_RE = /^---\n([\s\S]*?)\n---\n?/;

interface RawFrontmatter {
  title?: string;
  slug?: string;
  description?: string;
  publishedAt?: string;
  updatedAt?: string;
  type?: string;
  /** Arbitrary extra fields captured as-is */
  [key: string]: unknown;
}

/** Extract key: value pairs from YAML-like frontmatter (simple line parser, no full YAML). */
function parseFrontmatter(mdx: string): { fm: RawFrontmatter; body: string } {
  const match = mdx.match(FRONTMATTER_RE);
  if (!match) {
    return { fm: {}, body: mdx };
  }

  const fmBlock = match[1];
  const body = mdx.slice(match[0].length);
  const fm: RawFrontmatter = {};

  for (const line of fmBlock.split("\n")) {
    const colonIdx = line.indexOf(":");
    if (colonIdx === -1) continue;

    const key = line.slice(0, colonIdx).trim();
    let value = line.slice(colonIdx + 1).trim();

    // Unquote
    if (
      (value.startsWith('"') && value.endsWith('"')) ||
      (value.startsWith("'") && value.endsWith("'"))
    ) {
      value = value.slice(1, -1);
    }

    if (key) fm[key] = value;
  }

  return { fm, body };
}

// ─── Legacy entity loading ────────────────────────────────────────────────

/**
 * Load a single legacy entity from `content/<legacyDir>/<slug>/`.
 *
 * Legacy format:
 *   content/<dir>/<slug>/
 *     index.mdx        ← frontmatter + MDX body
 *     relations.json   ← same shape as new format
 *
 * The entity `id` is derived as `{normalizedType}_{slug}`.
 */
export function loadLegacyEntity(
  legacyDir: string,
  slug: string,
): UnifiedEntity | null {
  const dir = path.join(LEGACY_ROOT, legacyDir, slug);
  if (!fs.existsSync(dir)) return null;

  const mdxFile = path.join(dir, "index.mdx");
  const relsFile = path.join(dir, "relations.json");

  if (!fs.existsSync(mdxFile)) return null;

  // ── Read MDX + parse frontmatter ─────────────────────────────────────
  const rawMdx = fs.readFileSync(mdxFile, "utf-8");
  const { fm, body } = parseFrontmatter(rawMdx);

  // ── Determine entity type ────────────────────────────────────────────
  // Priority: frontmatter.type (normalized) > directory mapping
  const rawFmType = fm.type ? String(fm.type).toLowerCase() : null;
  const normalizedType =
    (rawFmType ? LEGACY_TYPE_NORMALIZE[rawFmType] : null) ??
    LEGACY_DIR_TYPE_MAP[legacyDir] ??
    legacyDir;

  // ── Derive id ────────────────────────────────────────────────────────
  // Pattern: `{type}_{slug}` — e.g. `artist_yzomandias`
  const safeSlug = sanitiseId(fm.slug ?? slug) ?? slug;
  const id = `${normalizedType}_${safeSlug}`;

  // ── Build BaseMeta from frontmatter ──────────────────────────────────
  const meta: BaseMeta = {
    id,
    type: normalizedType as BaseMeta["type"],
    slug: safeSlug,
    title: fm.title ?? safeSlug,
    description: fm.description ?? "",
    publishedAt: fm.publishedAt,
    updatedAt: fm.updatedAt,
  };

  // ── Parse relations.json ─────────────────────────────────────────────
  let relations: Relations;
  if (fs.existsSync(relsFile)) {
    try {
      const raw = JSON.parse(fs.readFileSync(relsFile, "utf-8"));
      relations = RelationsSchema.parse(raw);
    } catch {
      // Broken relations → fall back to empty
      relations = RelationsSchema.parse({});
    }
  } else {
    relations = RelationsSchema.parse({});
  }

  return {
    id,
    type: normalizedType,
    slug: safeSlug,
    meta,
    content: rawMdx,
    relations,
    sourceFormat: "legacy-flat",
  };
}

// ─── Legacy listing ───────────────────────────────────────────────────────

export interface LegacyEntityRef {
  id: string;
  type: string;
  slug: string;
  legacyDir: string;
}

/**
 * Enumerate all legacy entities across every known directory.
 *
 * Skips:
 * - Hidden folders (`.` prefix)
 * - `_template` / `_templates` folders
 * - Directories not in `LEGACY_DIR_TYPE_MAP`
 * - Folders without an `index.mdx`
 */
export function listLegacyEntities(): LegacyEntityRef[] {
  const refs: LegacyEntityRef[] = [];

  for (const legacyDir of Object.keys(LEGACY_DIR_TYPE_MAP)) {
    const dirPath = path.join(LEGACY_ROOT, legacyDir);
    if (!fs.existsSync(dirPath)) continue;

    const entries = fs.readdirSync(dirPath, { withFileTypes: true });
    for (const entry of entries) {
      if (!entry.isDirectory()) continue;
      if (entry.name.startsWith(".")) continue;
      if (entry.name.startsWith("_")) continue;

      const slug = entry.name;
      const mdxFile = path.join(dirPath, slug, "index.mdx");
      if (!fs.existsSync(mdxFile)) continue;

      const normalizedType = LEGACY_DIR_TYPE_MAP[legacyDir] ?? legacyDir;
      const safeSlug = sanitiseId(slug) ?? slug;
      const id = `${normalizedType}_${safeSlug}`;

      refs.push({ id, type: normalizedType, slug: safeSlug, legacyDir });
    }
  }

  return refs;
}
