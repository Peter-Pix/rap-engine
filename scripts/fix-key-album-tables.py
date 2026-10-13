#!/usr/bin/env python3
"""
Opraví AI popisky v MDX tabulkách "## Klíčová alba" na faktické údaje.

AI popisek = "Moment, kdy se z oblíbeného rappera stala velká hvězda.",
"Vrchol jeho introspektivní éry." apod.
Faktický = rok vydání + počet skladeb z tracks.json (nebo label).

Použití: python3 scripts/fix-key-album-tables.py [--write]
"""
import json, re, sys
from pathlib import Path
ROOT = Path(__file__).resolve().parent.parent
ENT = ROOT/"content/entities"
WRITE = "--write" in sys.argv

AI_DESC = re.compile(
 r"(moment, kdy|vrchol jeho|definitivně dokázal|nebyla náhoda|"
 r"deska, na které|dospělejší|osobní zpověď|zvukový posun|"
 r"nejlépe produkčně|ukázal, že|přechodová věc|kultovní|"
 r"zlomov|průlom|definoval|návrat do hlubin|návrat ke kořenům)", re.I)

def fact_for(album_id):
    """Vrať faktický popis alba: rok + počet skladeb.

    POZOR: meta.json `year` = ORIGINÁLNÍ rok alba (správný).
    tracks.json `release_date` = často datum remasteru/re-release na Deezeru
    (např. H.P.T.N. originál 2009, Deezer verze 2023) — NEPOUŽÍVAT.
    """
    d = ENT/album_id
    meta_f = d/"meta.json"
    if not meta_f.exists(): return None
    m = json.load(open(meta_f))
    year = m.get("year") or (m.get("extraMeta") or {}).get("year")
    n = m.get("trackCount")
    if not n:
        tf = d/"tracks.json"
        if tf.exists():
            try:
                t = json.load(open(tf))
                n = t.get("total_tracks") or len(t.get("tracks") or [])
            except Exception: pass
    bits = []
    if year: bits.append(str(year))
    if n: bits.append(f"{n} skladeb")
    return ", ".join(bits) if bits else None

changed = []
for d in sorted(ENT.iterdir()):
    if not d.name.startswith("artist_"): continue
    f = d/"entity.mdx"
    if not f.exists(): continue
    t = f.read_text()
    m = re.search(r'^##\s+Klíčová alba\s*\n\n?(\|.*?)\n\n', t, re.M|re.S)
    if not m: continue
    table = m.group(1)
    if "](http" in table: continue  # má zdroje, nech
    rel_f = d/"relations.json"
    rel = json.load(open(rel_f)) if rel_f.exists() else {}
    albums = rel.get("albums") or []
    # mapuj název → album_id
    name2id = {}
    for aid in albums:
        am = ENT/aid/"meta.json"
        if am.exists():
            name2id[json.load(open(am)).get("title","").lower().strip()] = aid
    lines = table.split("\n")
    newlines = []
    hit = False
    for ln in lines:
        if not ln.strip().startswith("|") or "---" in ln: 
            newlines.append(ln); continue
        cols = [c.strip() for c in ln.strip("|").split("|")]
        if len(cols) < 3:
            newlines.append(ln); continue
        title, year, desc = cols[0], cols[1], cols[2]
        if not AI_DESC.search(desc):
            newlines.append(ln); continue
        aid = name2id.get(title.lower().strip())
        fact = fact_for(aid) if aid else None
        if not fact:
            # fallback: rok + název bez AI popisu
            fact = year if year and year!="—" else ""
        newlines.append(f"| {title} | {year} | {fact} |")
        hit = True
    if hit:
        newtable = "\n".join(newlines)
        t2 = t[:m.start()] + f"## Klíčová alba\n\n{newtable}\n\n" + t[m.end():]
        changed.append(d.name)
        if WRITE: f.write_text(t2)

print(f"{'ZAPSÁNO' if WRITE else 'DRY-RUN'}: {len(changed)} karet")
for n in changed[:40]: print("  ", n[7:])
