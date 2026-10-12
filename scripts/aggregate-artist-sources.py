#!/usr/bin/env python3
"""Agreguje zdroje (sourceUrls/sourceUrl) z alb + tracků na interpreta.

Zdroje v meta.json mají 3 nekonzistentní formáty:
  1. sourceUrls: ["https://..."]            (Discogs import)
  2. sourceUrls: {"deezer": "https://..."}   (Deezer import)
  3. extraMeta.sourceUrl: "https://..."      (Wikipedia import)

Tenhle skript je sjednotí na artist.level jako sourceUrls: ["https://..."].

DRY_RUN default — nic nezapisuje, jen reportuje.
"""
import json, os, sys, re
from collections import defaultdict

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
ENT = os.path.join(ROOT, "content", "entities")
DRY = "--write" not in sys.argv

def extract_sources(meta: dict) -> list[str]:
    """Vytáhne všechny zdroje z meta.json v libovolném formátu."""
    out = []
    def add(u):
        if u and isinstance(u, str) and u.startswith("http"):
            if u not in out:
                out.append(u)
    su = meta.get("sourceUrls")
    if isinstance(su, list):
        for x in su: add(x)
    elif isinstance(su, dict):
        for x in su.values(): add(x)
    elif isinstance(su, str):
        add(su)
    em = meta.get("extraMeta") or {}
    for k in ("sourceUrl", "sources"):
        v = em.get(k)
        if isinstance(v, list):
            for x in v: add(x)
        elif isinstance(v, str):
            add(v)
        elif isinstance(v, dict):
            for x in v.values(): add(x)
    if meta.get("sourceUrl"):
        add(meta["sourceUrl"])
    return out

# načti entity cache pro artist→album/track vazby
cache = json.load(open(os.path.join(ROOT, ".content-cache", "entities.json"), encoding="utf-8"))

report = []
for aid, ent in cache.items():
    if ent.get("type") != "artist":
        continue
    sources = set()
    by_kind = defaultdict(set)
    # z vlastních alb + tracků
    for rel_key in ("HAS_ALBUM", "HAS_TRACK"):
        for tid in (ent.get("outbound") or {}).get(rel_key, []):
            if tid not in cache:
                continue
            mp = os.path.join(ENT, tid, "meta.json")
            if not os.path.exists(mp):
                continue
            m = json.load(open(mp, encoding="utf-8"))
            for u in extract_sources(m):
                sources.add(u)
                # klasifikace zdroje
                if "discogs" in u: by_kind["discogs"].add(u)
                elif "deezer" in u: by_kind["deezer"].add(u)
                elif "wikipedia" in u: by_kind["wikipedia"].add(u)
                elif "musicbrainz" in u: by_kind["musicbrainz"].add(u)
                else: by_kind["other"].add(u)
    # vlastní meta.json zdroje
    own = os.path.join(ENT, aid, "meta.json")
    if os.path.exists(own):
        m = json.load(open(own, encoding="utf-8"))
        for u in extract_sources(m):
            sources.add(u)
    if sources:
        report.append({
            "artist": aid,
            "title": ent.get("title"),
            "count": len(sources),
            "kinds": {k: len(v) for k, v in by_kind.items()},
            "sources": sorted(sources),
        })

report.sort(key=lambda x: -x["count"])
print(f"Interpretů se zdroji: {len(report)} / {sum(1 for v in cache.values() if v.get('type')=='artist')}")
print(f"Mode: {'DRY RUN' if DRY else 'WRITE'}\n")
for r in report[:40]:
    print(f"  {r['title'][:24]:24} | {r['count']:2} zdrojů | {r['kinds']}")

json.dump(report, open(os.path.join(ROOT, ".data", "artist-sources-report.json"), "w"), ensure_ascii=False, indent=1)
print(f"\nReport uložen: .data/artist-sources-report.json")
