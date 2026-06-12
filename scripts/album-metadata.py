#!/usr/bin/env python3
"""Enrich album metadata: year, label relations, tracklists."""
import os, json, re

BASE = "content/entities"

# Quick scan for albums missing metadata
count = 0
for d in sorted(os.listdir(BASE)):
    if not d.startswith("album_"): continue
    meta_path = os.path.join(BASE, d, "meta.json")
    if not os.path.exists(meta_path): continue
    meta = json.load(open(meta_path, "r", encoding="utf-8"))
    has_year = "year" in meta
    rel = json.load(open(os.path.join(BASE, d, "relations.json"), "r", encoding="utf-8"))
    has_label = bool(rel.get("labels"))
    if not has_year or not has_label:
        count += 1
        if count <= 10:
            print(f"{d}: year={has_year}, label={has_label}")

print(f"\nTotal albums needing metadata: {count}")
