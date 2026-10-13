#!/usr/bin/env python3
"""
Sjednotí `description` v meta.json s reálným tracklistem (tracks.json).

Kontext: `scripts/enrich-albums.ts` generuje description jako
  "<Album> — album od <Artist> (<rok>): N skladeb."
kde N = počet grafových hran HAS_TRACK. Ty ale neodpovídají tracks.json
(import z Deezer/Discogs/MusicBrainz) → web pak ukazuje v meta description
jiné číslo než v tracklistu (a Google to vidí v OG/JSON-LD).

Zdroj pravdy = tracks.json (právě ten se renderuje).

Suchý běh default, --write pro zápis.
"""
import json, re, sys
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
ENT = ROOT / "content" / "entities"
WRITE = "--write" in sys.argv

changed = 0
for d in sorted(ENT.iterdir()):
    if not d.is_dir() or not d.name.startswith("album"): continue
    mp = d / "meta.json"; tp = d / "tracks.json"
    if not (mp.exists() and tp.exists()): continue
    try:
        tl = json.load(open(tp)); n = len(tl.get("tracks") or [])
    except Exception: continue
    if n == 0: continue
    meta = json.load(open(mp))
    desc = meta.get("description") or ""
    m = re.search(r"(\d+) skladeb", desc)
    if not m: continue
    cur = int(m.group(1))
    if cur == n: continue
    new = re.sub(r"\d+ skladeb", f"{n} skladeb", desc)
    changed += 1
    print(f"  {'DRY ' if not WRITE else 'WRT '} {d.name[:34]:36} {cur} → {n}")
    if WRITE:
        meta["description"] = new
        json.dump(meta, open(mp, "w"), ensure_ascii=False, indent=2)

print(f"\n{'DRY-RUN' if not WRITE else 'ZAPSÁNO'}: {changed} alb")
