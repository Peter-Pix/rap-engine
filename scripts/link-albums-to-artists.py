#!/usr/bin/env python3
"""Link albums to artists — SAFE verze (2026-10-12).

⚠️ HISTORIE: Předchozí verze párovála alba podle TEXTU V POPISU s `break`
na prvním matchi → masivní kontaminace (album přiřazeno hostovi/producentovi
zmíněnému v popisu). Audit 12.10.2026 našel 40+ zkomolených alb.

✅ LOGIKA (bezpečná):
  Autorita = TRACK-level primaryArtist. Album patří artistovi, který je
  `primaryArtist` u VĚTŠINY tracků alba. Feat host (jen v `featuring`) NE.
  Fallback: prefix track ID (`track_<slug>-...`) — majority prefix.
  NIKDY nepárovat podle volného textu v description.

Použití:
  python3 scripts/link-albums-to-artists.py          # DRY RUN
  DRY=0 python3 scripts/link-albums-to-artists.py     # zapíše
"""
import json, os
from collections import Counter

BASE = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
ENT = os.path.join(BASE, "content", "entities")
CACHE = os.path.join(BASE, ".content-cache")
DRY = os.environ.get("DRY", "1") != "0"


def load(p):
    try:
        with open(p, encoding="utf-8") as f:
            return json.load(f)
    except Exception:
        return None


def main():
    data = load(os.path.join(CACHE, "entities.json")) or {}
    artists = {k: v for k, v in data.items() if v.get("type") == "artist"}
    slug2artist = {a.get("slug", ""): aid for aid, a in artists.items()}

    links = {}  # album_id -> set(artist_id)
    unlinked = []
    for eid, e in data.items():
        if e.get("type") != "album":
            continue
        ap = os.path.join(ENT, eid)
        rel = load(os.path.join(ap, "relations.json")) or {}
        tracks = rel.get("tracks") or []
        prim = Counter()
        for t in tracks:
            tr = load(os.path.join(ENT, t, "relations.json"))
            if not tr:
                continue
            for a in tr.get("primaryArtist") or []:
                if a in artists:
                    prim[a] += 1
        if prim:
            # majority primaryArtist (track patří albu, album patří jim)
            top = prim.most_common(1)[0][1]
            links[eid] = {a for a, c in prim.items() if c == top}
            continue
        # fallback: prefix track ID
        pref = Counter()
        for t in tracks:
            pref[t.replace("track_", "").split("-")[0]] += 1
        hit = {slug2artist[p] for p in pref if p in slug2artist}
        if hit:
            links[eid] = hit
        else:
            unlinked.append((eid, e.get("title", "?")))

    total_alb = sum(1 for x in data.values() if x.get("type") == "album")
    print(f"Spárováno: {len(links)} / {total_alb} alb | bez vazby: {len(unlinked)}")

    changed = 0
    for album, aids in sorted(links.items()):
        for aid in aids:
            p = os.path.join(ENT, aid, "relations.json")
            relp = load(p)
            if not relp:
                continue
            cur = set(relp.get("albums") or [])
            if album not in cur:
                changed += 1
                print(f"  {'[DRY] ' if DRY else ''}{artists[aid].get('title'):24} + {data.get(album,{}).get('title','?')}")
                if not DRY:
                    relp["albums"] = sorted(cur | {album})
                    with open(p, "w", encoding="utf-8") as f:
                        json.dump(relp, f, ensure_ascii=False, indent=2)
                        f.write("\n")
    print(f"\n{'DRY RUN' if DRY else 'Zapsáno'}: {changed} nových vazeb")


if __name__ == "__main__":
    main()
