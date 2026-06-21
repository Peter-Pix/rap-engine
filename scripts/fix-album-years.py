#!/usr/bin/env python3
"""
Fix album years for albums missing the 'year' field in meta.json.
Strategy:
1. If releaseDate exists → extract year
2. If deezerId exists → fetch from Deezer API
3. Otherwise → try Discogs or leave as unknown
"""

import json, os, sys, time, urllib.request, urllib.parse

BASE = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
ENTITIES = os.path.join(BASE, 'content', 'entities')

def load_json(path):
    with open(path) as f:
        return json.load(f)

def save_json(path, data):
    with open(path, 'w') as f:
        json.dump(data, f, indent=2, ensure_ascii=False)
        f.write('\n')

def fetch_deezer_album(album_id):
    """Fetch album detail from Deezer API."""
    time.sleep(0.3)
    url = f"https://api.deezer.com/album/{album_id}"
    try:
        req = urllib.request.Request(url, headers={'User-Agent': 'RKG/1.0'})
        with urllib.request.urlopen(req, timeout=10) as resp:
            return json.loads(resp.read())
    except Exception as e:
        print(f"    ⚠️  Deezer API error: {e}")
        return None

def main():
    data = load_json(os.path.join(BASE, '.content-cache', 'entities.json'))
    
    # Find albums without year
    no_year = []
    for eid, e in data.items():
        if e.get('type') != 'album':
            continue
        meta_path = os.path.join(ENTITIES, eid, 'meta.json')
        if not os.path.exists(meta_path):
            continue
        meta = load_json(meta_path)
        if not meta.get('year'):
            no_year.append((eid, meta))
    
    print(f"Albums without year: {len(no_year)}")
    
    fixed = 0
    skipped = 0
    failed = 0
    
    for eid, meta in sorted(no_year, key=lambda x: x[1].get('title', '?')):
        title = meta.get('title', '?')
        slug = eid.replace('album_', '')
        
        print(f"\n  {title:45s} | {slug}")
        
        year = None
        
        # Strategy 1: Extract from releaseDate
        release_date = meta.get('releaseDate')
        if release_date:
            # releaseDate can be "2019" or "2019-01-15" or "2019-01"
            year = release_date[:4]
            if year.isdigit() and len(year) == 4:
                print(f"    ✅ From releaseDate: {year}")
        
        # Strategy 2: Fetch from Deezer API
        if not year:
            deezer_id = meta.get('deezerId')
            if deezer_id:
                print(f"    🔍 Fetching Deezer album {deezer_id}...")
                detail = fetch_deezer_album(deezer_id)
                if detail:
                    release = detail.get('release_date', '')
                    if release:
                        year = release[:4]
                        if year.isdigit() and len(year) == 4:
                            print(f"    ✅ From Deezer API: {year} ({detail.get('artist',{}).get('name','?')} - {detail.get('title','?')})")
        
        if year:
            meta['year'] = int(year)
            save_json(os.path.join(ENTITIES, eid, 'meta.json'), meta)
            fixed += 1
        else:
            print(f"    ❌ Cannot determine year")
            failed += 1
    
    print(f"\n{'='*50}")
    print(f"Results: {fixed} fixed, {failed} failed")

if __name__ == '__main__':
    main()
