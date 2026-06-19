/**
 * Smart linker — přidá chybějící vazby izolovaným entitám.
 *
 * Algoritmus:
 *  1. Album bez artists → matchneme z title patternu (artist jméno v názvu)
 *                             + z tracks.json feat → label label label
 *  2. Artist bez labels → matchneme z label_rels artistů co s ním spolupracují
 *  3. Label bez artists → matchneme z jiných entit s tímto label
 *
 * Pokud po všech pokusech pořád isolated → flagneme jako "needs review"
 */

import { readFile, writeFile, mkdir, readdir, copyFile } from "fs/promises";
import { join } from "path";
import { createHash } from "crypto";
import { existsSync } from "fs";
import { readdir as rd } from "fs/promises";

const CONTENT_ROOT = "/Users/petrpiskacek/.openclaw/workspace/rap-knowledge-graph/content/entities";
const BACKUP_ROOT = "/Users/petrpiskacek/.openclaw/workspace/rap-knowledge-graph/.backups/smart-linker";

const STANDARD_KEYS = [
  "albums", "artists", "genres", "influencedBy",
  "labels", "locations", "moods", "partOf",
  "related", "scenes", "styles", "themes", "tracks"
];

function normalize(s: string): string {
  return s
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, "");
}

async function backup(path: string) {
  if (!existsSync(path)) return null;
  const content = await readFile(path, "utf-8");
  const hash = createHash("md5").update(content).digest("hex").slice(0, 8);
  await mkdir(BACKUP_ROOT, { recursive: true });
  const filename = path.split("/").pop();
  const backupPath = join(BACKUP_ROOT, `${filename}_${Date.now()}_${hash}`);
  await copyFile(path, backupPath);
  return backupPath;
}

