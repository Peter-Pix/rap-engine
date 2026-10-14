#!/usr/bin/env python3
"""
OVĚŘÍ feat vazby podle Deezer ID (ne podle jména).

Pro každou track entitu s `featuring`:
1. Vezme Deezer track ID ze sources
2. Dotáhne /track/{id} → contributors (name, role, id)
3. Pro každou feat vazbu: najde našeho umělce a jeho deezerId
4. Porovná: host contributor ID == náš umělec deezerId?
   - SHODA → OK
   - NESHODA → označí k odebrání (fake/duplicitní profil)
   - bez našeho ID → neověřitelné (ponechá, jen report)

Výstup: .data/feat-id-verification.json + report

Použití:
  python3 scripts/verify-feat-ids.py            # dry-run (jen report)
  python3 scripts/verify-feat-ids.py --write    # odebere neshodné vazby
"""
import json, os, re, sys, time, unicodedata, urllib.request
from collections import defaultdict
from urllib.error import HTTPError

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
ENT = os.path.join(ROOT, "content", "entities")
OUT = os.path.join(ROOT, ".data", "feat-id-verification.json")
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
            if e.code == 429: time.sleep(5*(att+1)); continue
            return None
        except Exception: time.sleep(2)
    return None

# naši umělci: id -> deezerId
artist_ids = {}
for x in os.listdir(ENT):
    if not x.startswith("artist_"): continue
    try: m = json.load(open(f"{ENT}/{x}/meta.json"))
    except Exception: continue
    artist_ids[x] = str(m.get("deezerId") or "")

# tracky s feat
tracks = []
for x in os.listdir(ENT):
    if not x.startswith("track_"): continue
    rp = f"{ENT}/{x}/relations.json"
    if not os.path.isfile(rp): continue
    try: r = json.load(open(rp))
    except Exception: continue
    feats = r.get("featuring") or []
    if not feats: continue
    mp = f"{ENT}/{x}/meta.json"
    try: m = json.load(open(mp))
    except Exception: continue
    did = None
    for s in ((m.get("extraMeta") or {}).get("sources") or []):
        mm = re.search(r"deezer\.com/track/(\d+)", s)
        if mm: did = mm.group(1); break
    tracks.append((x, r, did, feats))

print(f"tracků s feat: {len(tracks)}")
ok = bad = unknown = 0
bads = []
cache = {}
for i, (x, r, did, feats) in enumerate(tracks, 1):
    if not did:
        unknown += 1
        continue
    if did not in cache:
        cache[did] = api(f"https://api.deezer.com/track/{did}")
        time.sleep(0.18)
    t = cache[did]
    if not t or "error" in t:
        unknown += 1
        continue
    # contributor ID podle normalizovaného jména (Featured i Main)
    contrib = {}
    for c in (t.get("contributors") or []):
        contrib.setdefault(norm(c.get("name")), []).append(str(c.get("id")))
    for a in feats:
        aid = artist_ids.get(a, "")
        aname = norm(json.load(open(f"{ENT}/{a}/meta.json")).get("title", "")) if os.path.isfile(f"{ENT}/{a}/meta.json") else ""
        cids = contrib.get(aname, [])
        if not aid:
            unknown += 1
            continue
        if not cids:
            # contributor jméno nesedí → možná přejmenováno; report
            unknown += 1
            continue
        if aid in cids:
            ok += 1
        else:
            bad += 1
            bads.append({"track": x, "artist": a, "our_id": aid, "contrib_ids": cids,
                         "name": aname, "deezer_track": did})
    if i % 200 == 0: print(f"  {i}/{len(tracks)} — ok:{ok} bad:{bad}", flush=True)

print(f"\n{'ZAPSÁNO' if WRITE else 'DRY-RUN'} — ID verifikace:")
print(f"  OK (ID shoda): {ok}")
print(f"  NESHODA (fake/duplikát): {bad}")
print(f"  neověřitelné: {unknown}")
json.dump({"ok": ok, "bad": bad, "unknown": unknown, "mismatches": bads},
          open(OUT, "w"), ensure_ascii=False, indent=1)
print(f"\nreport: {OUT}")
for b in bads[:20]:
    print(f"  {b['track'][:38]:40} {b['artist']:22} our={b['our_id']:12} contrib={b['contrib_ids']}")

if WRITE and bads:
    removed = 0
    for b in bads:
        rp = f"{ENT}/{b['track']}/relations.json"
        r = json.load(open(rp))
        f = r.get("featuring") or []
        if b["artist"] in f:
            f.remove(b["artist"]); r["featuring"] = f
            json.dump(r, open(rp, "w"), indent=2, ensure_ascii=False)
            open(rp, "a").write("\n")
            removed += 1
    print(f"\nODEBRÁNO {removed} neshodných vazeb")
