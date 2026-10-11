/**
 * Test: noindex gate — entity bez obsahu se nesmí dostat do sitemapy
 * ani být indexovatelné Googlem.
 *
 * Chrání před SEO regresí, kdy import tisíce "tenkých" skladeb zaplaví
 * sitemap a Google penalizuje thin content.
 *
 * Smlouva fáze 3 (od 11. 10. 2026):
 * - Pás C (holá metadata) → noindex+isStub ZŮSTÁVÁ (thin content)
 * - Pás A/B (quality gate prošel) → noindex+isStub SUNDÁN, ale obsah ≥ 400 znaků
 * - Nic indexovatelného nesmí mít thin content
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

  it("importované tracklist skladby: C = noindex+isStub, A/B = bohatý obsah bez noindex", () => {
    const imported = ids
      .map((id) => entities[id])
      .filter((e) => e.extraMeta?.generatedFrom === "deezer-tracklist");
    assert.ok(imported.length > 0, "žádné importované skladby — spusť cache:build");
    for (const e of imported) {
      const em = e.extraMeta ?? {};
      const content = (e.content ?? "").length;
      if (em.phase3Pas === "C") {
        // holá metadata → thin content → musí zůstat stub
        assert.strictEqual(em.noindex, true, `${e.id} (C) nemá noindex:true`);
        assert.strictEqual(em.isStub, true, `${e.id} (C) nemá isStub:true`);
      } else if (em.phase3Pas === "A" || em.phase3Pas === "B") {
        // quality gate prošel → noindex/isStub sundán, ale obsah musí být bohatý
        assert.notStrictEqual(em.noindex, true, `${e.id} (A/B) má stale noindex`);
        assert.notStrictEqual(em.isStub, true, `${e.id} (A/B) má stale isStub`);
        assert.ok(
          content >= 400,
          `${e.id} (A/B) sundaný noindex, ale obsah jen ${content} znaků — thin content indexovatelný!`,
        );
      }
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

  it("žádný indexovatelný TRACK nemá thin content (<400 znaků)", () => {
    // fáze 3 doména = skladby (4 000+ importů = hlavní thin-content riziko).
    // Ostatní typy (alba, žánry, témata) mají strukturovaná data a jsou
    // indexačním enginem hodnoceny jinak — mimo scope tohoto testu.
    for (const id of ids) {
      const e = entities[id];
      if (e.type !== "track") continue;
      const em = e.extraMeta ?? {};
      if (em.noindex === true || em.isDraft === true) continue;
      const content = (e.content ?? "").length;
      assert.ok(
        content >= 400,
        `${id} je indexovatelný bez noindex, ale obsah jen ${content} znaků`,
      );
    }
  });
});
