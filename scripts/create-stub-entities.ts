/**
 * Create stub entities for all dangling refs.
 * Works by scanning all relations.json files for references to non-existing entities.
 */

import { readFileSync, writeFileSync, existsSync, mkdirSync } from 'fs';
import { readdirSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = join(__dirname, '..');
const ENTITIES_DIR = join(ROOT, 'content', 'entities');

// Build set of existing entity slugs
const existing = new Set<string>();
for (const d of readdirSync(ENTITIES_DIR)) {
  existing.add(d);
}

// Scan all relations.json for refs that don't exist
const missingRefs = new Set<string>();

for (const entityDir of readdirSync(ENTITIES_DIR)) {
  const relPath = join(ENTITIES_DIR, entityDir, 'relations.json');
  if (!existsSync(relPath)) continue;
  
  try {
    const rel = JSON.parse(readFileSync(relPath, 'utf-8'));
    for (const key of Object.keys(rel)) {
      const values = rel[key];
      if (!Array.isArray(values)) continue;
      for (const ref of values) {
        // Only check refs that look like entity references (contain _)
        if (typeof ref === 'string' && ref.includes('_')) {
          // Clean ref (remove any array syntax remnants)
          const cleanRef = ref.replace(/[[\]"]/g, '').trim();
          if (!existing.has(cleanRef)) {
            missingRefs.add(cleanRef);
          }
        }
      }
    }
  } catch { /* skip invalid JSON */ }
}

console.log(`Found ${missingRefs.size} unique missing entity refs`);

// Template for stub relations.json
const EMPTY_RELATIONS = {
  albums: [], artists: [], genres: [], influencedBy: [], labels: [],
  locations: [], moods: [], partOf: [], related: [], scenes: [],
  styles: [], themes: [], tracks: [],
};

let created = 0;
let skipped = 0;

for (const ref of missingRefs) {
  if (existing.has(ref)) {
    skipped++;
    continue;
  }

  // Determine type from prefix
  const parts = ref.split('_');
  const type = parts[0];
  const slug = parts.slice(1).join('_');

  // Human-readable type labels
  const typeLabels: Record<string, string> = {
    artist: 'Umělec',
    album: 'Album',
    label: 'Label',
    producer: 'Producent',
    genre: 'Žánr',
    mood: 'Mood',
    style: 'Styl',
    theme: 'Téma',
    scene: 'Scéna',
    location: 'Místo',
    article: 'Článek',
  };
  const label = typeLabels[type] || type;

  const entityDir = join(ENTITIES_DIR, ref);
  mkdirSync(entityDir, { recursive: true });

  // Write minimal entity.mdx
  writeFileSync(join(entityDir, 'entity.mdx'), `---
title: "${slug}"
slug: "${slug}"
type: "${type}"
description: "${label}"
publishedAt: "2026-06-12"
---
<!-- Stub entity created on 2026-06-12 -->
`);
  
  // Write empty relations.json
  writeFileSync(join(entityDir, 'relations.json'), JSON.stringify(EMPTY_RELATIONS, null, 2) + '\n');
  
  // Write minimal meta.json
  writeFileSync(join(entityDir, 'meta.json'), JSON.stringify({
    id: ref,
    type: 'entity',
    slug,
    relations: []
  }, null, 2) + '\n');

  created++;

  if (created <= 15) console.log(`  ✓ ${ref}`);
}

console.log(`\nResults:`);
console.log(`  Created stubs: ${created}`);
console.log(`  Skipped (already exist): ${skipped}`);