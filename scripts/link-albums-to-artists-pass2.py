#!/usr/bin/env python3
"""
Second pass: link remaining unmatched albums using:
1. rel.artists in album's own relations.json
2. More flexible description matching (aliases, partial names)
3. Manual overrides for known cases
"""

import json, os, re, sys
from collections import defaultdict

BASE = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
ENTITIES = os.path.join(BASE, 'content', 'entities')
CACHE = os.path.join(BASE, '.content-cache')

def load_json(path):
    with open(path) as f:
        return json.load(f)

def save_json(path, data):
    with open(path, 'w') as f:
        json.dump(data, f, indent=2, ensure_ascii=False)
        f.write('\n')

def main():
    data = load_json(os.path.join(CACHE, 'entities.json'))
    
    # Build artist name -> eid map (with aliases)
    artist_map = {}
    for eid, e in data.items():
        if e.get('type') == 'artist':
            title = e.get('title', '')
            slug = e.get('slug', '')
            # Primary name
            artist_map[title.lower().strip()] = eid
            # Slug as name
            artist_map[slug.lower().replace('-', ' ')] = eid
            # Also add without diacritics
            import unicodedata
            def strip_diac(s):
                return ''.join(c for c in unicodedata.normalize('NFKD', s) if not unicodedata.combining(c))
            artist_map[strip_diac(title.lower().strip())] = eid
            artist_map[strip_diac(slug.lower().replace('-', ' '))] = eid
    
    # Manual aliases for names that don't match
    aliases = {
        'câlin': 'calin',
        'filip konvalinka': 'sofian medjmedj',
        'the willers brothers': 'the willers brothers',  # might not exist
        'animist': 'digit',
        'p t k': 'ptk',
        'kristián': 'kristian',
        'michal': 'michal',
        'adam': 'adam',
        'david': 'david',
        'jan': 'jan',
        'petr': 'petr',
        'tomáš': 'tomas',
        'martin': 'martin',
        'jakub': 'jakub',
        'lukáš': 'lukas',
        'ondřej': 'ondrej',
        'vojtěch': 'vojtech',
        'matěj': 'matej',
        'filip': 'filip',
    }
    
    # Find all albums that still need matching
    # First, check which artists already have albums
    artists_with_albums = set()
    for eid, e in data.items():
        if e.get('type') != 'artist':
            continue
        rel_path = os.path.join(ENTITIES, eid, 'relations.json')
        if os.path.exists(rel_path):
            rels = load_json(rel_path)
            for a in rels.get('albums', []):
                artists_with_albums.add(a)
    
    # Find unmatched albums
    unmatched = []
    for eid, e in data.items():
        if e.get('type') != 'album':
            continue
        if eid not in artists_with_albums:
            unmatched.append(eid)
    
    print(f"Unmatched albums: {len(unmatched)}")
    
    # Try to match each
    matched = 0
    album_to_artist = defaultdict(list)
    
    for eid in sorted(unmatched):
        meta_path = os.path.join(ENTITIES, eid, 'meta.json')
        if not os.path.exists(meta_path):
            continue
        meta = load_json(meta_path)
        desc = meta.get('description', '')
        title = meta.get('title', '?')
        
        # Method 1: Check album's own relations.json for artists
        rel_path = os.path.join(ENTITIES, eid, 'relations.json')
        if os.path.exists(rel_path):
            rels = load_json(rel_path)
            for artist_ref in rels.get('artists', []):
                if artist_ref in data:
                    album_to_artist[artist_ref].append(eid)
                    matched += 1
                    continue
        
        # Method 2: Try description matching with aliases
        if desc and eid not in [a for ids in album_to_artist.values() for a in ids]:
            desc_lower = desc.lower()
            for artist_title, artist_eid in artist_map.items():
                if artist_title in desc_lower and len(artist_title) > 2:
                    album_to_artist[artist_eid].append(eid)
                    matched += 1
                    break
    
    print(f"Matched: {matched}")
    
    # Update relations
    updated = 0
    for artist_eid, albums in sorted(album_to_artist.items()):
        rel_path = os.path.join(ENTITIES, artist_eid, 'relations.json')
        if not os.path.exists(rel_path):
            continue
        
        rels = load_json(rel_path)
        existing = set(rels.get('albums', []))
        new_albums = [a for a in albums if a not in existing]
        
        if not new_albums:
            continue
        
        rels['albums'] = sorted(set(rels.get('albums', [])) | set(albums))
        save_json(rel_path, rels)
        updated += 1
        
        artist_data = data.get(artist_eid, {})
        artist_name = artist_data.get('title', artist_eid)
        print(f"  {artist_name:30s} | +{len(new_albums):2d} albums (total {len(rels['albums'])})")
    
    print(f"\nUpdated {updated} artists")
    
    # Show still unmatched
    still_unmatched = []
    for eid in unmatched:
        found = False
        for artist_eid, albums in album_to_artist.items():
            if eid in albums:
                found = True
                break
        if not found:
            still_unmatched.append(eid)
    
    if still_unmatched:
        print(f"\n=== Still unmatched ({len(still_unmatched)}) ===")
        for eid in sorted(still_unmatched):
            meta_path = os.path.join(ENTITIES, eid, 'meta.json')
            if os.path.exists(meta_path):
                meta = load_json(meta_path)
                desc = meta.get('description', '')[:100]
                print(f"  {meta.get('title','?'):40s} | {eid} | {desc}")

if __name__ == '__main__':
    main()
