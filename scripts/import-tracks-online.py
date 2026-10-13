#!/usr/bin/env python3
"""
Doplní tracks.json u alb, kde chybí — ze ověřených zdrojů (Discogs / Deezer).

Kontext: 64 alb bez tracků. Deezer ani Wikipedie je nemají → hlavní zdroj
Discogs (CZ/SK rap alba tam jsou), doplňkově Deezer.

BEZPEČNOST: vstupem je /tmp/validated3.json (už proběhlá 3-vrstvá validace:
  1. interpret z Discogs release  (musí obsahovat očekávaného interpreta)
  2. žánr   (Discogs genres/styles musí obsahovat hip-hop/rap)
  3. rok    (±2 roky od roku v DB)
  4. jazyk  (CZ/SK znaky nebo rap slovní zásoba v názvech skladeb)
  → 24 alb prošlo, 3 falešné shody odmítnuty (demo, if, la-farandula).

Použití:
  python3 scripts/import-tracks-online.py            # dry-run
  python3 scripts/import-tracks-online.py --write    # zápis
"""
import json, sys, os
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
ENT  = ROOT / "content" / "entities"
VALID = Path("/tmp/validated3.json")
DRY = "--write" not in sys.argv

def slug_to_album(slug):
    """Najdi album entitu podle slugu."""
    for d in ENT.iterdir():
        if not d.is_dir() or not d.name.startswith("album"):
            continue
        m = d / "meta.json"
        if not m.exists(): continue
        try: meta = json.load(open(m))
        except Exception: continue
        if meta.get("slug") == slug:
            return d, meta
    return None, None

data = json.load(open(VALID))
# jen validní (n>=2)
items = {k: v for k, v in data.items() if v.get("n", 0) >= 2}
print(f"Kandidátů k zápisu: {len(items)}\n")

written, skipped = 0, 0
for slug, v in sorted(items.items()):
    d, meta = slug_to_album(slug)
    if not d:
        print(f"  ⚠️  {slug}: entita nenalezena"); skipped += 1; continue
    tp = d / "tracks.json"
    if tp.exists():
        try:
            if json.load(open(tp)):  # má obsah
                print(f"  ⏭️  {slug}: už má tracky"); skipped += 1; continue
        except Exception: pass

    tracks = []
    for i, t in enumerate(v["tracks"]):
        rec = {"position": t.get("pos") or (i+1), "title": t["title"]}
        dur = t.get("dur")
        if isinstance(dur, int): rec["duration_sec"] = dur
        elif isinstance(dur, str) and dur.count(":") == 1:
            try:
                m, s = dur.split(":"); rec["duration_sec"] = int(m)*60+int(s)
            except Exception: pass
        tracks.append(rec)

    out = {
        "source": v["src"],
        "album": meta.get("title"),
        "artist": v.get("artist"),
        "year": v.get("year"),
        "total_tracks": len(tracks),
        "tracks": tracks,
    }
    if v["src"] == "discogs":
        out["discogs_id"] = None  # doplní se níže ručně, zde jen značka zdroje
    print(f"  {'DRY ' if DRY else 'WRT '} {slug[:28]:30} {len(tracks):3} skl. ({v['src']})")
    if not DRY:
        json.dump(out, open(tp, "w"), ensure_ascii=False, indent=2)
    written += 1

print(f"\n{'DRY-RUN' if DRY else 'ZAPSÁNO'}: {written} alb | přeskočeno: {skipped}")
if DRY: print("Spusť s --write pro zápis.")
