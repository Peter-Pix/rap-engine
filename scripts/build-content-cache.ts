#!/usr/bin/env -S npx tsx

/**
 * Build-time content cache script.
 *
 * Usage:
 *   npx tsx scripts/build-content-cache.ts
 *
 * Reads entities from BOTH `content/entities/` (graph-folder) and
 * legacy `content/<type>/<slug>/` (legacy-flat) formats via the unified
 * entity resolver, normalizes relations into graph edges, computes inbound
 * backlinks, maps routes, builds a search index, and writes 5 cache files
 * into `.content-cache/`.
 *
 * Exit codes:
 *   0 — success (may include minor load errors that were skipped)
 *   1 — some entity load errors encountered (details printed to stderr)
 *   2 — fatal error
 */

import { listAllEntities } from "../src/lib/content/entity-resolver";
import { buildCache } from "../src/lib/content/cache-builder";
import { validateEntityMap } from "../src/lib/content/validator";
import * as fs from "node:fs";
import * as path from "node:path";

function main(): void {
  console.log("🔨 Building content cache (graph-folder + legacy)...\n");

  // 1. Load everything via unified resolver
  const entities = listAllEntities();
  const count = entities.size;

  // 2. Validate before building
  console.log("🔍 Running validation...\n");
  const report = validateEntityMap(entities);

  if (!report.isValid) {
    console.error(`❌ Validation FAILED — ${report.errorCount} error(s):\n`);
    for (const err of report.errors.slice(0, 10)) {
      const label = err.entityId ? `[${err.entityId}] ` : "";
      console.error(`   ${err.rule}: ${label}${err.message}`);
    }
    if (report.errors.length > 10) {
      console.error(`   ... and ${report.errors.length - 10} more error(s)`);
    }
    if (report.warningCount > 0) {
      console.error(`\n   ⚠️  ${report.warningCount} warning(s) (non-blocking)`);
    }
    console.error(`\n💥 Build ABORTED — fix validation errors first.`);
    console.error(`   Run "npx tsx scripts/validate-content.ts" for full details.\n`);
    process.exit(1);
  }

  if (report.warningCount > 0) {
    console.warn(`   ⚠️  ${report.warningCount} validation warning(s) — non-blocking, but review them.`);
    console.warn(`   Run "npx tsx scripts/validate-content.ts" for full details.\n`);
  } else {
    console.log("   ✅ All validation checks passed.\n");
  }

  // 3. Report source format distribution
  let graphCount = 0;
  let legacyCount = 0;
  for (const e of entities.values()) {
    if (e.sourceFormat === "graph-folder") graphCount++;
    else legacyCount++;
  }

  console.log(
    `📋 Loaded ${count} total entit${count === 1 ? "y" : "ies"}`,
  );
  if (graphCount > 0) console.log(`   │── graph-folder:  ${graphCount}`);
  if (legacyCount > 0) console.log(`   │── legacy-flat:   ${legacyCount}`);

  if (count === 0) {
    console.warn("⚠️  No entities found. Writing empty caches.");
  }

  // 3. Build & write cache files
  buildCache(entities);

  // 4. Summary
  const edges = jsonSilent(".content-cache/graph.json") ?? [];
  const routes = jsonSilent(".content-cache/routes.json") ?? {};
  const inbound = jsonSilent(".content-cache/inbound.json") ?? {};

  console.log(`\n📦 Cache written to .content-cache/`);
  console.log(`   entities.json     — ${count} entit${count === 1 ? "y" : "ies"}`);
  console.log(
    `   graph.json        — ${Array.isArray(edges) ? edges.length : 0} edge${Array.isArray(edges) && edges.length === 1 ? "" : "s"}`,
  );
  console.log(
    `   inbound.json      — ${Object.keys(inbound).length} nodes with backlinks`,
  );
  console.log(
    `   routes.json       — ${Object.keys(routes).length} route${Object.keys(routes).length === 1 ? "" : "s"}`,
  );
  console.log(
    `   search-index.json — ${count} entr${count === 1 ? "y" : "ies"}`,
  );
  console.log();

  console.log("🎉 Cache build complete.");
}

// ─── Helper ───────────────────────────────────────────────────────────────

function jsonSilent(filePath: string): unknown | null {
  try {
    return JSON.parse(
      fs.readFileSync(path.join(process.cwd(), filePath), "utf-8"),
    );
  } catch {
    return null;
  }
}

main();
