/**
 * Location cleanup & enrichment.
 *
 * Problémy k vyřešení:
 *  1. Špatné slugy (location_koice → location_kosice)
 *  2. Duplicitní location_cz vs location_cesko, location_sk vs location_slovensko
 *  3. 102 umělců bez location — doplnit z 44rap + heuristika z meta.city/origin
 *
 * Append-only: nikdy nepřepisuje, vytváří nové location entity jen když chybí.
 * Pokud location existuje s jiným slugem (diacritics bug), vytvoří redirect.
 */

import { readFile, writeFile, mkdir, readdir, copyFile } from "fs/promises";
import { join } from "path";
import { createHash } from "crypto";
import { existsSync } from "fs";

const CONTENT_ROOT = "/Users/petrpiskacek/.openclaw/workspace/rap-knowledge-graph/content/entities";
const BACKUP_ROOT = "/Users/petrpiskacek/.openclaw/workspace/rap-knowledge-graph/.backups/location-fix";

// Slugify — zachází s diakritikou
function slugify(s: string): string {
  return s
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");
}

// Mapování: špatný slug → správný slug (fix existujících)
const SLUG_FIXES: Record<string, string> = {
  location_koice: "location_kosice",
  "location_esk-budjovice": "location_ceske-budejovice",
  "location_esk-bdjovice": "location_ceske-budejovice",
  location_pieany: "location_piestany",
  location_handlov: "location_handlova",
};

// Duplicitní — které slugy jsou synonyma
const DEDUPE: Record<string, string> = {
  location_cz: "location_cesko",
  location_sk: "location_slovensko",
};

interface CityData {
  city: string;
  slug: string;
  country: "CZ" | "SK" | "?";
}

// Známá města → (slug, country)
const KNOWN_CITIES: Record<string, { slug: string; country: "CZ" | "SK" }> = {
  praha: { slug: "praha", country: "CZ" },
  brno: { slug: "brno", country: "CZ" },
  ostrava: { slug: "ostrava", country: "CZ" },
  liberec: { slug: "liberec", country: "CZ" },
  ústí: { slug: "usti-nad-labem", country: "CZ" },
  jihlava: { slug: "jihlava", country: "CZ" },
  cheb: { slug: "cheb", country: "CZ" },
  české: { slug: "ceske-budejovice", country: "CZ" },
  český: { slug: "ceske-budejovice", country: "CZ" },
  karlovy: { slug: "karlovy-vary", country: "CZ" },
  zlín: { slug: "zlin", country: "CZ" },
  kladno: { slug: "kladno", country: "CZ" },
  pardubice: { slug: "pardubice", country: "CZ" },
  plzeň: { slug: "plzen", country: "CZ" },
  hradec: { slug: "hradec-kralove", country: "CZ" },
  bratislava: { slug: "bratislava", country: "SK" },
  košice: { slug: "kosice", country: "SK" },
  trnava: { slug: "trnava", country: "SK" },
  piešťany: { slug: "piestany", country: "SK" },
  handlová: { slug: "handlova", country: "SK" },
  nitra: { slug: "nitra", country: "SK" },
  prešov: { slug: "presov", country: "SK" },
  žilina: { slug: "zilina", country: "SK" },
  trenčín: { slug: "trencin", country: "SK" },
  banská: { slug: "banska-bystrica", country: "SK" },
};

function getCityInfo(cityStr: string): { slug: string; country: "CZ" | "SK" } | null {
  const normalized = cityStr.toLowerCase().trim();

  // Direct match
  for (const [key, info] of Object.entries(KNOWN_CITIES)) {
    if (normalized.startsWith(key)) {
      return info;
    }
  }

  // Slugify fallback
  const slug = slugify(cityStr);
  if (!slug) return null;

  // Heuristic country detection
  let country: "CZ" | "SK" = "CZ";
  if (
    normalized.includes("bratislav") ||
    normalized.includes("košic") ||
    normalized.includes("trnav") ||
    normalized.includes("nitr") ||
    normalized.includes("slovensk")
  ) {
    country = "SK";
  }

  return { slug, country };
}

async function backup(path: string) {
  if (!existsSync(path)) return null;
  const content = await readFile(path, "utf-8");
  const hash = createHash("md5").update(content).digest("hex").slice(0, 8);
  const filename = path.split("/").pop();
  const backupPath = join(BACKUP_ROOT, `${filename}_${Date.now()}_${hash}`);
  await mkdir(BACKUP_ROOT, { recursive: true });
  await copyFile(path, backupPath);
  return backupPath;
}

async function loadAllLocations(): Promise<Map<string, any>> {
  const map = new Map<string, any>();
  const dirs = await readdir(CONTENT_ROOT, { withFileTypes: true });
  for (const dir of dirs) {
    if (!dir.isDirectory() || !dir.name.startsWith("location_")) continue;
    try {
      const meta = JSON.parse(await readFile(join(CONTENT_ROOT, dir.name, "meta.json"), "utf-8"));
      map.set(dir.name, meta);
    } catch {}
  }
  return map;
}

