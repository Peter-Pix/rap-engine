#!/usr/bin/env python3
"""
Fix relations for confirmed CZ/SK artists + delete AI hallucination stubs.
"""

import json, os, shutil

BASE = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
ENTITIES = os.path.join(BASE, 'content', 'entities')
DEPRECATED = os.path.join(BASE, 'content', 'entities', '_deprecated_artists')
os.makedirs(DEPRECATED, exist_ok=True)

def load_json(path):
    with open(path) as f:
        return json.load(f)

def save_json(path, data):
    with open(path, 'w') as f:
        json.dump(data, f, indent=2, ensure_ascii=False)
        f.write('\n')

# === 1. Fix relations for confirmed artists ===

# Haha Crew - Slovak rap group
haha_rels = {
    "albums": [],
    "artists": [],
    "genres": ["genre_rap", "genre_trap"],
    "influencedBy": [],
    "labels": [],
    "locations": ["location_slovensko"],
    "moods": [],
    "partOf": [],
    "related": [],
    "scenes": ["scene_slovenska-rapova-scena"],
    "styles": ["style_trap"],
    "themes": [],
    "tracks": []
}
save_json(os.path.join(ENTITIES, 'artist_haha-crew', 'relations.json'), haha_rels)
print("✅ Haha Crew: relations added (genre_rap, genre_trap, location_slovensko, scene_slovenska-rapova-scena)")

# Matej Straka - Slovak rapper
matej_rels = {
    "albums": [],
    "artists": [],
    "genres": ["genre_rap", "genre_trap"],
    "influencedBy": [],
    "labels": [],
    "locations": ["location_slovensko"],
    "moods": [],
    "partOf": [],
    "related": [],
    "scenes": ["scene_slovenska-rapova-scena"],
    "styles": ["style_trap"],
    "themes": [],
    "tracks": []
}
save_json(os.path.join(ENTITIES, 'artist_matej-straka', 'relations.json'), matej_rels)
print("✅ Matej Straka: relations added")

# TKX - Slovak rapper
tkx_rels = {
    "albums": [],
    "artists": [],
    "genres": ["genre_rap", "genre_trap"],
    "influencedBy": [],
    "labels": [],
    "locations": ["location_slovensko"],
    "moods": [],
    "partOf": [],
    "related": [],
    "scenes": ["scene_slovenska-rapova-scena"],
    "styles": ["style_trap"],
    "themes": [],
    "tracks": []
}
save_json(os.path.join(ENTITIES, 'artist_tkx', 'relations.json'), tkx_rels)
print("✅ TKX: relations added")

# === 2. Delete AI hallucination stubs ===
# These are artists that:
# - Have no real data (empty meta.json, no relations)
# - Are not referenced anywhere
# - Deezer/Discogs search shows they're either non-existent or not CZ/SK rap

to_delete = [
    'artist_66domo',
    'artist_anki',
    'artist_apollo27',
    'artist_arny',
    'artist_badboy-berlin',  # unclear, probably not CZ/SK
    'artist_cigo',
    'artist_cyper-sound',
    'artist_danny-marr',
    'artist_dj-kadr',
    'artist_dolin',
    'artist_ekoo',
    'artist_fill',
    'artist_fillipian',
    'artist_gipsy',  # Gipsy & Queen - not CZ/SK rap
    'artist_hajtkovic',
    'artist_humla',
    'artist_jay-am',
    'artist_lenny',
    'artist_loudz-one',
    'artist_lucas-blakk',
    'artist_meiton',
    'artist_meizmen',  # duplicate of mejzyy/meizyy
    'artist_mikolaj-trybulec',
    'artist_moma',
    'artist_ota-petrina',
    'artist_pam-rabbit',  # Czech singer, not rapper
    'artist_robert-burian',  # Slovak EDM producer, not rap
    'artist_rook',
    'artist_seinys',
    'artist_smolki',
    'artist_tante-elze',
    'artist_tomi',
    'artist_under-my-pillow',
    'artist_vavra',
    'artist_vektor',
    'artist_youv-dee',  # French rapper
]

moved = 0
for eid in to_delete:
    src = os.path.join(ENTITIES, eid)
    dst = os.path.join(DEPRECATED, eid)
    if os.path.exists(src):
        shutil.move(src, dst)
        moved += 1
        print(f"🗑️  Moved {eid} to _deprecated_artists/")

print(f"\n{'='*50}")
print(f"Total moved to deprecated: {moved}")
print(f"Remaining zero-edge artists: 39 - {moved} = {39 - moved}")
