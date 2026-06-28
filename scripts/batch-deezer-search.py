#!/usr/bin/env python3
"""Batch search Deezer for artist IDs and download photos."""

import json
import os
import subprocess
import time
from pathlib import Path

BASE_DIR = Path("/Users/petrpiskacek/.openclaw/workspace/rap-knowledge-graph")
ENTITIES_DIR = BASE_DIR / "content" / "entities"
IMAGES_TS = BASE_DIR / "src" / "lib" / "content" / "images.ts"
ARTISTS_DIR = BASE_DIR / "public" / "images" / "artists"

def search_deezer(title):
    """Search artist on Deezer and return best match ID."""
    import urllib.parse
    query = urllib.parse.quote(title)
    url = f"https://api.deezer.com/search/artist?q={query}"
    
    try:
        result = subprocess.run(['curl', '-s', url], capture_output=True, text=True, timeout=10)
        data = json.loads(result.stdout)
        
        if data.get('data'):
            # Return first result with most fans
            best = max(data['data'], key=lambda x: x.get('nb_fan', 0))
            return best['id'], best.get('nb_fan', 0)
    except:
        pass
    
    return None, 0

def download_and_convert(deezer_id, slug):
    """Download image from Deezer and convert to WebP."""
    # Get image URL
    api_url = f"https://api.deezer.com/artist/{deezer_id}"
    result = subprocess.run(['curl', '-s', api_url], capture_output=True, text=True, timeout=10)
    data = json.loads(result.stdout)
    
    picture_url = data.get('picture_xl') or data.get('picture_big')
    if not picture_url or 'placeholder' in picture_url:
        return False, "No image"
    
    # Download
    jpg_path = ARTISTS_DIR / f"{slug}.jpg"
    subprocess.run(['curl', '-s', '-L', '-o', str(jpg_path), picture_url], check=True, timeout=30)
    
    if not jpg_path.exists() or jpg_path.stat().st_size == 0:
        return False, "Download failed"
    
    # Convert to WebP
    webp_path = ARTISTS_DIR / f"{slug}.webp"
    subprocess.run([
        'python3', '-c', f"""
from PIL import Image
img = Image.open('{jpg_path}')
img = img.convert('RGB')
img = img.resize((1200, 1200), Image.LANCZOS)
img.save('{webp_path}', 'WEBP', quality=82, method=6)
"""
    ], check=True, timeout=30)
    
    jpg_path.unlink()
    
    if webp_path.exists() and webp_path.stat().st_size > 1000:
        return True, str(webp_path)
    return False, "Conversion failed"

def update_images_ts(slug):
    """Add image entry to images.ts."""
    with open(IMAGES_TS, 'r') as f:
        content = f.read()
    
    if f"'{slug}':" in content:
        return True  # Already exists
    
    new_entry = f"  '{slug}': '/images/artists/{slug}.webp',\n"
    closing_idx = content.rfind('};')
    if closing_idx == -1:
        return False
    
    new_content = content[:closing_idx] + new_entry + content[closing_idx:]
    
    with open(IMAGES_TS, 'w') as f:
        f.write(new_content)
    
    return True

def main():
    # Top priority artists
    priorities = [
        'nik-tendo', 'yzomandias', 'calin', 'separ', 'hugo-toxxx',
        'rest', 'ektor', 'ego', 'james-cole', 'maniak',
        'paulie-garand', 'tafrob', 'radikal-chef', 'pil-c', 'fobia-kid',
        'dame', 'gleb', 'samey', 'hasan', '58g'
    ]
    
    ARTISTS_DIR.mkdir(parents=True, exist_ok=True)
    
    success = 0
    failed = 0
    
    for slug in priorities:
        meta_path = ENTITIES_DIR / f"artist_{slug}" / "meta.json"
        if not meta_path.exists():
            continue
        
        with open(meta_path) as f:
            data = json.load(f)
        
        title = data.get('title', slug)
        
        # Check if already has image
        with open(IMAGES_TS) as f:
            if f"'{slug}':" in f.read():
                print(f"SKIP {slug} — already has image")
                continue
        
        print(f"Searching: {title}... ", end='', flush=True)
        
        # Search Deezer
        deezer_id, fans = search_deezer(title)
        if not deezer_id:
            print(f"NOT FOUND")
            failed += 1
            continue
        
        print(f"found (id:{deezer_id}, {fans} fans) ", end='', flush=True)
        
        # Download
        ok, msg = download_and_convert(deezer_id, slug)
        if ok:
            if update_images_ts(slug):
                print("OK")
                success += 1
            else:
                print("FAIL (images.ts)")
                failed += 1
        else:
            print(f"FAIL ({msg})")
            failed += 1
        
        time.sleep(1)  # Rate limiting
    
    print(f"\nResults: {success} success, {failed} failed")

if __name__ == '__main__':
    main()
