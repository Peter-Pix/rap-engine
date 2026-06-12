#!/usr/bin/env python3
"""Batch enrich all 15 profile .txt files into rich artist entities."""

import os, re, json, sys

BASE_DIR = os.path.join(os.path.dirname(__file__), "..", "content", "entities")
RAW_DIR  = os.path.join(os.path.dirname(__file__), "..", "raw-data", "taxonomy", "15profilu")

def read_txt(filename):
    return open(os.path.join(RAW_DIR, filename), "r", encoding="utf-8").read()

def read_json(path):
    return json.load(open(path, "r", encoding="utf-8"))

def write_json(path, data):
    with open(path, "w", encoding="utf-8") as f:
        json.dump(data, f, indent=2, ensure_ascii=False)
        f.write("\n")

def find_real_name(text):
    m = re.search(r'vlastn[íi]m jménem\s+\*?\*?([^*\n]+?)\*?\*?\s*[,.]', text)
    if m:
        return m.group(1).strip()
    m = re.search(r'vlastn[íi]m jménem\s+\*?\*?([^*\n]+?)\*?\*?\s*$', text, re.M)
    if m:
        return m.group(1).strip()
    return None

def find_birth_date(text):
    m = re.search(r'narodil se\s+\*?\*?(\d{1,2})\.\s*(\w+)\s+(\d{4})\*?\*?', text)
    if m:
        months = {'ledna':'01','února':'02','března':'03','dubna':'04','května':'05','června':'06','července':'07','srpna':'08','září':'09','října':'10','listopadu':'11','prosince':'12'}
        d, mon, y = m.groups()
        return f"{y}-{months.get(mon, '01')}-{int(d):02d}"
    return None

def find_origin(text):
    m = re.search(r'v\s+\*?\*?([^*\n,]+)\*?\*?\s+a patří', text)
    if m:
        return m.group(1).strip()
    m = re.search(r'z\s+\*?\*?([^*\n,]+?)\*?\*?\s+a', text)
    if m:
        return m.group(1).strip()
    return None

def find_first_section(text, artist_name):
    """Extract first narrative section before ***"""
    parts = text.split("***")
    if parts:
        return parts[0].strip()
    return text[:2000]

def extract_albums(text):
    """Extract albums from '## Klíčová alba' or similar sections."""
    albums = []
    # Match patterns like **Album (YYYY)** or * **Album (YYYY)**
    for m in re.finditer(r'\*\*([^*\(]+)\s*\((\d{4})[^)]*\)\*\*', text):
        title, year = m.group(1).strip(), int(m.group(2))
        albums.append((title, year))
    return albums

def slugify(title):
    return re.sub(r'[^a-z0-9]+', '-', title.lower().replace("č","c").replace("š","s").replace("ž","z").replace("ř","r").replace("ď","d").replace("ť","t").replace("ň","n").replace("é","e").replace("í","i").replace("á","a").replace("ú","u").replace("ů","u").replace("ó","o").replace("ě","e")).strip("-")

def create_stub_album(al_id, title, year, artist_id):
    d = os.path.join(BASE_DIR, al_id)
    if not os.path.exists(d):
        os.makedirs(d)
        meta = {"id": al_id, "type": "album", "title": title, "slug": slugify(title), "description": f"Album {title} ({year}).", "year": year, "publishedAt": "2024-01-01"}
        write_json(os.path.join(d, "meta.json"), meta)
        open(os.path.join(d, "entity.mdx"), "w", encoding="utf-8").write(f"---\nid: {al_id}\ntype: album\ntitle: {title}\n---\n\nAlbum {title} ({year}).\n")
        write_json(os.path.join(d, "relations.json"), {"artists": [artist_id]})
        print(f"  Created album: {al_id}")
    else:
        # Just add artist relation
        rel = read_json(os.path.join(d, "relations.json"))
        rel.setdefault("artists", [])
        if artist_id not in rel["artists"]:
            rel["artists"].append(artist_id)
            write_json(os.path.join(d, "relations.json"), rel)

