#!/usr/bin/env python3
"""Doplní chybějící vazbu track → album (BELONGS_TO_ALBUM) z tracks.json.

Bezpečnost: párování POUZE přes Deezer track link (jednoznačné ID), nikdy
přes název. Track bez alba + jeho link nalezený v tracks.json nějakého alba
→ přidá se belongsToAlbum a HAS_TRACK.

Použití:
  python3 scripts/link-tracks-to-albums.py          # DRY run
  DRY=0 python3 scripts/link-tracks-to-albums.py     # reálně zapíše
"""
import json, os, glob

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
ENT = os.path.join(ROOT, "content", "entities")
DRY = os.environ.get("DRY", "1") != "0"

# 1) link → album id
bylink = {}
for f in glob.glob(os.path.join(ENT, "album_*", "tracks.json")):
    try:
        d = json.load(open(f))
    except Exception:
        continue
    albid = os.path.basename(os.path.dirname(f))
    for t in d.get("tracks", []):
        if t.get("link"):
            bylink[t["link"].rstrip("/")] = albid

# 2) které tracky mají už album
linked = set()
for f in glob.glob(os.path.join(ENT, "track_*", "relations.json")):
    r = json.load(open(f))
    if r.get("belongsToAlbum"):
        linked.add(os.path.basename(os.path.dirname(f)))

added = 0
for f in glob.glob(os.path.join(ENT, "track_*", "relations.json")):
    tid = os.path.basename(os.path.dirname(f))
    if tid in linked:
        continue
    m = json.load(open(os.path.join(os.path.dirname(f), "meta.json")))
    srcs = (m.get("extraMeta") or {}).get("sources") or []
    link = None
    for s in srcs:
        if "deezer.com/track" in str(s):
            link = str(s).rstrip("/")
            break
    if not link:
        continue
    albid = bylink.get(link)
    if not albid:
        continue
    r = json.load(open(f))
    r.setdefault("belongsToAlbum", [])
    if albid in r["belongsToAlbum"]:
        continue
    r["belongsToAlbum"].append(albid)
    if not DRY:
        json.dump(r, open(f, "w"), ensure_ascii=False, indent=2)
        open(f, "a").write("\n")
    added += 1
    print(f"  {'[DRY] ' if DRY else ''}{tid} → {albid}")

print(f"\nHotovo: doplněno {added} vazeb · DRY={DRY}")
