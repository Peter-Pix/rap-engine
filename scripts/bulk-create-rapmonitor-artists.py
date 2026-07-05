#!/usr/bin/env python3
"""Bulk create artists on RapMonitor from knowledge graph data."""

import json
import os
import subprocess
import time

API_KEY = "***"
BASE_URL = "https://rap-monitor.base44.app/api"
KG_DIR = "/Users/petrpiskacek/.openclaw/workspace/rap-knowledge-graph/content/entities"

def get_czsk_artists():
    """Get all CZ/SK artists from knowledge graph with albums."""
    artists = []
    for entry in os.listdir(KG_DIR):
        if not entry.startswith("artist_"):
            continue
        
        meta_path = os.path.join(KG_DIR, entry, "meta.json")
        rel_path = os.path.join(KG_DIR, entry, "relations.json")
        
        if not os.path.exists(meta_path):
            continue
        
        try:
            with open(meta_path) as f:
                meta = json.load(f)
            
            albums = []
            if os.path.exists(rel_path):
                with open(rel_path) as f:
                    rel = json.load(f)
                    albums = rel.get("albums", [])
            
            title = meta.get("title", "")
            origin = meta.get("origin", "")
            
            if title and len(albums) > 0:
                # Check if CZ/SK
                origin_lower = origin.lower()
                czsk_markers = ["čes", "slov", "praha", "brno", "ostrava", "zlin", "plzen",
                                "liberec", "olomouc", "pardubice", "hradec", "usti",
                                "bratislava", "kosice", "zilina", "trnava"]
                is_czsk = any(m in origin_lower for m in czsk_markers)
                
                if is_czsk or not origin:
                    artists.append({
                        "name": title,
                        "aliases": meta.get("aliases", []),
                        "bio": meta.get("description", "")[:300],
                        "notes": f"Origin: {origin}, realName: {meta.get('realName', 'N/A')}"
                    })
        except Exception as e:
            print(f"Error processing {entry}: {e}")
    
    return artists

def bulk_create_artists(batch):
    """Create a batch of artists via bulk API."""
    url = f"{BASE_URL}/entities/Artist/bulk"
    payload = json.dumps(batch, ensure_ascii=False)
    
    result = subprocess.run(
        ["curl", "-s", "-X", "POST",
         "-H", "Content-Type: application/json",
         "-H", f"api_key: {API_KEY}",
         "-d", payload, url],
        capture_output=True, text=True, timeout=30
    )
    
    try:
        data = json.loads(result.stdout)
        return data
    except:
        return {"error": result.stdout or result.stderr}

def main():
    artists = get_czsk_artists()
    print(f"Found {len(artists)} CZ/SK artists to create")
    
    # Process in batches of 25
    batch_size = 25
    total_created = 0
    total_errors = 0
    
    for i in range(0, len(artists), batch_size):
        batch = artists[i:i+batch_size]
        print(f"\nProcessing batch {i//batch_size + 1}/{(len(artists)-1)//batch_size + 1} ({len(batch)} artists)...")
        
        result = bulk_create_artists(batch)
        
        if isinstance(result, list):
            print(f"  ✓ Created {len(result)} artists")
            total_created += len(result)
            for artist in result:
                print(f"    - {artist.get('name', 'N/A')} (ID: {artist.get('id', 'N/A')})")
        elif isinstance(result, dict) and result.get("error"):
            print(f"  ✗ Error: {result['error']}")
            total_errors += len(batch)
        else:
            print(f"  ? Unexpected response: {result}")
        
        time.sleep(1)  # Rate limiting
    
    print(f"\n{'='*60}")
    print(f"Done: {total_created} created, {total_errors} errors")
    print(f"{'='*60}")

if __name__ == "__main__":
    main()
