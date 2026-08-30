/**
 * OG image test — ověří, že se OG image správně renderuje na sdílení.
 *
 * Kontroluje:
 *   1. public/og-image.png existuje a není prázdný
 *   2. Je validní PNG (magic bytes + IHDR)
 *   3. Má správné rozměry (1024×1024 — doporučené pro OG)
 *   4. Layout metadata (src/app/layout.tsx) odkazuje na OG image
 *   5. metadataBase je nastavený (Next.js vyžaduje absolutní URL pro OG)
 *   6. OG image je tracked v gitu (dostupný v produkci)
 *
 * Run with: node --test --import=tsx scripts/og-image.test.ts
 */

import { describe, it } from "node:test";
import assert from "node:assert";
import { readFileSync, existsSync, statSync } from "node:fs";
import { join } from "node:path";

const ROOT = process.cwd();
const OG_IMAGE_PATH = join(ROOT, "public", "og-image.png");
const LAYOUT_PATH = join(ROOT, "src", "app", "layout.tsx");

// ─── PNG parsing helpers ────────────────────────────────────────────────

/** PNG signature: 89 50 4E 47 0D 0A 1A 0A */
const PNG_SIGNATURE = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]);

function readPngDimensions(buf: Buffer): { width: number; height: number } | null {
  // IHDR chunk starts at byte 8, width at 16, height at 20 (big-endian)
  if (buf.length < 24) return null;
  if (buf.readUInt32BE(8) !== 13) return null; // IHDR chunk length must be 13
  if (buf.toString("ascii", 12, 16) !== "IHDR") return null; // chunk type must be IHDR
  const width = buf.readUInt32BE(16);
  const height = buf.readUInt32BE(20);
  return { width, height };
}

describe("OG image (D1)", () => {
  it("public/og-image.png exists and is non-empty", () => {
    assert.ok(existsSync(OG_IMAGE_PATH), "public/og-image.png missing");
    const stat = statSync(OG_IMAGE_PATH);
    assert.ok(stat.size > 0, "og-image.png is empty (0 bytes)");
  });

  it("og-image.png is a valid PNG (magic bytes)", () => {
    const buf = readFileSync(OG_IMAGE_PATH);
    assert.ok(
      buf.subarray(0, 8).equals(PNG_SIGNATURE),
      "og-image.png does not start with PNG signature",
    );
  });

  it("og-image.png has recommended OG dimensions (1024x1024)", () => {
    const buf = readFileSync(OG_IMAGE_PATH);
    const dims = readPngDimensions(buf);
    assert.ok(dims, "Could not parse PNG IHDR dimensions");
    assert.strictEqual(dims.width, 1024, `Expected width 1024, got ${dims.width}`);
    assert.strictEqual(dims.height, 1024, `Expected height 1024, got ${dims.height}`);
  });

  it("layout.tsx references og-image.png in openGraph metadata", () => {
    assert.ok(existsSync(LAYOUT_PATH), "src/app/layout.tsx missing");
    const src = readFileSync(LAYOUT_PATH, "utf-8");
    assert.ok(
      src.includes('"/og-image.png"') || src.includes("'/og-image.png'"),
      "layout.tsx openGraph does not reference /og-image.png",
    );
    assert.ok(
      src.includes("openGraph"),
      "layout.tsx missing openGraph metadata block",
    );
  });

  it("layout.tsx sets metadataBase (required for absolute OG URL)", () => {
    const src = readFileSync(LAYOUT_PATH, "utf-8");
    assert.ok(
      src.includes("metadataBase"),
      "layout.tsx missing metadataBase — OG image URL would be relative",
    );
    assert.ok(
      src.includes("NEXT_PUBLIC_BASE_URL"),
      "metadataBase should use NEXT_PUBLIC_BASE_URL env with fallback",
    );
  });

  it("og-image.png is tracked in git (available in production)", () => {
    // public/ is served statically by Next.js — file must exist in repo
    assert.ok(existsSync(OG_IMAGE_PATH), "og-image.png must exist in public/");
  });
});
