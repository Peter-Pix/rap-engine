#!/usr/bin/env python3
"""
Doplní Deezer artist ID našim umělcům — STRUKTURÁLNĚ, ne hledáním.

Metoda: vezme Deezer track ID z našich track entit (extraMeta.sources),
dotáhne /track/{id}, najde contributor s role=Main a shodným jménem → jeho ID.

Tím dostaneme OVĚŘENÝ Deezer ID (žádné fuzzy hledání podle jména).
Díky ID lze pak feat vazby ověřovat strukturovaně.

Výstup: zapíše deezerId do meta.json (jen když chybí a shoda je přesná).

Použití:
  python3 scripts/backfill-deezer-artist-ids.py            # dry-run
  python3 scripts/backfill-deezer-artist-ids.py --write
"""
import json, os, re, sys, time, unicodedata, urllib.request
from collections import defaultdict
from urllib.error import HTTPError

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
ENT = os.path.join(ROOT, "content", "entities")
WRITE = "--write" in sys.argv
UA = {"User-Agent": "4rap-research/1.0 (ppix50@gmail.com)"}

def norm(s):
    s = unicodedata.normalize("NFD", str(s or "")).encode("ascii", "ignore").decode().lower()
    return re.sub(r"[^a-z0-9]+", " ", s).strip()

def api(url, retries=3):
    for att in range(retries):
        try:
            return json.load(urllib.request.urlopen(urllib.request.Request(url, headers=UA), timeout=20))
        except HTTPError as e:
            if e.code == 429:
                time.sleep(5 * (att + 1)); continue
            return None
        except Exception:
            time.sleep(2)
    return None

# 1) umělci + jejich jména
artists = {}
for x in os.listdir(ENT):
    if not x.startswith("artist_"): continue
    try: m = json.load(open(f"{ENT}/{x}/meta.json"))
    except Exception: continue
    artists[x] = {"title": m.get("title", ""), "nn": norm(m.get("title", "")),
                  "deezerId": m.get("deezerId"), "path": f"{ENT}/{x}/meta.json"}

# 2) pro každého umělce: jeden Deezer track ID (z jeho vlastních tracků)
by_artist = defaultdict(list)
for x in os.listdir(ENT):
    if not x.startswith("track_"): continue
    rp = f"{ENT}/{x}/relations.json"
    if not os.path.isfile(rp): continue
    try: r = json.load(open(rp))
    except Exception: continue
    mp = f"{ENT}/{x}/meta.json"
    try: m = json.load(open(mp))
    except Exception: continue
    dids = [re.search(r"/track/(\d+)", s).group(1)
            for s in ((m.get("extraMeta") or {}).get("sources") or [])
            if re.search(r"deezer\.com/track/(\d+)", s)]
    if not dids: continue
    for a in (r.get("primaryArtist") or []):
        by_artist[a].append(dids[0])

todo = [a for a in artists if not artists[a]["deezerId"] and by_artist.get(a)]
print(f"umělců bez ID s dostupným trackem: {len(todo)}")

resolved = {}
for i, a in enumerate(todo, 1):
    for tid in by_artist[a][:3]:
        t = api(f"https://api.deezer.com/track/{tid}")
        if not t: continue
        for c in (t.get("contributors") or []):
            if (c.get("role") or "").lower() != "main": continue
            if norm(c.get("name")) == artists[a]["nn"] and c.get("id"):
                resolved[a] = c["id"]
                break
        if a in resolved: break
        time.sleep(0.15)
    if i % 50 == 0: print(f"  {i}/{len(todo)} — vyřešeno: {len(resolved)}", flush=True)
    time.sleep(0.15)

print(f"\n{'ZAPSÁNO' if WRITE else 'DRY-RUN'}: vyřešeno {len(resolved)} Deezer artist ID")
if WRITE:
    for a, did in resolved.items():
        p = artists[a]["path"]
        m = json.load(open(p))
        m["deezerId"] = did
        m.setdefault("sourceUrls", [])
        u = f"https://www.deezer.com/artist/{did}"
        if u not in m["sourceUrls"]: m["sourceUrls"].append(u)
        json.dump(m, open(p, "w"), indent=2, ensure_ascii=False)
        open(p, "a").write("\n")
print("\nukázka:", dict(list(resolved.items())[:10]))
