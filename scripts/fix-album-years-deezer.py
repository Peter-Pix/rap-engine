#!/usr/bin/env python3
"""
Fix album years using Deezer API.
For albums with default years (2024-01-01, 2026-05-21, 2026-06-12),
fetch the real release date from Deezer.
"""

import json, os, time, urllib.request, urllib.parse, sys

ROOT = "content/entities"
ALBUMS_TO_FIX = []

# Find all albums with suspicious default years
for d in sorted(os.listdir(ROOT)):
    if d.startswith("album_"):
        meta_path = f"{ROOT}/{d}/meta.json"
        if os.path.isfile(meta_path):
            with open(meta_path) as f:
                meta = json.load(f)
            year = meta.get("publishedAt", "")
            if year in ("2024-01-01", "2026-05-21", "2026-06-12"):
                # Get artist from relations for better search
                rel_path = f"{ROOT}/{d}/relations.json"
                artists = []
                if os.path.isfile(rel_path):
                    with open(rel_path) as f:
                        rels = json.load(f)
                    artists = rels.get("artists", [])
                # Extract artist names (strip artist_ prefix)
                artist_names = []
                for a in artists:
                    # artist names are IDs like "artist_marpo"
                    if a.startswith("artist_"):
                        # Try to get the display name from meta
                        artist_meta_path = f"{ROOT}/{a}/meta.json"
                        if os.path.isfile(artist_meta_path):
                            with open(artist_meta_path) as f:
                                am = json.load(f)
                            artist_names.append(am["title"])
                        else:
                            artist_names.append(a.replace("artist_", "").replace("-", " "))
                    else:
                        artist_names.append(a)
                
                ALBUMS_TO_FIX.append({
                    "id": d,
                    "title": meta["title"],
                    "old_year": year,
                    "artists": artist_names,
                    "meta_path": meta_path,
                })

print(f"Found {len(ALBUMS_TO_FIX)} albums to fix")

def search_deezer(query, retries=3):
    """Search Deezer API for an album"""
    url = f"https://api.deezer.com/search/album?q={urllib.parse.quote(query)}&limit=3"
    for attempt in range(retries):
        try:
            req = urllib.request.Request(url, headers={"User-Agent": "Mozilla/5.0"})
            with urllib.request.urlopen(req, timeout=10) as resp:
                data = json.load(resp)
                return data
        except Exception as e:
            if attempt < retries - 1:
                time.sleep(1)
            else:
                print(f"  API error: {e}")
                return None
    return None

fixed = 0
not_found = 0
errors = 0

for i, album in enumerate(ALBUMS_TO_FIX):
    # Build search query: "artist album_title"
    title = album["title"]
    artist = album["artists"][0] if album["artists"] else ""
    
    # Try different search queries
    queries = []
    if artist:
        queries.append(f"{artist} {title}")
        queries.append(f'album:"{title}" artist:"{artist}"')
    queries.append(f'album:"{title}"')
    
    found = False
    for query in queries:
        result = search_deezer(query)
        if not result or not result.get("data"):
            continue
        
        # Try to find exact title match
        for item in result["data"]:
            item_title = item.get("title", "").strip()
            item_artist = item.get("artist", {}).get("name", "").strip()
            release_date = item.get("release_date", "")
            
            # Normalize for comparison
            def norm(s):
                return s.lower().strip().replace("  ", " ")
            
            if norm(item_title) == norm(title) or title.lower() in item_title.lower():
                if release_date:
                    # Deezer returns YYYY-MM-DD
                    year = release_date[:4]
                    if year and year not in ("2024", "2026") or len(release_date) >= 4:
                        # Update meta.json
                        with open(album["meta_path"]) as f:
                            meta = json.load(f)
                        old_year = meta.get("publishedAt", "?")
                        meta["publishedAt"] = release_date
                        with open(album["meta_path"], "w") as f:
                            json.dump(meta, f, indent=2, ensure_ascii=False)
                            f.write("\n")
                        print(f"[{i+1}/{len(ALBUMS_TO_FIX)}] ✅ {album['id']:45s} {old_year:10s} → {release_date} ({item_artist})")
                        fixed += 1
                        found = True
                        break
        if found:
            break
        time.sleep(0.5)  # Rate limit
    
    if not found:
        print(f"[{i+1}/{len(ALBUMS_TO_FIX)}] ❌ {album['id']:45s} {album['old_year']:10s} — not found on Deezer")
        not_found += 1
    
    time.sleep(0.5)  # Rate limit

print(f"\n{'='*60}")
print(f"RESULTS: {fixed} fixed, {not_found} not found, {errors} errors")
print(f"{'='*60}")