# List of profiles to process
FILES = [
    "Separ.txt", "Marpo.txt", "Orion.txt", "Ben Cristovao.txt", "Gleb.txt",
    "PTK.txt", "Pil C.txt", "Fobia Kid.txt", "Fvck_kvlt.txt", "Hellwana.txt",
    "Mike Trafik.txt", "Arleta.txt", "Vercetti CG.txt", "Ego.txt", "Rytmus.txt"
]

# Map filename → artist_id
ID_MAP = {
    "Separ.txt": "artist_separ",
    "Marpo.txt": "artist_marpo",
    "Orion.txt": "artist_orion",
    "Ben Cristovao.txt": "artist_ben-cristovao",
    "Gleb.txt": "artist_gleb",
    "PTK.txt": "artist_ptk",
    "Pil C.txt": "artist_pil-c",
    "Fobia Kid.txt": "artist_fobia-kid",
    "Fvck_kvlt.txt": "artist_fvck-kvlt",
    "Hellwana.txt": "artist_hellwana",
    "Mike Trafik.txt": "artist_mike-trafik",
    "Arleta.txt": "artist_arleta",
    "Vercetti CG.txt": "artist_vercetti-cg",
    "Ego.txt": "artist_ego",
    "Rytmus.txt": "artist_rytmus",
}

for fname in FILES:
    artist_id = ID_MAP[fname]
    entity_dir = os.path.join(BASE_DIR, artist_id)
    if not os.path.exists(entity_dir):
        print(f"SKIP (no entity): {fname}")
        continue
    
    text = read_txt(fname)
    
    meta = read_json(os.path.join(entity_dir, "meta.json"))
    rel  = read_json(os.path.join(entity_dir, "relations.json"))
    
    # Extract metadata
    rn = find_real_name(text)
    bd = find_birth_date(text)
    og = find_origin(text)
    
    if rn: meta["realName"] = rn
    if bd: meta["birthDate"] = bd
    if og: meta["origin"] = og
    if "occupation" not in meta: meta["occupation"] = ["rapper"]
    if "publishedAt" not in meta: meta["publishedAt"] = "2024-01-01"
    
    # Rich body: first narrative section + "V kostce" bullet points
    first = find_first_section(text, meta["title"])
    # Clean markdown links [text](url)
    first = re.sub(r'\[([^\]]+)\]\([^)]+\)', r'\1', first)
    # Clean **bold**
    first = re.sub(r'\*\*([^*]+)\*\*', r'\1', first)
    # Limit length
    if len(first) > 4000:
        first = first[:4000] + "\n\n..."
    
    # Write entity.mdx
    mdx = f"---\n"
    mdx += f"id: {artist_id}\n"
    mdx += f"type: artist\n"
    mdx += f"title: {meta['title']}\n"
    if rn: mdx += f"realName: {rn}\n"
    if og: mdx += f"origin: {og}\n"
    if bd: mdx += f"birthDate: {bd}\n"
    mdx += f"---\n\n{first}\n"
    
    with open(os.path.join(entity_dir, "entity.mdx"), "w", encoding="utf-8") as f:
        f.write(mdx)
    
    # Extract and create albums
    albums = extract_albums(text)
    album_ids = []
    for title, year in albums:
        al_id = f"album_{slugify(title)}"
        create_stub_album(al_id, title, year, artist_id)
        album_ids.append(al_id)
    
    if album_ids:
        rel["albums"] = album_ids
    
    # Set default relations if missing
    rel.setdefault("genres", [])
    if not rel["genres"]: rel["genres"] = ["genre_hip-hop", "genre_rap"]
    
    write_json(os.path.join(entity_dir, "meta.json"), meta)
    write_json(os.path.join(entity_dir, "relations.json"), rel)
    
    print(f"DONE: {fname} → {artist_id} (albums: {len(album_ids)}, body: {len(first)} chars)")

print("\nAll 15 profiles enriched!")
