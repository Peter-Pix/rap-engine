/**
 * Tests for common-ground.ts — pure výpočet přímých shod.
 */

import { describe, it } from "node:test";
import assert from "node:assert";
import {
  computeCommonGround,
  commonGroundVerdict,
  type CommonGroundEntity,
} from "../common-ground";

const ent = (
  id: string,
  over: Partial<CommonGroundEntity> = {},
): CommonGroundEntity => ({
  id,
  type: id.split("_")[0],
  slug: id.split("_").slice(1).join("-"),
  title: id,
  ...over,
});

// malý „svět" entit pro resolve
const WORLD: Record<string, CommonGroundEntity> = {
  artist_a: ent("artist_a", {
    title: "A",
    outbound: {
      HAS_GENRE: ["genre_trap", "genre_street-rap"],
      HAS_STYLE: ["style_melodic"],
      ORIGINATES_FROM: ["location_praha", "location_cesko"],
      RELEASED_BY: ["label_milion-plus"],
    },
  }),
  artist_b: ent("artist_b", {
    title: "B",
    outbound: {
      HAS_GENRE: ["genre_trap", "genre_hardcore-rap"],
      HAS_STYLE: ["style_melodic", "style_hardcore"],
      ORIGINATES_FROM: ["location_brno", "location_cesko"],
      RELEASED_BY: ["label_detektor-records"],
    },
  }),
  genre_trap: ent("genre_trap", { title: "Trap" }),
  "genre_street-rap": ent("genre_street-rap", { title: "Street rap" }),
  "genre_hardcore-rap": ent("genre_hardcore-rap", { title: "Hardcore rap" }),
  style_melodic: ent("style_melodic", { title: "Melodický" }),
  style_hardcore: ent("style_hardcore", { title: "Hardcore" }),
  location_praha: ent("location_praha", { title: "Praha" }),
  location_brno: ent("location_brno", { title: "Brno" }),
  location_cesko: ent("location_cesko", { title: "Česko" }),
  "label_milion-plus": ent("label_milion-plus", { title: "Milion+" }),
  "label_detektor-records": ent("label_detektor-records", { title: "Detektor" }),
};

const resolve = (id: string) => WORLD[id];

describe("computeCommonGround", () => {
  it("najde přímé shody ve žánrech, stylech i lokalitách", () => {
    const r = computeCommonGround(WORLD.artist_a, WORLD.artist_b, resolve);
    const byKey = Object.fromEntries(r.groups.map((g) => [g.key, g.items]));

    assert.deepStrictEqual(byKey.genres?.map((i) => i.title), ["Trap"]);
    assert.deepStrictEqual(byKey.styles?.map((i) => i.title), ["Melodický"]);
    assert.deepStrictEqual(byKey.locations?.map((i) => i.title), ["Česko"]);
  });

  it("řadí skupiny podle relevance (žánry před lokalitami)", () => {
    const r = computeCommonGround(WORLD.artist_a, WORLD.artist_b, resolve);
    const keys = r.groups.map((g) => g.key);
    assert.ok(keys.indexOf("genres") < keys.indexOf("locations"));
  });

  it("staví správné URL pro shody", () => {
    const r = computeCommonGround(WORLD.artist_a, WORLD.artist_b, resolve);
    const trap = r.groups.find((g) => g.key === "genres")!.items[0];
    assert.strictEqual(trap.url, "/zanry/trap");
  });

  it("sčítá totalShared napříč skupinami", () => {
    const r = computeCommonGround(WORLD.artist_a, WORLD.artist_b, resolve);
    // Trap + Melodický + Česko = 3
    assert.strictEqual(r.totalShared, 3);
    assert.strictEqual(r.isEmpty, false);
  });

  it("vrátí prázdný výsledek, když není shoda", () => {
    const lonely = ent("artist_c", {
      outbound: { HAS_GENRE: ["genre_unique"] },
    });
    const r = computeCommonGround(lonely, WORLD.artist_a, resolve);
    assert.strictEqual(r.isEmpty, true);
    assert.strictEqual(r.totalShared, 0);
    assert.strictEqual(r.groups.length, 0);
  });

  it("přeskočí shodu, když resolve nezná entitu", () => {
    const a = ent("artist_x", { outbound: { HAS_GENRE: ["genre_ghost"] } });
    const b = ent("artist_y", { outbound: { HAS_GENRE: ["genre_ghost"] } });
    const r = computeCommonGround(a, b, () => undefined);
    assert.strictEqual(r.isEmpty, true);
  });

  it("zvládne entity bez outbound", () => {
    const r = computeCommonGround(
      ent("artist_a2"),
      ent("artist_b2"),
      resolve,
    );
    assert.strictEqual(r.isEmpty, true);
  });

  it("je symetrický (A×B == B×A)", () => {
    const ab = computeCommonGround(WORLD.artist_a, WORLD.artist_b, resolve);
    const ba = computeCommonGround(WORLD.artist_b, WORLD.artist_a, resolve);
    assert.strictEqual(ab.totalShared, ba.totalShared);
    assert.deepStrictEqual(
      ab.groups.map((g) => g.key),
      ba.groups.map((g) => g.key),
    );
  });
});

