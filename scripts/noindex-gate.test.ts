/**
 * Test: noindex gate — entity bez obsahu se nesmí dostat do sitemapy
 * ani být indexovatelné Googlem.
 *
 * Chrání před SEO regresí, kdy import tisíce "tenkých" skladeb zaplaví
 * sitemap a Google penalizuje thin content.
 */
import { describe, it } from "node:test";
import assert from "node:assert";
import { readFileSync, existsSync } from "node:fs";
import { join } from "node:path";

const ROOT = process.cwd();
const CACHE = join(ROOT, ".content-cache", "entities.json");

function loadEntities(): Record<string, any> {
  if (!existsSync(CACHE)) return {};
  return JSON.parse(readFileSync(CACHE, "utf8"));
}

describe("noindex gate", () => {
  const entities = loadEntities();
  const ids = Object.keys(entities);

  it("importované tracklist skladby mají noindex + isStub", () => {
    const imported = ids
      .map((id) => entities[id])
      .filter((e) => e.extraMeta?.generatedFrom === "deezer-tracklist");
    assert.ok(imported.length > 0, "žádné importované skladby — spusť cache:build");
    for (const e of imported) {
      assert.strictEqual(
        e.extraMeta.noindex,
        true,
        `${e.id} nemá noindex:true`,
      );
      assert.strictEqual(e.extraMeta.isStub, true, `${e.id} nemá isStub:true`);
    }
  });

  it("extraMeta není zanořené (regrese: extraMeta.extraMeta)", () => {
    for (const id of ids) {
      const e = entities[id];
      assert.strictEqual(
        e.extraMeta?.extraMeta,
        undefined,
        `${id} má zanořené extraMeta.extraMeta — cache-builder bug`,
      );
    }
  });

  it("importované skladby mají prázdný nebo minimální obsah", () => {
    const imported = ids
      .map((id) => entities[id])
      .filter((e) => e.extraMeta?.generatedFrom === "deezer-tracklist");
    // sanity: jsou to skutečně "stub" entity, ne bohaté profily
    for (const e of imported.slice(0, 50)) {
      assert.ok(
        (e.content ?? "").length < 500,
        `${e.id} má podezřele dlouhý obsah na stub`,
      );
    }
  });
});
