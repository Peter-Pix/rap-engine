#!/usr/bin/env python3
"""
Ověří a opraví rok vydání alb (meta.json 'year' + 'publishedAt').

ZDROJE (cross-check, ber jen shodu):
  1) Deezer  /album/{deezerId}  -> release_date  (live API)
  2) MusicBrainz release-group  -> first-release-date
  3) Wikipedie článek umělce    -> "Roku YYYY ... <album>"

POZOR na past: Deezer release_date může být datum REMASTERU/re-release
(např. H.P.T.N. originál 2009, Deezer 2023). Proto:
  - pokud se zdroje rozejdou o >1 rok -> NEMĚNIT, jen reportovat
  - pokud se shodují -> opravit meta.year + publishedAt

Použití:
  python3 scripts/verify-album-years.py            # audit (dry-run)
  python3 scripts/verify-album-years.py --write    # zapsat opravy
"""
import json, os, re, sys, time, urllib.request, urllib.parse

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
ENT = os.path.join(ROOT, "content", "entities")
WRITE = "--write" in sys.argv
UA = {"User-Agent": "4rap-research/1.0 (ppix50@gmail.com)"}

def api(url, ua=None):
    for attempt in range(3):
        try:
            req = urllib.request.Request(url, headers=ua or {"User-Agent": "RKG/1.0"})
            with urllib.request.urlopen(req, timeout=15) as r:
                return json.load(r)
        except Exception as e:
            if attempt == 2: return None
            time.sleep(2 + attempt * 3)

def deezer_year(dz_id):
    d = api(f"https://api.deezer.com/album/{dz_id}")
    if not d or d.get("error"): return None
    rd = d.get("release_date") or ""
    m = re.match(r"(\d{4})", rd)
    return int(m.group(1)) if m else None

def mb_year(artist, album):
    q = urllib.parse.quote(f'artist:"{artist}" AND release:"{album}"')
    d = api(f"https://musicbrainz.org/ws/2/release-group?query={q}&fmt=json", UA)
    time.sleep(1.1)
    if not d: return None
    for rg in d.get("release-groups", []):
        t = (rg.get("title") or "").lower()
        a = (rg.get("artist-credit") or [{}])[0].get("name", "").lower()
        # striktní shoda
        if album.lower()[:12] in t and artist.lower()[:8] in a:
            frd = rg.get("first-release-date") or ""
            m = re.match(r"(\d{4})", frd)
            if m: return int(m.group(1))
    return None

def wiki_years(artist):
    """Vrať dict {rok: [text...]} z článku umělce na cs/sk wikipedii."""
    out = {}
    for lang in ("cs", "sk"):
        url = (f"https://{lang}.wikipedia.org/w/api.php?action=query&prop=extracts"
               f"&explaintext&redirects=1&titles={urllib.parse.quote(artist)}&format=json")
        d = api(url)
        if not d: continue
        for p in d.get("query", {}).get("pages", {}).values():
            t = p.get("extract") or ""
            for m in re.finditer(r"(20[0-2]\d|19[89]\d)", t):
                out.setdefault(int(m.group(1)), []).append(t[max(0,m.start()-80):m.start()+80])
            if out: break
    return out

def main():
    rows = []
    for d in sorted(os.listdir(ENT)):
        if not d.startswith("album_"): continue
        mp = os.path.join(ENT, d, "meta.json")
        if not os.path.isfile(mp): continue
        meta = json.load(open(mp))
        cur = meta.get("year")
        tp = os.path.join(ENT, d, "tracks.json")
        dz = None
        if os.path.isfile(tp):
            try:
                t = json.load(open(tp))
                dz = t.get("source_id") if t.get("source") == "deezer" else None
                # fallback: deezerId v meta
            except Exception: pass
        dz = dz or meta.get("deezerId")
        if not cur or not dz: continue
        dy = deezer_year(dz)
        time.sleep(0.35)
        if dy is None or abs(int(cur) - dy) <= 1: continue
        rows.append({"id": d, "title": meta.get("title"), "cur": int(cur),
                     "deezer": dy, "dz_id": dz,
                     "artists": (json.load(open(os.path.join(ENT,d,"relations.json"))).get("artists")
                                 if os.path.isfile(os.path.join(ENT,d,"relations.json")) else [])})

    print(f"Kandidátů na opravu (>1 rok rozdíl Deezer vs meta): {len(rows)}\n")
    cache = {}
    results = []
    for r in rows:
        # MB jen kde je znám umělec
        aname = None
        for a in (r["artists"] or [])[:1]:
            amp = os.path.join(ENT, a, "meta.json")
            if os.path.isfile(amp): aname = json.load(open(amp)).get("title")
        mby = mb_year(aname, r["title"]) if aname else None
        # wiki
        wy = None
        if aname:
            if aname not in cache: cache[aname] = wiki_years(aname)
            yrs = cache[aname]
            # hledej album v okolí roku z Deezeru nebo ±3
            cand = [y for y in yrs if abs(y - r["deezer"]) <= 2]
            if cand: wy = min(cand, key=lambda y: abs(y - r["deezer"]))
        r["mb"] = mby; r["wiki"] = wy
        conf = "?"
        if mby and abs(mby - r["deezer"]) <= 1: conf = "VYSOKÁ (DZ+MB)"
        elif wy and abs(wy - r["deezer"]) <= 1: conf = "STŘEDNÍ (DZ+wiki)"
        elif wy and abs(wy - r["cur"]) <= 1: conf = "POZOR (wiki=meta)"
        else: conf = "NÍZKÁ"
        r["conf"] = conf
        results.append(r)
        print(f"{r['id'][6:]:32} meta={r['cur']} DZ={r['deezer']} MB={mby} wiki={wy}  → {conf}")

    if WRITE:
        n = 0
        for r in results:
            if r["conf"].startswith("VYSOKÁ") or r["conf"].startswith("STŘEDNÍ"):
                mp = os.path.join(ENT, r["id"], "meta.json")
                meta = json.load(open(mp))
                y = r["deezer"]
                meta["year"] = y
                meta["publishedAt"] = f"{y}-01-01"
                desc = meta.get("description") or ""
                desc = re.sub(r"\((19|20)\d{2}\)", f"({y})", desc)
                meta["description"] = desc
                json.dump(meta, open(mp, "w"), indent=2, ensure_ascii=False)
                open(mp, "a").write("\n")
                n += 1
        print(f"\n✅ ZAPSÁNO: {n} alb")
    else:
        print("\n(dry-run — použij --write)")

if __name__ == "__main__":
    main()
