/**
 * Tests for indexation-engine.ts
 * Run with: node --test --import=tsx src/lib/indexation/__tests__/indexation-engine.test.ts
 */

import { describe, it } from "node:test";
import assert from "node:assert";
import { gateByScore } from "../indexation-engine";
import { IndexationState } from "../types";
import { DEFAULT_THRESHOLDS } from "../config";

describe("gateByScore", () => {
  it("returns NOINDEX below candidate threshold", () => {
    assert.strictEqual(gateByScore(10, DEFAULT_THRESHOLDS), IndexationState.NOINDEX);
    assert.strictEqual(gateByScore(19, DEFAULT_THRESHOLDS), IndexationState.NOINDEX);
  });

  it("returns CANDIDATE between candidate and indexable", () => {
    assert.strictEqual(gateByScore(20, DEFAULT_THRESHOLDS), IndexationState.CANDIDATE);
    assert.strictEqual(gateByScore(39, DEFAULT_THRESHOLDS), IndexationState.CANDIDATE);
  });

  it("returns INDEXABLE between indexable and authoritative", () => {
    assert.strictEqual(gateByScore(40, DEFAULT_THRESHOLDS), IndexationState.INDEXABLE);
    assert.strictEqual(gateByScore(69, DEFAULT_THRESHOLDS), IndexationState.INDEXABLE);
  });

  it("returns AUTHORITATIVE at or above authoritative threshold", () => {
    assert.strictEqual(gateByScore(70, DEFAULT_THRESHOLDS), IndexationState.AUTHORITATIVE);
    assert.strictEqual(gateByScore(100, DEFAULT_THRESHOLDS), IndexationState.AUTHORITATIVE);
  });

  it("respects per-type authoritative override", () => {
    // Artist threshold = 60, genre threshold = 80
    assert.strictEqual(gateByScore(65, DEFAULT_THRESHOLDS, 60), IndexationState.AUTHORITATIVE); // artist
    assert.strictEqual(gateByScore(65, DEFAULT_THRESHOLDS, 80), IndexationState.INDEXABLE);     // genre
  });

  it("respects custom thresholds", () => {
    const thresholds = { candidate: 30, indexable: 60, authoritative: 90 };
    assert.strictEqual(gateByScore(29, thresholds), IndexationState.NOINDEX);
    assert.strictEqual(gateByScore(30, thresholds), IndexationState.CANDIDATE);
    assert.strictEqual(gateByScore(60, thresholds), IndexationState.INDEXABLE);
    assert.strictEqual(gateByScore(90, thresholds), IndexationState.AUTHORITATIVE);
  });
});
