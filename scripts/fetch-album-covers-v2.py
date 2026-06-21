#!/usr/bin/env python3
"""
Fetch album covers - v2 with better matching.
Uses artist name as filter, validates results.
"""

import json, os, sys, time, re, urllib.request, urllib.error, urllib.parse

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
    s = s.lower().strip()
    s = re.sub(r'[^a-z0-9\s]', '', s)
    s = re.sub(r'\s+', ' ', s).strip()
    return s

def search_deezer_albums(query, artist=None):
    """Search Deezer for albums matching query."""
    time.sleep(0.25)
    search_q = query
    if artist:
        search_q = f"{query} {artist}"
    
    url = f"https://api.deezer.com/search/album?q={urllib.parse.quote(search_q)}&limit=10"
    try:
        req = urllib.request.Request(url, headers={'User-Agent': 'RKG/1.0'})
        with urllib.request.urlopen(req, timeout=10) as resp:
            return json.loads(resp.read())
    except Exception as e:
        return None

def get_album_from_deezer(album_id):
    """Get album detail from Deezer by ID."""
    time.sleep(0.25)
    url = f"https://api.deezer.com/album/{album_id}"
    try:
        req = urllib.request.Request(url, headers={'User-Agent': 'RKG/1.0'})
        with urllib.request.urlopen(req, timeout=10) as resp:
            return json.loads(resp.read())
    except Exception as e:
        return None

def download_image(url, dest_path):
    try:
        req = urllib.request.Request(url, headers={'User-Agent': 'Mozilla/5.0'})
        with urllib.request.urlopen(req, timeout=10) as resp:
            data = resp.read()
            if len(data) < 1000:
                return False
            with open(dest_path, 'wb') as f:
                f.write(data)
            return True
    except:
        return False

def main():
    data = load_json(os.path.join(CACHE, 'entities.json'))
    
    # Albums still needing covers
    still_needed = [
        ('airon-meidan', 'Ektor'),
        ('bauch-money-mixtape', 'Hugo Toxxx'),
        ('dj-wich', 'DJ Wich'),
        ('dj-wich-v-kontra', 'DJ Wich'),
        ('das-leben-feat-arleta', 'Hellwana'),
        ('dlouhej-pribeh-kratkej-svet', 'Viktor Sheen'),
        ('dej-se-vule-zbozi', 'Orion'),
        ('figury', 'Ektor'),
        ('gyzmo', 'LA4'),
        ('ilegalni-kecy', 'Hugo Toxxx'),
        ('jedini-co-hresi', 'Rytmus'),
        ('kasa-tape', 'Gleb'),
        ('legalni-drogy', 'Hugo Toxxx'),
        ('mc-ktory-vedel-privela', 'Ektor'),
        ('mimo-sit', 'Pil C'),
        ('maly-pepek-mixtape-vol-1', 'Idea'),
        ('ofiko-mixtape', 'Maniak'),
        ('puvod-umeni', 'Marpo'),
        ('rok-psa', 'Hugo Toxxx'),
        ('stanica-zoo-2', 'Gleb'),
        ('svet-bavi', 'Calin'),
        ('dj-wich-remixy', 'DJ Wich'),
        ('tmvcjn', 'DJ Rusty'),
        ('treti-oko', 'Ektor'),
        ('umeni-zit', 'Viktor Sheen'),
        ('v-radiu-hral-elan-kdyz-umrel-tupac', 'Pil C'),
        ('velke-hry', 'Ektor'),
        ('valka', 'Pil C'),
        ('ypsilon-black', 'Majk Spirit'),
        ('ypsilon-white', 'Majk Spirit'),
        ('yzomandias-ii', 'Yzomandias'),
        ('zloo', 'Gleb'),
        ('zustat-silnej', 'MC Gey'),
    ]
    
    success = 0
    failed = 0
    
    for slug, artist_name in still_needed:
        eid = f'album_{slug}'
        meta_path = os.path.join(ENTITIES, eid, 'meta.json')
        if not os.path.exists(meta_path):
            print(f"  {slug}: NO META")
            failed += 1
            continue
        
        meta = load_json(meta_path)
        title = meta.get('title', '?')
        
        print(f"\n  {title:45s} | {slug} (artist: {artist_name})")
        
        # Try multiple search strategies
        cover_url = None
        source = None
        
        # Strategy 1: Search with artist name
        result = search_deezer_albums(title, artist_name)
        if result and result.get('data'):
            for album in result['data']:
                album_artist = album['artist']['name'].lower()
                album_title = album['title'].lower()
                
                # Validate: artist should match
                if normalize(artist_name) in normalize(album_artist) or normalize(album_artist) in normalize(artist_name):
                    cover = album.get('cover_xl') or album.get('cover_big') or album.get('cover_medium')
                    if cover:
                        cover_url = cover
                        source = f"Deezer ({album_artist} - {album_title})"
                        print(f"    ✅ {source}")
                        break
        
        # Strategy 2: Search without artist, then validate
        if not cover_url:
            result = search_deezer_albums(title)
            if result and result.get('data'):
                for album in result['data']:
                    album_artist = album['artist']['name'].lower()
                    album_title = album['title'].lower()
                    
                    # Check if title matches well
                    norm_title = normalize(title)
                    norm_album = normalize(album_title)
                    
                    if norm_title == norm_album or norm_title in norm_album or norm_album in norm_title:
                        # Also check artist
                        if normalize(artist_name) in normalize(album_artist) or normalize(album_artist) in normalize(artist_name):
                            cover = album.get('cover_xl') or album.get('cover_big') or album.get('cover_medium')
                            if cover:
                                cover_url = cover
                                source = f"Deezer (no-artist search, {album_artist} - {album_title})"
                                print(f"    ✅ {source}")
                                break
        
        # Strategy 3: Try getting album by ID from deezer-index
        if not cover_url:
            deezer_idx = load_json(os.path.join(CACHE, 'deezer-index.json'))
            deezer_albums = deezer_idx.get('albums', {})
            
            # Check if slug exists in index
            if slug in deezer_albums:
                entry = deezer_albums[slug]
                cover = entry.get('cover')
                if cover:
                    # Verify by fetching album detail
                    detail = get_album_from_deezer(entry['deezer_id'])
                    if detail:
                        detail_artist = detail.get('artist', {}).get('name', '').lower()
                        if normalize(artist_name) in normalize(detail_artist):
                            cover_url = detail.get('cover_xl') or detail.get('cover_big') or cover
                            source = f"Deezer index verified ({detail['artist']['name']} - {detail['title']})"
                            print(f"    ✅ {source}")
        
        if not cover_url:
            print(f"    ❌ No cover found")
            failed += 1
            continue
        
        # Download
        dest_path = os.path.join(IMAGES_DIR, f"{slug}.jpg")
        if os.path.exists(dest_path):
            print(f"    ⏭️  Already exists")
            success += 1
            continue
        
        if download_image(cover_url, dest_path):
            meta['image'] = f"/images/albums/{slug}.jpg"
            save_json(meta_path, meta)
            success += 1
            print(f"    ✅ Saved")
        else:
            print(f"    ❌ Download failed")
            failed += 1
    
    print(f"\n{'='*50}")
    print(f"Results: {success} downloaded, {failed} failed")

if __name__ == '__main__':
    main()
