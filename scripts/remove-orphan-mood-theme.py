#!/usr/bin/env python3
"""
Odstraní mood_ a theme_ entity (taxonomie AI odhadů), které po přesunu
nálad/témat do aiEstimates ztratily všechny vazby.

Důvod: HAS_MOOD (7092) + HAS_THEME (4883) hrany byly AI odhad z názvů,
Deezer poskytuje jen genres. Po strip-ai-mood-theme.py zůstaly entity
mood_* a theme_* úplně osiřelé (0 inbound hran).

Použití:
  python3 scripts/remove-orphan-mood-theme.py            # dry-run
  python3 scripts/remove-orphan-mood-theme.py --write    # zápis
"""
import json, os, sys, shutil, datetime
ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
ENT = os.path.join(ROOT, "content", "entities")
WRITE = "--write" in sys.argv

to_remove = []
for d in sorted(os.listdir(ENT)):
    if d.startswith("mood_") or d.startswith("theme_"):
        to_remove.append(d)

# zkontroluj, že žádná jiná entita na ně neodkazuje
dangling = 0
for d in os.listdir(ENT):
    rp = os.path.join(ENT, d, "relations.json")
    if not os.path.isfile(rp): continue
    r = json.load(open(rp))
    for k, v in r.items():
        if isinstance(v, list):
            for x in v:
                if isinstance(x, str) and (x.startswith("mood_") or x.startswith("theme_")):
                    dangling += 1
                    print(f"  ⚠️ reference: {d} [{k}] → {x}")

print(f"entity k odstranění: {len(to_remove)} (mood {sum(1 for d in to_remove if d.startswith('mood_'))}, theme {sum(1 for d in to_remove if d.startswith('theme_'))})")
print(f"zbloudilé reference: {dangling}")

if WRITE and dangling == 0:
    bk = os.path.join(ROOT, ".backups", f"entities-mood-theme-{datetime.datetime.now():%Y%m%d%H%M}")
    os.makedirs(bk, exist_ok=True)
    for d in to_remove:
        shutil.move(os.path.join(ENT, d), os.path.join(bk, d))
    print(f"✅ {len(to_remove)} entit přesunuto do {bk}")
elif WRITE and dangling > 0:
    print("❌ NESMAZÁNO — existují zbloudilé reference, nejdřív opravit")
