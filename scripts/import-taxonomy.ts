/**
 * Import taxonomy tags from raw-data/Taxonomy/*.txt into artist relations.json
 * 
 * Each .txt file contains JSON array of { rapper, genre, style, scene, vibe, themes }
 * Maps vibe -> mood, themes -> theme entities
 */

import { readFileSync, writeFileSync, existsSync } from 'fs';
import { readdirSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = join(__dirname, '..');
const RAW_TAXONOMY = join(ROOT, 'raw-data', 'Taxonomy');
const ENTITIES_DIR = join(ROOT, 'content', 'entities');

interface TaxonomyEntry {
  rapper: string;
  genre: string[];
  style: string[];
  scene: string[];
  vibe: string[];
  themes: string[];
}

/**
 * Slugify: normalize strings to entity key format
 * e.g. "boom-bap" -> "boom-bap", "Paulie Garand" -> "paulie-garand"
 */
function slugify(name: string): string {
  return name
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '') // remove diacritics
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '');
}

// Mapping: vibe -> mood entity key
const vibeToMood: Record<string, string> = {
  'dark': 'dark',
  'club': 'club',
  'emotional': 'emotional',
  'lofi': 'lofi',
  'raw': 'raw',
  'abstract': 'abstract',
};

// Mapping: theme entity keys (themes from taxonomy map to these)
const themeToEntity: Record<string, string> = {
  'flex': 'flex',
  'success': 'success',
  'lifestyle': 'lifestyle',
  'love': 'love',
  'relationships': 'relationships',
  'street-life': 'street-life',
  'life': 'life',
  'society': 'society',
  'satire': 'satire',
  'battle': 'battle',
  'art': 'art',
  'ego': 'ego',
};

interface Relations {
  albums: string[];
  artists: string[];
  genres: string[];
  influencedBy: string[];
  labels: string[];
  locations: string[];
  moods: string[];
  partOf: string[];
  related: string[];
  scenes: string[];
  styles: string[];
  themes: string[];
  tracks: string[];
}

function loadRelations(entityPath: string): Relations | null {
  const filePath = join(entityPath, 'relations.json');
  if (!existsSync(filePath)) return null;
  try {
    return JSON.parse(readFileSync(filePath, 'utf-8'));
  } catch {
    return null;
  }
}

function saveRelations(entityPath: string, rel: Relations): void {
  writeFileSync(join(entityPath, 'relations.json'), JSON.stringify(rel, null, 2) + '\n');
}

/**
 * Merge arrays without duplicates, preserving order
 */
function mergeUnique(existing: string[], incoming: string[]): string[] {
  const combined = [...existing];
  for (const item of incoming) {
    // Check if item already exists (case-insensitive slug comparison)
    const slug = slugify(item);
    if (!combined.some(e => slugify(e) === slug)) {
      combined.push(item);
    }
  }
  return combined;
}

// Collect all taxonomy entries from all files
const allEntries: TaxonomyEntry[] = [];
const files = readdirSync(RAW_TAXONOMY).filter(f => f.endsWith('.txt') && !f.includes('cesti_slovensti') && !f.includes('next') && !f.includes('umelci_export'));

for (const file of files) {
  const content = readFileSync(join(RAW_TAXONOMY, file), 'utf-8');
  // Files use JS object literal syntax (unquoted keys), not strict JSON.
  // We normalize by wrapping keys in double quotes and parsing as JSON5-like.
  // Strategy: replace bare key names like "rapper:" -> "\"rapper\":"
  const normalized = content
    // Add quotes around bare keys (word characters followed by colon)
    .replace(/([{, ]\s*)([a-zA-Z_$][a-zA-Z0-9_$]*)\s*:/g, '$1"$2":')
    // Fix trailing commas that JSON hates
    .replace(/,([\s\n]*[\]}])/g, '$1');
  
  const jsonMatch = normalized.match(/\[\s*\{[\s\S]*\}\s*\]/);
  if (jsonMatch) {
    try {
      const entries = JSON.parse(jsonMatch[0]) as TaxonomyEntry[];
      allEntries.push(...entries);
    } catch (e) {
      console.error(`Failed to parse ${file}:`, e);
      console.error(`First 200 chars of normalized:`, normalized.substring(0, 200));
    }
  }
}

console.log(`Found ${allEntries.length} taxonomy entries across ${files.length} files`);

// Get list of existing artist directories
const artistDirs = new Set(
  readdirSync(ENTITIES_DIR)
    .filter(d => d.startsWith('artist_'))
    .map(d => d.replace('artist_', ''))
);

let updated = 0;
let notFound: string[] = [];
let skipped = 0;

for (const entry of allEntries) {
  const slug = slugify(entry.rapper);
  const entityPath = join(ENTITIES_DIR, `artist_${slug}`);

  if (!existsSync(entityPath)) {
    // Try direct match first
    notFound.push(entry.rapper);
    skipped++;
    continue;
  }

  const rel = loadRelations(entityPath);
  if (!rel) {
    notFound.push(entry.rapper);
    skipped++;
    continue;
  }

  // Merge taxonomy data into relations
  rel.genres = mergeUnique(rel.genres, entry.genre);
  rel.styles = mergeUnique(rel.styles, entry.style);
  rel.scenes = mergeUnique(rel.scenes, entry.scene);

  // Map vibe -> mood
  const moods = entry.vibe
    .map((v: string) => vibeToMood[v.toLowerCase()] || slugify(v))
    .filter(Boolean);
  rel.moods = mergeUnique(rel.moods, moods);

  // Map themes -> theme entity keys
  const themes = entry.themes
    .map((t: string) => themeToEntity[t.toLowerCase()] || slugify(t))
    .filter(Boolean);
  rel.themes = mergeUnique(rel.themes, themes);

  saveRelations(entityPath, rel);
  updated++;
}

console.log(`\nResults:`);
console.log(`  Updated: ${updated}`);
console.log(`  Skipped (not found): ${skipped}`);
console.log(`  Not found list: ${notFound.length > 0 ? notFound.join(', ') : '(none)'}`);

// Also log entries that have different slug than expected (for verification)
const mismatches = allEntries.filter(e => {
  const slug = slugify(e.rapper);
  return !existsSync(join(ENTITIES_DIR, `artist_${slug}`));
});
if (mismatches.length > 0) {
  console.log(`\nMismatches (taxonomy key != entity dir):`);
  for (const m of mismatches) {
    console.log(`  "${m.rapper}" -> slug "${slugify(m.rapper)}"`);
  }
}