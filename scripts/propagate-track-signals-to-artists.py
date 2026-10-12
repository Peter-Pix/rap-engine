#!/usr/bin/env python3
"""Propaguje track-level signály (mood/theme/style/genre) na artista.

Problém: artisti mají řídká metadata (mood 12%, theme 3%, style 17%), i když
jejich tracky mají bohaté signály. Porovnání raperů je pak "kostrbaté" —
porovnává artist↔artist, ale artisti nemají agregované vlastnosti tracků.

Řešení: pro každého artista agregovat union moods/themes/styles/genres ze
všech jeho tracků (primaryArtist + featuring). Čistě odvozené z existujících
faktů, žádná nová data.

Použití:
  python3 scripts/propagate-track-signals-to-artists.py          # DRY
  DRY=0 python3 scripts/propagate-track-signals-to-artists.py     # reálně zapíše
"""
import json, os, glob
from collections import defaultdict

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
ENT = os.path.join(ROOT, "content", "entities")
DRY = os.environ.get("DRY", "1") != "0"

FIELDS = ["genres", "moods", "themes", "styles"]

# 1) artista → union signálů z tracků
artist_signals = defaultdict(lambda: {f: set() for f in FIELDS})
for f in glob.glob(os.path.join(ENT, "track_*", "relations.json")):
    try:
        r = json.load(open(f))
    except Exception:
        continue
    artists = (r.get("primaryArtist") or []) + (r.get("featuring") or [])
    if not artists:
        continue
    for field in FIELDS:
        vals = r.get(field) or []
        for a in artists:
            artist_signals[a][field].update(vals)

# 2) zapis do artist relations (merge, ne overwrite)
changed = 0
for f in glob.glob(os.path.join(ENT, "artist_*", "relations.json")):
    aid = os.path.basename(os.path.dirname(f))
    sig = artist_signals.get(aid)
    if not sig:
        continue
    r = json.load(open(f))
    modified = False
    for field in FIELDS:
        existing = set(r.get(field) or [])
        new = sig[field] - existing
        if new:
            r.setdefault(field, [])
            r[field] = sorted(set(r[field]) | new)
            modified = True
    if modified:
        if not DRY:
            json.dump(r, open(f, "w"), ensure_ascii=False, indent=2)
            open(f, "a").write("\n")
        changed += 1
        if DRY:
            print(f"  [DRY] {aid}: +{sum(len(sig[x]-set((json.load(open(f)) if False else r).get(x) or [])) for x in FIELDS)} signálů")

print(f"\nHotovo: {changed} artistů s novými signály · DRY={DRY}")
print(f"Celkem artistů se signály: {sum(1 for a,s in artist_signals.items() if any(s.values()))}")
