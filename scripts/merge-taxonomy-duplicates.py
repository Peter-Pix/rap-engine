#!/usr/bin/env python3
"""Sloučí duplicitní taxonomické entity (genre/mood/theme/style).

Přesměruje všechny reference (relations.json ve všech entitách) ze zdrojové
entity na cílovou, pak zdrojovou složku přesune do trash.

Konfigurace MERGES: [(source_id, target_id), ...]

Použití:
  python3 scripts/merge-taxonomy-duplicates.py          # DRY
  DRY=0 python3 scripts/merge-taxonomy-duplicates.py     # reálně
"""
import json, os, glob, shutil

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
ENT = os.path.join(ROOT, "content", "entities")
TRASH = os.path.join(ROOT, ".trash-taxonomy-merge-20261012")
DRY = os.environ.get("DRY", "1") != "0"

# (source_id, target_id)
MERGES = [
    ("genre_r-n-b", "genre_rnb"),
    ("genre_world-music", "genre_world"),
    ("genre_newschool-rap", "genre_new-school"),
    ("genre_trueschool-rap", "genre_old-school-rap"),
    ("theme_introspection", "theme_self-reflection"),
    # Sémanticky jednoznačné duplicity (stejný koncept, jiné slovo)
    ("genre_alternative-hip-hop", "genre_alternative-rap"),
    ("genre_experimental-hip-hop", "genre_experimental-rap"),
    ("genre_underground-hip-hop", "genre_underground-rap"),
    ("genre_alternative", "genre_alternative-rap"),  # stub
]

os.makedirs(TRASH, exist_ok=True)

for src, dst in MERGES:
    if not os.path.exists(os.path.join(ENT, src)):
        print(f"  skip (chybí zdroj): {src}")
        continue
    if not os.path.exists(os.path.join(ENT, dst)):
        print(f"  ⚠️ POZOR (chybí cíl): {dst} — přeskočeno")
        continue

    refs = 0
    files_changed = []
    for f in glob.glob(os.path.join(ENT, "*", "relations.json")):
        r = json.load(open(f))
        changed = False
        for k, v in r.items():
            if isinstance(v, list) and src in v:
                # nahradit src → dst, dedup
                new = [dst if x == src else x for x in v]
                # odstranit duplicity (když dst už tam bylo)
                seen = []
                for x in new:
                    if x not in seen:
                        seen.append(x)
                r[k] = seen
                refs += 1
                changed = True
        if changed:
            files_changed.append(os.path.basename(os.path.dirname(f)))
            if not DRY:
                json.dump(r, open(f, "w"), ensure_ascii=False, indent=2)
                open(f, "a").write("\n")

    print(f"  {src} → {dst}: {refs} referencí, {len(files_changed)} souborů")
    if not DRY:
        shutil.move(os.path.join(ENT, src), os.path.join(TRASH, src))
        print(f"    → složka přesunuta do trash")

print(f"\nHotovo · DRY={DRY}")
