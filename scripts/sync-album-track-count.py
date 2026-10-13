#!/usr/bin/env python3
"""
Sjednotí text "Obsahuje **N skladeb**" v entity.mdx s reálným tracklistem.

Kontext: MDX text generuje `scripts/enrich-albums.ts` z propojených TRACK ENTIT
(graf), ale tracks.json (importovaný z Deezer/Discogs/MusicBrainz) má vlastní
seznam. Když se liší, web ukazuje dvě čísla (text vs hlavička tracklistu).

Tento skript aktualizuje text podle tracks.json — zdroj pravdy o tracklistu
je soubor tracks.json, protože právě ten se renderuje.

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
    tp = d / "tracks.json"
    mp = d / "entity.mdx"
    if not (tp.exists() and mp.exists()): continue
    try:
        tl = json.load(open(tp))
        n = len(tl.get("tracks") or [])
    except Exception:
        continue
    if n == 0: continue
    txt = mp.read_text()
    # najdi "Obsahuje **N skladeb**" nebo "s **N skladbami**"
    new = txt
    m1 = re.search(r"Obsahuje \*\*(\d+) skladeb\*\*", txt)
    m2 = re.search(r"s \*\*(\d+) skladbami\*\*", txt)
    cur = None
    if m1: cur = int(m1.group(1))
    elif m2: cur = int(m2.group(1))
    if cur is None or cur == n: continue
    new = re.sub(r"Obsahuje \*\*\d+ skladeb\*\*", f"Obsahuje **{n} skladeb**", new)
    new = re.sub(r"s \*\*\d+ skladbami\*\*", f"s **{n} skladbami**", new)
    if new != txt:
        changed += 1
        print(f"  {'DRY ' if not WRITE else 'WRT '} {d.name[:32]:34} {cur} → {n}")
        if WRITE: mp.write_text(new)

print(f"\n{'DRY-RUN' if not WRITE else 'ZAPSÁNO'}: {changed} alb k opravě")
