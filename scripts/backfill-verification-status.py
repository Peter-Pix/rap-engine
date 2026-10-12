#!/usr/bin/env python3
"""Fáze 0.3 — doplnit status ověření (verification) do meta.json.

Třístupňový status:
  verified    — má ověřený zdroj (sourceUrls) A neprošel kontaminačním auditem
  partial     — měl zdroj, ale ten byl kontaminovaný (smazán) / nebo zdroj pochybný
  unverified  — nemá žádný zdroj

Zdroje pro "partial": .data/album-id-contaminated.json (169 alb z kontaminačního auditu).

DRY_RUN default (--write pro zápis).
"""
import json, os, sys

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
ENT = os.path.join(ROOT, "content", "entities")
WRITE = "--write" in sys.argv

def has_source(em):
    if not em: return False
    for k in ("sourceUrls", "sourceUrl", "sources"):
        v = em.get(k)
        if not v: continue
        if isinstance(v, str): return v.startswith("http")
        if isinstance(v, list): return any(isinstance(x, str) and x.startswith("http") for x in v)
        if isinstance(v, dict): return any(isinstance(x, str) and x.startswith("http") for x in v.values())
    return False

cache = json.load(open(os.path.join(ROOT, ".content-cache", "entities.json"), encoding="utf-8"))
# kontaminovaná alba (slugs → entity id)
contaminated_slugs = set(json.load(open(os.path.join(ROOT, ".data", "album-id-contaminated.json"))))
slug_to_id = {}
for aid, x in cache.items():
    if x.get("type") == "album":
        slug_to_id[x.get("slug", "")] = aid

changes = []
for aid, x in cache.items():
    t = x.get("type")
    # taxonomie (genre/label/location/mood/theme/style/scene) — status se neuvádí
    if t in ("genre", "label", "location", "mood", "theme", "style", "scene"):
        continue
    em = x.get("extraMeta") or {}
    has_src = has_source(em)
    # partial: album z kontaminačního seznamu
    is_contaminated = (t == "album" and aid in {slug_to_id.get(s) for s in contaminated_slugs if s in slug_to_id})
    if t == "album" and not is_contaminated:
        # album, které mělo deezerId ale smazán → poznáme podle importu? zjednodušíme: jen explicitní seznam
        pass
    status = "verified" if has_src else "unverified"
    if is_contaminated:
        status = "partial"
    # zapiš jen pokud se mění / chybí
    mp = os.path.join(ENT, aid, "meta.json")
    if not os.path.exists(mp):
        continue
    m = json.load(open(mp, encoding="utf-8"))
    if m.get("verification") == status:
        continue
    changes.append({"id": aid, "type": t, "title": x.get("title"), "verification": status})

print(f"Změn: {len(changes)}")
from collections import Counter
c = Counter((ch["type"], ch["verification"]) for ch in changes)
for k, v in sorted(c.items()):
    print(f"  {k[0]:10} {k[1]:12} {v}")

json.dump(changes, open(os.path.join(ROOT, ".data", "verification-changes.json"), "w"), ensure_ascii=False, indent=1)

if WRITE:
    n = 0
    for ch in changes:
        mp = os.path.join(ENT, ch["id"], "meta.json")
        m = json.load(open(mp, encoding="utf-8"))
        m["verification"] = ch["verification"]
        json.dump(m, open(mp, "w", encoding="utf-8"), ensure_ascii=False, indent=2)
        n += 1
    print(f"\nZapsáno: {n}")
