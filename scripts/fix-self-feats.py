#!/usr/bin/env python3
"""Odstraní self-feat: track, kde je umělec v featuring i primaryArtist.

Logická chyba: umělec nemůže featovat sám sebe (už je hlavní interpret).
"""
import json,os,sys
ROOT=os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
ENT=os.path.join(ROOT,"content","entities")
WRITE="--write" in sys.argv
n=0
for d in os.listdir(ENT):
    if not d.startswith('track_'): continue
    rp=f"{ENT}/{d}/relations.json"
    try: r=json.load(open(rp))
    except: continue
    fe=r.get('featuring') or []
    if not fe: continue
    pa=set(r.get('primaryArtist') or [])
    overlap=[x for x in fe if x in pa]
    if overlap:
        n+=1
        print(f"  {d[:46]:48} odebírám feat: {[x.replace('artist_','') for x in overlap]}")
        if WRITE:
            r['featuring']=[x for x in fe if x not in pa]
            json.dump(r,open(rp,'w'),indent=2,ensure_ascii=False); open(rp,'a').write('\n')
print(f"{'ZAPSÁNO' if WRITE else 'DRY'}: {n} self-featů")
