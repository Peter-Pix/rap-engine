#!/usr/bin/env npx tsx
/**
 * migrate-legacy-to-entities.ts
 *
 * Converts legacy flat-format entities (`content/<type>/<slug>/index.mdx`)
 * into the graph-folder format (`content/entities/<id>/`).
 *
 * Each migrated entity produces three files:
 *   - entity.mdx       ← MDX body (with title heading stripped)
 *   - meta.json         ← standard BaseMeta + type-specific extras
 *   - relations.json    ← existing relations + frontmatter-derived edges
 *
 * Usage:
 *   npx tsx scripts/migrate-legacy-to-entities.ts               # migrate all
 *   npx tsx scripts/migrate-legacy-to-entities.ts --dry-run     # preview only
 *   npx tsx scripts/migrate-legacy-to-entities.ts --overwrite   # overwrite existing
 *   npx tsx scripts/migrate-legacy-to-entities.ts --entity artist_yzomandias
 *   npx tsx scripts/migrate-legacy-to-entities.ts --type artist --dry-run
 *
 * Safety:
 *   - Does NOT delete or modify legacy source files.
 *   - Default: skips entities already present in content/entities/.
 *   - Fails on invalid slugs / missing required fields.
 *   - --dry-run prints what WOULD happen without writing.
 */

import fs from "node:fs";
import path from "node:path";
import {
  buildMeta,
  buildRelations,
  stripTitleHeading,
  validateForMigration,
  type MigrationError,
} from "../src/lib/content/migration-mappers";
import { type UnifiedEntity } from "../src/lib/content/types";
import { listLegacyEntities, loadLegacyEntity } from "../src/lib/content/legacy-loader";

// ─── CLI args ─────────────────────────────────────────────────────────────

function parseArgs(): {
  dryRun: boolean;
  overwrite: boolean;
  entity?: string;
  type?: string;
  verbose: boolean;
} {
  const args = process.argv.slice(2);
  return {
    dryRun: args.includes("--dry-run"),
    overwrite: args.includes("--overwrite"),
    entity: args.find((a, i) => a === "--entity" && i + 1 < args.length)
      ? args[args.indexOf("--entity") + 1]
      : undefined,
    type: args.find((a, i) => a === "--type" && i + 1 < args.length)
      ? args[args.indexOf("--type") + 1]
      : undefined,
    verbose: args.includes("--verbose") || args.includes("-v"),
  };
}

// ─── Helpers ──────────────────────────────────────────────────────────────

const ENTITIES_ROOT = path.join(process.cwd(), "content", "entities");

interface MigrationResult {
  entityId: string;
  type: string;
  slug: string;
  title: string;
  status: "created" | "skipped" | "error" | "dry-run";
  reason?: string;
  errors?: MigrationError[];
}

function entityExists(entityId: string): boolean {
  return fs.existsSync(path.join(ENTITIES_ROOT, entityId));
}

function writeEntity(
  entityId: string,
  meta: Record<string, unknown>,
  relations: Record<string, string[]>,
  mdxContent: string,
): void {
  const dir = path.join(ENTITIES_ROOT, entityId);
  fs.mkdirSync(dir, { recursive: true });

  // Sort relation keys for deterministic output
  const sortedRelations: Record<string, string[]> = {};
  for (const key of Object.keys(relations).sort()) {
    sortedRelations[key] = [...relations[key]].sort();
  }

  writeJson(path.join(dir, "meta.json"), meta);
  writeJson(path.join(dir, "relations.json"), sortedRelations);
  fs.writeFileSync(path.join(dir, "entity.mdx"), mdxContent.trimEnd() + "\n", "utf-8");
}

function writeJson(filepath: string, data: unknown): void {
  fs.writeFileSync(filepath, JSON.stringify(data, null, 2) + "\n", "utf-8");
}

// ─── Main migration logic ─────────────────────────────────────────────────

function migrateEntity(
  entity: UnifiedEntity,
  options: { dryRun: boolean; overwrite: boolean; verbose: boolean },
): MigrationResult {
  const { id, type, slug, meta } = entity;
  const result: MigrationResult = {
    entityId: id,
    type,
    slug,
    title: meta.title,
    status: "skipped",
  };

  // ── 1. Validate ──────────────────────────────────────────────────────
  const errors = validateForMigration(entity);
  if (errors.length > 0) {
    result.status = "error";
    result.reason = `Validation failed: ${errors.map((e) => e.message).join("; ")}`;
    result.errors = errors;
    return result;
  }

  // ── 2. Check if already exists ───────────────────────────────────────
  if (!options.overwrite && entityExists(id)) {
    result.status = "skipped";
    result.reason = "Entity already exists in content/entities/ (use --overwrite to replace)";
    return result;
  }

  // ── 3. Dry run? ──────────────────────────────────────────────────────
  if (options.dryRun) {
    result.status = "dry-run";
    return result;
  }

  // ── 4. Build output files ────────────────────────────────────────────
  try {
    // Re‑read raw frontmatter from the legacy source.
    // The entity.meta is Zod‑parsed BaseMeta which drops unknown keys
    // (like realName, active, origin, era). We need raw FM for extras.
    const { fm: rawFrontmatter } = readRawFrontmatter(entity);

    // Build meta.json (with type‑specific extras from raw FM)
    const metaJson = buildMeta(entity, rawFrontmatter);

    // Build relations.json (merge existing + frontmatter-derived)
    const relationsJson = buildRelations(entity, rawFrontmatter);

    // Build entity.mdx (strip frontmatter + title heading from MDX body)
    const mdxBody = extractMdxBody(entity.content, entity.meta.title);

    // Write
    writeEntity(id, metaJson, relationsJson, mdxBody);

    result.status = "created";
    if (options.verbose) {
      console.log(`  ✅ Created ${id}/`);
      console.log(`     meta.json:      ${Object.keys(metaJson).length} fields`);
      console.log(`     relations.json:  ${Object.keys(relationsJson).reduce((s, k) => s + relationsJson[k].length, 0)} edges`);
      console.log(`     entity.mdx:      ${mdxBody.split("\n").length} lines`);
    }
  } catch (err) {
    result.status = "error";
    result.reason = err instanceof Error ? err.message : String(err);
  }

  return result;
}

