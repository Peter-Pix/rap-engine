#!/usr/bin/env python3
"""
Fáze 0.3 — Producenti: odstranit falešné "sám sobě" kredity u běžných rapperů.

Audit zjištění:
- PRODUCED_BY má 495 hran, z toho 449 míří na `artist_*` entity (ne producer_*).
- 293 z nich = "artista produkuje VLASTNÍ track" (tautologie).
- Z toho 280 jsou SKUTEČNÍ producenti (DJ Wich, Decky, Dj Fatte, Mike Trafik…),
  kteří rapují na vlastních beatech = legitimní producentský kredit.
- 13 je u BĚŽNÝCH rapperů (7krát3, Calin, James Cole, Marpo, Protiva) =
  FALEŠNÝ kredit — Deezer uvádí jen 'Main' (interpret), žádný producer.
  Vznikl chybným importem (rap-monitor/discogs 'producer' field).

Pravidlo: odstranit PRODUCED_BY → artist, kde:
  (a) artist == primaryArtist tracku (produkuje sám sobě)
  (b) artist NENÍ v seznamu známých producentů-artistů

Známí producenti-artisti (rapují + produkují): DJ Wich, Decky, Dj Fatte,
Mike Trafik, Vae Cortez, Radimo, Special Beatz, Enthic, Dtonate, D.Kop,
Konex, Leryk, Byzo, Huclberry, Vercetti CG.

Použití:
  python3 scripts/fix-produced-by.py            # dry-run
  python3 scripts/fix-produced-by.py --write    # zápis
"""
import json, os, sys
ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
ENT = os.path.join(ROOT, "content", "entities")
WRITE = "--write" in sys.argv

REAL_PRODUCER_ARTISTS = {
    "artist_dj-wich", "artist_decky", "artist_dj-fatte", "artist_mike-trafik",
    "artist_vae-cortez", "artist_radimo", "artist_special-beatz", "artist_enthic",
    "artist_dtonate", "artist_d-kop", "artist_konex", "artist_leryk",
    "artist_byzo", "artist_huclberry", "artist_vercetti-cg",
}

def title_of(eid):
    mp = os.path.join(ENT, eid, "meta.json")
    if os.path.isfile(mp):
        return json.load(open(mp)).get("title", eid)
    return eid

g = json.load(open(os.path.join(ROOT, ".content-cache", "graph.json")))
prod = [e for e in g if e["relation"] == "PRODUCED_BY" and e["to"].startswith("artist_")]

removed = 0
kept_real = 0
kept_other = 0
details = []

for e in prod:
    t = e["from"]
    rp = os.path.join(ENT, t, "relations.json")
    if not os.path.isfile(rp): continue
    r = json.load(open(rp))
    primary = r.get("primaryArtist") or []
    producers = r.get("producers") or []

    is_self = e["to"] in primary
    is_real = e["to"] in REAL_PRODUCER_ARTISTS

    if is_self and not is_real:
        # odstranit z producers
        if e["to"] in producers:
            details.append((title_of(t), title_of(e["to"])))
            removed += 1
            if WRITE:
                r["producers"] = [p for p in producers if p != e["to"]]
                json.dump(r, open(rp, "w"), indent=2, ensure_ascii=False)
                open(rp, "a").write("\n")
    elif is_self and is_real:
        kept_real += 1
    else:
        kept_other += 1

print(f"{'ZAPSÁNO' if WRITE else 'DRY-RUN'}:")
print(f"  odstraněno (falešný 'sám sobě' kredit): {removed}")
print(f"  ponecháno (skutečný producent, sám sobě): {kept_real}")
print(f"  ponecháno (produkuje jinému): {kept_other}")
if not WRITE:
    for t, a in details:
        print(f"    - '{t}' → {a}")
