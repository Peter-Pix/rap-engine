/**
 * Propsat ověřená data (realName, birthDate, origin) z ověřeného seznamu do meta.json
 */

import { readFileSync, writeFileSync, existsSync, mkdirSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = join(__dirname, '..');
const ENTITIES_DIR = join(ROOT, 'content', 'entities');
const RAW_FILE = join(ROOT, 'raw-data', 'Taxonomy', 'cesti_slovensti_rapperi_overena_data.txt');

interface ArtistData {
  stageName: string;
  slug: string;
  realName: string | null;
  origin: string | null;
  birthDate: string | null;
  note: string | null;
}

function slugify(name: string): string {
  return name
    .toLowerCase()
    .normalize('NFD').replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '');
}

function parseDate(text: string): string | null {
  // Format: "7. 6. 1986" -> "1986-06-07" (ISO)
  // or "NEUVEDENO"
  if (!text || text === 'NEUVEDENO') return null;
  
  const m = text.match(/(\d{1,2})\.\s*(\d{1,2})\.\s*(\d{4})/);
  if (m) {
    const d = m[1].padStart(2, '0');
    const mo = m[2].padStart(2, '0');
    return `${m[3]}-${mo}-${d}`;
  }
  
  // Just year? shouldn't happen
  return null;
}

// Parse the verified data file
const content = readFileSync(RAW_FILE, 'utf-8');
const lines = content.split('\n');

interface ParsedEntry {
  stageName: string;
  realName: string | null;
  origin: string | null;
  birthDate: string | null;
  isGroup: boolean;
  note: string | null;
}

const entries: ParsedEntry[] = [];

// Manual mapping based on file content
// Format: stage_name | real_name | origin | birth_date
const rawEntries: Array<{ stageName: string; slug: string; realName: string | null; origin: string | null; birthDate: string | null; isGroup: boolean; note: string | null }> = [
  // Czech scene
  { stageName: 'Smack One', slug: 'smack', realName: 'Jakub Janeček', origin: 'Praha', birthDate: '1986-06-07', isGroup: false, note: null },
  { stageName: 'Hugo Toxxx', slug: 'hugo-toxxx', realName: 'Jan Daněk', origin: 'Praha', birthDate: '1982-09-16', isGroup: false, note: null },
  { stageName: 'Vladimir 518', slug: 'vladimir-518', realName: 'Vladimír Brož', origin: 'Hostivice (u Prahy)', birthDate: '1978-08-08', isGroup: false, note: null },
  { stageName: 'Marpo', slug: 'marpo', realName: 'Otakar Petřina ml.', origin: 'Praha', birthDate: '1985-01-29', isGroup: false, note: null },
  { stageName: 'Ektor', slug: 'ektor', realName: 'Marko Elefteriadis', origin: 'Dobřichovice', birthDate: '1985-12-04', isGroup: false, note: null },
  { stageName: 'Yzomandias', slug: 'yzomandias', realName: 'Jakub Vlček', origin: 'Karlovy Vary', birthDate: '1991-03-21', isGroup: false, note: null },
  { stageName: 'Viktor Sheen', slug: 'viktor-sheen', realName: 'Viktor Dundych', origin: 'Almaty (KZ); vyrůstal na Kladně', birthDate: '1993-08-15', isGroup: false, note: null },
  { stageName: 'Nik Tendo', slug: 'nik-tendo', realName: 'Dominik Citta', origin: 'Pardubice', birthDate: '1993-08-19', isGroup: false, note: null },
  { stageName: 'Sergei Barracuda', slug: 'sergei-barracuda', realName: 'Erik Peter', origin: 'Ostrava', birthDate: '1990-05-31', isGroup: false, note: null },
  { stageName: 'Calin', slug: 'calin', realName: 'Călin Panfili', origin: 'Kišiněv (Moldavsko); žije v Brně', birthDate: '1997-08-11', isGroup: false, note: null },
  { stageName: 'Totally Nothin', slug: 'totally-nothin', realName: 'František Thiel', origin: 'Tábor (jižní Čechy)', birthDate: null, isGroup: false, note: null },
  { stageName: 'Dollar Prync', slug: 'dollar-prync', realName: null, origin: 'Smíchov, Praha', birthDate: null, isGroup: false, note: 'Romský pouliční rapper, A51; jméno ani datum nar. veřejně neuvádí' },
  
  // Slovak scene
  { stageName: 'Rytmus', slug: 'rytmus', realName: 'Patrik Vrbovský', origin: 'Kroměříž; vyrůstal v Piešťanech', birthDate: '1977-01-03', isGroup: false, note: null },
  { stageName: 'Ego', slug: 'ego', realName: 'Michal Straka', origin: 'Lučenec', birthDate: '1983-11-08', isGroup: false, note: null },
  { stageName: 'Separ', slug: 'separ', realName: 'Michael Kmeť', origin: 'Bratislava', birthDate: '1986-11-18', isGroup: false, note: null },
  { stageName: 'Kali', slug: 'kali', realName: 'Koloman Magyary', origin: 'Bratislava (Petržalka)', birthDate: '1982-12-29', isGroup: false, note: null },
  { stageName: 'Majk Spirit', slug: 'majk-spirit', realName: 'Michal Dušička', origin: 'Bratislava (Petržalka)', birthDate: '1984-08-28', isGroup: false, note: null },
  { stageName: 'Pil C', slug: 'pil-c', realName: 'Lukáš Kajanovič', origin: 'Partizánske; žije v Bratislavě', birthDate: '1986-04-19', isGroup: false, note: null },
  { stageName: 'Strapo', slug: 'strapo', realName: 'Ján Strapec', origin: 'Trnava', birthDate: '1989-03-10', isGroup: false, note: null },
  
  // Groups
  { stageName: 'Berlin Manson', slug: 'berlin-manson', realName: null, origin: 'Bratislava', birthDate: null, isGroup: true, note: 'Slovenská punk-rapová skupina. Členové: Adam Dragun (frontman), Patrik Nagy, Tomáš Tabiš. Data narození členů veřejně NEUVEDENA.' },
  
  // Unidentified
  { stageName: 'Pain', slug: 'pain', realName: null, origin: null, birthDate: null, isGroup: false, note: 'Nepodařilo se spolehlivě určit, o kterého interpreta jde (příliš obecné jméno).' },
];

