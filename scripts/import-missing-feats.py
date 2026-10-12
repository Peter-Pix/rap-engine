#!/usr/bin/env python3
"""Importuje chybějící feat tracky (ověřené z Deezer API).

Data: ručně ověřené Deezer track ID + ISRC + contributors.
Vytvoří track entity s minimálním stubem (jen ověřená fakta, žádné AI).

Použití:
  python3 scripts/import-missing-feats.py          # DRY
  DRY=0 python3 scripts/import-missing-feats.py     # reálně
"""
import json, os, re, unicodedata

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
ENT = os.path.join(ROOT, "content", "entities")
DRY = os.environ.get("DRY", "1") != "0"

def slugify(s):
    s = unicodedata.normalize("NFD", str(s)).encode("ascii", "ignore").decode()
    return re.sub(r"[^a-z0-9]+", "-", s.lower()).strip("-")

# artist id -> slug
artist_slug = {}
for aid in ["artist_dj-wich","artist_strapo","artist_ektor","artist_koky",
            "artist_nik-tendo","artist_indy"]:
    m = json.load(open(os.path.join(ENT, aid, "meta.json")))
    artist_slug[aid] = m["slug"]

TRACKS = [
    {
        "title": "Choďte šeci Do Piče",
        "artist": "artist_dj-wich",
        "featuring": ["artist_strapo", "artist_ektor"],
        "album": "album_veni-vidi-wich",
        "deezer_id": 138812405,
        "isrc": "TCACU1655396",
        "year": "2020",
    },
    {
        "title": "Zatím Co Vy",
        "artist": "artist_koky",
        "featuring": ["artist_nik-tendo"],
        "album": "album_stat-ve-stinu-dotykat-se-hvezd",
        "deezer_id": 1280021962,
        "isrc": "CZUM72100208",
        "year": "2021",
    },
    {
        "title": "365247",
        "artist": "artist_nik-tendo",
        "featuring": ["artist_koky"],
        "album": None,  # LUNAZAR není v DB
        "deezer_id": 1076868782,
        "isrc": "CZUM72000586",
        "year": "2020",
    },
    {
        "title": "1000 MC's",
        "artist": "artist_dj-wich",
        "featuring": ["artist_indy"],
        "album": "album_veni-vidi-wich",
        "deezer_id": 74455024,
        "isrc": None,
        "year": "2011",
    },
]

created = 0
for t in TRACKS:
    artist = t["artist"]
    a_slug = artist_slug[artist]
    slug = f'{a_slug}-{slugify(t["title"])}'
    tid = f"track_{slug}"
    d = os.path.join(ENT, tid)
    if os.path.exists(d):
        print(f"  skip (existuje): {tid}")
        continue

    meta = {
        "id": tid,
        "type": "track",
        "slug": slug,
        "title": t["title"],
        "description": f"Skladba „{t['title']}“ od {json.load(open(os.path.join(ENT, artist, 'meta.json')))['title']}.",
        "publishedAt": f"{t['year']}-01-01",
        "extraMeta": {
            "isrc": t["isrc"],
            "sources": [f"https://www.deezer.com/track/{t['deezer_id']}"],
            "generatedFrom": "deezer-feat-audit",
            "noindex": True,
            "isStub": True,
        },
    }

    relations = {
        "primaryArtist": [artist],
        "featuring": t["featuring"],
        "belongsToAlbum": [t["album"]] if t["album"] else [],
        "producers": [],
        "labels": [],
        "genres": [],
        "styles": [],
        "themes": [],
        "moods": [],
        "related": [],
    }

    mdx = f"## O čem je\n\nSkladba „{t['title']}“ — spolupráce, u které ověřujeme feat vazby.\n"

    print(f"  {'[DRY] ' if DRY else ''}{tid}: {t['title']} (feat {[artist_slug[f] for f in t['featuring']]})")
    if not DRY:
        os.makedirs(d, exist_ok=True)
        json.dump(meta, open(os.path.join(d, "meta.json"), "w"), ensure_ascii=False, indent=2)
        open(os.path.join(d, "meta.json"), "a").write("\n")
        json.dump(relations, open(os.path.join(d, "relations.json"), "w"), ensure_ascii=False, indent=2)
        open(os.path.join(d, "relations.json"), "a").write("\n")
        open(os.path.join(d, "entity.mdx"), "w").write(mdx)
        created += 1

print(f"\nVytvořeno: {created} tracků · DRY={DRY}")
