#!/usr/bin/env python3
"""
Přesune AI odhady nálad/témat z relations.json do samostatného pole
`aiEstimates` a odstraní je z hlavních `moods`/`themes` klíčů.

Důvod: HAS_MOOD (7092) a HAS_THEME (4883) hrany v grafu jsou generované
AI z názvů skladeb (scripts/batch-import-tracks.ts mapuje klíčová slova),
NE z Deezeru/Discogs/MusicBrainz. Deezer poskytuje jen `genres`.

Řešení: moods + themes přesunout do `aiEstimates: {moods, themes}` a
hlavní klíče vyprázdnit → graf bude obsahovat jen ověřená data.

Použití:
  python3 scripts/strip-ai-mood-theme.py            # dry-run
  python3 scripts/strip-ai-mood-theme.py --write    # zápis
"""
import json, os, sys
ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
ENT = os.path.join(ROOT, "content", "entities")
WRITE = "--write" in sys.argv

def process(d):
    rp = os.path.join(ENT, d, "relations.json")
    if not os.path.isfile(rp): return None
    r = json.load(open(rp))
    moods = r.get("moods") or []
    themes = r.get("themes") or []
    if not moods and not themes: return None
    # ulož do aiEstimates
    ai = r.get("aiEstimates") or {}
    if moods: ai["moods"] = moods
    if themes: ai["themes"] = themes
    r["aiEstimates"] = ai
    # vyprázdni hlavní klíče
    if "moods" in r: r["moods"] = []
    if "themes" in r: r["themes"] = []
    return r

changed = 0
for d in sorted(os.listdir(ENT)):
    r = process(d)
    if r is not None:
        changed += 1
        if WRITE:
            rp = os.path.join(ENT, d, "relations.json")
            json.dump(r, open(rp, "w"), indent=2, ensure_ascii=False)
            open(rp, "a").write("\n")

print(f"{'ZAPSÁNO' if WRITE else 'DRY-RUN'}: {changed} souborů přesunuto do aiEstimates")
