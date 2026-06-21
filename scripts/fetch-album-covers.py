#!/usr/bin/env python3
"""
Fetch album covers for albums missing images.
Strategy:
1. Check Deezer index (by title match)
2. If not found, search Deezer API
3. Download cover and update meta.json
"""

import json, os, sys, time, re, urllib.request, urllib.error, urllib.parse
from pathlib import Path

BASE = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
ENTITIES = os.path.join(BASE, 'content', 'entities')
CACHE = os.path.join(BASE, '.content-cache')
IMAGES_DIR = os.path.join(BASE, 'public', 'images', 'albums')

os.makedirs(IMAGES_DIR, exist_ok=True)

def load_json(path):
    with open(path) as f:
        return json.load(f)

def save_json(path, data):
    with open(path, 'w') as f:
        json.dump(data, f, indent=2, ensure_ascii=False)
        f.write('\n')

def normalize(s):
    """Normalize string for comparison."""
    s = s.lower().strip()
    s = re.sub(r'[^a-z0-9\s]', '', s)
    s = re.sub(r'\s+', ' ', s)
    return s

def download_image(url, dest_path):
    """Download image from URL to destination."""
    try:
        req = urllib.request.Request(url, headers={
            'User-Agent': 'Mozilla/5.0 (compatible; RKG/1.0)'
        })
        with urllib.request.urlopen(req, timeout=10) as resp:
            data = resp.read()
            if len(data) < 1000:
                return False
            with open(dest_path, 'wb') as f:
                f.write(data)
            return True
    except Exception as e:
        print(f"    ⚠️  Download failed: {e}")
        return False

def search_deezer(query, artist_hint=None):
    """Search Deezer API for an album."""
    time.sleep(0.2)  # Rate limit
    search_q = query
    if artist_hint:
        search_q = f"{query} {artist_hint}"
    
    url = f"https://api.deezer.com/search/album?q={urllib.parse.quote(search_q)}&limit=5"
    try:
        req = urllib.request.Request(url, headers={'User-Agent': 'RKG/1.0'})
        with urllib.request.urlopen(req, timeout=10) as resp:
            data = json.loads(resp.read())
            if data.get('data'):
                for album in data['data']:
                    cover = album.get('cover_xl') or album.get('cover_big') or album.get('cover_medium')
                    if cover:
                        return {
                            'id': album['id'],
                            'title': album['title'],
                            'artist': album['artist']['name'],
                            'cover': cover
                        }
    except Exception as e:
        print(f"    ⚠️  Deezer search failed: {e}")
    return None

def main():
    data = load_json(os.path.join(CACHE, 'entities.json'))
    deezer_idx = load_json(os.path.join(CACHE, 'deezer-index.json'))
    deezer_albums = deezer_idx.get('albums', {})
    
    # Find albums without image
    no_image = []
    for eid, e in data.items():
        if e.get('type') != 'album':
            continue
        meta_path = os.path.join(ENTITIES, eid, 'meta.json')
        if os.path.exists(meta_path):
            meta = load_json(meta_path)
            if not meta.get('image'):
                no_image.append((eid, meta.get('title', '?'), meta.get('description', '')))
    
    print(f"Albums without image: {len(no_image)}")
    
    # Build title -> slug map from Deezer index
    deezer_by_title = {}
    for slug, entry in deezer_albums.items():
        title = normalize(entry.get('deezer_title', ''))
        if title:
            deezer_by_title[title] = (slug, entry)
    
    success = 0
    skipped = 0
    failed = 0
    
    for eid, title, desc in sorted(no_image, key=lambda x: x[1]):
        slug = eid.replace('album_', '')
        meta_path = os.path.join(ENTITIES, eid, 'meta.json')
        meta = load_json(meta_path)
        
        print(f"\n  {title:45s} | {slug}")
        
        # Find which artist this album belongs to
        linked_artists = []
        for aeid, ae in data.items():
            if ae.get('type') not in ('artist', 'collective'):
                continue
            rel_path = os.path.join(ENTITIES, aeid, 'relations.json')
            if os.path.exists(rel_path):
                rels = load_json(rel_path)
                if eid in rels.get('albums', []):
                    linked_artists.append(ae.get('title', aeid))
        
        artist_hint = linked_artists[0] if linked_artists else None
        
        # Strategy 1: Check Deezer index by title match
        norm_title = normalize(title)
        cover_url = None
        source = None
        
        if norm_title in deezer_by_title:
            entry = deezer_by_title[norm_title][1]
            cover_url = entry.get('cover')
            source = f"deezer-index (slug={deezer_by_title[norm_title][0]})"
            print(f"    ✅ Found in Deezer index: {source}")
        
        # Strategy 2: Try partial match in Deezer index
        if not cover_url:
            for d_title, (d_slug, d_entry) in deezer_by_title.items():
                if norm_title in d_title or d_title in norm_title:
                    if len(norm_title) > 3 and len(d_title) > 3:
                        cover_url = d_entry.get('cover')
                        source = f"deezer-index partial ({d_slug}: {d_entry.get('deezer_title','?')})"
                        print(f"    ✅ Partial match: {source}")
                        break
        
        # Strategy 3: Search Deezer API
        if not cover_url:
            print(f"    🔍 Searching Deezer API...")
            result = search_deezer(title, artist_hint)
            if result:
                cover_url = result['cover']
                source = f"deezer-api ({result['artist']} - {result['title']})"
                print(f"    ✅ Found: {source}")
        
        if not cover_url:
            print(f"    ❌ No cover found")
            failed += 1
            continue
        
        # Download cover
        dest_filename = f"{slug}.jpg"
        dest_path = os.path.join(IMAGES_DIR, dest_filename)
        
        if os.path.exists(dest_path):
            print(f"    ⏭️  Already downloaded")
            skipped += 1
            continue
        
        print(f"    📥 Downloading: {cover_url}")
        if download_image(cover_url, dest_path):
            # Update meta.json with local path
            meta['image'] = f"/images/albums/{dest_filename}"
            save_json(meta_path, meta)
            success += 1
            print(f"    ✅ Saved to /images/albums/{dest_filename}")
        else:
            print(f"    ❌ Download failed")
            failed += 1
    
    print(f"\n{'='*50}")
    print(f"Results: {success} downloaded, {skipped} skipped, {failed} failed")

if __name__ == '__main__':
    main()
