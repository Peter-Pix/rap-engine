#!/usr/bin/env python3
"""Batch download artist photos from Deezer for artists without images."""

import json
import os
import re
import subprocess
import time
from pathlib import Path

BASE_DIR = Path("/Users/petrpiskacek/.openclaw/workspace/rap-knowledge-graph")
ENTITIES_DIR = BASE_DIR / "content" / "entities"
IMAGES_TS = BASE_DIR / "src" / "lib" / "content" / "images.ts"
ARTISTS_DIR = BASE_DIR / "public" / "images" / "artists"

def get_artist_slugs_without_images():
    """Get list of artist slugs that don't have images in images.ts."""
    with open(IMAGES_TS, 'r') as f:
        content = f.read()
    
    # Parse existing images
    pattern = r"'([^']+)': '/images/artists/([^']+)\.webp',?"
    matches = re.findall(pattern, content)
    mapped_slugs = {m[0] for m in matches}
    
    # Get all artist slugs
    artist_slugs = []
    for d in os.listdir(ENTITIES_DIR):
        if d.startswith('artist_'):
            slug = d.replace('artist_', '')
            if slug not in mapped_slugs:
                artist_slugs.append(slug)
    
    return sorted(artist_slugs)

def get_deezer_id(slug):
    """Get Deezer ID from meta.json."""
    meta_path = ENTITIES_DIR / f"artist_{slug}" / "meta.json"
    if not meta_path.exists():
        return None
    
    try:
        with open(meta_path, 'r') as f:
            data = json.load(f)
        return data.get('deezerId')
    except:
        return None

def download_image(deezer_id, slug):
    """Download image from Deezer and convert to WebP."""
    # Get image URL from Deezer API
    api_url = f"https://api.deezer.com/artist/{deezer_id}"
    
    try:
        result = subprocess.run(
            ['curl', '-s', api_url],
            capture_output=True,
            text=True,
            timeout=10
        )
        data = json.loads(result.stdout)
        
        picture_url = data.get('picture_xl') or data.get('picture_big')
        if not picture_url or 'placeholder' in picture_url:
            return False, f"No image available (placeholder)"
        
        # Download image
        jpg_path = ARTISTS_DIR / f"{slug}.jpg"
        subprocess.run(
            ['curl', '-s', '-L', '-o', str(jpg_path), picture_url],
            check=True,
            timeout=30
        )
        
        # Check if file was downloaded
        if not jpg_path.exists() or jpg_path.stat().st_size == 0:
            if jpg_path.exists():
                jpg_path.unlink()
            return False, "Download failed (empty file)"
        
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
        
        # Remove JPG
        jpg_path.unlink()
        
        if webp_path.exists() and webp_path.stat().st_size > 1000:
            return True, str(webp_path)
        else:
            if webp_path.exists():
                webp_path.unlink()
            return False, "Conversion failed"
            
    except subprocess.TimeoutExpired:
        return False, "Timeout"
    except Exception as e:
        return False, str(e)

def update_images_ts(slug):
    """Add new image entry to images.ts."""
    with open(IMAGES_TS, 'r') as f:
        content = f.read()
    
    # Find the last entry and add new one before the closing };
    # Insert before the last };
    new_entry = f"  '{slug}': '/images/artists/{slug}.webp',\n"
    
    # Find position before the closing }; and insert
    closing_idx = content.rfind('};')
    if closing_idx == -1:
        return False
    
    new_content = content[:closing_idx] + new_entry + content[closing_idx:]
    
    with open(IMAGES_TS, 'w') as f:
        f.write(new_content)
    
    return True

def main():
    print("=" * 60)
    print("Batch Artist Photo Downloader")
    print("=" * 60)
    
    # Ensure directory exists
    ARTISTS_DIR.mkdir(parents=True, exist_ok=True)
    
    # Get artists without images
    slugs = get_artist_slugs_without_images()
    print(f"\nFound {len(slugs)} artists without images")
    
    # Filter those with deezerId
    with_deezer = []
    for slug in slugs:
        deezer_id = get_deezer_id(slug)
        if deezer_id:
            with_deezer.append((slug, deezer_id))
    
    print(f"{len(with_deezer)} have deezerId — will try to download")
    print(f"{len(slugs) - len(with_deezer)} don't have deezerId — skipping\n")
    
    success_count = 0
    skip_count = 0
    fail_count = 0
    
    for i, (slug, deezer_id) in enumerate(with_deezer, 1):
        print(f"[{i}/{len(with_deezer)}] {slug} (deezerId: {deezer_id})... ", end='', flush=True)
        
        # Check if WebP already exists (from previous run)
        webp_path = ARTISTS_DIR / f"{slug}.webp"
        if webp_path.exists():
            print("SKIP (already exists)")
            skip_count += 1
            continue
        
        # Download
        ok, msg = download_image(deezer_id, slug)
        if ok:
            # Update images.ts
            if update_images_ts(slug):
                print(f"OK ({msg})")
                success_count += 1
            else:
                print("FAIL (images.ts update failed)")
                fail_count += 1
        else:
            print(f"FAIL ({msg})")
            fail_count += 1
        
        # Rate limit: wait 500ms between requests
        time.sleep(0.5)
    
    print("\n" + "=" * 60)
    print(f"Results: {success_count} success, {skip_count} skipped, {fail_count} failed")
    print("=" * 60)

if __name__ == '__main__':
    main()
