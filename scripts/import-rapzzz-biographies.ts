/**
 * Import Rapzzz biografie (next2.txt)
 *
 * Extracts JSON objects from the text file, maps to artist entities,
 * enriches meta.json with aliases, skills, biography text,
 * and creates album/track entities with tracklists.
 */

import { readFileSync, writeFileSync, existsSync, mkdirSync } from 'fs';
import { readdirSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = join(__dirname, '..');
const ENTITIES_DIR = join(ROOT, 'content', 'entities');
const RAW_FILE = join(ROOT, 'raw-data', 'taxonomy', 'next2.txt');

// ─── Slugify ──────────────────────────────────────────────────────────────

function slugify(name: string): string {
  return name
    .toLowerCase()
    .normalize('NFD').replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '');
}

// ─── Extract JSON objects from text ──────────────────────────────────────

function extractJsonObjects(text: string): Record<string, unknown>[] {
  const objects: Record<string, unknown>[] = [];
  let depth = 0;
  let start = -1;
  let i = 0;

  while (i < text.length) {
    if (text[i] === '{') {
      if (depth === 0) start = i;
      depth++;
    } else if (text[i] === '}') {
      depth--;
      if (depth === 0 && start !== -1) {
        const jsonStr = text.substring(start, i + 1);
        try {
          const obj = JSON.parse(jsonStr);
          objects.push(obj);
        } catch {
          // Skip invalid JSON
        }
        start = -1;
      }
    }
    i++;
  }

  return objects;
}

// ─── Map artist name to slug ───────────────────────────────────────────────

const nameToSlug: Record<string, string> = {
  'DJ Wich': 'dj-wich',
  'Yzomandias': 'yzomandias',
  'Ektor': 'ektor',
  'Maniak': 'maniak',
  'PTK': 'ptk',
  'Kato': 'kato',
  'Idea': 'idea',
  'Rest': 'rest',
  'Michajlov': 'michajlov',
  'MC Baron': 'mc-baron',
  'Řáhol One': 'rahol-one',
  'MC Dup X': 'mc-dup-x',
};

// ─── Helpers ──────────────────────────────────────────────────────────────

function loadMeta(entityDir: string): Record<string, unknown> {
  const path = join(entityDir, 'meta.json');
  if (existsSync(path)) return JSON.parse(readFileSync(path, 'utf-8'));
  return {};
}

function saveMeta(entityDir: string, meta: Record<string, unknown>): void {
  writeFileSync(join(entityDir, 'meta.json'), JSON.stringify(meta, null, 2) + '\n');
}

function loadMdx(entityDir: string): string | null {
  const path = join(entityDir, 'entity.mdx');
  if (existsSync(path)) return readFileSync(path, 'utf-8');
  return null;
}