describe("commonGroundVerdict", () => {
  it("vrací text pro nula shod", () => {
    assert.match(commonGroundVerdict({ groups: [], totalShared: 0, isEmpty: true }), /Žádná/);
  });

  it("škádluje podle počtu shod", () => {
    assert.match(commonGroundVerdict({ groups: [], totalShared: 1, isEmpty: false }), /Jedna/);
    assert.match(commonGroundVerdict({ groups: [], totalShared: 10, isEmpty: false }), /dvojčata/);
  });
});

// ─── computeSharedTracks ────────────────────────────────────────────────────

import { computeSharedTracks, trackRoleLabel } from "../common-ground";

const track = (
  id: string,
  outbound: Record<string, string[]>,
  title = id,
): CommonGroundEntity => ({
  id,
  type: "track",
  slug: id.replace(/^track_/, ""),
  title,
  outbound,
});

describe("computeSharedTracks", () => {
  const resolve = (id: string) =>
    ({
      artist_a: { id: "artist_a", type: "artist", slug: "a", title: "A" },
      artist_b: { id: "artist_b", type: "artist", slug: "b", title: "B" },
    })[id];

  it("najde skladbu, kde je A primární a B host", () => {
    const tracks = [
      track("track_1", { HAS_ARTIST: ["artist_a"], FEATURES: ["artist_b"] }, "Společná"),
      track("track_2", { HAS_ARTIST: ["artist_a"] }, "Sólo A"),
    ];
    const r = computeSharedTracks("artist_a", "artist_b", tracks, resolve);
    assert.strictEqual(r.length, 1);
    assert.strictEqual(r[0].title, "Společná");
    assert.strictEqual(r[0].roleA, "primary");
    assert.strictEqual(r[0].roleB, "feature");
  });

  it("najde skladbu, kde jsou oba hosté", () => {
    const tracks = [
      track("track_1", { HAS_ARTIST: ["artist_x"], FEATURES: ["artist_a", "artist_b"] }),
    ];
    const r = computeSharedTracks("artist_a", "artist_b", tracks, resolve);
    assert.strictEqual(r.length, 1);
    assert.strictEqual(r[0].roleA, "feature");
    assert.strictEqual(r[0].roleB, "feature");
    assert.strictEqual(r[0].primaryTitle, undefined); // x není v resolve
  });

  it("nevrátí skladbu, kde je jen jeden", () => {
    const tracks = [track("track_1", { HAS_ARTIST: ["artist_a"] })];
    const r = computeSharedTracks("artist_a", "artist_b", tracks, resolve);
    assert.strictEqual(r.length, 0);
  });

  it("řadí podle titulu a staví URL", () => {
    const tracks = [
      track("track_zzz", { HAS_ARTIST: ["artist_a"], FEATURES: ["artist_b"] }, "Zebra"),
      track("track_aaa", { HAS_ARTIST: ["artist_a"], FEATURES: ["artist_b"] }, "Ahoj"),
    ];
    const r = computeSharedTracks("artist_a", "artist_b", tracks, resolve);
    assert.deepStrictEqual(r.map((x) => x.title), ["Ahoj", "Zebra"]);
    assert.strictEqual(r[0].url, "/skladby/aaa");
  });

  it("je symetrická", () => {
    const tracks = [
      track("track_1", { HAS_ARTIST: ["artist_a"], FEATURES: ["artist_b"] }),
    ];
    const ab = computeSharedTracks("artist_a", "artist_b", tracks, resolve);
    const ba = computeSharedTracks("artist_b", "artist_a", tracks, resolve);
    assert.strictEqual(ab.length, ba.length);
    assert.strictEqual(ba[0].roleA, "feature");
    assert.strictEqual(ba[0].roleB, "primary");
  });
});

