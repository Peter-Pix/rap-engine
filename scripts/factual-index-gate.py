#!/usr/bin/env python3
"""Krok 2.2.2 — faktický index gate místo AI klasifikace (phase3Pas).

NOVÝ GATE (objektivní fakta):
  index  ⟸  má album + primaryArtist + délku + (žánr NEBO label) + MDX ≥400
  noindex ⟸  jinak

phase3Pas zůstává v extraMeta jako historická stopa, ale NEROZHODUJE.

Použití: python3 scripts/factual-index-gate.py [--write]
"""
import json,os,sys
ROOT=os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
ENT=os.path.join(ROOT,"content","entities")
WRITE="--write" in sys.argv
MIN=400

def facts_ok(d):
    try:
        m=json.load(open(f"{ENT}/{d}/meta.json",encoding='utf-8'))
        r=json.load(open(f"{ENT}/{d}/relations.json",encoding='utf-8'))
    except Exception: return False
    em=m.get('extraMeta') or {}
    if not r.get('primaryArtist'): return False
    if not em.get('duration'): return False
    if not (r.get('genres') or r.get('labels') or r.get('featuring') or r.get('producers')): return False
    p=f"{ENT}/{d}/entity.mdx"
    if os.path.isfile(p) and len(open(p,encoding='utf-8').read())>=MIN: return True
    return False

unblocked=0; blocked=0
for d in sorted(os.listdir(ENT)):
    if not d.startswith('track_'): continue
    try: m=json.load(open(f"{ENT}/{d}/meta.json",encoding='utf-8'))
    except: continue
    em=m.get('extraMeta') or {}
    ok=facts_ok(d)
    is_ni = em.get('noindex') or em.get('isStub')
    if ok and is_ni:
        if WRITE:
            for k in ('noindex','isStub','stubReason','draftReason'): em.pop(k,None)
            em['gateBy']='facts'
            m['extraMeta']=em
            json.dump(m,open(f"{ENT}/{d}/meta.json",'w',encoding='utf-8'),indent=2,ensure_ascii=False); open(f"{ENT}/{d}/meta.json",'a').write('\n')
        unblocked+=1
    elif ok and not is_ni:
        if WRITE:
            em['gateBy']='facts'; m['extraMeta']=em
            json.dump(m,open(f"{ENT}/{d}/meta.json",'w',encoding='utf-8'),indent=2,ensure_ascii=False); open(f"{ENT}/{d}/meta.json",'a').write('\n')
    elif not ok and not is_ni:
        if WRITE:
            em['noindex']=True; em['isStub']=True; em['gateBy']='facts'
            em['stubReason']='thin facts (bez alba/artistu/délky/žánru)'
            m['extraMeta']=em
            json.dump(m,open(f"{ENT}/{d}/meta.json",'w',encoding='utf-8'),indent=2,ensure_ascii=False); open(f"{ENT}/{d}/meta.json",'a').write('\n')
        blocked+=1
print(f"{'ZAPSÁNO' if WRITE else 'DRY'}: odblokováno faktickým gate={unblocked} zablokováno={blocked}")
