/**
 * Import Rapedia Knowledge Graph (next.txt)
 *
 * 1. Normalizes IDs (rapper_ → artist_, group_ → collective_)
 * 2. Creates/updates entities for labels, albums, artists
 * 3. Props realName, birthDate, labels into meta.json
 * 4. Adds graph edges into relations.json
 */

import { readFileSync, writeFileSync, existsSync, mkdirSync } from 'fs';
import { readdirSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = join(__dirname, '..');
const ENTITIES_DIR = join(ROOT, 'content', 'entities');
const RAW_FILE = join(ROOT, 'raw-data', 'taxonomy', 'next.txt');

// ─── Types ────────────────────────────────────────────────────────────────

type EntityData = {
  id: string;
  kind: string;
  name: string;
  realName?: string | null;
  birthDate?: string | null;
  birthPlace?: string | null;
  originCity?: string | null;
  originCountry?: string | null;
  genres?: string[];
  labels?: string[];
  yearsActiveStart?: number;
  yearsActiveEnd?: number | null;
  releaseDate?: string;
  type?: string;
  upc?: string;
};

type GraphEdge = {
  source: string;
  relation: string;
  target: string;
  confidence: number;
  evidence?: string;
};

// ─── Normalize IDs ────────────────────────────────────────────────────────

function normalizeId(raw: string): string {
  const prefixMap: Record<string, string> = {
    'rapper_': 'artist_',
    'group_': 'collective_',
    'artist_': 'artist_',
    'label_': 'label_',
    'album_': 'album_',
    'track_': 'track_',
    'producer_': 'producer_',
    'project_': 'collective_',
    'influence_': 'artist_',
    'series_': 'article_',
    'city_': 'location_',
  };
  for (const [prefix, mapped] of Object.entries(prefixMap)) {
    if (raw.startsWith(prefix)) {
      return mapped + raw.slice(prefix.length);
    }
  }
  return raw;
}

// ─── Map relation types ───────────────────────────────────────────────────

function relationToRelationKey(relation: string): string | null {
  const map: Record<string, string[]> = {
    'labels': ['MEMBER_OF', 'RELEASED_ON_LABEL'],
    'related': ['COLLABORATED_WITH', 'HAS_FEATURE', 'ORIGINATED_FROM', 'VOICE_ACTOR_FOR'],
    'artists': ['MEMBER_OF', 'HAS_FEATURE', 'COLLABORATED_WITH', 'ORIGINATED_FROM'],
    'influencedBy': ['INFLUENCED_BY'],
    'partOf': ['MEMBER_OF'],
  };
  for (const [key, rels] of Object.entries(map)) {
    if (rels.includes(relation)) return key;
  }
  // Default: related (for anything we can't map exactly)
  return 'related';
}

// ─── Load raw data ────────────────────────────────────────────────────────

const rawContent = readFileSync(RAW_FILE, 'utf-8');
const ragedia = JSON.parse(rawContent);
const rawEntities = ragedia.rapedia_knowledge_graph.raw_entities;
const graphEdges: GraphEdge[] = ragedia.rapedia_knowledge_graph.graph_edges;

console.log(`📊 Rapedia KG loaded:`);
console.log(`   Raw entities: ${Object.keys(rawEntities).length}`);
console.log(`   Graph edges: ${graphEdges.length}`);

// ─── Existing entities ────────────────────────────────────────────────────

const existingDirs = new Set(readdirSync(ENTITIES_DIR));

// ─── Process entities: create/update ──────────────────────────────────────

interface RelationChanges {
  labels: string[];
  artists: string[];
  related: string[];
  albums: string[];
  tracks: string[];
  influencedBy: string[];
  partOf: string[];
}

let created = 0;
let updated = 0;
let skipped = 0;

function loadMeta(entityDir: string): Record<string, unknown> {
  const path = join(entityDir, 'meta.json');
  if (existsSync(path)) return JSON.parse(readFileSync(path, 'utf-8'));
  return {};
}

function saveMeta(entityDir: string, meta: Record<string, unknown>): void {
  writeFileSync(join(entityDir, 'meta.json'), JSON.stringify(meta, null, 2) + '\n');
}

function loadRelations(entityDir: string): Record<string, string[]> {
  const path = join(entityDir, 'relations.json');
  if (existsSync(path)) return JSON.parse(readFileSync(path, 'utf-8'));
  return { albums: [], artists: [], genres: [], influencedBy: [], labels: [],
    locations: [], moods: [], partOf: [], related: [], scenes: [],
    styles: [], themes: [], tracks: [] };
}

function saveRelations(entityDir: string, rel: Record<string, string[]>): void {
  writeFileSync(join(entityDir, 'relations.json'), JSON.stringify(rel, null, 2) + '\n');
}

for (const [rawId, rawEntity] of Object.entries(rawEntities)) {
  const entityData = (rawEntity as any)['entity.json'] as EntityData;
  if (!entityData) continue;

  const normalizedId = normalizeId(rawId);
  const entityDir = join(ENTITIES_DIR, normalizedId);
  const exists = existingDirs.has(normalizedId);
  
  let meta: Record<string, unknown>;
  let needSave = false;

  if (!exists) {
    // Create stub
    mkdirSync(entityDir, { recursive: true });
    
    const prefix = normalizedId.split('_')[0];
    const typeLabels: Record<string, string> = {
      artist: 'Umělec', label: 'Label', album: 'Album',
      track: 'Track', collective: 'Skupina', producer: 'Producent',
      location: 'Místo', article: 'Článek',
    };
    
    meta = {
      id: normalizedId,
      type: prefix,
      slug: normalizedId.slice(prefix.length + 1),
      title: entityData.name || normalizedId.slice(prefix.length + 1),
      description: typeLabels[prefix] || prefix,
      publishedAt: '2026-06-12',
    };
    
    // Write minimal entity.mdx
    writeFileSync(join(entityDir, 'entity.mdx'), `---
title: "${meta.title}"
slug: "${meta.slug}"
type: "${prefix}"
description: "${meta.description}"
publishedAt: "2026-06-12"
---
`);
    
    // Write relations.json
    saveRelations(entityDir, { albums: [], artists: [], genres: [], influencedBy: [], labels: [],
      locations: [], moods: [], partOf: [], related: [], scenes: [],
      styles: [], themes: [], tracks: [] });
    
    created++;
  } else {
    meta = loadMeta(entityDir);
  }

  // Enrich meta.json with data from Rapedia
  if (entityData.realName && !meta.realName) {
    meta.realName = entityData.realName;
    needSave = true;
  }
  if (entityData.birthDate && !meta.birthDate) {
    meta.birthDate = entityData.birthDate;
    needSave = true;
  }
  if (entityData.birthPlace && !meta.origin) {
    meta.origin = entityData.birthPlace;
    needSave = true;
  }
  if (entityData.originCity && !meta.origin) {
    meta.origin = entityData.originCity;
    needSave = true;
  }
  if (entityData.yearsActiveStart && !meta.active) {
    const start = entityData.yearsActiveStart;
    const end = entityData.yearsActiveEnd;
    meta.active = end ? `${start}–${end}` : `${start}–současnost`;
    needSave = true;
  }
  // Add album-specific data
  if (entityData.releaseDate && !meta.releaseDate) {
    meta.releaseDate = entityData.releaseDate;
    needSave = true;
  }
  if (entityData.upc && !meta.upc) {
    meta.upc = entityData.upc;
    needSave = true;
  }

  // Ensure title exists
  if (!meta.title && entityData.name) {
    meta.title = entityData.name;
    needSave = true;
  }

  if (needSave) {
    saveMeta(entityDir, meta);
    updated++;
  } else if (exists) {
    skipped++;
  }
}

console.log(`\n📦 Entity processing:`);
console.log(`   Created: ${created}`);
console.log(`   Enriched: ${updated}`);
console.log(`   Skipped (unchanged): ${skipped}`);

// ─── Process graph edges ──────────────────────────────────────────────────

// Collect edges per target entity (normalized ID)
type EdgeMap = Record<string, string[]>;
const edgesByTarget: Record<string, EdgeMap> = {};

for (const edge of graphEdges) {
  const sourceId = normalizeId(edge.source);
  const targetId = normalizeId(edge.target);
  
  if (!edgesByTarget[sourceId]) edgesByTarget[sourceId] = { labels: [], artists: [], related: [], albums: [], tracks: [], influencedBy: [], partOf: [] };
  
  // Determine relation key
  const relKey = relationToRelationKey(edge.relation);
  if (relKey && !edgesByTarget[sourceId][relKey]?.includes(targetId)) {
    edgesByTarget[sourceId][relKey].push(targetId);
  }
}

// Also add reverse edges? No — keep it directed as our schema is undirected enough
// We'll add edges to both source and target where it makes sense

// Write edges to relations.json
let edgeUpdates = 0;

for (const [entityId, edgeData] of Object.entries(edgesByTarget)) {
  const entityDir = join(ENTITIES_DIR, entityId);
  if (!existsSync(entityDir)) continue;
  
  const rel = loadRelations(entityDir);
  let changed = false;
  
  for (const [key, newValues] of Object.entries(edgeData)) {
    if (!newValues.length) continue;
    if (!(key in rel)) rel[key] = [];
    
    for (const val of newValues) {
      if (!rel[key].includes(val)) {
        rel[key].push(val);
        changed = true;
      }
    }
  }
  
  if (changed) {
    saveRelations(entityDir, rel);
    edgeUpdates++;
  }
}

console.log(`\n🔗 Edge processing:`);
console.log(`   Edge targets distributed: ${edgeUpdates} entities updated`);

// ─── Summary ──────────────────────────────────────────────────────────────

console.log(`\n📊 Total edges in Rapedia: ${graphEdges.length}`);
console.log(`   Labl affiliations (MEMBER_OF/RELEASED_ON_LABEL): ${graphEdges.filter(e => e.relation === 'MEMBER_OF' || e.relation === 'RELEASED_ON_LABEL').length}`);
console.log(`   Album releases (RELEASED_BY): ${graphEdges.filter(e => e.relation === 'RELEASED_BY').length}`);
console.log(`   Features (HAS_FEATURE): ${graphEdges.filter(e => e.relation === 'HAS_FEATURE').length}`);
console.log(`   Producers (HAS_PRODUCER): ${graphEdges.filter(e => e.relation === 'HAS_PRODUCER').length}`);
console.log(`   Collaborations (COLLABORATED_WITH): ${graphEdges.filter(e => e.relation === 'COLLABORATED_WITH').length}`);