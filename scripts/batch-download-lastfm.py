#!/usr/bin/env python3
"""Batch download artist photos from Last.fm for artists without images."""

import json
import os
import re
import subprocess
import time
import urllib.parse
from pathlib import Path

BASE_DIR = Path("/Users/petrpiskacek/.openclaw/workspace/rap-knowledge-graph")
ENTITIES_DIR = BASE_DIR / "content" / "entities"
IMAGES_TS = BASE_DIR / "src" / "lib" / "content" / "images.ts"
ARTISTS_DIR = BASE_DIR / "public" / "images" / "artists"

def get_artist_slugs_without_images():
    """Get list of artist slugs that don't have images in images.ts."""
    with open(IMAGES_TS, 'r') as f:
        content = f.read()
    
    pattern = r"'([^']+)': '/images/artists/([^']+)\.webp',?"
    matches = re.findall(pattern, content)
    mapped_slugs = {m[0] for m in matches}
    
    artist_slugs = []
    for d in os.listdir(ENTITIES_DIR):
        if d.startswith('artist_'):
            slug = d.replace('artist_', '')
            if slug not in mapped_slugs:
                artist_slugs.append(slug)
    
    return sorted(artist_slugs)

def get_artist_name(slug):
    """Get artist name from meta.json."""
    meta_path = ENTITIES_DIR / f"artist_{slug}" / "meta.json"
    if not meta_path.exists():
        return None
    
    try:
        with open(meta_path, 'r') as f:
            data = json.load(f)
        return data.get('title')
    except:
        return None

def search_lastfm(artist_name):
    """Search artist on Last.fm and return image URL."""
    if not artist_name:
        return None
    
    # URL encode artist name
    encoded = urllib.parse.quote(artist_name)
    api_url = f"https://ws.audioscrobbler.com/2.0/?method=artist.search&artist={encoded}&api_key=YOUR_API_KEY&format=json&limit=1"
    
    # Try without API key first (limited)
    try:
        result = subprocess.run(
            ['curl', '-s', f"https://ws.audioscrobbler.com/2.0/?method=artist.search&artist={encoded}&format=json&limit=1"],
            capture_output=True,
            text=True,
            timeout=10
        )
        data = json.loads(result.stdout)
        
        if 'results' in data and 'artistmatches' in data['results']:
            artists = data['results']['artistmatches'].get('artist', [])
            if artists and len(artists) > 0:
                artist = artists[0] if isinstance(artists, list) else artists
                images = artist.get('image', [])
                for img in images:
                    if img.get('size') == 'extralarge' and img.get('#text'):
                        return img['#text']
                    if img.get('size') == 'large' and img.get('#text'):
                        return img['#text']
        return None
    except:
        return None

def download_image(image_url, slug):
    """Download image and convert to WebP."""
    if not image_url:
        return False, "No image URL"
    
    try:
        jpg_path = ARTISTS_DIR / f"{slug}.jpg"
        subprocess.run(
            ['curl', '-s', '-L', '-o', str(jpg_path), image_url],
            check=True,
            timeout=30
        )
        
        if not jpg_path.exists() or jpg_path.stat().st_size == 0:
            if jpg_path.exists():
                jpg_path.unlink()
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
print('OK')
"""
        ], check=True, timeout=30)
        
        jpg_path.unlink()
        
        if webp_path.exists() and webp_path.stat().st_size > 1000:
            return True, str(webp_path)
        else:
            if webp_path.exists():
                webp_path.unlink()
            return False, "Conversion failed"
            
    except Exception as e:
        return False, str(e)

def update_images_ts(slug):
    """Add new image entry to images.ts."""
    with open(IMAGES_TS, 'r') as f:
        content = f.read()
    
    new_entry = f"  '{slug}': '/images/artists/{slug}.webp',\n"
    closing_idx = content.rfind('};')
    if closing_idx == -1:
        return False
    
    new_content = content[:closing_idx] + new_entry + content[closing_idx:]
    
    with open(IMAGES_TS, 'w') as f:
        f.write(new_content)
    
    return True

def main():
    print("=" * 60)
    print("Last.fm Artist Photo Downloader")
    print("=" * 60)
    
    ARTISTS_DIR.mkdir(parents=True, exist_ok=True)
    
    slugs = get_artist_slugs_without_images()
    print(f"\nFound {len(slugs)} artists without images")
    
    success_count = 0
    fail_count = 0
    
    for i, slug in enumerate(slugs[:50], 1):  # Limit to first 50 to avoid rate limits
        artist_name = get_artist_name(slug)
        if not artist_name:
            continue
            
        print(f"[{i}/50] {slug} ({artist_name})... ", end='', flush=True)
        
        # Check if already exists
        webp_path = ARTISTS_DIR / f"{slug}.webp"
        if webp_path.exists():
            print("SKIP")
            continue
        
        # Search Last.fm
        image_url = search_lastfm(artist_name)
        if not image_url:
            print("NOT FOUND on Last.fm")
            fail_count += 1
            continue
        
        # Download
        ok, msg = download_image(image_url, slug)
        if ok:
            if update_images_ts(slug):
                print(f"OK")
                success_count += 1
            else:
                print("FAIL (images.ts)")
                fail_count += 1
        else:
            print(f"FAIL ({msg})")
            fail_count += 1
        
        time.sleep(1)  # Rate limiting
    
    print("\n" + "=" * 60)
    print(f"Results: {success_count} success, {fail_count} failed")
    print("=" * 60)

if __name__ == '__main__':
    main()
