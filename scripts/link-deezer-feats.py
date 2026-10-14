#!/usr/bin/env python3
"""
FÁZE 1.5 — Napojí feat vazby z Deezer API sběru (.data/deezer-feats-api.json).

Proces:
1. Načte sesbíraná data (deezer_id → featured[] z Deezer contributors role=Featured)
2. Pro každý track najde odpovídající track ENTITU (přes deezer ID v sources)
3. Namapuje feat JMÉNA na existující artist entity (přes normalize + title)
4. Doplní `featuring` do relations.json (idempotentně, bez duplikátů)

Pravidla:
- Zapisují se POUZE jména matchující existující artist entity.
- Nematchnutá jména se reportují (zahraničí / chybí entita) — NEZAPISUJÍ se.
- Ověření: feat musí být v Deezer contributors s rolí Featured (to už data splňují).
- Idempotentní: existující vazba se neduplikuje.

Použití:
  python3 scripts/link-deezer-feats.py            # dry-run
  python3 scripts/link-deezer-feats.py --write    # zápis
"""
import json, os, re, sys, unicodedata
from collections import Counter, defaultdict

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
ENT = os.path.join(ROOT, "content", "entities")
DATA = os.path.join(ROOT, ".data", "deezer-feats-api.json")
WRITE = "--write" in sys.argv

def norm(s):
    s = unicodedata.normalize("NFD", str(s or "")).encode("ascii", "ignore").decode().lower()
    return re.sub(r"[^a-z0-9]+", " ", s).strip()

def slugify(s):
    s = unicodedata.normalize("NFD", str(s or "")).encode("ascii", "ignore").decode()
    return re.sub(r"[^a-z0-9]+", "-", s.lower()).strip("-")

# 1) index: artist name (normalized) -> artist id  (+ varianta bez mezer)
artists_by_name = {}
artists_by_compact = {}   # bez mezer (pro "P T K" -> "PTK")
artists_by_slug = {}
for d in os.listdir(ENT):
    if not d.startswith("artist_"):
        continue
    mp = os.path.join(ENT, d, "meta.json")
    if not os.path.isfile(mp):
        continue
    try:
        m = json.load(open(mp))
    except Exception:
        continue
    t = m.get("title", "")
    sl = m.get("slug", "")
    if t:
        artists_by_name[norm(t)] = d
        artists_by_compact[norm(t).replace(" ", "")] = d
    if sl:
        artists_by_slug[sl] = d

def find_artist(fname):
    """Najdi artistu: přesná shoda -> bez mezer (jen krátká jména <=6 znaků)."""
    n = norm(fname)
    if n in artists_by_name:
        return artists_by_name[n]
    comp = n.replace(" ", "")
    # bez mezer jen pro krátká jména (PTK, MC Gey apod.), aby se nepletly náhodné
    if len(comp) <= 6 and comp in artists_by_compact:
        # ověř, že jde o stejné "slovo" (ne náhodná kolize)
        return artists_by_compact[comp]
    return None

print(f"artist entit: {len(artists_by_name)} (index podle jména)")

# 2) index: deezer track id -> track entity id
tracks_by_deezer = {}
for d in os.listdir(ENT):
    if not d.startswith("track_"):
        continue
    rp = os.path.join(ENT, d, "relations.json")
    if not os.path.isfile(rp):
        continue
    try:
        r = json.load(open(rp))
    except Exception:
        continue
    # deezer id je v meta.json extraMeta.sources
    mp = os.path.join(ENT, d, "meta.json")
    if not os.path.isfile(mp):
        continue
    try:
        m = json.load(open(mp))
    except Exception:
        continue
    for s in (m.get("extraMeta") or {}).get("sources") or []:
        mm = re.search(r"deezer\.com/track/(\d+)", s)
        if mm:
            tracks_by_deezer[mm.group(1)] = d

print(f"track entit s Deezer ID: {len(tracks_by_deezer)}")

# 3) načti sesbíraná data
if not os.path.isfile(DATA):
    print("❌ chybí .data/deezer-feats-api.json")
    sys.exit(1)
data = json.load(open(DATA))
print(f"Deezer sběr: {data['total']} tracků")

# 4) napojování
linked = 0            # nových vazeb
already = 0           # už existovalo
no_track = 0          # track entita nenalezena
unmatched = Counter() # nematchnutá feat jména
tracks_touched = set()

for rec in data["tracks"]:
    feats = rec.get("featured") or []
    if not feats:
        continue
    did = rec["deezer_id"]
    tent = tracks_by_deezer.get(did)
    if not tent:
        no_track += 1
        continue
    rp = os.path.join(ENT, tent, "relations.json")
    if not os.path.isfile(rp):
        continue
    r = json.load(open(rp))
    cur = set(r.get("featuring") or [])
    added = []
    for fname in feats:
        aid = find_artist(fname)
        if not aid:
            unmatched[fname] += 1
            continue
        if aid in cur:
            already += 1
            continue
        cur.add(aid)
        added.append(aid)
    if added:
        r["featuring"] = sorted(cur)
        linked += len(added)
        tracks_touched.add(tent)
        if WRITE:
            json.dump(r, open(rp, "w"), indent=2, ensure_ascii=False)
            open(rp, "a").write("\n")

print(f"\n{'ZAPSÁNO' if WRITE else 'DRY-RUN'}:")
print(f"  nových feat vazeb: {linked}")
print(f"  tracků dotčeno: {len(tracks_touched)}")
print(f"  už existovalo: {already}")
print(f"  track entita nenalezena: {no_track}")
print(f"  nematchnutých feat jmen: {sum(unmatched.values())} ({len(unmatched)} unikátních)")
print("\n  Top nematchnutých:")
for n, c in unmatched.most_common(20):
    print(f"    {n:30} {c}")