describe("trackRoleLabel", () => {
  it("přeloží role do češtiny", () => {
    assert.strictEqual(trackRoleLabel("primary"), "autor");
    assert.strictEqual(trackRoleLabel("feature"), "host");
    assert.strictEqual(trackRoleLabel("both"), "host i autor");
  });
});

// ─── computeIndirectPath (Fáze 5) ──────────────────────────────────────────

import { computeIndirectPath } from "../common-ground";

describe("computeIndirectPath", () => {
  // Graf spolupráce: A spolupracoval s X, X spolupracoval s B.
  const OUTBOUND: Record<string, Record<string, string[]>> = {
    artist_a: { RELATED_TO: ["artist_x"] },
    artist_x: { RELATED_TO: ["artist_a", "artist_b"] },
    artist_b: { RELATED_TO: ["artist_x"] },
    artist_a2: { RELATED_TO: ["artist_y"] },
    artist_y: { RELATED_TO: ["artist_a2"] },
    // přes skladbu: C a D hostují na stejném tracku
    track_shared: {
      HAS_ARTIST: ["artist_c"],
      FEATURES: ["artist_d"],
    },
    artist_c: { RELATED_TO: [] },
    artist_d: { RELATED_TO: [] },
  };

  const RESOLVE: Record<string, CommonGroundEntity> = {
    artist_a: ent("artist_a", { title: "A" }),
    artist_x: ent("artist_x", { title: "X" }),
    artist_b: ent("artist_b", { title: "B" }),
    artist_c: ent("artist_c", { title: "C" }),
    artist_d: ent("artist_d", { title: "D" }),
    artist_a2: ent("artist_a2", { title: "A2" }),
    artist_y: ent("artist_y", { title: "Y" }),
    track_shared: { id: "track_shared", type: "track", slug: "shared", title: "Shared" },
  };
  const resolve = (id: string) => RESOLVE[id];

  it("najde nepřímou cestu přes společný kontakt", () => {
    const r = computeIndirectPath("artist_a", "artist_b", OUTBOUND, resolve);
    assert.ok(r);
    assert.ok(r!.length >= 1);
    // Cesta musí projít přes X (společný kontakt).
    assert.ok(r!.hops.some((h) => h.viaId === "artist_x"));
  });

  it("vrátí null, když cesta neexistuje", () => {
    const r = computeIndirectPath("artist_a2", "artist_b", OUTBOUND, resolve);
    assert.strictEqual(r, null);
  });

  it("vrátí null pro stejné umělce", () => {
    const r = computeIndirectPath("artist_a", "artist_a", OUTBOUND, resolve);
    assert.strictEqual(r, null);
  });

  it("najde cestu přes sdílenou skladbu (track prostředník)", () => {
    const r = computeIndirectPath("artist_c", "artist_d", OUTBOUND, resolve);
    assert.ok(r);
    // track_shared je prostředník.
    assert.ok(r!.hops.some((h) => h.viaId === "track_shared"));
  });

  it("staví URL a titulek mezistanice", () => {
    const r = computeIndirectPath("artist_a", "artist_b", OUTBOUND, resolve);
    assert.ok(r);
    const x = r!.hops.find((h) => h.viaId === "artist_x");
    assert.ok(x);
    assert.strictEqual(x!.viaTitle, "X");
    assert.strictEqual(x!.viaUrl, "/raperi/x");
  });
});
