/**
 * Import richer genre descriptions from raw-data/Genre/*.txt
 * Replaces entity.mdx content for matching genre entities.
 */

import { readFileSync, writeFileSync, existsSync } from 'fs';
import { readdirSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = join(__dirname, '..');
const RAW_GENRE = join(ROOT, 'raw-data', 'Genre');
const ENTITIES_DIR = join(ROOT, 'content', 'entities');

// Mapping: raw file name (without extension) -> entity key
const fileToEntity: Record<string, string> = {
  'Drill': 'genre_drill',
  'Drum and bass': 'genre_drum-and-bass',
  'Experimental rap': 'genre_experimental-rap',
  'Glitch hop': 'genre_glitch-hop',
  'Grime': 'genre_grime',
  'Street rap': 'genre_street-rap',
  'UK Garage - kopie': 'genre_uk-garage',
  'Underground rap': 'genre_underground-rap',
};

interface EntityMdx {
  frontmatter: Record<string, unknown>;
  body: string;
}

function parseMdx(content: string): EntityMdx {
  const match = content.match(/^---\n([\s\S]*?)\n---\n?([\s\S]*)$/);
  if (!match) {
    return { frontmatter: {}, body: content };
  }
  
  const frontmatter: Record<string, unknown> = {};
  for (const line of match[1].split('\n')) {
    const kv = line.match(/^(\w+):\s*(.+)$/);
    if (kv) {
      let val: unknown = kv[2].trim();
      if (val === 'true') val = true;
      else if (val === 'false') val = false;
      else if (!isNaN(Number(val))) val = Number(val);
      frontmatter[kv[1]] = val;
    }
  }
  
  return { frontmatter, body: match[2].trim() };
}

function buildMdx(frontmatter: Record<string, unknown>, body: string): string {
  const fmLines = Object.entries(frontmatter)
    .map(([k, v]) => `${k}: ${v}`)
    .join('\n');
  
  return `---\n${fmLines}\n---\n\n${body}\n`;
}

let updated = 0;
let skipped = 0;

for (const [file, entityKey] of Object.entries(fileToEntity)) {
  const rawPath = join(RAW_GENRE, `${file}.txt`);
  const entityDir = join(ENTITIES_DIR, entityKey);
  const mdxPath = join(entityDir, 'entity.mdx');

  if (!existsSync(rawPath)) {
    console.error(`Raw file not found: ${rawPath}`);
    skipped++;
    continue;
  }
  if (!existsSync(mdxPath)) {
    console.error(`Entity mdx not found: ${mdxPath}`);
    skipped++;
    continue;
  }

  // Read raw content
  const rawContent = readFileSync(rawPath, 'utf-8').trim();
  
  // Read existing MDX to preserve frontmatter
  const existingMdx = readFileSync(mdxPath, 'utf-8');
  const parsed = parseMdx(existingMdx);

  // Replace body with raw content
  const newMdx = buildMdx(parsed.frontmatter, rawContent);
  writeFileSync(mdxPath, newMdx);
  
  updated++;
  console.log(`✓ ${entityKey} — ${rawContent.length} chars -> entity.mdx`);
}

console.log(`\nDone: ${updated} updated, ${skipped} skipped`);