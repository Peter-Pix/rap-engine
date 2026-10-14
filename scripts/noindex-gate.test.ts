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

  it("faktický gate: index ⟸ fakta (album+artist+délka+žánr/label) A obsah ≥400", () => {
    // Gate NESMÍ stát na AI klasifikaci (phase3Pas z Rap Monitoru = AI odhad).
    // Autorita = objektivní fakta + dostatečný obsah (no thin content).
    for (const id of ids) {
      const e = entities[id];
      if (e.type !== "track") continue;
      const em = e.extraMeta ?? {};
      const rel = e.outbound ?? {};
      const content = (e.content ?? "").length;
      const hasFacts =
        (rel.HAS_ARTIST ?? []).length > 0 &&
        Boolean(em.duration) &&
        ((rel.HAS_GENRE ?? []).length > 0 ||
          (rel.RELEASED_BY ?? []).length > 0 ||
          (rel.FEATURES ?? []).length > 0 ||
          (rel.PRODUCED_BY ?? []).length > 0);
      const indexable = hasFacts && content >= 400;

      if (indexable) {
        assert.notStrictEqual(em.isStub, true, `${id} je indexovatelný (fakta+obsah), ale je stub`);
        assert.notStrictEqual(em.noindex, true, `${id} je indexovatelný (fakta+obsah), ale má noindex`);
      } else {
        assert.strictEqual(
          em.noindex === true || em.isStub === true,
          true,
          `${id} není indexovatelný (chybí fakta nebo obsah <400), ale nemá noindex`,
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
