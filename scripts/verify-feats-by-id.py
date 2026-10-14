#!/usr/bin/env python3
"""Ověří feat vazby podle Deezer ID — PŘESNÉ pravidlo (bez false positives).

JEDINÝ spolehlivý fake signál:
  Deezer contributors obsahuje umělce SE STEJNÝM JMÉNEM jako náš feat,
  ale s JINÝM ID → náš záznam ukazuje na jiný (fake/duplicitní) profil.

Proč ne ostatní:
- contrib=[] (Deezer featy nevrátil) → title je autorita → NEVÍM (nechat)
- contrib má jiné umělce, ale ne stejné jméno → náš feat tam prostě chybí
  v contributors (Deezer neúplné) → NEVÍM (nechat)

Tím se vyhneme hromadnému mazání správných vazeb.
"""
import json, os, re, sys, unicodedata, urllib.request
from concurrent.futures import ThreadPoolExecutor
ROOT=os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
ENT=os.path.join(ROOT,"content","entities")
OUT=os.path.join(ROOT,".data","feat-id-verify.json")
WRITE="--write" in sys.argv
UA={"User-Agent":"4rap-research/1.0 (ppix50@gmail.com)"}

def norm(s):
    s=unicodedata.normalize("NFD",str(s or "")).encode("ascii","ignore").decode().lower()
    return re.sub(r"[^a-z0-9]+"," ",s).strip()

artist_id={}; artist_name={}
for x in os.listdir(ENT):
    if not x.startswith("artist_"): continue
    try: m=json.load(open(f"{ENT}/{x}/meta.json"))
    except Exception: continue
    artist_id[x]=str(m.get("deezerId") or ""); artist_name[x]=norm(m.get("title",""))

tracks=[]
for x in os.listdir(ENT):
    if not x.startswith("track_"): continue
    rp=f"{ENT}/{x}/relations.json"
    if not os.path.isfile(rp): continue
    try: r=json.load(open(rp))
    except Exception: continue
    f=r.get("featuring") or []
    if not f: continue
    try: m=json.load(open(f"{ENT}/{x}/meta.json"))
    except Exception: continue
    did=None
    for s in ((m.get("extraMeta") or {}).get("sources") or []):
        mm=re.search(r"deezer\.com/track/(\d+)",s)
        if mm: did=mm.group(1); break
    tracks.append((x,m.get("title",""),did,f))
print(f"tracků s feat: {len(tracks)}",flush=True)
dids=sorted({d for _,_,d,_ in tracks if d})
print(f"unikátních deezer tracků: {len(dids)}",flush=True)

def fetch(did):
    try: return did, json.load(urllib.request.urlopen(urllib.request.Request(f"https://api.deezer.com/track/{did}",headers=UA),timeout=8))
    except Exception: return did, None

cache={}
with ThreadPoolExecutor(max_workers=8) as ex:
    for n,(did,t) in enumerate(ex.map(fetch,dids),1):
        cache[did]=t
        if n%300==0: print(f"  fetch {n}/{len(dids)}",flush=True)

ok=bad=unknown=0; bads=[]
for x,title,did,f in tracks:
    t=cache.get(did) if did else None
    if not t: unknown+=len(f); continue
    # jméno → [ID] z contributors
    cbn={}
    for c in (t.get("contributors") or []):
        cbn.setdefault(norm(c.get("name")),[]).append(str(c.get("id")))
    for a in f:
        aid=artist_id.get(a,""); an=artist_name.get(a,"")
        if not aid: unknown+=1; continue
        ids_same_name = cbn.get(an, [])
        if aid in ids_same_name:
            ok+=1                                  # ID sedí
        elif ids_same_name:
            bad+=1                                 # stejné jméno, JINÉ ID → fake
            bads.append({"track":x,"title":title[:44],"artist":a,"our_id":aid,
                         "contrib_ids":ids_same_name,"deezer":did})
        else:
            unknown+=1                             # jméno v contrib není → nevíme

print(f"\n{'ZAPSÁNO' if WRITE else 'DRY'}: OK={ok} FAKE={bad} NEVÍM={unknown}",flush=True)
json.dump({"ok":ok,"bad":bad,"unknown":unknown,"mismatches":bads},open(OUT,"w"),ensure_ascii=False,indent=1)
print("\nFAKE (stejné jméno, jiné ID):")
for b in bads:
    print(f"  {b['title'][:40]:42} {b['artist']:18} our={b['our_id']:11} contrib={b['contrib_ids']}")
if WRITE and bads:
    rem=0
    for b in bads:
        rp=f"{ENT}/{b['track']}/relations.json"
        r=json.load(open(rp)); f=r.get("featuring") or []
        if b["artist"] in f:
            f.remove(b["artist"]); r["featuring"]=f
            json.dump(r,open(rp,"w"),indent=2,ensure_ascii=False); open(rp,"a").write("\n"); rem+=1
    print(f"\nODEBRÁNO {rem}")
