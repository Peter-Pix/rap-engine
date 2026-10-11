import { test } from "node:test";
import assert from "node:assert/strict";
import { validateAnswer } from "./validate";
import type { CacheEntities } from "@/lib/content/cache-builder";
import type { GroundingContext } from "./types";

// Malý fake KG
const entities: CacheEntities = {
  artist_adiss: {
    id: "artist_adiss", type: "artist", slug: "adiss", title: "ADiss",
    description: "Slovenský rapper.", content: "ADiss je rapper.", outbound: {},
  },
  artist_majk: {
    id: "artist_majk", type: "artist", slug: "majk-spirit", title: "Majk Spirit",
    description: "Slovenský rapper.", content: "Majk Spirit je rapper.", outbound: {},
  },
  track_marec: {
    id: "track_marec", type: "track", slug: "adiss-marec", title: "Marec",
    description: "Track.", content: "Text.", outbound: {},
  },
};

const ctx: GroundingContext = {
  text: "...",
  edges: "...",
  computed: "...",
  allowedIds: new Set(["artist_adiss", "artist_majk", "track_marec"]),
  allowedUrls: new Set(["/raperi/adiss", "/raperi/majk-spirit", "/skladby/adiss-marec"]),
};

test("validní odpověď s povolenými entitami projde", () => {
  const ans = "ADiss spolupracoval s **Majk Spirit**. Více: [ADiss](/raperi/adiss)";
  const r = validateAnswer(ans, ctx, entities);
  assert.equal(r.ok, true, JSON.stringify(r.violations));
});

test("vymyšlená entita v bold → violation", () => {
  const ans = "ADiss spolupracoval s **Zzqx Pufrt** a **Majk Spirit**.";
  const r = validateAnswer(ans, ctx, entities);
  assert.equal(r.ok, false);
  assert.ok(r.violations.some((v) => v.includes("Zzqx Pufrt")));
});

test("vymyšlená URL → violation", () => {
  const ans = "Více: [Někdo](/raperi/neexistujici-clovek)";
  const r = validateAnswer(ans, ctx, entities);
  assert.equal(r.ok, false);
  assert.ok(r.violations.some((v) => v.includes("neexistujici-clovek")));
});

test("holá vymyšlená URL v textu → violation", () => {
  const ans = "Více na /raperi/vymysleny-rapper";
  const r = validateAnswer(ans, ctx, entities);
  assert.equal(r.ok, false);
});

test("běžná slova nejsou hlášena jako halucinace", () => {
  const ans = "**Rap** je **žánr**, **album** vyšlo v **Česko**.";
  const r = validateAnswer(ans, ctx, entities);
  assert.equal(r.ok, true, JSON.stringify(r.violations));
});

test("externí http odkazy se nehlásí", () => {
  const ans = "Zdroj: [Spotify](https://open.spotify.com/track/xyz)";
  const r = validateAnswer(ans, ctx, entities);
  assert.equal(r.ok, true, JSON.stringify(r.violations));
});

test("částečná shoda jména projde (Majk Spirit vs Majk Spirit (rapper))", () => {
  const ans = "**Majk Spirit** je slovenský rapper.";
  const r = validateAnswer(ans, ctx, entities);
  assert.equal(r.ok, true, JSON.stringify(r.violations));
});

// ─── Regresní testy: falešné positive, které spike odhalil ─────────────────

test("REGrese: čísla v bold se nehlásí jako entita", () => {
  const ans = "ADiss má **89 vlastních skladeb** a **1 hostování** v cizích skladbách.";
  const r = validateAnswer(ans, ctx, entities);
  assert.equal(r.ok, true, JSON.stringify(r.violations));
});

test("REGrese: běžná slova v bold (vlastních skladeb) nejsou entita", () => {
  const ans = "Má **vlastní skladby** a **hostování**.";
  const r = validateAnswer(ans, ctx, entities);
  assert.equal(r.ok, true, JSON.stringify(r.violations));
});

test("REGrese: 'vlastních skladeb' s číslem → OK", () => {
  const ans = "Celkem **2 vlastních skladeb**.";
  const r = validateAnswer(ans, ctx, entities);
  assert.equal(r.ok, true, JSON.stringify(r.violations));
});

test("stále chytá vymyšlené jméno i s číslem okolo", () => {
  const ans = "Má 89 skladeb a spolupracoval s **Zzqx Pufrt** a **Majk Spirit**.";
  const r = validateAnswer(ans, ctx, entities);
  assert.equal(r.ok, false);
  assert.ok(r.violations.some((v) => v.includes("Zzqx Pufrt")));
});