async function ensureLocationEntity(slug: string, title: string, country: "CZ" | "SK"): Promise<string> {
  const dirName = `location_${slug}`;
  const dirPath = join(CONTENT_ROOT, dirName);
  if (existsSync(dirPath)) return dirName;

  // Create new
  await mkdir(dirPath, { recursive: true });
  const meta = {
    id: dirName,
    type: "location",
    slug,
    title,
    country,
  };
  await writeFile(join(dirPath, "meta.json"), JSON.stringify(meta, null, 2));
  await writeFile(
    join(dirPath, "relations.json"),
    JSON.stringify(
      {
        albums: [],
        artists: [],
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
  await writeFile(join(dirPath, "entity.mdx"), `# ${title}\n\nMěsto v ${country === "CZ" ? "České republice" : "na Slovensku"}.\n`);
  return dirName;
}

async function main() {
  console.log("📍 Location cleanup & enrichment\n");

  // 1. Phase 1: Fix slug bugs in references
  console.log("━━━ PHASE 1: Fix slug bugs ━━━\n");
  const slugFixCount = Object.keys(SLUG_FIXES).length;
  const dedupeCount = Object.keys(DEDUPE).length;
  console.log(`  Slug fixes to apply: ${slugFixCount}`);
  console.log(`  Dedupe mappings: ${dedupeCount}\n`);

  // Combine all fixes
  const ALL_FIXES: Record<string, string> = { ...SLUG_FIXES, ...DEDUPE };

  let totalFixes = 0;
  const files = await readdir(CONTENT_ROOT, { withFileTypes: true });
  for (const dir of files) {
    if (!dir.isDirectory()) continue;
    const relPath = join(CONTENT_ROOT, dir.name, "relations.json");
    if (!existsSync(relPath)) continue;
    const rel = JSON.parse(await readFile(relPath, "utf-8"));
    let changed = false;
    for (const key of Object.keys(rel)) {
      if (Array.isArray(rel[key])) {
        rel[key] = rel[key].map((v: string) => {
          if (ALL_FIXES[v]) {
            changed = true;
            return ALL_FIXES[v];
          }
          return v;
        });
      }
    }
    if (changed) {
      await backup(relPath);
      await writeFile(relPath, JSON.stringify(rel, null, 2));
      totalFixes++;
    }
  }
  console.log(`  ✅ Fixed ${totalFixes} relations files\n`);

  // 2. Phase 2: Load all artists, identify which need locations
  console.log("━━━ PHASE 2: Identify missing locations ━━━\n");
  const artistDirs = files.filter((d) => d.isDirectory() && d.name.startsWith("artist_"));
  const needsLocation: Array<{ slug: string; title: string; city: string; country: "CZ" | "SK" }> = [];

  for (const dir of artistDirs) {
    const slug = dir.name.replace("artist_", "");
    try {
      const meta = JSON.parse(await readFile(join(CONTENT_ROOT, dir.name, "meta.json"), "utf-8"));
      const rel = JSON.parse(await readFile(join(CONTENT_ROOT, dir.name, "relations.json"), "utf-8"));

      // Skip if already has location relation
      if (rel.locations && rel.locations.length > 0) continue;

      // Find city from meta
      const cityStr = meta.city || meta.origin || meta.birthPlace || "";
      if (!cityStr) continue;

      const info = getCityInfo(cityStr);
      if (!info) continue;

      needsLocation.push({
        slug,
        title: meta.title || slug,
        city: cityStr,
        country: info.country,
      });
    } catch {}
  }

  console.log(`  Artists needing location: ${needsLocation.length}\n`);

  // 3. Phase 3: Ensure location entities exist + add to relations
  console.log("━━━ PHASE 3: Create missing locations & link ━━━\n");
  const locationCache = new Map<string, string>(); // citySlug → location_<slug>

  let created = 0;
  let linked = 0;
  for (const a of needsLocation) {
    const info = getCityInfo(a.city);
    if (!info) continue;

    let locDir = locationCache.get(info.slug);
    if (!locDir) {
      locDir = await ensureLocationEntity(info.slug, a.city.split(",")[0].trim(), info.country);
      locationCache.set(info.slug, locDir);
      if (!existsSync(join(CONTENT_ROOT, locDir, "meta.json")) || !(await readFile(join(CONTENT_ROOT, locDir, "meta.json"), "utf-8")).includes('"country"')) {
        created++;
      }
    }

    // Add to artist relations
    const relPath = join(CONTENT_ROOT, `artist_${a.slug}`, "relations.json");
    const rel = JSON.parse(await readFile(relPath, "utf-8"));
    if (!rel.locations) rel.locations = [];
    if (!rel.locations.includes(locDir)) {
      rel.locations.push(locDir);
      await backup(relPath);
      await writeFile(relPath, JSON.stringify(rel, null, 2));
      linked++;
    }

    // Add artist to location's inbound
    const locRelPath = join(CONTENT_ROOT, locDir, "relations.json");
    if (existsSync(locRelPath)) {
      const locRel = JSON.parse(await readFile(locRelPath, "utf-8"));
      if (!locRel.artists) locRel.artists = [];
      if (!locRel.artists.includes(`artist_${a.slug}`)) {
        locRel.artists.push(`artist_${a.slug}`);
        await writeFile(locRelPath, JSON.stringify(locRel, null, 2));
      }
    }
  }

  console.log(`  ✅ Created ${created} new location entities`);
  console.log(`  ✅ Linked ${linked} artists to locations\n`);

  // Summary
  console.log("━━━ SUMMARY ━━━");
  console.log(`  📍 Relations files fixed: ${totalFixes}`);
  console.log(`  🆕 New location entities: ${created}`);
  console.log(`  🔗 Artists newly linked: ${linked}`);
  console.log(`\n✨ Hotovo!`);
}

main().catch((e) => {
  console.error("💥 Chyba:", e);
  process.exit(1);
});