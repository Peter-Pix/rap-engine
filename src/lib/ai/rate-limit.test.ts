import { test } from "node:test";
import assert from "node:assert/strict";
import { RateLimiter } from "./rate-limit";

test("rate limiter povolí burst do kapacity", () => {
  const rl = new RateLimiter({ capacity: 3, refillPerSec: 0.1 });
  assert.equal(rl.check("a").allowed, true);
  assert.equal(rl.check("a").allowed, true);
  assert.equal(rl.check("a").allowed, true);
  assert.equal(rl.check("a").allowed, false);
});

test("rate limiter izoluje identity", () => {
  const rl = new RateLimiter({ capacity: 1, refillPerSec: 0.1 });
  assert.equal(rl.check("a").allowed, true);
  assert.equal(rl.check("b").allowed, true);
  assert.equal(rl.check("a").allowed, false);
});

test("rate limiter vrátí retryAfter při vyčerpání", () => {
  const rl = new RateLimiter({ capacity: 1, refillPerSec: 0.5 });
  rl.check("x");
  const r = rl.check("x");
  assert.equal(r.allowed, false);
  assert.ok((r.retryAfterSec ?? 0) >= 1);
});
