/**
 * Test na cache:validate — assert 0 errors.
 *
 * Načte všechny entity přes unified resolver a spustí validateEntityMap().
 * Gate: build cache je validní jen když nejsou žádné chyby (warnings neblokují).
 *
 * Run with: node --test --import=tsx scripts/validate-content.test.ts
 */

import { describe, it } from "node:test";
import assert from "node:assert";
import { listAllEntities } from "../src/lib/content/entity-resolver";
import { validateEntityMap } from "../src/lib/content/validator";

describe("cache:validate — content validation gate", () => {
  it("validateEntityMap returns 0 errors (isValid=true)", () => {
    const entities = listAllEntities();
    assert.ok(entities.size > 0, `expected entities to load, got ${entities.size}`);

    const report = validateEntityMap(entities);

    // Build gate: 0 errors required (warnings are non-blocking)
    assert.strictEqual(
      report.errorCount,
      0,
      `expected 0 validation errors, got ${report.errorCount}: ` +
        report.errors.slice(0, 5).map((e) => `[${e.rule}] ${e.message}`).join("; "),
    );
    assert.strictEqual(report.isValid, true, "report.isValid must be true");
  });
});
