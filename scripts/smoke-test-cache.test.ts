/**
 * Smoke test content cache.
 *
 * Ověří, že build cache (.content-cache/) je přítomná, validní JSON
 * a má očekávané struktury. Toto je minimální gate — pokud cache chybí
 * nebo je poškozená, build by selhal.
 *
 * Run with: node --test --import=tsx scripts/smoke-test-cache.test.ts
 */

import { describe, it } from "node:test";
import assert from "node:assert";
import { readFileSync, existsSync } from "node:fs";
import { join } from "node:path";

const CACHE_DIR = join(process.cwd(), ".content-cache");

const REQUIRED_FILES = [
  "entities.json",
  "graph.json",
  "inbound.json",
  "routes.json",
  "search-index.json",
];

function readJson(name: string): unknown {
  const p = join(CACHE_DIR, name);
  assert.ok(existsSync(p), `Cache file missing: ${name}`);
  return JSON.parse(readFileSync(p, "utf-8"));
}

describe("content cache smoke test", () => {
  it("all required cache files exist", () => {
    for (const f of REQUIRED_FILES) {
      assert.ok(existsSync(join(CACHE_DIR, f)), `Missing cache file: ${f}`);
    }
  });

  it("entities.json is a valid object with entities", () => {
    const entities = readJson("entities.json");
    assert.ok(typeof entities === "object" && entities !== null, "entities.json must be an object");
    const ids = Object.keys(entities);
    assert.ok(ids.length > 0, "entities.json must contain at least one entity");
    // Each entity must have required fields
    for (const id of ids.slice(0, 50)) {
      const e = entities[id];
      assert.ok(e.id === id, `entity ${id}: id mismatch`);
      assert.ok(typeof e.type === "string" && e.type.length > 0, `entity ${id}: missing type`);
      assert.ok(typeof e.slug === "string" && e.slug.length > 0, `entity ${id}: missing slug`);
      assert.ok(typeof e.title === "string" && e.title.length > 0, `entity ${id}: missing title`);
    }
  });

  it("graph.json is a valid array of edges", () => {
    const graph = readJson("graph.json");
    assert.ok(Array.isArray(graph), "graph.json must be an array");
    for (const edge of graph.slice(0, 50)) {
      assert.ok(typeof edge.from === "string", "edge missing from");
      assert.ok(typeof edge.to === "string", "edge missing to");
      assert.ok(typeof edge.relation === "string", "edge missing relation");
    }
  });

  it("inbound.json is a valid object", () => {
    const inbound = readJson("inbound.json");
    assert.ok(typeof inbound === "object" && inbound !== null, "inbound.json must be an object");
  });

  it("routes.json is a valid object with route→id mapping", () => {
    const routes = readJson("routes.json");
    assert.ok(typeof routes === "object" && routes !== null, "routes.json must be an object");
    const entries = Object.entries(routes);
    assert.ok(entries.length > 0, "routes.json must contain routes");
    for (const [route, id] of entries.slice(0, 50)) {
      assert.ok(route.startsWith("/"), `route must start with /: ${route}`);
      assert.ok(typeof id === "string" && id.length > 0, `route ${route}: invalid id`);
    }
  });

  it("search-index.json is a valid array", () => {
    const idx = readJson("search-index.json");
    assert.ok(Array.isArray(idx), "search-index.json must be an array");
    for (const entry of idx.slice(0, 50)) {
      assert.ok(typeof entry.id === "string", "search entry missing id");
      assert.ok(typeof entry.title === "string", "search entry missing title");
    }
  });
});
