import path from "node:path";
import fs from "node:fs";
import { CONTENT_ROOT } from "./constants";

// ─── Entity paths ─────────────────────────────────────────────────────────

/** Absolute path to an entity's folder: `content/entities/<id>/` */
export function entityDir(entityId: string): string {
  return path.join(CONTENT_ROOT, entityId);
}

/** Absolute path to `content/entities/<id>/meta.json` */
export function metaPath(entityId: string): string {
  return path.join(entityDir(entityId), "meta.json");
}

/** Absolute path to `content/entities/<id>/entity.mdx` */
export function mdxPath(entityId: string): string {
  return path.join(entityDir(entityId), "entity.mdx");
}

/** Absolute path to `content/entities/<id>/relations.json` */
export function relationsPath(entityId: string): string {
  return path.join(entityDir(entityId), "relations.json");
}

/** Absolute path to `content/entities/<id>/media/` */
export function mediaDir(entityId: string): string {
  return path.join(entityDir(entityId), "media");
}

// ─── Discovery ────────────────────────────────────────────────────────────

/**
 * List every ID in `content/entities/`.
 * Skips hidden files (`.` prefix) and non‑directories.
 */
export function listEntityIds(): string[] {
  if (!fs.existsSync(CONTENT_ROOT)) return [];
  return fs
    .readdirSync(CONTENT_ROOT, { withFileTypes: true })
    .filter((d) => d.isDirectory() && !d.name.startsWith("."))
    .map((d) => d.name);
}

/** Check whether an entity folder exists inside `content/entities/`. */
export function entityExists(entityId: string): boolean {
  return fs.existsSync(entityDir(entityId));
}

// ─── Safety ───────────────────────────────────────────────────────────────

/**
 * Sanitise a user‑provided ID or slug so it can be safely used as a
 * filesystem name.  Keeps only `[a-z0-9_-]`.
 * Returns `null` when the result would be empty.
 */
export function sanitiseId(raw: string): string | null {
  const clean = raw
    .toLowerCase()
    .replace(/[^a-z0-9_-]/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "");
  return clean || null;
}
