#!/usr/bin/env python3
"""
FÁZE 1 — Sbírá feat vazby z Deezer API `/track/{id}` → contributors role=Featured.

Proč: tracks.json pole `feat` má jen 274 tracků (Deezer albums endpoint ho
nedává spolehlivě). Ale `/track/{id}` vrací `contributors` s rolí Featured.
6311 tracků má Deezer link → můžeme dotáhnout každý zvlášť.

Výstup: .data/deezer-feats-api.json
  { fetched_at, total, tracks: [{deezer_id, title, main_artist, featured:[names]}] }

Použití:
  python3 scripts/fetch-deezer-feats-api.py                    # celý běh
  python3 scripts/fetch-deezer-feats-api.py --limit 50         # test
  python3 scripts/fetch-deezer-feats-api.py --resume           # pokračuj z cache
"""
import json, os, re, sys, time, urllib.request
from urllib.error import HTTPError, URLError

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
ENT = os.path.join(ROOT, "content", "entities")
OUT = os.path.join(ROOT, ".data", "deezer-feats-api.json")
os.makedirs(os.path.dirname(OUT), exist_ok=True)

LIMIT = None
for i, a in enumerate(sys.argv):
    if a == "--limit": LIMIT = int(sys.argv[i+1])
RESUME = "--resume" in sys.argv

UA = {"User-Agent": "4rap-research/1.0 (ppix50@gmail.com)"}

def api(url, retries=4):
    for att in range(retries):
        try:
            r = urllib.request.Request(url, headers=UA)
            return json.load(urllib.request.urlopen(r, timeout=20))
        except HTTPError as e:
            if e.code == 429:
                wait = 6 * (att + 1)
                print(f"    429 → čekám {wait}s", flush=True)
                time.sleep(wait); continue
            raise
        except (URLError, TimeoutError):
            time.sleep(2 * (att + 1))
    return None

# načti Deezer IDs ze všech tracks.json
albums = sorted(d for d in os.listdir(ENT) if d.startswith("album_"))
ids = {}  # deezer_id -> (album_id, title)
for a in albums:
    tp = os.path.join(ENT, a, "tracks.json")
    if not os.path.isfile(tp): continue
    try:
        d = json.load(open(tp))
    except Exception:
        continue
    for t in d.get("tracks", []):
        m = re.search(r"/track/(\d+)", t.get("link", "") or "")
        if m:
            ids[m.group(1)] = (a, t.get("title", ""))

print(f"tracků s Deezer ID: {len(ids)}")

done = {}
if RESUME and os.path.isfile(OUT):
    try:
        prev = json.load(open(OUT))
        done = {x["deezer_id"]: x for x in prev.get("tracks", [])}
        print(f"resume: už mám {len(done)}")
    except Exception:
        done = {}

todo = [k for k in ids if k not in done]
if LIMIT: todo = todo[:LIMIT]
print(f"ke zpracování: {len(todo)}")

result = list(done.values())
for i, tid in enumerate(todo, 1):
    d = api(f"https://api.deezer.com/track/{tid}")
    if not d or "error" in d:
        continue
    contribs = d.get("contributors") or []
    featured = [c.get("name", "").strip() for c in contribs
                if (c.get("role") or "").lower() in ("featured", "featuring", "feat")]
    main = [c.get("name", "").strip() for c in contribs
            if (c.get("role") or "").lower() == "main"]
    album_id, _ = ids[tid]
    result.append({
        "deezer_id": tid,
        "title": d.get("title", ""),
        "main_artist": (main[0] if main else (d.get("artist") or {}).get("name", "")),
        "featured": featured,
    })
    if i % 200 == 0:
        json.dump({"fetched_at": time.strftime("%Y-%m-%dT%H:%M:%S"),
                   "total": len(result), "tracks": result},
                  open(OUT, "w"), ensure_ascii=False, indent=1)
        print(f"  {i}/{len(todo)} — checkpoint (featů: {sum(1 for x in result if x['featured'])})", flush=True)
    time.sleep(0.22)

json.dump({"fetched_at": time.strftime("%Y-%m-%dT%H:%M:%S"),
           "total": len(result), "tracks": result},
          open(OUT, "w"), ensure_ascii=False, indent=1)
nf = sum(1 for x in result if x["featured"])
print(f"\nHOTOVO: {len(result)} tracků, {nf} s Featured → {OUT}")
