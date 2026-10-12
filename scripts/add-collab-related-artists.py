#!/usr/bin/env python3
"""Doplní RELATED_ARTIST vazby z kolaborací (společný track).

Problém: 264 párů artistů spolupracovalo na tracku (primaryArtist + featuring),
ale nemají RELATED_ARTIST vazbu → síť je řídká, "Porovnat rapery" nevidí
spojení.

Řešení: pro každý track se dvěma+ artisty přidat bidirectional `related`
vazbu do artist relations.json.

Použití:
  python3 scripts/add-collab-related-artists.py          # DRY
  DRY=0 python3 scripts/add-collab-related-artists.py     # reálně
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

# 2) existující related vazby
existing = set()
for f in glob.glob(os.path.join(ENT, "artist_*", "relations.json")):
    aid = os.path.basename(os.path.dirname(f))
    r = json.load(open(f))
    for t in (r.get("related") or []):
        existing.add(tuple(sorted([aid, t])))

new = pairs - existing
print(f"kolaborační páry: {len(pairs)} | existující: {len(existing)} | NOVÉ: {len(new)}")

# 3) zápis (bidirectional do related)
added = 0
for a, b in new:
    for src, dst in [(a, b), (b, a)]:
        rp = os.path.join(ENT, src, "relations.json")
        if not os.path.exists(rp):
            continue
        r = json.load(open(rp))
        rel = set(r.get("related") or [])
        if dst not in rel:
            rel.add(dst)
            r["related"] = sorted(rel)
            if not DRY:
                json.dump(r, open(rp, "w"), ensure_ascii=False, indent=2)
                open(rp, "a").write("\n")
            added += 1

print(f"zapsáno vazeb (bidirectional): {added} · DRY={DRY}")