let updated = 0;
let createdStubs = 0;
let skipped = 0;

for (const entry of rawEntries) {
  const entityDir = join(ENTITIES_DIR, `artist_${entry.slug}`);
  
  if (!existsSync(entityDir)) {
    // Create stub if missing
    mkdirSync(entityDir, { recursive: true });
    
    const meta: Record<string, unknown> = {
      id: `artist_${entry.slug}`,
      type: 'artist',
      slug: entry.slug,
      title: entry.stageName,
      description: entry.isGroup ? 'Skupina' : 'Umělec',
      publishedAt: '2026-06-12',
    };
    if (entry.realName) meta.realName = entry.realName;
    if (entry.origin) meta.origin = entry.origin;
    if (entry.birthDate) meta.birthDate = entry.birthDate;
    if (entry.isGroup) meta.isGroup = true;
    if (entry.note) meta.note = entry.note;
    
    writeFileSync(join(entityDir, 'meta.json'), JSON.stringify(meta, null, 2) + '\n');
    
    writeFileSync(join(entityDir, 'entity.mdx'), `---
title: "${entry.stageName}"
slug: "${entry.slug}"
type: "artist"
description: "${entry.isGroup ? 'Skupina' : 'Umělec'}"
publishedAt: "2026-06-12"
---
`);
    
    writeFileSync(join(entityDir, 'relations.json'), JSON.stringify({
      albums: [], artists: [], genres: [], influencedBy: [], labels: [],
      locations: [], moods: [], partOf: [], related: [], scenes: [],
      styles: [], themes: [], tracks: []
    }, null, 2) + '\n');
    
    createdStubs++;
    console.log(`✦ CREATED stub: ${entry.slug} (${entry.stageName})`);
    continue;
  }
  
  // Read existing meta.json
  const metaPath = join(entityDir, 'meta.json');
  let meta: Record<string, unknown>;
  
  if (existsSync(metaPath)) {
    meta = JSON.parse(readFileSync(metaPath, 'utf-8'));
  } else {
    meta = { id: `artist_${entry.slug}`, type: 'artist', slug: entry.slug };
  }
  
  // Update fields
  let changed = false;
  
  if (entry.realName && (meta.realName === undefined || meta.realName === null)) {
    meta.realName = entry.realName;
    changed = true;
  }
  
  if (entry.origin && (meta.origin === undefined || meta.origin === null)) {
    meta.origin = entry.origin;
    changed = true;
  }
  
  if (entry.birthDate && (meta.birthDate === undefined || meta.birthDate === null)) {
    meta.birthDate = entry.birthDate;
    changed = true;
  }
  
  if (entry.isGroup && !meta.isGroup) {
    meta.isGroup = true;
    changed = true;
  }
  
  // Clean up old "active" field (it was a placeholder, not verified)
  if (meta.active && meta.active !== undefined) {
    // Keep it but don't remove
  }
  
  if (!meta.realName && !entry.realName && entry.note) {
    meta.note = entry.note;
    changed = true;
  }
  
  if (changed) {
    writeFileSync(metaPath, JSON.stringify(meta, null, 2) + '\n');
    updated++;
    console.log(`✓ ${entry.slug}: ${entry.realName || '(no realName)'} | ${entry.origin || ''} | ${entry.birthDate || ''}`);
  } else {
    skipped++;
  }
}

console.log(`\nResults:`);
console.log(`  Updated: ${updated}`);
console.log(`  Created stubs: ${createdStubs}`);
console.log(`  Skipped (no changes): ${skipped}`);