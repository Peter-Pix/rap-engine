/**
 * Tests for seo-score.ts
 * Run with: node --test --import=tsx src/lib/indexation/__tests__/seo-score.test.ts
 */

import { describe, it } from "node:test";
import assert from "node:assert";
import { extractSignals, computeSeoScore } from "../seo-score";
import { DEFAULT_WEIGHTS } from "../config";
import type { SeoSignals, ScoreWeights } from "../types";

// ─── Fixtures ───────────────────────────────────────────────────────────

function makeEntity(overrides: Partial<any> = {}): any {
  return {
    id: "artist_test",
    type: "artist",
    slug: "test",
    title: "Test Artist",
    description: "A test artist description",
    content: "Some MDX content here.",
    outbound: {},
    image: null,
    extraMeta: {},
    ...overrides,
  };
}

// ─── extractSignals ─────────────────────────────────────────────────────

describe("extractSignals", () => {
  it("returns zeroed signals for a bare-bones entity", () => {
    const entity = makeEntity({ description: "", content: "" });
    const signals = extractSignals(entity, []);
    assert.strictEqual(signals.descriptionLength, 0);
    assert.strictEqual(signals.hasImage, false);
    assert.strictEqual(signals.hasFaq, false);
    assert.strictEqual(signals.hasSchema, true); // not stub / not draft
    assert.strictEqual(signals.relationCount, 0);
    assert.strictEqual(signals.backlinkCount, 0);
    assert.strictEqual(signals.contentLength, 0);
    assert.strictEqual(signals.profileCompleteness, 0);
  });

  it("detects image from entity.image", () => {
    const entity = makeEntity({ image: "https://example.com/cover.jpg" });
    const signals = extractSignals(entity, []);
    assert.strictEqual(signals.hasImage, true);
  });

  it("detects image from extraMeta.profileImageUrl", () => {
    const entity = makeEntity({ extraMeta: { profileImageUrl: "/img.webp" } });
    const signals = extractSignals(entity, []);
    assert.strictEqual(signals.hasImage, true);
  });

  it("detects FAQ in markdown content", () => {
    const entity = makeEntity({ content: "## Časté otázky\n\nQ: What?\nA: Yes." });
    const signals = extractSignals(entity, []);
    assert.strictEqual(signals.hasFaq, true);
  });

  it("counts outbound relations", () => {
    const entity = makeEntity({
      outbound: {
        HAS_ALBUM: ["album_a", "album_b"],
        HAS_GENRE: ["genre_trap"],
      },
    });
    const signals = extractSignals(entity, []);
    assert.strictEqual(signals.relationCount, 3);
  });

  it("counts inbound backlinks", () => {
    const entity = makeEntity();
    const signals = extractSignals(entity, ["a", "b", "c"]);
    assert.strictEqual(signals.backlinkCount, 3);
  });

  it("marks stub/draft as no schema", () => {
    const stub = makeEntity({ extraMeta: { isStub: true } });
    const draft = makeEntity({ extraMeta: { status: "draft" } });
    assert.strictEqual(extractSignals(stub, []).hasSchema, false);
    assert.strictEqual(extractSignals(draft, []).hasSchema, false);
  });
});

// ─── computeSeoScore ──────────────────────────────────────────────────────

describe("computeSeoScore", () => {
  it("returns 0 for zeroed signals", () => {
    const signals: SeoSignals = {
      descriptionLength: 0,
      hasImage: false,
      hasFaq: false,
      hasSchema: false,
      relationCount: 0,
      backlinkCount: 0,
      contentLength: 0,
      profileCompleteness: 0,
    };
    assert.strictEqual(computeSeoScore(signals, DEFAULT_WEIGHTS), 0);
  });

  it("returns 100 for perfect signals", () => {
    const signals: SeoSignals = {
      descriptionLength: 200, // > 160
      hasImage: true,
      hasFaq: true,
      hasSchema: true,
      relationCount: 15, // > 10
      backlinkCount: 8, // > 5
      contentLength: 5000, // > 2000
      profileCompleteness: 100,
    };
    assert.strictEqual(computeSeoScore(signals, DEFAULT_WEIGHTS), 100);
  });

  it("is deterministic — same inputs → same output", () => {
    const signals: SeoSignals = {
      descriptionLength: 80,
      hasImage: true,
      hasFaq: false,
      hasSchema: true,
      relationCount: 5,
      backlinkCount: 2,
      contentLength: 1000,
      profileCompleteness: 50,
    };
    const a = computeSeoScore(signals, DEFAULT_WEIGHTS);
    const b = computeSeoScore(signals, DEFAULT_WEIGHTS);
    assert.strictEqual(a, b);
  });

  it("respects custom weights", () => {
    const signals: SeoSignals = {
      descriptionLength: 0,
      hasImage: true, // 50 pts
      hasFaq: false,
      hasSchema: false,
      relationCount: 0,
      backlinkCount: 0,
      contentLength: 0,
      profileCompleteness: 0,
    };
    const weights: ScoreWeights = {
      ...DEFAULT_WEIGHTS,
      description: 0,
      image: 50,
      faq: 0,
      schema: 0,
      relations: 0,
      backlinks: 0,
      content: 0,
      profile: 0,
    };
    assert.strictEqual(computeSeoScore(signals, weights), 50);
  });
});
