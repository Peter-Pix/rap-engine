#!/usr/bin/env python3
"""Process downloaded artist photos from ~/Downloads."""

import os
import subprocess
import sys
from pathlib import Path
from PIL import Image

BASE_DIR = Path("/Users/petrpiskacek/.openclaw/workspace/rap-knowledge-graph")
ARTISTS_DIR = BASE_DIR / "public" / "images" / "artists"
IMAGES_TS = BASE_DIR / "src" / "lib" / "content" / "images.ts"
DOWNLOADS_DIR = Path("/Users/petrpiskacek/Downloads")

# Map filenames to artist slugs
file_map = {
    'AstralKid22.jpg': 'astralkid22',
    'CA$HANOVA BULHAR.jpg': 'ca-hanova-bulhar',
    'Grey256.jpeg': 'grey256',
    'Lvcas Dope.jpeg': 'lvcas-dope',
    'SIMA.png': 'sima',
    'Sergei Barracuda.webp': 'sergei-barracuda',
    'Sofian Medjmedj.jpeg': 'sofian-medjmedj',
    'Čistychov.jpg': 'cistychov',
    'Řezník.jpg': 'reznik',
}

def convert_to_webp(src_path, slug):
    """Convert image to 1200x1200 WebP q82."""
    try:
        img = Image.open(src_path)
        img = img.convert('RGB')
        
        # Crop to square from center
        w, h = img.size
        if w != h:
            min_dim = min(w, h)
            left = (w - min_dim) // 2
            top = (h - min_dim) // 2
            right = left + min_dim
            bottom = top + min_dim
            img = img.crop((left, top, right, bottom))
        
        # Resize
        img = img.resize((1200, 1200), Image.LANCZOS)
        
        # Save
        dst_path = ARTISTS_DIR / f"{slug}.webp"
        img.save(dst_path, 'WEBP', quality=82, method=6)
        
        return True, str(dst_path)
    except Exception as e:
        return False, str(e)

def update_images_ts(slug):
    """Add/update image entry in images.ts."""
    with open(IMAGES_TS, 'r') as f:
        content = f.read()
    
    new_entry = f"  '{slug}': '/images/artists/{slug}.webp',\n"
    
    # Check if entry exists
    if f"'{slug}':" in content:
        # Replace existing entry
        pattern = rf"  '{slug}': '/images/artists/[^']+',\n"
        import re
        new_content = re.sub(pattern, new_entry, content)
        if new_content != content:
            with open(IMAGES_TS, 'w') as f:
                f.write(new_content)
            return True
    else:
        # Add new entry before closing };
        closing_idx = content.rfind('};')
        if closing_idx != -1:
            new_content = content[:closing_idx] + new_entry + content[closing_idx:]
            with open(IMAGES_TS, 'w') as f:
                f.write(new_content)
            return True
    
    return False

def main():
    print("=" * 60)
    print("Processing downloaded artist photos")
    print("=" * 60)
    
    ARTISTS_DIR.mkdir(parents=True, exist_ok=True)
    
    success = 0
    failed = 0
    
    for filename, slug in file_map.items():
        src_path = DOWNLOADS_DIR / filename
        if not src_path.exists():
            print(f"MISSING: {filename}")
            failed += 1
            continue
        
        print(f"Processing {filename} → {slug}... ", end='', flush=True)
        
        # Convert
        ok, msg = convert_to_webp(src_path, slug)
        if ok:
            if update_images_ts(slug):
                print(f"OK ({msg})")
                success += 1
            else:
                print("FAIL (images.ts)")
                failed += 1
        else:
            print(f"FAIL ({msg})")
            failed += 1
    
    print("\n" + "=" * 60)
    print(f"Results: {success} success, {failed} failed")
    print("=" * 60)

if __name__ == '__main__':
    main()
