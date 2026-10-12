#!/usr/bin/env python3
"""Přesune kolaborace z `related` do `artists` pole (oprava mapování).

Problém: relation-registry mapuje `artists` → RELATED_ARTIST, ale `related`
→ RELATED_TO (generický). Kolaborace (feat na tracku) jsem omylem zapsal do
`related`, takže se nezobrazily jako RELATED_ARTIST.

Fix: pro kolaborační páry (dva artisti na stejném tracku) přesunout vazbu
z `related` do `artists` pole. `artists` je správné místo pro spolupracovníky.

Použití:
  python3 scripts/fix-collab-to-artists.py          # DRY
  DRY=0 python3 scripts/fix-collab-to-artists.py     # reálně
"""
import json, os, glob
from collections import defaultdict

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
ENT = os.path.join(ROOT, "content", "entities")
DRY = os.environ.get("DRY", "1") != "0"

# 1) kolaborační páry (artist↔artist na stejném tracku)
pairs = set()
for f in glob.glob(os.path.join(ENT, "track_*", "relations.json")):
    try:
        r = json.load(open(f))
    except Exception:
        continue
    artists = list(dict.fromkeys((r.get("primaryArtist") or []) + (r.get("featuring") or [])))
    for i in range(len(artists)):
        for j in range(i + 1, len(artists)):
            pairs.add(tuple(sorted([artists[i], artists[j]])))

print(f"kolaborační páry: {len(pairs)}")

moved = 0
for a, b in pairs:
    # oba směry: přesunout b z related(a) do artists(a), a z related(b) do artists(b)
    for src, dst in [(a, b), (b, a)]:
        rp = os.path.join(ENT, src, "relations.json")
        if not os.path.exists(rp):
            continue
        r = json.load(open(rp))
        related = set(r.get("related") or [])
        artists = set(r.get("artists") or [])
        if dst in related and dst not in artists:
            related.discard(dst)
            artists.add(dst)
            r["related"] = sorted(related)
            r["artists"] = sorted(artists)
            if not DRY:
                json.dump(r, open(rp, "w"), ensure_ascii=False, indent=2)
                open(rp, "a").write("\n")
            moved += 1

print(f"přesunuto vazeb related→artists: {moved} · DRY={DRY}")
