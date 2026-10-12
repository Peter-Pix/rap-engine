#!/usr/bin/env python3
"""Najde Wikipedia (CS/SK) stránku interpreta a přidá ji jako biografický zdroj.

Využívá Wikipedia search API. Přidá sourceUrls do meta.json interpreta.
DRY_RUN default (--write pro zápis).
"""
import json, os, sys, re, time, unicodedata, urllib.request, urllib.parse

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
ENT = os.path.join(ROOT, "content", "entities")
WRITE = "--write" in sys.argv
UA = {"User-Agent": "RKGBot/1.0 (petrpiskacek@gmail.com)"}

def norm(s):
    s = unicodedata.normalize("NFKD", s or "").encode("ascii", "ignore").decode().lower()
    return re.sub(r"[^a-z0-9]", "", s)

def wiki_search(lang, q):
    u = (f"https://{lang}.wikipedia.org/w/api.php?action=query&list=search"
         f"&srsearch={urllib.parse.quote(q)}&srlimit=5&format=json&formatversion=2")
    for _ in range(3):
        try:
            d = json.load(urllib.request.urlopen(urllib.request.Request(u, headers=UA), timeout=12))
            return [x["title"] for x in d.get("query", {}).get("search", [])]
        except Exception:
            time.sleep(2)
    return []

def has_wiki_source(meta):
    for v in (meta.get("sourceUrls") or []):
        if isinstance(v, str) and "wikipedia" in v: return True
    return False

cache = json.load(open(os.path.join(ROOT, ".content-cache", "entities.json"), encoding="utf-8"))
artists = [(k, v) for k, v in cache.items() if v.get("type") == "artist"]

found = []
for aid, ent in sorted(artists, key=lambda x: x[1].get("title", "")):
    title = ent.get("title", "")
    if not title: continue
    mp = os.path.join(ENT, aid, "meta.json")
    if not os.path.exists(mp): continue
    meta = json.load(open(mp, encoding="utf-8"))
    if has_wiki_source(meta): continue
    # hledej stránku
    best = None
    for lang in ("cs", "sk"):
        for cand in wiki_search(lang, title):
            cn = norm(cand.split("(")[0].strip())
            tn = norm(title)
            # PŘÍSNÁ shoda: přesně, nebo s disambiguací (rapper/skupina/hudební)
            # Nikdy ne "in" — "Dame" nesmí matchovat "Notre-Dame", "Aless" ne "Alesso".
            ok = False
            if cn == tn:
                ok = True
            else:
                # disambiguation v závorce, která naznačuje hudební osobu
                disamb = norm(cand.lower())
                if disamb.startswith(tn) and any(k in cand.lower() for k in
                        ("rapper", "raper", "hudobn", "hudebn", "skupina", "zpěvák", "spevák",
                         "zpěvačka", "speváčka", "interpret", "dj", "músico", "hudebník")):
                    ok = True
            if ok:
                best = (lang, cand)
                break
        if best: break
        time.sleep(0.3)
    if best:
        lang, cand = best
        url = f"https://{lang}.wikipedia.org/wiki/{urllib.parse.quote(cand.replace(' ', '_'))}"
        found.append({"artist": aid, "title": title, "lang": lang, "page": cand, "url": url})
        print(f"  ✓ {title[:28]:28} | {lang}:{cand[:36]}")
    time.sleep(0.35)

print(f"\nNalezeno: {len(found)} / {len(artists)}")

if WRITE and found:
    n = 0
    for f in found:
        mp = os.path.join(ENT, f["artist"], "meta.json")
        meta = json.load(open(mp, encoding="utf-8"))
        srcs = meta.get("sourceUrls")
        if not isinstance(srcs, list):
            srcs = []
        if f["url"] not in srcs:
            srcs.append(f["url"])
        meta["sourceUrls"] = srcs
        json.dump(meta, open(mp, "w", encoding="utf-8"), ensure_ascii=False, indent=2)
        n += 1
    print(f"Zapsáno: {n}")

json.dump(found, open(os.path.join(ROOT, ".data", "artist-wiki-sources.json"), "w"), ensure_ascii=False, indent=1)
print("Report: .data/artist-wiki-sources.json")
