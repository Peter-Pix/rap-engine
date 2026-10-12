#!/usr/bin/env python3
"""Odstraní KONTAMINOVANÁ Deezer metadata z alb se špatným deezerId.

Kontext: .backups/.../deezer-index.json pároval alba fuzzy (podle jména) →
70 fuzzy matchů, z toho 52 má ŠPATNÉHO interpreta (Taylor Swift, Foo Fighters,
Beatles...). Ta alba mají v DB špatná metadata + tracks.json + obaly.

Co smažeme (Deezer-odvozené, nedůvěryhodné):
  deezerId, deezerUrl, label, upc, genres, trackCount, durationSec,
  image (pokud lokální z Deezeru), sourceUrls.deezer, + smažeme tracks.json

Co ZACHOVÁME (naše kurátorované): id, type, slug, title, description,
  publishedAt, year, note...

Použití:
  python3 scripts/fix-contaminated-albums.py          # DRY
  DRY=0 python3 scripts/fix-contaminated-albums.py     # reálně
"""
import json, os

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
ENT = os.path.join(ROOT, "content", "entities")
DRY = os.environ.get("DRY", "1") != "0"

contaminated = json.load(open(os.path.join(ROOT, ".data", "album-id-contaminated.json")))
DUSTER = ["deezerId", "deezerUrl", "label", "upc", "genres",
          "trackCount", "durationSec"]

n = 0
for slug in contaminated:
    mp = os.path.join(ENT, f"album_{slug}", "meta.json")
    if not os.path.exists(mp):
        print(f"  skip (chybí): {slug}"); continue
    m = json.load(open(mp))
    removed = []
    for k in DUSTER:
        if k in m:
            removed.append(k); 
            if not DRY: del m[k]
    # image — smažeme jen pokud vypadá jako Deezer (lokální /images/albums/<slug>.webp
    # vzniklo stažením z Deezeru = taky špatné)
    if m.get("image"):
        removed.append("image")
        if not DRY: del m["image"]
    # sourceUrls.deezer
    if isinstance(m.get("sourceUrls"), dict) and m["sourceUrls"].get("deezer"):
        removed.append("sourceUrls.deezer")
        if not DRY: m["sourceUrls"].pop("deezer", None)
        if not DRY and not m["sourceUrls"]:
            del m["sourceUrls"]
    # tracks.json smazat
    tj = os.path.join(ENT, f"album_{slug}", "tracks.json")
    if os.path.exists(tj):
        removed.append("tracks.json")
        if not DRY:
            os.rename(tj, tj + ".contaminated")
    if not DRY:
        json.dump(m, open(mp, "w"), ensure_ascii=False, indent=2)
        open(mp, "a").write("\n")
    n += 1
    print(f"  {'[DRY] ' if DRY else ''}{slug:30} odstraněno: {','.join(removed)}")

print(f"\nHotovo: {n} alb očištěno · DRY={DRY}")
