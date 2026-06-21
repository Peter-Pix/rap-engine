#!/usr/bin/env python3
"""
Fix remaining unmatched albums with manual overrides.
Also fix the extract_main_artists function to handle more patterns.
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

def normalize_name(name):
    n = name.lower().strip()
    n = n.replace('(', '').replace(')', '').replace('!', '').replace('?', '')
    n = n.replace(':', '').replace(';', '').replace(',', '').replace('.', '')
    n = n.replace('"', '').replace("'", '').replace('–', '-').replace('—', '-')
    n = n.replace('ě', 'e').replace('š', 's').replace('č', 'c').replace('ř', 'r')
    n = n.replace('ž', 'z').replace('ý', 'y').replace('á', 'a').replace('í', 'i')
    n = n.replace('é', 'e').replace('ó', 'o').replace('ú', 'u').replace('ů', 'u')
    n = n.replace('ť', 't').replace('ď', 'd').replace('ň', 'n').replace('ĺ', 'l')
    n = n.replace('ľ', 'l').replace('ä', 'a').replace('ô', 'o')
    n = n.strip()
    return n

def main():
    data = load_json(os.path.join(CACHE, 'entities.json'))
    
    # Manual overrides: album_eid -> [artist_eid, ...]
    # These are albums where the description pattern wasn't caught
    overrides = {
        # "Album Robina Zoota" pattern
        'album_0002': ['artist_robin-zoot'],
        'album_pouzar': ['artist_robin-zoot'],
        'album_robby-trouble': ['artist_robin-zoot'],
        
        # "Debutové album Sofiana Medjmedje" pattern
        'album_19': ['artist_sofian-medjmedj'],
        'album_project-23': ['artist_sofian-medjmedj'],
        
        # "Společné album X a Y" - regex didn't catch because of year format
        'album_denpasar': ['artist_sofian-medjmedj', 'artist_ben-cristovao'],
        'album_khaosan': ['artist_sofian-medjmedj', 'artist_ben-cristovao'],
        
        # 58G albums
        'album_58-tape-vol-1': ['collective_58g'],
        'album_58-tape-vol-2': ['collective_58g'],
        'album_city-park': ['collective_58g'],
        'album_za-5-dvanact': ['collective_58g'],
        
        # "Album Hard Rica" pattern
        'album_global': ['artist_hard-rico'],
        
        # "Milion Plus" = label_milion-plus
        'album_krtek-forever': ['label_milion-plus'],
        
        # "Album Lipa" = Lipo
        'album_lyrika': ['artist_lipo'],
        
        # "Album Mamuti Lp" = Lp
        'album_mamuti-lp': ['artist_lp'],
        
        # "Debutové album Blaka" = Blako
        'album_roaming': ['artist_blako'],
        
        # "Debutové album Alana Murina" = Alan Murin
        'album_trueself': ['artist_alan-murin'],
        
        # "Čis T" albums
        'album_sin-limite-vol-2': ['artist_cis-t'],
        'album_yak-orol': ['artist_cis-t'],
        
        # "Album od Palerma" - Palermo not in DB, but Ektor is featured
        # 'album_fight': [],  # skip for now
        
        # "Cirk La Putyka" - not in DB
        # 'album_rest-in-euphoria': [],  # skip
        
        # "IF" albums - IF is not in DB as artist
        # These are Sofian Medjmedj's early work under alias IF
        'album_if': ['artist_sofian-medjmedj'],
        'album_rap': ['artist_sofian-medjmedj'],
        'album_rep': ['artist_sofian-medjmedj'],
        'album_stop-play': ['artist_sofian-medjmedj'],
        
        # "Bpm" albums - BPM is a label, not an artist
        # These are albums by various artists under BPM label
        # Skip for now - need to identify actual artists
        
        # "Album X" pattern - these have no description, skip
    }
    
    # Apply overrides
    updated = 0
    for album_eid, artist_eids in overrides.items():
        if album_eid not in data:
            print(f"  SKIP {album_eid}: not in data")
            continue
        
        for artist_eid in artist_eids:
            if artist_eid not in data:
                print(f"  SKIP {album_eid}→{artist_eid}: not in data")
                continue
            
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
            print(f"  {artist_name:30s} | +{album_title:40s}")
    
    print(f"\nUpdated {updated} albums via overrides")
    
    # Show still unmatched
    all_linked = set()
    for eid, e in data.items():
        if e.get('type') not in ('artist', 'collective', 'label'):
            continue
        rel_path = os.path.join(ENTITIES, eid, 'relations.json')
        if os.path.exists(rel_path):
            rels = load_json(rel_path)
            all_linked.update(rels.get('albums', []))
    
    still = [eid for eid, e in data.items() if e.get('type') == 'album' and eid not in all_linked]
    print(f"\n=== Still unmatched ({len(still)}) ===")
    
    # Categorize
    no_desc = []
    has_desc = []
    non_cz = []
    
    for eid in sorted(still):
        meta_path = os.path.join(ENTITIES, eid, 'meta.json')
        if os.path.exists(meta_path):
            meta = load_json(meta_path)
            desc = meta.get('description', '')
            title = meta.get('title', '?')
            if not desc or desc.strip() in ('Album', ''):
                no_desc.append((eid, title))
            elif 'Nas' in desc or 'Kevin McKay' in desc or 'The Willers' in desc or 'Mad Thing' in desc or 'René Gát' in desc or 'Andsan' in desc or 'Ario' in desc:
                non_cz.append((eid, title, desc[:100]))
            else:
                has_desc.append((eid, title, desc[:100]))
    
    print(f"\n--- No description ({len(no_desc)}) ---")
    for eid, title in no_desc:
        print(f"  {title:40s} | {eid}")
    
    print(f"\n--- Non-CZ/SK artists ({len(non_cz)}) ---")
    for eid, title, desc in non_cz:
        print(f"  {title:40s} | {eid} | {desc}")
    
    print(f"\n--- Has description but not matched ({len(has_desc)}) ---")
    for eid, title, desc in has_desc:
        print(f"  {title:40s} | {eid} | {desc}")

if __name__ == '__main__':
    main()
