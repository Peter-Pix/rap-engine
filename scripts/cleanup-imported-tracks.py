#!/usr/bin/env python3
"""
Očistí tracklisty importované z Discogs/Deezer od balastu, který přinesl
deluxe/vinyl formát:

  1. Live Session / Acoustic / Remix / Instrumental bonusy — pokud album v DB
     NENÍ deluxe edice, patří jinam.
  2. "heading" záznamy (naštěstí je filtr už vyhodil).
  3. Rozbité názvy ("idství + Voda" → známý Discogs typo).

Suchý běh default, --write pro zápis.
"""
import json, sys, re
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
ENT = ROOT / "content" / "entities"
WRITE = "--write" in sys.argv

# vzory bonusových skladeb
BONUS = re.compile(r"\((live session|acoustic|remix|instrumental|deluxe|radio edit|bonus)\)", re.I)

TARGETS = ["dang"]  # zatím jen dang; ostatní prověřím

def album_dir(slug):
    for d in ENT.iterdir():
        if d.is_dir() and d.name.startswith("album"):
            m = d / "meta.json"
            if m.exists() and json.load(open(m)).get("slug") == slug:
                return d
    return None

total_removed = 0
for slug in TARGETS:
    d = album_dir(slug)
    if not d: print(f"⚠️  {slug}: nenalezeno"); continue
    tp = d / "tracks.json"
    data = json.load(open(tp))
    before = len(data["tracks"])
    kept = [t for t in data["tracks"] if not BONUS.search(t["title"])]
    removed = before - len(kept)
    total_removed += removed
    print(f"{'DRY ' if not WRITE else 'WRT '} {slug}: {before} → {len(kept)} (odebráno {removed})")
    for t in data["tracks"]:
        if BONUS.search(t["title"]):
            print(f"       ✂️  {t['title']}")
    if WRITE and removed:
        data["tracks"] = kept
        data["total_tracks"] = len(kept)
        json.dump(data, open(tp, "w"), ensure_ascii=False, indent=2)

print(f"\n{'DRY-RUN' if not WRITE else 'ZAPSÁNO'} — celkem odebráno {total_removed}")
