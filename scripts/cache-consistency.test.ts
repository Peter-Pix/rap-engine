/**
 * Test na build cache konzistenci.
 *
 * Ověří, že build cache (.content-cache/) je novější než poslední MDX edit
 * v content/. Pokud je nějaký MDX soubor novější než cache, cache je
 * zastaralá a build by použil nekonzistentní data.
 *
 * Gate: nejstarší cache soubor musí být >= nejnovější MDX soubor.
 *
 * Run with: node --test --import=tsx scripts/cache-consistency.test.ts
 */

import { describe, it } from "node:test";
import assert from "node:assert";
import { readdirSync, statSync, existsSync } from "node:fs";
import { join } from "node:path";

const ROOT = process.cwd();
const CONTENT_DIR = join(ROOT, "content");
const CACHE_DIR = join(ROOT, ".content-cache");

/** Rekurzivně najde všechny soubory s danou příponou a vrátí [path, mtimeMs]. */
function collectFiles(dir: string, ext: string, out: Array<[string, number]>): void {
  if (!existsSync(dir)) return;
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    const p = join(dir, entry.name);
    if (entry.isDirectory()) {
      collectFiles(p, ext, out);
    } else if (entry.isFile() && entry.name.endsWith(ext)) {
      out.push([p, statSync(p).mtimeMs]);
    }
  }
}

describe("build cache consistency", () => {
  it("cache is newer than the latest MDX edit in content/", () => {
    // 1. Nejnovější MDX edit
    const mdxFiles: Array<[string, number]> = [];
    collectFiles(CONTENT_DIR, ".mdx", mdxFiles);
    assert.ok(mdxFiles.length > 0, "no MDX files found in content/");
    const latestMdx = Math.max(...mdxFiles.map(([, t]) => t));

    // 2. Nejstarší cache soubor (všechny musí být novější než poslední MDX edit)
    const cacheFiles = readdirSync(CACHE_DIR).filter((f) => f.endsWith(".json"));
    assert.ok(cacheFiles.length > 0, "no cache files found in .content-cache/");
    const oldestCache = Math.min(
      ...cacheFiles.map((f) => statSync(join(CACHE_DIR, f)).mtimeMs),
    );

    // 3. Gate: cache nesmí být starší než poslední MDX edit
    assert.ok(
      oldestCache >= latestMdx,
      `cache is STALE: latest MDX edit (${new Date(latestMdx).toISOString()}) ` +
        `is newer than oldest cache file (${new Date(oldestCache).toISOString()}). ` +
        `Run "npm run cache:build" to rebuild.`,
    );
  });
});
