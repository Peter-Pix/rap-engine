#!/usr/bin/env python3
"""Opraví kontaminované primaryArtist na track úrovni.

Problém: u některých alb se `artists` z alba propsali na VŠECHNY tracky jako
primaryArtist, i když track má skutečného Main interpreta jiného.

Autorita: Deezer `/track/{id}` contributors role=Main (jen pro dotčená alba).

Použití: python3 scripts/fix-track-primary-artists.py [--write]
"""
import json,os,sys,re,urllib.request,time
from concurrent.futures import ThreadPoolExecutor
ROOT=os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
ENT=os.path.join(ROOT,"content","entities")
WRITE="--write" in sys.argv
UA={"User-Agent":"4rap-research/1.0 (ppix50@gmail.com)"}
AFFECTED=["album_pribehy-a-sny","album_sny-jsou-mocnejsi-nez-skutecnost",
          "album_koke-koke","album_sos","album_akta-x","album_2-mouchy-1-ranou"]

# Deezer artist ID → naše entity (přes deezerId v meta)
by_did={}
for d in os.listdir(ENT):
    if not d.startswith('artist_'): continue
    try: m=json.load(open(f"{ENT}/{d}/meta.json"))
    except: continue
    if m.get('deezerId'): by_did[str(m['deezerId'])]=d
# fallback: jméno → entita
def norm(s):
    return re.sub(r"[^a-z0-9]+","",str(s or "").lower())
by_name={}
for d in os.listdir(ENT):
    if not d.startswith('artist_'): continue
    try: m=json.load(open(f"{ENT}/{d}/meta.json"))
    except: continue
    by_name[norm(m.get('title',''))]=d

def fetch(tid):
    try: return tid, json.load(urllib.request.urlopen(urllib.request.Request(f"https://api.deezer.com/track/{tid}",headers=UA),timeout=8))
    except Exception: return tid, None

changed=0; details=[]
for al in AFFECTED:
    rp=f"{ENT}/{al}/relations.json"
    if not os.path.isfile(rp): continue
    r=json.load(open(rp))
    arts=set(r.get('artists') or [])
    tasks=[]
    for t in (r.get('tracks') or []):
        try: tm=json.load(open(f"{ENT}/{t}/meta.json"))
        except: continue
        did=None
        for s in (tm.get('extraMeta') or {}).get('sources') or []:
            mm=re.search(r"deezer\.com/track/(\d+)",s)
            if mm: did=mm.group(1); break
        if did: tasks.append((t,did))
    cache={}
    with ThreadPoolExecutor(max_workers=6) as ex:
        for tid,obj in ex.map(lambda x: fetch(x[1]), tasks): cache[tid]=obj
    for t,did in tasks:
        obj=cache.get(did)
        if not obj: continue
        mains=[c for c in (obj.get('contributors') or []) if c.get('role')=='Main']
        feats=[c for c in (obj.get('contributors') or []) if c.get('role')=='Featured']
        newmains=[]
        for c in mains:
            e=by_did.get(str(c.get('id'))) or by_name.get(norm(c.get('name')))
            if e: newmains.append(e)
        if not newmains: continue
        trp=f"{ENT}/{t}/relations.json"
        tr=json.load(open(trp))
        old=set(tr.get('primaryArtist') or [])
        new=set(newmains)
        if old!=new:
            details.append((t,sorted(old),sorted(new)))
            if WRITE:
                tr['primaryArtist']=sorted(new)
                # doplnit feat, co v contrib je Featured (pokud entita existuje)
                addfeat=[e for c in feats if (e:=by_did.get(str(c.get('id'))) or by_name.get(norm(c.get('name'))))]
                fe=set(tr.get('featuring') or [])
                for e in addfeat:
                    if e not in new: fe.add(e)
                tr['featuring']=sorted(fe)
                json.dump(tr,open(trp,'w'),indent=2,ensure_ascii=False); open(trp,'a').write('\n')
            changed+=1
print(f"{'ZAPSÁNO' if WRITE else 'DRY'}: změn {changed}")
for t,old,new in details:
    print(f"  {t[:44]:46}")
    print(f"     - {[x.replace('artist_','') for x in old]}")
    print(f"     + {[x.replace('artist_','') for x in new]}")