function saveMdx(entityDir: string, mdx: string): void {
  writeFileSync(join(entityDir, 'entity.mdx'), mdx);
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

// ─── Main ─────────────────────────────────────────────────────────────────

const rawContent = readFileSync(RAW_FILE, 'utf-8');
const objects = extractJsonObjects(rawContent);

console.log(`📊 Extracted ${objects.length} JSON objects from next2.txt`);

// Identify which objects are "umelec" profiles vs lists
const artistProfiles = objects.filter(obj => (obj as any).umelec);
const otherLists = objects.filter(obj => !(obj as any).umelec && (obj as any).kategorie);

console.log(`   Artist profiles: ${artistProfiles.length}`);
console.log(`   Other lists: ${otherLists.length}`);

let enrichedMeta = 0;
let bioWritten = 0;
let albumsCreated = 0;
let edgesAdded = 0;

// ─── Process artist profiles ──────────────────────────────────────────────

for (const obj of artistProfiles) {
  const profile = (obj as any).umelec;
  const name = profile?.jmeno;
  if (!name) continue;

  const slug = nameToSlug[name];
  if (!slug) {
    console.log(`  ⚠️  Unknown artist: "${name}" — skipping`);
    continue;
  }

  const entityDir = join(ENTITIES_DIR, `artist_${slug}`);
  if (!existsSync(entityDir)) {
    console.log(`  ⚠️  Entity not found: artist_${slug} — skipping`);
    continue;
  }

  const meta = loadMeta(entityDir);
  const mdx = loadMdx(entityDir);
  const rel = loadRelations(entityDir);
  let metaChanged = false;
  let mdxChanged = false;
  let relChanged = false;

  // --- meta.json: aliases ---
  if (profile.alias && Array.isArray(profile.alias) && profile.alias.length > 0) {
    if (!meta.aliases) {
      meta.aliases = profile.alias;
      metaChanged = true;
    }
  }

  // --- meta.json: skills ---
  if (profile.dovednosti && Array.isArray(profile.dovednosti) && profile.dovednosti.length > 0) {
    if (!meta.skills) {
      meta.skills = profile.dovednosti;
      metaChanged = true;
    }
  }

  // --- meta.json: real name ---
  if (profile.skutecne_jmeno && !meta.realName) {
    meta.realName = profile.skutecne_jmeno;
    metaChanged = true;
  }

  // --- meta.json: birth date ---
  if (profile.datum_narozeni && !meta.birthDate) {
    meta.birthDate = profile.datum_narozeni;
    metaChanged = true;
  }

  // --- meta.json: origin ---
  if (profile.misto_narozeni && !meta.origin) {
    meta.origin = profile.misto_narozeni;
    metaChanged = true;
  }

  // --- meta.json: city ---
  if (profile.mesto || profile.aktivní_mesto) {
    const cityText = profile.aktivní_mesto || profile.mesto;
    if (cityText && !meta.location) {
      meta.location = cityText;
      metaChanged = true;
    }
  }

  // --- meta.json: description (biografie) ---
  let bioText = '';
  if (profile.biografie) {
    bioText = typeof profile.biografie === 'string' 
      ? profile.biografie 
      : JSON.stringify(profile.biografie);
  }
  if (profile.opis && !bioText) {
    bioText = profile.opis;
  }

  if (bioText) {
    // Update meta description if empty
    if (!meta.description || meta.description === 'Umělec' || meta.description === 'Artist' || String(meta.description).length < 20) {
      meta.description = bioText;
      metaChanged = true;
    }

    // Update entity.mdx with bio if it's a stub
    if (mdx && mdx.includes('<!-- Stub entity')) {
      const parts = mdx.match(/^---\n([\s\S]*?)\n---\n?([\s\S]*)$/);
      if (parts) {
        const newBody = bioText + '\n';
        saveMdx(entityDir, `---\n${parts[1]}\n---\n\n${newBody}`);
        mdxChanged = true;
        bioWritten++;
      }
    }
  }

  // --- relations: labels from collaborations ---
  if (profile.tvorba?.spoluprace_vybrane) {
    for (const collab of profile.tvorba.spoluprace_vybrane) {
      const collabName = collab.nazev || collab.projekt || collab.album;
      const partner = collab.partner;
      
      // If partner is a known artist, add to related
      if (partner) {
        const partnerSlug = nameToSlug[partner];
        if (partnerSlug && !rel.related?.includes(`artist_${partnerSlug}`)) {
          if (!rel.related) rel.related = [];
          rel.related.push(`artist_${partnerSlug}`);
          relChanged = true;
          edgesAdded++;
        }
      }

      // If it's a specific album, record the reference
      if (collabName) {
        const albumSlug = slugify(collabName);
        const albumId = `album_${albumSlug}`;
        // Check if album entity exists or needs creating
        const albumDir = join(ENTITIES_DIR, albumId);
        if (!existsSync(albumDir)) {
          mkdirSync(albumDir, { recursive: true });
          const albumMeta = {
            id: albumId,
            type: 'album',
            slug: albumSlug,
            title: collabName,
            description: `Album od ${name}`,
            releaseDate: collab.rok ? String(collab.rok) : undefined,
            publishedAt: '2026-06-12',
          };
          writeFileSync(join(albumDir, 'meta.json'), JSON.stringify(albumMeta, null, 2) + '\n');
          writeFileSync(join(albumDir, 'entity.mdx'), `---
title: "${collabName}"
slug: "${albumSlug}"
type: "album"
description: "Album od ${name}"
publishedAt: "2026-06-12"
---
`);
          writeFileSync(join(albumDir, 'relations.json'), JSON.stringify({
            albums: [], artists: [entityDir.split('/').pop()!], genres: [], 
            influencedBy: [], labels: [], locations: [], moods: [], 
            partOf: [], related: [], scenes: [], styles: [], themes: [], tracks: []
          }, null, 2) + '\n');
          albumsCreated++;
        }
        
        // Add album reference to artist
        if (!rel.albums?.includes(albumId)) {
          if (!rel.albums) rel.albums = [];
          rel.albums.push(albumId);
          relChanged = true;
        }

        // Also add feature references if the album has known collaborations
        if (profile.tvorba?.vlastni_alba_singly) {
          for (const album of profile.tvorba.vlastni_alba_singly) {
            if (slugify(album.nazev) === albumSlug && album.tracklist_vybrane) {
              for (const track of album.tracklist_vybrane) {
                const featMatch = track.match(/feat\.\s*([^)]+)/i);
                if (featMatch) {
                  const featName = featMatch[1].split(',')[0].trim();
                  const featSlug = slugify(featName);
                  const featId = `artist_${featSlug}`;
                  if (!rel.related?.includes(featId)) {
                    if (!rel.related) rel.related = [];
                    rel.related.push(featId);
                    relChanged = true;
                    edgesAdded++;
                  }
                }
              }
            }
          }
        }
      }
    }
  }

  // --- relations: genres from zanry_styl ---
  if (profile.zanry_styl && Array.isArray(profile.zanry_styl)) {
    // Map to genre entity IDs
    const genreMap: Record<string, string> = {
      'trap': 'genre_trap',
      'boombap': 'genre_boom-bap',
      'hip-hop': 'genre_hip-hop',
      'oldschool': 'genre_old-school-rap',
      'newschool': 'genre_newschool-rap',
      'rap': 'genre_rap',
      'electro': 'genre_electro',
      'grime': 'genre_grime',
      'alternative': 'genre_alternative-rap',
      'experimental': 'genre_experimental-rap',
      'freestyle': 'genre_freestyle-rap',
      'trueschool': 'genre_trueschool-rap',
    };
    
    for (const style of profile.zanry_styl) {
      const lower = style.toLowerCase();
      for (const [key, genreId] of Object.entries(genreMap)) {
        if (lower.includes(key)) {
          if (!rel.genres?.includes(genreId)) {
            if (!rel.genres) rel.genres = [];
            rel.genres.push(genreId);
            relChanged = true;
          }
          break;
        }
      }
    }
  }

  if (metaChanged) {
    saveMeta(entityDir, meta);
    enrichedMeta++;
  }
  
  if (relChanged) {
    saveRelations(entityDir, rel);
  }
}

// ─── Process city lists ───────────────────────────────────────────────────

for (const list of otherLists) {
  const category = (list as any).kategorie || '';
  const artists = (list as any).seznam_artistu || [];
  
  console.log(`   List: "${category}" (${artists.length} artists)`);
  
  for (const entry of artists) {
    const name = entry.jmeno;
    const slug = nameToSlug[name] || slugify(name);
    const entityDir = join(ENTITIES_DIR, `artist_${slug}`);
    
    if (!existsSync(entityDir)) continue;
    
    const meta = loadMeta(entityDir);
    let changed = false;
    
    if (entry.alias && Array.isArray(entry.alias) && !meta.aliases) {
      meta.aliases = entry.alias;
      changed = true;
    }
    
    if (entry.popisek && !meta.description) {
      meta.description = entry.popisek;
      changed = true;
    }
    
    if (changed) {
      saveMeta(entityDir, meta);
      enrichedMeta++;
    }
  }
}

console.log(`\n📊 Results:`);
console.log(`   Artists enriched: ${enrichedMeta}`);
console.log(`   Biographies written to MDX: ${bioWritten}`);
console.log(`   Albums created: ${albumsCreated}`);
console.log(`   Edge references added: ${edgesAdded}`);