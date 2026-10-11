import { test } from "node:test";
import assert from "node:assert/strict";
import { AskCache } from "./cache";
import type { AskResult } from "./types";

function fakeResult(answer: string): AskResult {
  return {
    answer,
    sources: [],
    refused: false,
    verified: true,
    meta: { latencyMs: 10, model: "test", attempts: 1 },
  };
}

test("cache vrátí uloženou odpověď", () => {
  const c = new AskCache();
  c.set("Kolik skladeb má ADiss?", fakeResult("89"));
  const hit = c.get("Kolik skladeb má ADiss?");
  assert.equal(hit?.answer, "89");
});

test("cache normalizuje dotaz (diakritika, velikost)", () => {
  const c = new AskCache();
  c.set("Kolik skladeb má ADiss?", fakeResult("89"));
  assert.ok(c.get("kolik SKLADEB ma adiss?"));
});

test("cache miss u jiného dotazu", () => {
  const c = new AskCache();
  c.set("a", fakeResult("x"));
  assert.equal(c.get("b"), null);
});

test("cache respektuje TTL", () => {
  const c = new AskCache({ ttlMs: -1 }); // hned expiruje
  c.set("q", fakeResult("x"));
  assert.equal(c.get("q"), null);
});

test("LRU evikce při přetečení", () => {
  const c = new AskCache({ max: 2 });
  c.set("q1", fakeResult("1"));
  c.set("q2", fakeResult("2"));
  c.set("q3", fakeResult("3"));
  assert.equal(c.stats().size, 2);
  assert.equal(c.get("q1"), null); // nejstarší vypadl
  assert.ok(c.get("q3"));
});
