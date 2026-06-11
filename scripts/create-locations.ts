#!/usr/bin/env npx tsx
/**
 * Extract locations from artist meta.json origin fields,
 * normalize them, create location_* entities,
 * and wire locations relations to artists.
 */

import fs from "node:fs";
import path from "node:path";

const ENTITIES_DIR = path.join(process.cwd(), "content", "entities");

// ─── Normalization map: raw → canonical slug + title ───
const NORMALIZATION: Record<string, { slug: string; title: string; region?: string }> = {
  "Praha": { slug: "praha", title: "Praha", region: "Česko" },
  "Praha, Czech Republic": { slug: "praha", title: "Praha", region: "Česko" },
  "Brno": { slug: "brno", title: "Brno", region: "Česko" },
  "Brno, Czech Republic": { slug: "brno", title: "Brno", region: "Česko" },
  "Teplice": { slug: "teplice", title: "Teplice", region: "Česko" },
  "Ústí nad Labem": { slug: "usti-nad-labem", title: "Ústí nad Labem", region: "Česko" },
  "Liberec, Czech Republic": { slug: "liberec", title: "Liberec", region: "Česko" },
  "Cheb, Czech Republic": { slug: "cheb", title: "Cheb", region: "Česko" },
  "Jihlava": { slug: "jihlava", title: "Jihlava", region: "Česko" },
  "Jihlava, Czech Republic": { slug: "jihlava", title: "Jihlava", region: "Česko" },
  "Hradec Králové / Praha": { slug: "hradec-kralove", title: "Hradec Králové", region: "Česko" },
  "České Budějovice, Czech Republic": { slug: "ceske-budejovice", title: "České Budějovice", region: "Česko" },
  "Pardubice": { slug: "pardubice", title: "Pardubice", region: "Česko" },
  "Ostrava": { slug: "ostrava", title: "Ostrava", region: "Česko" },
  "Liberec (narozen v Mnichově)": { slug: "liberec", title: "Liberec", region: "Česko" },
  "Rumburk / Praha": { slug: "rumburk", title: "Rumburk", region: "Česko" },
  "Kutná Hora / Praha": { slug: "kutna-hora", title: "Kutná Hora", region: "Česko" },
  "Příbram": { slug: "pribram", title: "Příbram", region: "Česko" },
  "Litoměřice, Czech Republic": { slug: "litomerice", title: "Litoměřice", region: "Česko" },
  "Bratislava, Slovensko": { slug: "bratislava", title: "Bratislava", region: "Slovensko" },
  "Bratislava-Petržalka, Slovakia": { slug: "bratislava", title: "Bratislava", region: "Slovensko" },
  "Bratislava, Slovakia": { slug: "bratislava", title: "Bratislava", region: "Slovensko" },
  "Bratislava": { slug: "bratislava", title: "Bratislava", region: "Slovensko" },
  "Košice, Slovensko": { slug: "kosice", title: "Košice", region: "Slovensko" },
  "Nitra, Slovensko": { slug: "nitra", title: "Nitra", region: "Slovensko" },
  "Nové Mesto nad Váhom, Slovensko": { slug: "nove-mesto-nad-vahom", title: "Nové Mesto nad Váhom", region: "Slovensko" },
  "Trnava, Slovensko": { slug: "trnava", title: "Trnava", region: "Slovensko" },
  "Česko": { slug: "cesko", title: "Česko", region: "Česko" },
  "Slovakia": { slug: "slovensko", title: "Slovensko", region: "Slovensko" },
  "Londýn, Velká Británie": { slug: "londyn", title: "Londýn", region: "Velká Británie" },
  "Manchester, United Kingdom / Czech Republic": { slug: "manchester", title: "Manchester", region: "Velká Británie" },
};

// ─── Collect all artist origins ─────────────────────────
const artistOrigins: Map<string, string> = new Map();

for (const entry of fs.readdirSync(ENTITIES_DIR)) {
  if (!entry.startsWith("artist_")) continue;
  const metaPath = path.join(ENTITIES_DIR, entry, "meta.json");
  if (!fs.existsSync(metaPath)) continue;

  const meta = JSON.parse(fs.readFileSync(metaPath, "utf-8"));
  const origin = meta.origin;
  if (origin && typeof origin === "string" && origin.trim()) {
    artistOrigins.set(entry, origin.trim());
  }
}

console.log(`Found ${artistOrigins.size} artists with origin field`);

// ─── Normalize and deduplicate locations ───────────────
const locationMap: Map<string, { slug: string; title: string; region?: string; sources: string[] }> = new Map();
const unmatched: string[] = [];

for (const [artistId, raw] of artistOrigins) {
  const norm = NORMALIZATION[raw];
  if (!norm) {
    unmatched.push(raw);
    continue;
  }

  const key = norm.slug;
  if (!locationMap.has(key)) {
    locationMap.set(key, { ...norm, sources: [] });
  }
  locationMap.get(key)!.sources.push(artistId);
}

if (unmatched.length > 0) {
  console.log("\n⚠️ Unmatched origins (need manual mapping):");
  for (const u of unmatched) {
    console.log(`  "${u}"`);
  }
}

console.log(`\n📍 ${locationMap.size} unique locations to create`);

// ─── Create location entities ────────────────────────────
let created = 0;
let skipped = 0;

for (const [slug, data] of locationMap) {
  const id = `location_${slug}`;
  const dir = path.join(ENTITIES_DIR, id);

  if (fs.existsSync(dir)) {
    skipped++;
    continue;
  }

  fs.mkdirSync(dir, { recursive: true });

  const meta = {
    id,
    type: "location",
    title: data.title,
    description: `Hip-hopová scéna v ${data.title}${data.region ? `, ${data.region}` : ""}`,
    slug,
    publishedAt: new Date().toISOString().split("T")[0],
    ...(data.region ? { region: data.region } : {}),
  };

  fs.writeFileSync(path.join(dir, "meta.json"), JSON.stringify(meta, null, 2));
  fs.writeFileSync(path.join(dir, "relations.json"), JSON.stringify({}, null, 2));
  fs.writeFileSync(path.join(dir, "entity.mdx"), `---\ntitle: "${data.title}"\n---\n\n# ${data.title}\n\nHip-hopová scéna v ${data.title}${data.region ? `, ${data.region}` : ""}.\n`);

  created++;
}

console.log(`  ✅ ${created} created, ⏭️ ${skipped} skipped (already exist)`);

// ─── Wire locations to artists ─────────────────────────
// Create/update relations.json for ALL artists with origin
let wired = 0;
let createdRelFile = 0;

for (const [artistId, raw] of artistOrigins) {
  const norm = NORMALIZATION[raw];
  if (!norm) continue;

  const locationId = `location_${norm.slug}`;
  const relPath = path.join(ENTITIES_DIR, artistId, "relations.json");

  // Create or read relations
  let rel: Record<string, string[]> = {};
  if (fs.existsSync(relPath)) {
    try {
      rel = JSON.parse(fs.readFileSync(relPath, "utf-8"));
    } catch {
      rel = {};
    }
  } else {
    createdRelFile++;
  }

  // Ensure locations key exists
  const existing = rel.locations || [];
  if (!existing.includes(locationId)) {
    rel.locations = [...existing, locationId];
    fs.writeFileSync(relPath, JSON.stringify(rel, null, 2));
    wired++;
  }
}

console.log(`  🔗 ${wired} artists wired to locations (${createdRelFile} new rel files created)`);

console.log("\n🎉 Done! Run 'npm run cache:build' to rebuild.");
