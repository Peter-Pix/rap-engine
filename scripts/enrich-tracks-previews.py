#!/usr/bin/env python3
"""Propsání preview_url z albovych tracks.json do track meta.json.

Proc: alba maji tracks.json (393 alb, 4 619 tracku) s preview_url — oficialni
Deezer 30s ukazky. Ale track entity je nemaji. Prepiseme je naprimo BEZ API
volani a BEZ rizika zameny (match pres Deezer track link = jednoznacne ID).

Pouziti:
  python3 scripts/enrich-tracks-previews.py          # DRY run
  DRY=0 python3 scripts/enrich-tracks-previews.py     # realne zapise
"""
import json, glob, os
from collections import defaultdict

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
ENT = os.path.join(ROOT, "content", "entities")
DRY = os.environ.get("DRY", "1") != "0"

# 1) link -> {preview, isrc, duration, releaseDate}
bylink = defaultdict(dict)
for f in glob.glob(os.path.join(ENT, "album_*", "tracks.json")):
    try:
        d = json.load(open(f))
    except Exception:
        continue
    rdate = d.get("release_date")
    for t in d.get("tracks", []):
        link = t.get("link")
        if not link:
            continue
        e = bylink.get(link) or {}
        if t.get("preview_url"): e["preview"] = t["preview_url"]
        if t.get("isrc"): e["isrc"] = t["isrc"]
        if t.get("duration_sec"): e["duration"] = t["duration_sec"]
        if rdate: e["releaseDate"] = rdate
        if e: bylink[link] = e

print(f"Zdroj: {len(bylink)} track linku s metadaty z tracks.json")

touched = 0
for md in glob.glob(os.path.join(ENT, "track_*", "meta.json")):
    m = json.load(open(md))
    em = m.get("extraMeta") or {}
    srcs = em.get("sources") or []
    link = None
    for s in srcs:
        if "deezer.com/track" in str(s):
            link = str(s).rstrip("/")
            break
    if not link:
        continue
    data = bylink.get(link) or bylink.get(link + "/")
    if not data:
        continue
    changed = False
    for k, v in data.items():
        if v and em.get(k) != v:
            em[k] = v
            changed = True
    if changed:
        m["extraMeta"] = em
        if not DRY:
            json.dump(m, open(md, "w"), ensure_ascii=False, indent=2)
            open(md, "a").write("\n")
        touched += 1

print(f"Hotovo: zapsano/upraveno {touched} tracku · DRY={DRY}")
