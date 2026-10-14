#!/usr/bin/env python3
"""
Sbírá Deezer artist ID pro feat hosty z Deezer contributors (role=Featured).

Proč: feat jméno z contributors je OVĚŘENÝ fakt + Deezer vrací i jeho ID.
To je strukturovaný identifikátor → můžeme založit nové artist entity správně.

Výstup: .data/feat-artist-ids.json
  { collected_at, artists: { normalized_name: {name, deezer_id, count, tracks:[ids]} } }

Použití:
  python3 scripts/collect-feat-artist-ids.py [--limit N]
"""
import json, os, re, sys, time, unicodedata, urllib.request
from collections import defaultdict
from urllib.error import HTTPError

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
DATA = os.path.join(ROOT, ".data", "deezer-feats-api.json")
OUT = os.path.join(ROOT, ".data", "feat-artist-ids.json")
UA = {"User-Agent": "4rap-research/1.0 (ppix50@gmail.com)"}
LIMIT = None
for i, a in enumerate(sys.argv):
    if a == "--limit": LIMIT = int(sys.argv[i+1])

def norm(s):
    s = unicodedata.normalize("NFD", str(s or "")).encode("ascii", "ignore").decode().lower()
    return re.sub(r"[^a-z0-9]+", " ", s).strip()

def api(url, retries=3):
    for att in range(retries):
        try:
            r = urllib.request.Request(url, headers=UA)
            return json.load(urllib.request.urlopen(r, timeout=20))
        except HTTPError as e:
            if e.code == 429:
                time.sleep(5 * (att + 1)); continue
            raise
        except Exception:
            time.sleep(2)
    return None

d = json.load(open(DATA))
recs = [r for r in d["tracks"] if r.get("featured")]
if LIMIT: recs = recs[:LIMIT]
print(f"tracků s feat: {len(recs)}")

# už máme? resume
artists = {}
if os.path.isfile(OUT):
    try:
        artists = json.load(open(OUT)).get("artists", {})
        print(f"resume: {len(artists)} hostů")
    except Exception:
        artists = {}

done_tracks = set()
for v in artists.values():
    for t in v.get("tracks", []):
        done_tracks.add(str(t))

for i, rec in enumerate(recs, 1):
    tid = str(rec["deezer_id"])
    if tid in done_tracks:
        continue
    t = api(f"https://api.deezer.com/track/{tid}")
    if not t or "error" in t:
        continue
    for c in t.get("contributors") or []:
        if (c.get("role") or "").lower() != "featured":
            continue
        name = (c.get("name") or "").strip()
        cid = c.get("id")
        if not name or not cid:
            continue
        k = norm(name)
        v = artists.setdefault(k, {"name": name, "deezer_id": cid, "count": 0, "tracks": []})
        v["count"] += 1
        if tid not in v["tracks"]:
            v["tracks"].append(tid)
    if i % 200 == 0:
        json.dump({"collected_at": time.strftime("%Y-%m-%dT%H:%M:%S"), "artists": artists},
                  open(OUT, "w"), ensure_ascii=False, indent=1)
        print(f"  {i}/{len(recs)} — hostů: {len(artists)}", flush=True)
    time.sleep(0.2)

json.dump({"collected_at": time.strftime("%Y-%m-%dT%H:%M:%S"), "artists": artists},
          open(OUT, "w"), ensure_ascii=False, indent=1)
print(f"\nHOTOVO: {len(artists)} unikátních feat hostů → {OUT}")
