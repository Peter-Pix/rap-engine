#!/usr/bin/env -S npx tsx

/**
 * Normalize relation target IDs in all `relations.json` files.
 *
 * Why:
 *   Raw `relations.json` files contain a mix of formats:
 *     - Bare slugs:        "boom-bap"
 *     - Canonical IDs:     "genre_boom-bap"
 *   Both resolve to the same target via `cache-builder.resolveTargetId()`,
 *   so a single entity can appear twice in the resolved edge list — and
 *   consequently twice in `outbound` arrays. This causes React "duplicate
 *   key" warnings at render time and bloats the graph.
 *
 * What this does:
 *   For every bare-slug reference, attempt to resolve it to a canonical
 *   `{type}_{slug}` ID by searching the entity map. If exactly one
 *   `{type}_{slug}` exists for that bare slug, rewrite the reference.
 *   If multiple types have the same bare slug, log an ambiguity and skip
 *   (caller must disambiguate manually). If no match, leave the bare
 *   slug as-is (validator will flag it as a dangling relation).
 *
 * Usage:
 *   npx tsx scripts/normalize-relation-ids.ts           # dry run, shows diff
 *   npx tsx scripts/normalize-relation-ids.ts --apply   # actually write files
 */

import { readFileSync, writeFileSync, readdirSync, existsSync } from "node:fs";
import { join } from "node:path";

const ROOT = process.cwd();
const ENTITIES_DIR = join(ROOT, "content", "entities");
const APPLY = process.argv.includes("--apply");

// ─── Load all canonical entity IDs (folder names) ────────────────────────
const allIds = new Set<string>();
for (const d of readdirSync(ENTITIES_DIR)) {
  allIds.add(d);
}

// ─── Build reverse index: bare-slug → [canonical IDs] ───────────────────
const slugToIds = new Map<string, string[]>();
for (const id of allIds) {
  const underscore = id.indexOf("_");
  if (underscore < 0) continue;
  const slug = id.slice(underscore + 1);
  const list = slugToIds.get(slug) ?? [];
  list.push(id);
  slugToIds.set(slug, list);
}

// ─── Process every relations.json ────────────────────────────────────────
let totalRefs = 0;
let rewrites = 0;
let deduped = 0;
let ambiguous = 0;
let unchanged = 0;
let missing = 0;

const changes: Array<{ file: string; key: string; from: string; to: string }> = [];
const ambiguousRefs: Array<{ file: string; key: string; ref: string; candidates: string[] }> = [];
const missingRefs: Array<{ file: string; key: string; ref: string }> = [];

for (const entityDir of readdirSync(ENTITIES_DIR)) {
  const relPath = join(ENTITIES_DIR, entityDir, "relations.json");
  if (!existsSync(relPath)) continue;

  let rel: Record<string, unknown>;
  try {
    rel = JSON.parse(readFileSync(relPath, "utf-8"));
  } catch {
    continue;
  }

  let fileChanged = false;

  for (const [key, value] of Object.entries(rel)) {
    if (!Array.isArray(value)) continue;
    const newArr: string[] = [];
    const seen = new Set<string>();
    for (const ref of value) {
      if (typeof ref !== "string") {
        newArr.push(ref as string);
        continue;
      }
      totalRefs++;

      // Dedupe within the same array — two canonical IDs pointing to the
      // same target can appear when imports paste the same ref twice.
      if (seen.has(ref)) {
        // Skip silently — it's an in-file duplicate, not a rewrite.
        deduped++;
        fileChanged = true;
        continue;
      }
      seen.add(ref);

      // Already canonical? Keep as-is.
      if (allIds.has(ref)) {
        newArr.push(ref);
        unchanged++;
        continue;
      }

      // Try to resolve bare slug → canonical ID
      const candidates = slugToIds.get(ref) ?? [];
      if (candidates.length === 1) {
        const resolved = candidates[0];
        newArr.push(resolved);
        rewrites++;
        fileChanged = true;
        changes.push({ file: entityDir, key, from: ref, to: resolved });
      } else if (candidates.length > 1) {
        // Ambiguous — multiple types have the same bare slug.
        // Keep the bare slug for now; let the validator flag it.
        newArr.push(ref);
        ambiguous++;
        ambiguousRefs.push({ file: entityDir, key, ref, candidates });
      } else {
        // No match — dangling ref, leave it.
        newArr.push(ref);
        missing++;
        missingRefs.push({ file: entityDir, key, ref });
      }
    }
    rel[key] = newArr;
  }

  if (fileChanged && APPLY) {
    writeFileSync(relPath, JSON.stringify(rel, null, 2) + "\n", "utf-8");
  }
}

// ─── Report ───────────────────────────────────────────────────────────────
console.log("─".repeat(60));
console.log("Relation ID normalization");
console.log("─".repeat(60));
console.log(`Mode:              ${APPLY ? "APPLY (files written)" : "DRY RUN (use --apply to write)"}`);
console.log(`Total refs seen:   ${totalRefs}`);
console.log(`  ✓ Unchanged:     ${unchanged} (already canonical)`);
console.log(`  ✏️  Rewrites:     ${rewrites} (bare → canonical)`);
console.log(`  ⤵️  Deduped:       ${deduped} (duplicate refs within same array)`);
console.log(`  ⚠️  Ambiguous:    ${ambiguous} (multiple types share the slug)`);
console.log(`  ❌ Missing:      ${missing} (no matching entity)`);
console.log();

if (rewrites > 0 && changes.length > 0) {
  console.log(`First ${Math.min(15, changes.length)} rewrites:`);
  for (const c of changes.slice(0, 15)) {
    console.log(`  ${c.file}.relations.json  [${c.key}]  "${c.from}" → "${c.to}"`);
  }
  if (changes.length > 15) console.log(`  ... and ${changes.length - 15} more`);
  console.log();
}

if (ambiguous > 0) {
  console.log(`⚠️  Ambiguous references (need manual fix):`);
  for (const a of ambiguousRefs.slice(0, 10)) {
    console.log(`  ${a.file}.relations.json  [${a.key}]  "${a.ref}" → could be: ${a.candidates.join(", ")}`);
  }
  if (ambiguousRefs.length > 10) console.log(`  ... and ${ambiguousRefs.length - 10} more`);
  console.log();
}

if (missing > 0) {
  console.log(`❌ Dangling references (no matching entity):`);
  for (const m of missingRefs.slice(0, 10)) {
    console.log(`  ${m.file}.relations.json  [${m.key}]  "${m.ref}"`);
  }
  if (missingRefs.length > 10) console.log(`  ... and ${missingRefs.length - 10} more`);
  console.log();
}

if (!APPLY && rewrites > 0) {
  console.log("Run with --apply to write the changes to disk.");
} else if (APPLY && rewrites > 0) {
  console.log("✅ Files written. Run `npm run cache:build` to refresh the cache.");
}
