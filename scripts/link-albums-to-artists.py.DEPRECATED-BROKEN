#!/usr/bin/env python3
"""
Link albums to artists based on description field matching.
Scans all album meta.json descriptions for artist names and adds
matching albums to the artist's relations.json.
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
    
    # Build artist name -> eid map
    artist_map = {}
    for eid, e in data.items():
        if e.get('type') == 'artist':
            title = e.get('title', '')
            artist_map[title.lower()] = eid
            # Also add slug-based lookup
            slug = e.get('slug', '')
            artist_map[slug.lower().replace('-', ' ')] = eid
    
    # For each album, find artist from description
    album_to_artist = {}  # album_eid -> artist_eid
    unmatched = []
    
    for eid, e in data.items():
        if e.get('type') != 'album':
            continue
        meta_path = os.path.join(ENTITIES, eid, 'meta.json')
        if not os.path.exists(meta_path):
            continue
        meta = load_json(meta_path)
        desc = meta.get('description', '')
        if not desc:
            continue
        
        # Try to match artist name in description
        matched = False
        for artist_title, artist_eid in artist_map.items():
            if artist_title in desc.lower():
                album_to_artist[eid] = artist_eid
                matched = True
                break
        
        if not matched:
            unmatched.append((eid, meta.get('title', '?')))
    
    print(f"Matched {len(album_to_artist)} albums to artists")
    print(f"Unmatched: {len(unmatched)}")
    
    # Group albums by artist
    artist_albums = defaultdict(list)
    for album_eid, artist_eid in album_to_artist.items():
        artist_albums[artist_eid].append(album_eid)
    
    # Update each artist's relations.json
    updated = 0
    for artist_eid, albums in sorted(artist_albums.items()):
        rel_path = os.path.join(ENTITIES, artist_eid, 'relations.json')
        if not os.path.exists(rel_path):
            print(f"  SKIP {artist_eid}: no relations.json")
            continue
        
        rels = load_json(rel_path)
        existing = set(rels.get('albums', []))
        new_albums = [a for a in albums if a not in existing]
        
        if not new_albums:
            continue
        
        rels['albums'] = sorted(set(rels.get('albums', [])) | set(albums))
        save_json(rel_path, rels)
        updated += 1
        
        # Get artist name for display
        artist_data = data.get(artist_eid, {})
        artist_name = artist_data.get('title', artist_eid)
        print(f"  {artist_name:30s} | +{len(new_albums):2d} albums (total {len(rels['albums'])})")
    
    print(f"\nUpdated {updated} artists")
    
    # Show unmatched albums
    if unmatched:
        print(f"\n=== Unmatched albums ({len(unmatched)}) ===")
        for eid, title in sorted(unmatched, key=lambda x: x[1]):
            print(f"  {title:50s} | {eid}")

if __name__ == '__main__':
    main()