// ─── Raw frontmatter reader ───────────────────────────────────────────────

const FRONTMATTER_RE = /^---\n([\s\S]*?)\n---\n?/;

function readRawFrontmatter(
  entity: UnifiedEntity,
): { fm: Record<string, unknown> } {
  // The entity carries raw MDX content (including frontmatter for legacy entities)
  const raw = entity.content;
  const match = raw.match(FRONTMATTER_RE);
  if (!match) return { fm: {} };

  const fmBlock = match[1];
  const fm: Record<string, unknown> = {};

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

  return { fm };
}

/**
 * Extract the MDX body (without frontmatter) and strip the title heading.
 */
function extractMdxBody(content: string, title: string): string {
  // 1. Strip frontmatter
  const body = content.replace(FRONTMATTER_RE, "");
  // 2. Strip title heading
  return stripTitleHeading(body, title);
}

// ─── Entry point ──────────────────────────────────────────────────────────

async function main() {
  const options = parseArgs();

  console.log("\n🧳 Legacy → Graph-folder migration");
  console.log(`   Dry run:    ${options.dryRun ? "✅ YES" : "❌ no (will write files)"}`);
  console.log(`   Overwrite:  ${options.overwrite ? "✅ YES" : "❌ no (skip existing)"}`);
  console.log(`   Filter:     ${options.entity ? `entity: ${options.entity}` : options.type ? `type: ${options.type}` : "all"}\n`);

  // ── Discover legacy entities ─────────────────────────────────────────
  const refs = listLegacyEntities();
  console.log(`📋 Found ${refs.length} legacy entities`);

  // ── Filter ───────────────────────────────────────────────────────────
  let filtered = refs;
  if (options.entity) {
    filtered = refs.filter((r) => r.id === options.entity);
    if (filtered.length === 0) {
      console.error(`❌ No legacy entity found with ID "${options.entity}"`);
      process.exit(1);
    }
  }
  if (options.type) {
    filtered = refs.filter((r) => r.type === options.type);
    if (filtered.length === 0) {
      console.error(`❌ No legacy entities found for type "${options.type}"`);
      process.exit(1);
    }
  }

  console.log(`   Processing ${filtered.length} entities...\n`);

  // ── Migrate each ─────────────────────────────────────────────────────
  const results: MigrationResult[] = [];

  for (const ref of filtered) {
    const entity = loadLegacyEntity(ref.legacyDir, ref.slug);
    if (!entity) {
      results.push({
        entityId: ref.id,
        type: ref.type,
        slug: ref.slug,
        title: "?",
        status: "error",
        reason: "Failed to load legacy entity",
      });
      continue;
    }

    const r = migrateEntity(entity, options);
    results.push(r);

    // Print inline status
    const icon = r.status === "created" ? "✅" : r.status === "error" ? "❌" : r.status === "dry-run" ? "🔍" : "⏭️";
    const extra = r.reason ? ` — ${r.reason}` : "";
    console.log(`  ${icon} ${r.entityId} (${r.status})${extra}`);
  }

  // ── Summary ──────────────────────────────────────────────────────────
  const created = results.filter((r) => r.status === "created").length;
  const skipped = results.filter((r) => r.status === "skipped").length;
  const errors = results.filter((r) => r.status === "error").length;
  const dryRuns = results.filter((r) => r.status === "dry-run").length;

  console.log("");
  console.log("─".repeat(52));
  console.log(`📊 Summary:`);
  console.log(`   Created:   ${created}`);
  console.log(`   Skipped:   ${skipped}`);
  console.log(`   Errors:    ${errors}`);
  if (dryRuns > 0) console.log(`   Dry runs:  ${dryRuns}`);
  console.log(`   Total:     ${results.length}`);
  console.log("─".repeat(52));

  if (options.dryRun) {
    console.log("\n💡 This was a dry run. Run without --dry-run to actually write files.");
  } else if (created > 0) {
    console.log(`\n📦 Output directory: content/entities/`);
    console.log(`   Run "npm run cache:build" to rebuild the cache with new entities.`);
  }

  if (errors > 0) {
    console.log("\n❌ Errors:");
    for (const r of results) {
      if (r.status === "error") {
        console.log(`   ${r.entityId}: ${r.reason ?? "unknown error"}`);
        if (r.errors) {
          for (const e of r.errors) {
            console.log(`     • ${e.field}: ${e.message}`);
          }
        }
      }
    }
    process.exit(1);
  }
}

main().catch((err) => {
  console.error("Fatal error:", err);
  process.exit(1);
});
