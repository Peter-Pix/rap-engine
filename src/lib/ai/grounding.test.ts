import { test } from "node:test";
import assert from "node:assert/strict";
import { buildGraphIndex, computeFacts } from "./grounding";
import type { CacheEntities } from "@/lib/content/cache-builder";
import type { GraphEdge } from "@/lib/content/types";
import type { ResolvedEntity } from "./types";

/**
 * Regresní test: spolupráce se počítá ze SDÍLENÝCH SKLADEB (HAS_ARTIST/FEATURES),
 * NIKDY z RELATED_TO. Dřív AI hlásila „6 spolupracovníků" jen podle graph blízkosti,
 * i když spolu nic nenahráli → to byla chyba, kterou uživatel nahlásil.
 */

const ent = (id: string, type: string, title: string): CacheEntities[string] => ({
  id, type, slug: id.replace(/^[a-z]+_/, ""), title,
  description: `${title}`, content: `${title} content`, outbound: {},
});

const entities: CacheEntities = {
  artist_a: ent("artist_a", "artist", "A"),
  artist_b: ent("artist_b", "artist", "B"),
  artist_c: ent("artist_c", "artist", "C"),
  // 2 společné skladby A+B (1× primární+feat, 1× feat+feat)
  track_1: { ...ent("track_1", "track", "Společná 1"),
    outbound: { HAS_ARTIST: ["artist_a"], FEATURES: ["artist_b"] } },
  track_2: { ...ent("track_2", "track", "Společná 2"),
    outbound: { HAS_ARTIST: ["artist_x"], FEATURES: ["artist_a", "artist_b"] } },
  // 1 společná A+C
  track_3: { ...ent("track_3", "track", "Společná 3"),
    outbound: { HAS_ARTIST: ["artist_a", "artist_c"], FEATURES: [] } },
  // RELATED_TO blízkost A<->C, ale BEZ společné skladby → nesmí se počítat
  artist_d: ent("artist_d", "artist", "D"),
};

const graph: GraphEdge[] = [
  { from: "track_1", relation: "HAS_ARTIST", to: "artist_a" },
  { from: "track_1", relation: "FEATURES", to: "artist_b" },
  { from: "track_2", relation: "FEATURES", to: "artist_a" },
  { from: "track_2", relation: "FEATURES", to: "artist_b" },
  { from: "track_3", relation: "HAS_ARTIST", to: "artist_a" },
  { from: "track_3", relation: "HAS_ARTIST", to: "artist_c" },
  // blízkost bez featů:
  { from: "artist_a", relation: "RELATED_TO", to: "artist_d" },
];

const mk = (id: string, type: string): ResolvedEntity => ({
  id, type, title: entities[id]?.title ?? id, slug: id, score: 100, via: "exact",
});
const focus: ResolvedEntity[] = [mk("artist_a", "artist")];

test("computeFacts: spolupráce = počet sdílených skladeb, ne RELATED_TO", () => {
  const gi = buildGraphIndex(graph);
  const out = computeFacts(entities, gi, focus);
  assert.match(out, /B \(2 skl\.\)/, "A+B mají 2 společné skladby");
  assert.match(out, /C \(1 skl\.\)/, "A+C mají 1 společnou skladbu");
  assert.ok(!out.includes("D ("), "RELATED_TO bez společné skladby se nepočítá");
  assert.ok(!out.includes("spolupracovníkům"), "nesmí použít staré slovo");
});

test("computeFacts: bez společných skladeb vrátí explicitní nulu", () => {
  const gi = buildGraphIndex(graph);
  const out = computeFacts(entities, gi, [mk("artist_d", "artist")]);
  assert.match(out, /[Žž]ádné doložené společné skladby/);
});