async function main() {
  console.log("🔗 Smart linker — opravuje izolované entity\n");

  // Load all entities
  const data: Record<string, any> = {};
  const dirs = await rd(CONTENT_ROOT, { withFileTypes: true });
  for (const dir of dirs) {
    if (!dir.isDirectory()) continue;
    const relPath = join(CONTENT_ROOT, dir.name, "relations.json");
    if (!existsSync(relPath)) continue;
    try {
      data[dir.name] = JSON.parse(await readFile(relPath, "utf-8"));
    } catch {
      data[dir.name] = {};
    }
  }

  // Compute current outbound
  const outCount: Record<string, number> = {};
  for (const [eid, rel] of Object.entries(data)) {
    let total = 0;
    for (const k of STANDARD_KEYS) {
      if (Array.isArray(rel[k])) total += rel[k].length;
    }
    outCount[eid] = total;
  }

  // Compute inbound map (who references me?)
  const inboundMap: Record<string, string[]> = {};
  for (const [eid, rel] of Object.entries(data)) {
    for (const k of STANDARD_KEYS) {
      if (!Array.isArray(rel[k])) continue;
      for (const target of rel[k]) {
        if (!inboundMap[target]) inboundMap[target] = [];
        inboundMap[target].push(eid);
      }
    }
  }

  // Find isolated entities
  const isolated: string[] = [];
  for (const eid of Object.keys(data)) {
    const ob = outCount[eid] || 0;
    const ib = (inboundMap[eid] || []).length;
    if (ob === 0 && ib === 0) isolated.push(eid);
  }

  console.log(`🚨 Isolated entities: ${isolated.length}\n`);

  // Build artist name index
  const artistByName: Record<string, string> = {};
  for (const eid of Object.keys(data)) {
    if (!eid.startsWith("artist_")) continue;
    const metaPath = join(CONTENT_ROOT, eid, "meta.json");
    if (!existsSync(metaPath)) continue;
    try {
      const meta = JSON.parse(await readFile(metaPath, "utf-8"));
      if (meta.title) artistByName[normalize(meta.title)] = eid;
      if (meta.realName) artistByName[normalize(meta.realName)] = eid;
      artistByName[normalize(eid.replace("artist_", "").replace(/-/g, " "))] = eid;
    } catch {}
  }

  // Build label name index
  const labelByName: Record<string, string> = {};
  for (const eid of Object.keys(data)) {
    if (!eid.startsWith("label_")) continue;
    const metaPath = join(CONTENT_ROOT, eid, "meta.json");
    if (!existsSync(metaPath)) continue;
    try {
      const meta = JSON.parse(await readFile(metaPath, "utf-8"));
      if (meta.title) labelByName[normalize(meta.title)] = eid;
      labelByName[normalize(eid.replace("label_", "").replace(/-/g, " "))] = eid;
    } catch {}
  }

  let linked = 0;
  let stillIsolated = 0;
  const stillIsolatedList: string[] = [];

  for (const eid of isolated) {
    const rel = data[eid];
    if (!Array.isArray(rel.artists)) rel.artists = [];

    let changed = false;

    // Load meta + description for parsing
    const metaPath = join(CONTENT_ROOT, eid, "meta.json");
    let meta: any = {};
    if (existsSync(metaPath)) {
      try {
        meta = JSON.parse(await readFile(metaPath, "utf-8"));
      } catch {}
    }
    const desc = (meta.description || "").toString();

    // Strategy 1: For albums — match artist from title
    if (eid.startsWith("album_")) {
      const title = meta.title || "";

      // 1a: Match artist names that appear in album title
      for (const [normName, artistSlug] of Object.entries(artistByName)) {
        if (normName.length < 4) continue;
        if (title.toLowerCase().includes(normName)) {
          if (!rel.artists.includes(artistSlug)) {
            rel.artists.push(artistSlug);
            changed = true;
          }
        }
      }

      // 1b: Feat from tracks.json
      const tracksPath = join(CONTENT_ROOT, eid, "tracks.json");
      if (existsSync(tracksPath)) {
        try {
          const tracks = JSON.parse(await readFile(tracksPath, "utf-8"));
          for (const t of tracks.tracks || []) {
            for (const featName of t.feat || []) {
              const slug = artistByName[normalize(featName)];
              if (slug && !rel.artists.includes(slug)) {
                rel.artists.push(slug);
                changed = true;
              }
            }
          }
        } catch {}
      }

      // 1c: Match label from meta.label OR description
      if (Array.isArray(rel.labels)) {
        // First meta.label
        if (meta.label) {
          const labelSlug = labelByName[normalize(meta.label)];
          if (labelSlug && !rel.labels.includes(labelSlug)) {
            rel.labels.push(labelSlug);
            changed = true;
          }
        }
        // Then description text (e.g. "Milion Plus v roce 2023...")
        for (const [normLabel, labelSlug] of Object.entries(labelByName)) {
          if (normLabel.length < 4) continue;
          if (normalize(desc).includes(normLabel)) {
            if (!rel.labels.includes(labelSlug)) {
              rel.labels.push(labelSlug);
              changed = true;
            }
          }
        }
      }
    }

    // Strategy 2: For artists — find label from other artists in same scene
    if (eid.startsWith("artist_")) {
      // 2a: Already has label in meta? Match it
      if (meta.label && Array.isArray(rel.labels)) {
        const labelSlug = labelByName[normalize(meta.label)];
        if (labelSlug && !rel.labels.includes(labelSlug)) {
          rel.labels.push(labelSlug);
          changed = true;
        }
      }
      // 2b: Has city? Match location
      if (meta.city || meta.origin) {
        const city = (meta.city || meta.origin).split(",")[0].trim();
        // Find location
        for (const [locId, locRel] of Object.entries(data)) {
          if (!locId.startsWith("location_")) continue;
          if (locRel.title?.toLowerCase() === city.toLowerCase()) {
            if (!rel.locations) rel.locations = [];
            if (!rel.locations.includes(locId)) {
              rel.locations.push(locId);
              changed = true;
            }
          }
        }
      }
    }

    // Strategy 3: For labels — find artists that have this label
    if (eid.startsWith("label_")) {
      for (const [artistId, artistRel] of Object.entries(data)) {
        if (!artistId.startsWith("artist_")) continue;
        if (Array.isArray(artistRel.labels) && artistRel.labels.includes(eid)) {
          // Found an artist on this label
          if (!rel.artists) rel.artists = [];
          if (!rel.artists.includes(artistId)) {
            rel.artists.push(artistId);
            changed = true;
          }
        }
      }
    }

    if (changed) {
      const relPath = join(CONTENT_ROOT, eid, "relations.json");
      await backup(relPath);
      await writeFile(relPath, JSON.stringify(rel, null, 2), "utf-8");
      linked++;
    } else {
      stillIsolated++;
      stillIsolatedList.push(eid);
    }
  }

  console.log(`━━━ SUMMARY ━━━`);
  console.log(`  ✅ Newly linked: ${linked}`);
  console.log(`  ❌ Still isolated: ${stillIsolated}`);
  if (stillIsolatedList.length > 0) {
    console.log(`\n  Top 20 still isolated:`);
    for (const eid of stillIsolatedList.slice(0, 20)) {
      const metaPath = join(CONTENT_ROOT, eid, "meta.json");
      let title = eid;
      try {
        const m = JSON.parse(await readFile(metaPath, "utf-8"));
        title = m.title || eid;
      } catch {}
      console.log(`    ${eid}: "${title}"`);
    }
  }
  console.log(`\n✨ Hotovo!`);
}

main().catch((e) => {
  console.error("💥 Chyba:", e);
  process.exit(1);
});