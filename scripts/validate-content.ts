#!/usr/bin/env -S npx tsx

/**
 * Content validation CLI.
 *
 * Usage:
 *   npx tsx scripts/validate-content.ts          # full validation (filesystem + entity map)
 *   npx tsx scripts/validate-content.ts --quick   # entity-map only (skip filesystem scan)
 *   npx tsx scripts/validate-content.ts --json   # machine-readable JSON output
 *
 * Exit codes:
 *   0 — valid (no errors; warnings are informational only)
 *   1 — validation errors found
 *   2 — fatal error (could not load entities)
 */

import { listAllEntities } from "../src/lib/content/entity-resolver";
import { validateAllEntities, validateEntityMap } from "../src/lib/content/validator";
import type { ValidationReport, ValidationError, ValidationWarning } from "../src/lib/content/validator";

// ─── CLI args ─────────────────────────────────────────────────────────────

const args = process.argv.slice(2);
const quickMode = args.includes("--quick");
const jsonMode = args.includes("--json");

// ─── Main ─────────────────────────────────────────────────────────────────

function main(): void {
  // 1. Load entities
  const entities = listAllEntities();
  const count = entities.size;

  if (count === 0 && !jsonMode) {
    console.log("⚠️  No entities found. Nothing to validate.");
    process.exit(0);
  }

  // 2. Run validation
  const report: ValidationReport = quickMode
    ? validateEntityMap(entities)
    : validateAllEntities(entities);

  // 3. Output
  if (jsonMode) {
    outputJson(report, count);
  } else {
    outputHuman(report, count);
  }

  // 4. Exit
  process.exit(report.isValid ? 0 : 1);
}

// ─── Human-readable output ────────────────────────────────────────────────

function outputHuman(report: ValidationReport, entityCount: number): void {
  console.log("🔍 Validating content...\n");
  console.log(`   Entities loaded: ${entityCount}`);
  console.log();

  if (report.isValid) {
    console.log("✅ All checks passed!");
    if (report.warningCount > 0) {
      console.log(`   ⚠️  ${report.warningCount} warning${report.warningCount === 1 ? "" : "s"} (non-blocking):`);
      printWarnings(report.warnings);
    }
    console.log();
    return;
  }

  // ── Errors ──────────────────────────────────────────────────────────
  console.log(`❌ ${report.errorCount} validation error${report.errorCount === 1 ? "" : "s"} found:\n`);

  // Group errors by rule for readability
  const byRule = groupByRule(report.errors);
  for (const [rule, errs] of Object.entries(byRule)) {
    const icon = ruleIcon(rule);
    console.log(`  ${icon} ${rule} (${errs.length}):`);
    for (const e of errs.slice(0, 5)) {
      const entityLabel = e.entityId ? `[${e.entityId}] ` : "";
      console.log(`      ${entityLabel}${e.message}`);
      if (e.path) console.log(`        📁 ${e.path}`);
    }
    if (errs.length > 5) {
      console.log(`      ... and ${errs.length - 5} more`);
    }
    console.log();
  }

  // ── Warnings ────────────────────────────────────────────────────────
  if (report.warningCount > 0) {
    console.log(`   ⚠️  ${report.warningCount} warning${report.warningCount === 1 ? "" : "s"} (non-blocking):`);
    printWarnings(report.warnings);
    console.log();
  }

  // ── Summary ──────────────────────────────────────────────────────────
  console.log(`   Errors:   ${report.errorCount}`);
  console.log(`   Warnings: ${report.warningCount}`);
  console.log();
  console.log("💥 Validation FAILED — fix errors before building.");
}

function printWarnings(warnings: ValidationWarning[]): void {
  const byRule = groupWarningsByRule(warnings);
  for (const [rule, warns] of Object.entries(byRule)) {
    console.log(`      ${rule} (${warns.length}):`);
    for (const w of warns.slice(0, 3)) {
      const entityLabel = w.entityId ? `[${w.entityId}] ` : "";
      console.log(`        ${entityLabel}${w.message}`);
    }
    if (warns.length > 3) {
      console.log(`        ... and ${warns.length - 3} more`);
    }
  }
}

// ─── JSON output ──────────────────────────────────────────────────────────

function outputJson(report: ValidationReport, entityCount: number): void {
  console.log(
    JSON.stringify(
      {
        entityCount,
        isValid: report.isValid,
        errorCount: report.errorCount,
        warningCount: report.warningCount,
        errors: report.errors,
        warnings: report.warnings,
      },
      null,
      2,
    ),
  );
}

// ─── Grouping helpers ─────────────────────────────────────────────────────

function groupByRule(
  items: ValidationError[],
): Record<string, ValidationError[]> {
  const groups: Record<string, ValidationError[]> = {};
  for (const item of items) {
    const list = groups[item.rule] ?? (groups[item.rule] = []);
    list.push(item);
  }
  return groups;
}

function groupWarningsByRule(
  items: ValidationWarning[],
): Record<string, ValidationWarning[]> {
  const groups: Record<string, ValidationWarning[]> = {};
  for (const item of items) {
    const list = groups[item.rule] ?? (groups[item.rule] = []);
    list.push(item);
  }
  return groups;
}

function ruleIcon(rule: string): string {
  const icons: Record<string, string> = {
    MISSING_MDX: "📄",
    EMPTY_MDX: "📝",
    MISSING_META: "🏷️",
    MISSING_RELATIONS: "🔗",
    DUPLICATE_ID: "🆔",
    DUPLICATE_SLUG: "🔤",
    INVALID_META: "❌",
    ID_MISMATCH: "🔄",
    INVALID_SLUG_FORMAT: "🔤",
    INVALID_DATE: "📅",
    INVALID_RELATIONS: "🔗",
    DANGLING_RELATION: "👻",
    INVALID_RELATION_TARGET_TYPE: "🚫",
    INVALID_LEGACY_TYPE: "🏛️",
    UNMAPPED_TYPE: "🗺️",
  };
  return icons[rule] ?? "•";
}

main();
