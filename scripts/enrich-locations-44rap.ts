/**
 * 44rap location enrichment.
 *
 * Projde RKG umělce bez location, hledá je v 44rap,
 * doplňuje city/origin do meta.json + relations.locations.
 *
 * Append-only: pouze přidává chybějící pole, nikdy nepřepisuje.
 */

import { readFile, writeFile, mkdir, readdir, copyFile } from "fs/promises";
import { join } from "path";
import { createHash } from "crypto";
import { existsSync } from "fs";

const CONTENT_ROOT = "/Users/petrpiskacek/.openclaw/workspace/rap-knowledge-graph/content/entities";
const BACKUP_ROOT = "/Users/petrpiskacek/.openclaw/workspace/rap-knowledge-graph/.backups/location-44rap";

const DEEZER_BASE = "https://api.deezer.com"; // not used
const API_KEY = "b9d03638f3df4fe49ee5e75ab26d0803";
const API_BASE = "https://44rap.base44.app/api";

function normalize(s: string): string {
  return s
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, "");
}

function slugify(s: string): string {
  return s
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");
}

async function backup(path: string) {
  if (!existsSync(path)) return null;
  const content = await readFile(path, "utf-8");
  const hash = createHash("md5").update(content).digest("hex").slice(0, 8);
  const filename = path.split("/").pop();
  await mkdir(BACKUP_ROOT, { recursive: true });
  const backupPath = join(BACKUP_ROOT, `${filename}_${Date.now()}_${hash}`);
  await copyFile(path, backupPath);
  return backupPath;
}

interface Base44Rapper {
  artist_name: string;
  city?: string;
  birth_place?: string;
  country?: string;
}

async function main() {
  console.log("📍 44rap location enrichment\n");

  // 1. Fetch all 44rap rappers
  console.log("  Fetching 44rap rappers...");
  const res = await fetch(`${API_BASE}/entities/Rapper?limit=200`, {
    headers: { api_key: API_KEY },
  });
  const rappers: Base44Rapper[] = await res.json();
  console.log(`  ✅ Fetched ${rappers.length} rappers from 44rap\n`);

  // 2. Build name → rapper map
  const rapperByName: Record<string, Base44Rapper> = {};
  for (const r of rappers) {
    if (r.artist_name) rapperByName[normalize(r.artist_name)] = r;
  }

  // 3. Process RKG artists
  const files = await readdir(CONTENT_ROOT, { withFileTypes: true });
  const artistDirs = files.filter((d) => d.isDirectory() && d.name.startsWith("artist_"));

  let total = 0;
  let enriched = 0;
  let skipped = 0;
  let notFound = 0;

  for (const dir of artistDirs) {
    total++;
    const slug = dir.name.replace("artist_", "");
    const metaPath = join(CONTENT_ROOT, dir.name, "meta.json");
    const relPath = join(CONTENT_ROOT, dir.name, "relations.json");
    if (!existsSync(metaPath)) continue;

    const meta = JSON.parse(await readFile(metaPath, "utf-8"));
    const rel = JSON.parse(await readFile(relPath, "utf-8"));

    // Skip if already has location relation
    if (rel.locations && rel.locations.length > 0) {
      skipped++;
      continue;
    }

    // Find in 44rap
    const title = meta.title || "";
    const norm = normalize(title);
    const rapper = rapperByName[norm];
    if (!rapper) {
      notFound++;
      continue;
    }

    const city = rapper.city || rapper.birth_place;
    if (!city) {
      notFound++;
      continue;
    }

    // Add to meta (only if missing)
    let metaChanged = false;
    if (!meta.city && city) {
      meta.city = city;
      metaChanged = true;
    }
    if (!meta.origin && rapper.country === "CZ" && city) {
      meta.origin = `${city}, Česko`;
      metaChanged = true;
    } else if (!meta.origin && rapper.country === "SK" && city) {
      meta.origin = `${city}, Slovensko`;
      metaChanged = true;
    }

    // Create/ensure location entity
    const citySlug = slugify(city.split(/[,\/]/)[0].trim());
    const country = rapper.country === "SK" ? "SK" : "CZ";
    const locDir = `location_${citySlug}`;
    const locPath = join(CONTENT_ROOT, locDir);
    const locMetaPath = join(locPath, "meta.json");
    const locRelPath = join(locPath, "relations.json");

    if (!existsSync(locPath)) {
      await mkdir(locPath, { recursive: true });
      await writeFile(
        locMetaPath,
        JSON.stringify(
          {
            id: locDir,
            type: "location",
            slug: citySlug,
            title: city.split(",")[0].trim(),
            country,
          },
          null,
          2
        )
      );
      await writeFile(
        locRelPath,
        JSON.stringify(
          {
            albums: [],
            artists: [`artist_${slug}`],
            genres: [],
            influencedBy: [],
            labels: [],
            locations: [],
            moods: [],
            partOf: [],
            related: [],
            scenes: [],
            styles: [],
            themes: [],
            tracks: [],
          },
          null,
          2
        )
      );
      await writeFile(locPath + "/entity.mdx", `# ${city.split(",")[0].trim()}\n\nMěsto v ${country === "CZ" ? "České republice" : "na Slovensku"}.\n`);
    } else if (existsSync(locRelPath)) {
      const locRel = JSON.parse(await readFile(locRelPath, "utf-8"));
      if (!locRel.artists) locRel.artists = [];
      if (!locRel.artists.includes(`artist_${slug}`)) {
        locRel.artists.push(`artist_${slug}`);
        await writeFile(locRelPath, JSON.stringify(locRel, null, 2));
      }
    }

    // Add to artist relations
    if (!rel.locations) rel.locations = [];
    if (!rel.locations.includes(locDir)) {
      rel.locations.push(locDir);
    }

    // Save
    if (metaChanged) {
      await backup(metaPath);
      await writeFile(metaPath, JSON.stringify(meta, null, 2));
    }
    await backup(relPath);
    await writeFile(relPath, JSON.stringify(rel, null, 2));
    enriched++;
  }

  console.log(`━━━ SUMMARY ━━━`);
  console.log(`  Total artists: ${total}`);
  console.log(`  ✅ Enriched with location: ${enriched}`);
  console.log(`  ⏭️  Skipped (already has location): ${skipped}`);
  console.log(`  ❌ Not in 44rap: ${notFound}`);
  console.log(`\n✨ Hotovo!`);
}

main().catch((e) => {
  console.error("💥 Chyba:", e);
  process.exit(1);
});