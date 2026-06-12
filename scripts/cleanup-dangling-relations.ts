/**
 * Clean up known-bad dangling relations.
 * 
 * 1. Remove refs containing brackets/commas (invalid list syntax in a ref string)
 * 2. Fix known typos (pauli-garand -> paulie-garand)
 * 
 * Only operates on ref strings — does NOT validate existence of target entities.
 * Does NOT add prefixes. Does NOT remove valid-looking refs.
 */

import { readFileSync, writeFileSync, existsSync } from 'fs';
import { readdirSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = join(__dirname, '..');
const ENTITIES_DIR = join(ROOT, 'content', 'entities');

interface Relations {
  [key: string]: string[];
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

// Known typos: wrong slug -> correct slug (must be full entity slug)
const SLUG_FIXES: Record<string, string> = {
  'pauli-garand': 'paulie-garand',
  'artist_pauli-garand': 'artist_paulie-garand',
};

function isBracketSyntax(ref: string): boolean {
  return ref.includes('[') || ref.includes(']') || ref.includes(',');
}

function fixKnownTypo(ref: string): string | null {
  return SLUG_FIXES[ref] || null;
}

let fixCount = 0;
let removedCount = 0;
let entityCount = 0;

for (const entityDir of readdirSync(ENTITIES_DIR)) {
  const entityPath = join(ENTITIES_DIR, entityDir);
  if (!existsSync(join(entityPath, 'relations.json'))) continue;

  const rel = loadRelations(entityPath);
  if (!rel) continue;

  let changed = false;

  for (const key of Object.keys(rel)) {
    const values = rel[key];
    if (!Array.isArray(values)) continue;

    const cleaned: string[] = [];
    for (const ref of values) {
      // Remove bracket-syntax refs (invalid: "[artist_A, artist_B]")
      if (isBracketSyntax(ref)) {
        removedCount++;
        changed = true;
        continue;
      }

      // Fix known typos
      const fixed = fixKnownTypo(ref);
      if (fixed) {
        cleaned.push(fixed);
        fixCount++;
        changed = true;
        continue;
      }

      cleaned.push(ref);
    }

    rel[key] = cleaned;
  }

  if (changed) {
    saveRelations(entityPath, rel);
    entityCount++;
  }
}

console.log(`\nResults:`);
console.log(`  Entities cleaned: ${entityCount}`);
console.log(`  Removed invalid bracket-refs: ${removedCount}`);
console.log(`  Fixed typos: ${fixCount}`);