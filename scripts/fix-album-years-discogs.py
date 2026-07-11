#!/usr/bin/env python3
"""
Fix album years using Discogs API.
Discogs has accurate original release years (unlike Deezer which has digital release dates).
Rate limit: 25 req/min without auth → 0.5 req/sec = 2.4s delay between requests.
"""
import json, os, time, urllib.request, urllib.parse, sys

ROOT = "content/entities"
DELAY = 2.5  # seconds between requests (24 req/min, safe under 25 limit)

def discogs_search(query, retries=3):
    url = f"https://api.discogs.com/database/search?q={urllib.parse.quote(query)}&type=release&per_page=3"
    for attempt in range(retries):
        try:
            req = urllib.request.Request(url, headers={"User-Agent": "KnowledgeBaseAudit/1.0"})
            with urllib.request.urlopen(req, timeout=15) as resp:
                return json.load(resp)
        except Exception as e:
            if attempt < retries - 1:
                time.sleep(5)
            else:
                return None
    return None

# Find albums to fix
albums_to_fix = []
for d in sorted(os.listdir(ROOT)):
    if d.startswith("album_"):
        meta_path = f"{ROOT}/{d}/meta.json"
        if os.path.isfile(meta_path):
            with open(meta_path) as f:
                meta = json.load(f)
            year = meta.get("publishedAt", "")
            if year in ("2024-01-01", "2026-05-21", "2026-06-12"):
                # Get artist
                rel_path = f"{ROOT}/{d}/relations.json"
                artists = []
                if os.path.isfile(rel_path):
                    with open(rel_path) as f:
                        rels = json.load(f)
                    artists = rels.get("artists", [])
                
                artist_name = ""
                if artists:
                    am_path = f"{ROOT}/{artists[0]}/meta.json"
                    if os.path.isfile(am_path):
                        with open(am_path) as f:
                            am = json.load(f)
                        artist_name = am["title"]
                
                albums_to_fix.append({
                    "id": d,
                    "title": meta["title"],
                    "old_year": year,
                    "artist": artist_name,
                    "meta_path": meta_path,
                })

print(f"Found {len(albums_to_fix)} albums to fix via Discogs", flush=True)

fixed = 0
not_found = 0
ambiguous = 0

for i, album in enumerate(albums_to_fix):
    # Build query: "artist album_title"
    title = album["title"]
    artist = album["artist"]
    
    # Try artist + title first
    queries = []
    if artist:
        queries.append(f"{artist} {title}")
    queries.append(title)
    
    found = False
    for query in queries:
        result = discogs_search(query)
        if not result or not result.get("results"):
            time.sleep(DELAY)
            continue
        
        # Find best match — prefer exact title match
        best = None
        for r in result["results"]:
            r_title = r.get("title", "")
            r_year = r.get("year")
            r_format = r.get("format", [])
            r_type = r.get("type", "")
            
            # Must be a release (not master), have a year, and match title
            if not r_year:
                continue
            
            # Check if title matches (normalized)
            def norm(s):
                return s.lower().strip().replace("  ", " ")
            
            r_norm = norm(r_title)
            t_norm = norm(title)
            
            # Exact match or title is contained in release title
            if t_norm in r_norm or r_norm.endswith(t_norm):
                # Prefer format: CD, Vinyl, or album (not just digital)
                if any(fmt.lower() in ("cd", "vinyl", "album") for fmt in r_format):
                    best = r
                    break
                elif best is None:
                    best = r
        
        if best:
            r_year = best.get("year")
            r_title = best.get("title", "")
            
            # Sanity check: year should be 1990-2026
            if r_year and 1990 <= int(r_year) <= 2026:
                with open(album["meta_path"]) as f:
                    meta = json.load(f)
                old_year = meta.get("publishedAt", "?")
                meta["publishedAt"] = f"{r_year}-01-01"
                with open(album["meta_path"], "w") as f:
                    json.dump(meta, f, indent=2, ensure_ascii=False)
                    f.write("\n")
                print(f"[{i+1}/{len(albums_to_fix)}] ✅ {album['id']:50s} {old_year:10s} → {r_year} ({r_title[:40]})", flush=True)
                fixed += 1
                found = True
                break
            else:
                ambiguous += 1
        
        time.sleep(DELAY)
    
    if not found:
        print(f"[{i+1}/{len(albums_to_fix)}] ❌ {album['id']:50s} {album['old_year']:10s} — not found", flush=True)
        not_found += 1
    
    time.sleep(DELAY)

print(f"\n{'='*60}", flush=True)
print(f"RESULTS: {fixed} fixed, {not_found} not found, {ambiguous} ambiguous", flush=True)
print(f"{'='*60}", flush=True)