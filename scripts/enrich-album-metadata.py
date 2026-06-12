#!/usr/bin/env python3
"""Smart album metadata enrichment: year from title, label from artist."""
import os, json, re

BASE = "content/entities"

# Build artist → labels map
artist_labels = {}
for d in os.listdir(BASE):
    if not d.startswith("artist_"): continue
    meta_path = os.path.join(BASE, d, "meta.json")
    rel_path = os.path.join(BASE, d, "relations.json")
    if not os.path.exists(meta_path) or not os.path.exists(rel_path):
        continue
    rel = json.load(open(rel_path, "r", encoding="utf-8"))
    labels = rel.get("labels", [])
    if labels:
        artist_labels[d] = labels

# Also collective → labels
collective_labels = {}
for d in os.listdir(BASE):
    if not d.startswith("collective_"): continue
    rel_path = os.path.join(BASE, d, "relations.json")
    if not os.path.exists(rel_path): continue
    rel = json.load(open(rel_path, "r", encoding="utf-8"))
    labels = rel.get("labels", [])
    if labels:
        collective_labels[d] = labels

fixed_year = 0
fixed_label = 0

for d in sorted(os.listdir(BASE)):
    if not d.startswith("album_"): continue
    meta_path = os.path.join(BASE, d, "meta.json")
    rel_path = os.path.join(BASE, d, "relations.json")
    if not os.path.exists(meta_path) or not os.path.exists(rel_path):
        continue
    
    meta = json.load(open(meta_path, "r", encoding="utf-8"))
    rel = json.load(open(rel_path, "r", encoding="utf-8"))
    
    changed = False
    
    # 1. Extract year from title if missing
    if "year" not in meta:
        m = re.search(r'\b(19\d{2}|20\d{2})\b', meta.get("title", ""))
        if m:
            meta["year"] = int(m.group(1))
            changed = True
            fixed_year += 1
    
    # 2. Inherit label from artist if missing
    if not rel.get("labels"):
        artists = rel.get("artists", [])
        if artists:
            artist_id = artists[0]
            labels = artist_labels.get(artist_id, [])
            if not labels and artist_id.startswith("artist_"):
                # Try collective for this artist
                artist_rel_path = os.path.join(BASE, artist_id, "relations.json")
                if os.path.exists(artist_rel_path):
                    artist_rel = json.load(open(artist_rel_path, "r", encoding="utf-8"))
                    for col in artist_rel.get("partOf", []):
                        labels = collective_labels.get(col, [])
                        if labels: break
            if labels:
                rel["labels"] = [labels[0]]
                changed = True
                fixed_label += 1
    
    if changed:
        with open(meta_path, "w", encoding="utf-8") as f:
            json.dump(meta, f, indent=2, ensure_ascii=False)
            f.write("\n")
        with open(rel_path, "w", encoding="utf-8") as f:
            json.dump(rel, f, indent=2, ensure_ascii=False)
            f.write("\n")

print(f"Fixed year: {fixed_year}")
print(f"Fixed label: {fixed_label}")
print(f"Total changed: {fixed_year + fixed_label}")
