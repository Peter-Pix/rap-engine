#!/usr/bin/env python3
"""
Fix album-artist links: correctly parse descriptions to determine
who is the MAIN artist vs. just a featured guest.

Description patterns:
  'X v roce Y vydal album' → X is main artist
  'Společné album X a Y' → X and Y are main artists
  'Debutové album X' → X is main artist
  'Album X z roku Y' → X is main artist
  'Pátá/Čtvrtá/... deska X' → X is main artist
  'X v roce Y vydal EP' → X is main artist
  'Album' (just 'Album') → no info, skip
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

def extract_main_artists(desc, title):
    """Extract main artist name(s) from album description."""
    if not desc or desc.strip() in ('Album', ''):
        return []
    
    # Pattern 1: 'X v roce Y vydal album/EP/mixtape'
    m = re.match(r'^([^\.]+?)\s+v roce\s+\d{4}\s+vydal\s+(?:sv[ůů]e\s+)?(?:debutové\s+)?(?:album|EP|mixtape|desku)', desc)
    if m:
        name = m.group(1).strip()
        # Handle 'Společné album X a Y' - this is caught by pattern 2
        if name.lower().startswith('společné album'):
            return []
        return [name]
    
    # Pattern 2: 'Společné album X a Y'
    m = re.match(r'^Společné album\s+([^\.]+?)\s+a\s+([^\.]+?)(?:\s+z roku|\s+v roce|\s*\.)', desc)
    if m:
        return [m.group(1).strip(), m.group(2).strip()]
    
    # Pattern 3: 'Debutové album X'
    m = re.match(r'^Debutové album\s+([^\.]+?)(?:\s+z roku|\s+v roce|\s*\.)', desc)
    if m:
        return [m.group(1).strip()]
    
    # Pattern 4: 'Album X z roku Y'
    m = re.match(r'^Album\s+([^\.]+?)\s+z roku\s+\d{4}', desc)
    if m:
        return [m.group(1).strip()]
    
    # Pattern 5: 'Pátá/Čtvrtá/... deska X'
    m = re.match(r'^(Pátá|Čtvrtá|Třetí|Druhá|Šestá|Sedmá|Osmá|Devátá|Desátá)\s+deska\s+([^\.]+?)(?:\s+z roku|\s+v roce|\s*\.)', desc)
    if m:
        return [m.group(2).strip()]
    
    # Pattern 6: 'X v roce Y vydal své druhé/třetí/... album'
    m = re.match(r'^([^\.]+?)\s+v roce\s+\d{4}\s+vydal\s+sv[ůů]e\s+(?:druhé|třetí|čtvrté|páté|šesté|sedmé|osmé|deváté|desáté|první|druhé)\s+album', desc)
    if m:
        return [m.group(1).strip()]
    
    # Pattern 7: 'X v roce Y vydal' (generic)
    m = re.match(r'^([^\.]+?)\s+v roce\s+\d{4}\s+vydal', desc)
    if m:
        return [m.group(1).strip()]
    
    return []

def normalize_name(name):
    """Normalize name for comparison."""
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
    
    # Build artist name -> eid map
    artist_map = {}
    for eid, e in data.items():
        if e.get('type') not in ('artist', 'collective'):
            continue
        title = e.get('title', '')
        slug = e.get('slug', '')
        artist_map[normalize_name(title)] = eid
        artist_map[normalize_name(slug.replace('-', ' '))] = eid
    
    # Add known aliases
    aliases = {
        'câlin': 'calin',
        'filip konvalinka': 'sofian medjmedj',
        'animist': 'digit',
        'p t k': 'ptk',
        'milion plus': 'milion+',
        'bpm': 'bpm (básníci před mikrofonem)',
        'if': 'if',
        '58g': '58g',
    }
    
    # Process all albums
    album_artist_map = defaultdict(set)  # album_eid -> set of artist_eids (correct)
    
    for eid, e in data.items():
        if e.get('type') != 'album':
            continue
        
        meta_path = os.path.join(ENTITIES, eid, 'meta.json')
        if not os.path.exists(meta_path):
            continue
        
        meta = load_json(meta_path)
        desc = meta.get('description', '')
        title = meta.get('title', '')
        
        # Extract main artists from description
        main_names = extract_main_artists(desc, title)
        
        if not main_names:
            # No clear main artist - check if album has rel.artists
            rel_path = os.path.join(ENTITIES, eid, 'relations.json')
            if os.path.exists(rel_path):
                rels = load_json(rel_path)
                for artist_ref in rels.get('artists', []):
                    if artist_ref in data:
                        album_artist_map[eid].add(artist_ref)
            continue
        
        for name in main_names:
            nn = normalize_name(name)
            
            # Direct match
            if nn in artist_map:
                album_artist_map[eid].add(artist_map[nn])
                continue
            
            # Try alias
            if nn in aliases:
                alias_nn = normalize_name(aliases[nn])
                if alias_nn in artist_map:
                    album_artist_map[eid].add(artist_map[alias_nn])
                    continue
            
            # Try partial match (e.g., "BPM" -> "BPM (Básníci před mikrofonem)")
            found = False
            for an, aeid in artist_map.items():
                if nn in an or an in nn:
                    if len(nn) > 2 and len(an) > 2:
                        album_artist_map[eid].add(aeid)
                        found = True
                        break
            
            if not found:
                # Check if this name matches any artist title partially
                for aeid, ae in data.items():
                    if ae.get('type') not in ('artist', 'collective'):
                        continue
                    atitle = ae.get('title', '')
                    if nn in normalize_name(atitle) or normalize_name(atitle) in nn:
                        if len(nn) > 2 and len(normalize_name(atitle)) > 2:
                            album_artist_map[eid].add(aeid)
                            found = True
                            break
    
    # Now update all artist relations.json files
    # First, clear all existing album links
    cleared = 0
    for eid, e in data.items():
        if e.get('type') not in ('artist', 'collective'):
            continue
        rel_path = os.path.join(ENTITIES, eid, 'relations.json')
        if not os.path.exists(rel_path):
            continue
        rels = load_json(rel_path)
        if 'albums' in rels and rels['albums']:
            rels['albums'] = []
            save_json(rel_path, rels)
            cleared += 1
    
    print(f"Cleared album links from {cleared} artists")
    
    # Now add correct links
    # Build reverse map: artist_eid -> set of album_eids
    artist_albums = defaultdict(set)
    for album_eid, artist_eids in album_artist_map.items():
        for artist_eid in artist_eids:
            artist_albums[artist_eid].add(album_eid)
    
    updated = 0
    for artist_eid, album_eids in sorted(artist_albums.items()):
        rel_path = os.path.join(ENTITIES, artist_eid, 'relations.json')
        if not os.path.exists(rel_path):
            continue
        
        rels = load_json(rel_path)
        rels['albums'] = sorted(album_eids)
        save_json(rel_path, rels)
        updated += 1
        
        artist_name = data[artist_eid].get('title', artist_eid)
        print(f"  {artist_name:30s} | {len(album_eids):2d} albums")
    
    print(f"\nUpdated {updated} artists with correct album links")
    
    # Show unmatched albums
    all_linked = set()
    for albums in artist_albums.values():
        all_linked.update(albums)
    
    unmatched = [eid for eid, e in data.items() if e.get('type') == 'album' and eid not in all_linked]
    print(f"\nUnmatched albums: {len(unmatched)}")
    for eid in sorted(unmatched):
        meta_path = os.path.join(ENTITIES, eid, 'meta.json')
        if os.path.exists(meta_path):
            meta = load_json(meta_path)
            desc = meta.get('description', '')[:100]
            print(f"  {meta.get('title','?'):40s} | {eid} | {desc}")

if __name__ == '__main__':
    main()
