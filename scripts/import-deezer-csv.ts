/**
 * Import Deezer export (umelci_export_2026-06-11.csv)
 * Props deezer_id, deezer_url, nb_fan into meta.json
 */

import { readFileSync, writeFileSync, existsSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = join(__dirname, '..');
const ENTITIES_DIR = join(ROOT, 'content', 'entities');
const CSV_PATH = join(ROOT, 'raw-data', 'taxonomy', 'umelci_export_2026-06-11.csv');

interface DeezerRow {
  id: string;
  name: string;
  realName: string;
  birthDate: string;
  origin: string;
  label: string;
  nbAlbum: number;
  nbFan: number;
  confidence: number;
  importStatus: string;
  deezerId: number;
  deezerUrl: string;
}

function slugify(name: string): string {
  return name
    .toLowerCase()
    .normalize('NFD').replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '');
}

const csv = readFileSync(CSV_PATH, 'utf-8');
const lines = csv.split('\n').filter(l => l.trim());

// Parse CSV (semicolon separated)
const header = lines[0].split(';');
const rows: DeezerRow[] = [];

for (let i = 1; i < lines.length; i++) {
  const cols = lines[i].split(';');
  if (cols.length < header.length) continue;
  rows.push({
    id: cols[0],
    name: cols[1],
    realName: cols[2] || '',
    birthDate: cols[3] || '',
    origin: cols[4] || '',
    label: cols[5] || '',
    nbAlbum: parseInt(cols[6]) || 0,
    nbFan: parseInt(cols[7]) || 0,
    confidence: parseInt(cols[8]) || 0,
    importStatus: cols[9] || '',
    deezerId: parseInt(cols[10]) || 0,
    deezerUrl: cols[11] || '',
  });
}

console.log(`Parsed ${rows.length} Deezer rows`);

let enriched = 0;
let notFound: string[] = [];
let skipped = 0;

for (const row of rows) {
  const slug = slugify(row.name);
  const entityDir = join(ENTITIES_DIR, `artist_${slug}`);
  
  if (!existsSync(entityDir)) {
    notFound.push(row.name);
    skipped++;
    continue;
  }
  
  const metaPath = join(entityDir, 'meta.json');
  const meta = JSON.parse(readFileSync(metaPath, 'utf-8'));
  let changed = false;
  
  if (row.deezerId && !meta.deezerId) {
    meta.deezerId = row.deezerId;
    changed = true;
  }
  
  if (row.deezerUrl && !meta.deezerUrl) {
    meta.deezerUrl = row.deezerUrl;
    changed = true;
  }
  
  if (row.nbFan && !meta.fanCount) {
    meta.fanCount = row.nbFan;
    changed = true;
  }
  
  // Real name and birth date — only fill if empty and data exists
  if (row.realName && row.realName !== row.name && !meta.realName) {
    meta.realName = row.realName;
    changed = true;
  }
  
  if (changed) {
    writeFileSync(metaPath, JSON.stringify(meta, null, 2) + '\n');
    enriched++;
  }
}

console.log(`\nResults:`);
console.log(`  Enriched: ${enriched}`);
console.log(`  Not found: ${notFound.length}`);
if (notFound.length <= 10) {
  notFound.forEach(n => console.log(`    MISSING: ${n}`));
} else {
  console.log(`  (${notFound.slice(0, 10).join(', ')}...)`);
}