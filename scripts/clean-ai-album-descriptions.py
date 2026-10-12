#!/usr/bin/env python3
"""Fáze 0.4 — vyčistit AI-halucinované popisy alb.

Detekuje šablonovitý AI popis typu:
  "X v roce Y vydal (své Nté) album Z. Obsahuje celkem K skladeb,
   což je o M skladeb více/méně... Kombinuje A a B. Deska ..."

Přepíše na neutrální fakt:
  "Album {interpreta} z roku {Y}."  (rok je strukturovaný údaj, vždy pravdivý)

DRY_RUN default (--write pro zápis).
"""
import json, os, sys, re

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
ENT = os.path.join(ROOT, "content", "entities")
WRITE = "--write" in sys.argv

# vzor: "X v roce YYYY vydal" + "obsahuje celkem N skladeb" + (nepovinné "kombinuje")
re_template = re.compile(r"v roce \d{4} vydal", re.I)
re_count = re.compile(r"obsahuje (?:celkem )?\d+ sklad", re.I)

cache = json.load(open(os.path.join(ROOT, ".content-cache", "entities.json"), encoding="utf-8"))

def neutral_desc(artist_title, year):
    if year:
        return f"Album {artist_title} z roku {year}."
    return f"Album {artist_title}."

rewrites = []
for aid, ent in cache.items():
    if ent.get("type") != "album":
        continue
    d = ent.get("description") or ""
    if not d:
        continue
    # musí mít oba znaky AI šablony: "v roce X vydal" A "obsahuje N skladeb"
    if not (re_template.search(d) and re_count.search(d)):
        continue
    mp = os.path.join(ENT, aid, "meta.json")
    if not os.path.exists(mp):
        continue
    m = json.load(open(mp, encoding="utf-8"))
    year = m.get("year") or ent.get("extraMeta", {}).get("year")
    # najdi interpreta (primaryArtist z relations)
    rel = json.load(open(os.path.join(ENT, aid, "relations.json"), encoding="utf-8"))
    artists = rel.get("artists") or []
    artist_titles = [cache[a]["title"] for a in artists if a in cache and cache[a].get("type") == "artist"]
    if not artist_titles:
        # fallback: zkus z description "X v roce..."
        mm = re.match(r"^([A-ZÁ-Ž][a-zá-ž]+(?: [A-ZÁ-Ž][a-zá-ž]+)?)", d)
        artist_title = mm.group(1) if mm else "interpreta"
    else:
        artist_title = artist_titles[0]
    newd = neutral_desc(artist_title, year)
    rewrites.append({
        "album": aid,
        "title": ent.get("title"),
        "artist": artist_title,
        "year": year,
        "old": d,
        "new": newd,
    })

print(f"Detekováno AI šablon: {len(rewrites)}")
print(f"Mode: {'WRITE' if WRITE else 'DRY RUN'}\n")
for r in rewrites[:25]:
    print(f"  {r['title'][:26]:26} | {r['artist'][:16]:16} | {r['year']}")
    print(f"      → {r['new']}")

json.dump(rewrites, open(os.path.join(ROOT, ".data", "album-ai-desc-rewrites.json"), "w"), ensure_ascii=False, indent=1)

if WRITE:
    n = 0
    for r in rewrites:
        mp = os.path.join(ENT, r["album"], "meta.json")
        m = json.load(open(mp, encoding="utf-8"))
        m["description"] = r["new"]
        json.dump(m, open(mp, "w", encoding="utf-8"), ensure_ascii=False, indent=2)
        n += 1
    print(f"\nZapsáno: {n}")
print("\nReport: .data/album-ai-desc-rewrites.json")
