#!/usr/bin/env python3
"""Krok 1.6.3b — verifikace feat vazeb přes Deezer contributors (role=Featured).

Pro tracky bez feat v titulu: Deezer /track/{id} → contributors role=Featured.
- feat umělec je v Featured → verified (source: deezer)
- není → unverified (nechat, jen označit)
- NIKDY nemazat (Deezer má víc profilů, aliasy).

Použití: python3 scripts/verify-feats-deezer-contrib.py [--write]
"""
import json,os,sys,re,unicodedata,urllib.request,time
from concurrent.futures import ThreadPoolExecutor
ROOT=os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
ENT=os.path.join(ROOT,"content","entities")
OUT=os.path.join(ROOT,".data","feat-deezer-verify.json")
WRITE="--write" in sys.argv
UA={"User-Agent":"4rap-research/1.0 (ppix50@gmail.com)"}

def norm(s):
    s=unicodedata.normalize("NFD",str(s or "")).encode("ascii","ignore").decode().lower()
    return re.sub(r"[^a-z0-9]","",s)

names={}
for d in os.listdir(ENT):
    if not d.startswith('artist_'): continue
    try: names[d]=json.load(open(f"{ENT}/{d}/meta.json")).get('title','')
    except: pass

# kandidáti = feat tracky BEZ featVerifiedBy=title
cands=[]
for d in os.listdir(ENT):
    if not d.startswith('track_'): continue
    try: m=json.load(open(f"{ENT}/{d}/meta.json")); r=json.load(open(f"{ENT}/{d}/relations.json"))
    except: continue
    if not r.get('featuring'): continue
    if (m.get('extraMeta') or {}).get('featVerifiedBy')=='title': continue
    did=None
    for s in (m.get('extraMeta') or {}).get('sources') or []:
        mm=re.search(r"deezer\.com/track/(\d+)",s)
        if mm: did=mm.group(1); break
    cands.append((d,did,r.get('featuring')))
print("kandidátů:",len(cands))

dids=sorted({c[1] for c in cands if c[1]})
def fetch(did):
    try: return did,json.load(urllib.request.urlopen(urllib.request.Request(f"https://api.deezer.com/track/{did}",headers=UA),timeout=8))
    except Exception: return did,None
cache={}
with ThreadPoolExecutor(max_workers=8) as ex:
    for n,(did,t) in enumerate(ex.map(fetch,dids),1):
        cache[did]=t
        if n%300==0: print(f"  fetch {n}/{len(dids)}",flush=True)

confirmed=0; unver=0; noid=0
for t,did,fe in cands:
    if not did: noid+=1; continue
    obj=cache.get(did)
    if not obj: unver+=1; continue
    fnames={norm(c.get('name')) for c in (obj.get('contributors') or []) if c.get('role')=='Featured'}
    allnames={norm(c.get('name')) for c in (obj.get('contributors') or [])}
    hit=[f for f in fe if norm(names.get(f,'')) in allnames]
    if hit and len(hit)==len(fe):
        confirmed+=1
        if WRITE:
            p=f"{ENT}/{t}/meta.json"; m=json.load(open(p))
            m['verification']='verified'
            m.setdefault('extraMeta',{})['featVerifiedBy']='deezer-contrib'
            json.dump(m,open(p,'w'),indent=2,ensure_ascii=False); open(p,'a').write('\n')
    elif hit:
        confirmed+=1
        if WRITE:
            p=f"{ENT}/{t}/meta.json"; m=json.load(open(p))
            m['verification']='verified'; m.setdefault('extraMeta',{})['featVerifiedBy']='deezer-contrib-partial'
            json.dump(m,open(p,'w'),indent=2,ensure_ascii=False); open(p,'a').write('\n')
    else:
        unver+=1
print(f"{'ZAPSÁNO' if WRITE else 'DRY'}: confirmed={confirmed} neoveřeno={unver} bez deezer_id={noid}")
json.dump({'confirmed':confirmed,'unverified':unver,'noid':noid},open(OUT,'w'),ensure_ascii=False,indent=1)
