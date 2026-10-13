#!/usr/bin/env python3
"""
Označí alba bez tracklistu jako `tracklistStatus: "unavailable"` s poznámkou,
které zdroje byly zkoušeny. Cíl: není to tichá mezera v datech — je vidět,
že se to hledalo a kde.

Zdroje prověřené u každého alba:
  - Deezer API (search/album + ověření interpreta)
  - Discogs API (search/release + validace interpret/žánr/rok/jazyk)
  - MusicBrainz (release search + validace)
  - iTunes/Apple Music Search API
  - Wikipedie (CS/SK) — jen seznam alb, tracklisty tam nejsou

Suchý běh default, --write pro zápis.
"""
import json, sys
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
ENT = ROOT / "content" / "entities"
WRITE = "--write" in sys.argv

NOTE = ("Tracklist se nepodařilo dohledat ve veřejných zdrojích "
        "(Deezer, Discogs, MusicBrainz, Apple Music, Wikipedie). "
        "Digitální release — tracklist je dostupný jen ve streamovacích "
        "službách bez veřejného API.")

missing = json.load(open("/tmp/still-missing.json"))
count = 0
for item in missing:
    d = ENT / item["id"]
    m = d / "meta.json"
    if not m.exists(): continue
    meta = json.load(open(m))
    if meta.get("tracklistStatus") == "unavailable": continue
    count += 1
    print(f"  {'DRY ' if not WRITE else 'WRT '} {item['title'][:36]:38} ({item['artist'] or '?'})")
    if WRITE:
        meta["tracklistStatus"] = "unavailable"
        meta["tracklistNote"] = NOTE
        json.dump(meta, open(m, "w"), ensure_ascii=False, indent=2)

print(f"\n{'DRY-RUN' if not WRITE else 'OZNAČENO'}: {count} alb")
