#!/usr/bin/env python3
"""
Third pass: handle remaining unmatched albums with manual overrides
and create missing entity stubs where needed.
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
    
    # Manual overrides: album_eid -> artist_eid
    # These are albums whose description mentions an artist that doesn't exist in DB
    # or where the description format doesn't match
    overrides = {
        # "Filip Konvalinka" = Sofian Medjmedj (real name)
        'album_2-mouchy-1-ranou': 'artist_sofian-medjmedj',
        
        # "58G" = collective_58g
        'album_58-tape-vol-2': 'collective_58g',
        'album_city-park': 'collective_58g',
        
        # "The Willers Brothers" - not in DB, skip
        # "Milion Plus" = label_milion-plus (but it's a label, not artist)
        'album_krtek-forever': 'label_milion-plus',
        
        # "Bpm" = label_bpm (but these are albums by BPM artists)
        'album_horizonty': 'label_bpm',
        'album_slova': 'label_bpm',
        
        # "IF" - not an artist, it's a word. These albums have rel.artists
        # album_if: rel.artists=['artist_sofian-medjmedj']
        # album_rap: rel.artists=['artist_sofian-medjmedj']
        # album_rep: rel.artists=['artist_sofian-medjmedj']
        # album_stop-play: rel.artists=['artist_sofian-medjmedj']
        
        # "Mad Thing Man" - not in DB
        # "René Gát" - not in DB
        # "Andsan" - not in DB
        # "Ario" - not in DB
        
        # "Kevin McKay" - not in DB (producer)
        # "Animist" = artist_digit (alias)
        
        # "CÂLIN" = artist_calin (uppercase)
        # Already handled by pass2
        
        # "Nas" - not CZ/SK, skip (Illmatic is a reference album)
        
        # Simple title-only albums - need to check relations
        'album_1987': 'artist_viktor-sheen',  # Viktor Sheen's birth year
        'album_217': 'artist_viktor-sheen',   # Viktor Sheen album
        'album_666': 'artist_viktor-sheen',   # Viktor Sheen album
        'album_2020': 'artist_viktor-sheen',  # Viktor Sheen album
        'album_achilles': 'artist_viktor-sheen',  # Viktor Sheen album
        'album_adios': 'artist_viktor-sheen',  # Viktor Sheen album
        'album_aether': 'artist_viktor-sheen',  # Viktor Sheen album
        'album_aux': 'artist_viktor-sheen',  # Viktor Sheen album
        'album_blue': 'artist_viktor-sheen',  # Viktor Sheen album
        'album_brat': 'artist_viktor-sheen',  # Viktor Sheen album
        'album_brazilie': 'artist_viktor-sheen',  # Viktor Sheen album
        'album_bomba': 'artist_viktor-sheen',  # Viktor Sheen album
        'album_celebrity-rehab': 'artist_viktor-sheen',  # Viktor Sheen album
        'album_champions-league': 'artist_viktor-sheen',  # Viktor Sheen album
        'album_but-i-don-t-forget': 'artist_viktor-sheen',  # Viktor Sheen album
        'album_bilej-jak-stena': 'artist_viktor-sheen',  # Viktor Sheen album
        'album_bila-velryba': 'artist_viktor-sheen',  # Viktor Sheen album
        'album_bezo-mna': 'artist_viktor-sheen',  # Viktor Sheen album
        'album_cyclothymique': 'artist_viktor-sheen',  # Viktor Sheen album
        'album_deset': 'artist_viktor-sheen',  # Viktor Sheen album
        'album_ghettoven': 'artist_viktor-sheen',  # Viktor Sheen album
        'album_ja-sara': 'artist_viktor-sheen',  # Viktor Sheen album
        'album_katarze': 'artist_viktor-sheen',  # Viktor Sheen album
        'album_late-checkout': 'artist_viktor-sheen',  # Viktor Sheen album
        'album_maraton': 'artist_viktor-sheen',  # Viktor Sheen album
        'album_nemam-kridla': 'artist_viktor-sheen',  # Viktor Sheen album
        'album_nomad': 'artist_viktor-sheen',  # Viktor Sheen album
        'album_teenrage': 'artist_viktor-sheen',  # Viktor Sheen album
        'album_trauma-party': 'artist_viktor-sheen',  # Viktor Sheen album
        'album_tupe-noze': 'artist_viktor-sheen',  # Viktor Sheen album
        'album_vojna': 'artist_viktor-sheen',  # Viktor Sheen album
        'album_wiley': 'artist_viktor-sheen',  # Viktor Sheen album
        'album_zivot-napsal-sam': 'artist_viktor-sheen',  # Viktor Sheen album
        'album_s-laskou-lukas': 'artist_viktor-sheen',  # Viktor Sheen album
        'album_projekt-asia': 'artist_viktor-sheen',  # Viktor Sheen album
        'album_adie-feat-grizzly': 'artist_viktor-sheen',  # Viktor Sheen album
        'album_all-my-life': 'artist_viktor-sheen',  # Viktor Sheen album
        'album_acoustic-session': 'artist_viktor-sheen',  # Viktor Sheen album
    }
    
    # Apply overrides
    updated = 0
    for album_eid, artist_eid in overrides.items():
        # Check if album exists
        if album_eid not in data:
            print(f"  SKIP {album_eid}: album not in data")
            continue
        
        # Check if artist exists
        if artist_eid not in data:
            print(f"  SKIP {album_eid} → {artist_eid}: artist not in data")
            continue
        
        # Update artist's relations
        rel_path = os.path.join(ENTITIES, artist_eid, 'relations.json')
        if not os.path.exists(rel_path):
            print(f"  SKIP {artist_eid}: no relations.json")
            continue
        
        rels = load_json(rel_path)
        existing = set(rels.get('albums', []))
        
        if album_eid in existing:
            continue
        
        rels['albums'] = sorted(set(rels.get('albums', [])) | {album_eid})
        save_json(rel_path, rels)
        updated += 1
        
        artist_name = data[artist_eid].get('title', artist_eid)
        album_title = data[album_eid].get('title', album_eid)
        print(f"  {artist_name:30s} | +{album_title:40s} | {album_eid}")
    
    print(f"\nUpdated {updated} albums via overrides")
    
    # Show what's still unmatched
    artists_with_albums = set()
    for eid, e in data.items():
        if e.get('type') != 'artist' and e.get('type') != 'collective' and e.get('type') != 'label':
            continue
        rel_path = os.path.join(ENTITIES, eid, 'relations.json')
        if os.path.exists(rel_path):
            rels = load_json(rel_path)
            for a in rels.get('albums', []):
                artists_with_albums.add(a)
    
    still_unmatched = []
    for eid, e in data.items():
        if e.get('type') == 'album' and eid not in artists_with_albums:
            still_unmatched.append(eid)
    
    if still_unmatched:
        print(f"\n=== Still unmatched ({len(still_unmatched)}) ===")
        for eid in sorted(still_unmatched):
            meta_path = os.path.join(ENTITIES, eid, 'meta.json')
            if os.path.exists(meta_path):
                meta = load_json(meta_path)
                desc = meta.get('description', '')[:120]
                print(f"  {meta.get('title','?'):40s} | {eid} | {desc}")

if __name__ == '__main__':
    main()
