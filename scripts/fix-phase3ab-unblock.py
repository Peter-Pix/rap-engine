#!/usr/bin/env python3
"""pás A/B s MDX ≥400 znaků → sundat noindex+isStub (quality gate prošel)."""
import json,os,sys
ROOT=os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
ENT=os.path.join(ROOT,"content","entities")
WRITE="--write" in sys.argv
MIN=400; fixed=0
for d in sorted(os.listdir(ENT)):
    if not d.startswith('track_'): continue
    try: m=json.load(open(f"{ENT}/{d}/meta.json",encoding='utf-8'))
    except: continue
    em=m.get('extraMeta') or {}
    if em.get('phase3Pas') not in ('A','B'): continue
    if not (em.get('noindex') or em.get('isStub')): continue
    p=f"{ENT}/{d}/entity.mdx"
    c=len(open(p,encoding='utf-8').read()) if os.path.isfile(p) else 0
    if c<MIN: continue
    if WRITE:
        for k in ('noindex','isStub','stubReason','draftReason'): em.pop(k,None)
        m['extraMeta']=em
        json.dump(m,open(f"{ENT}/{d}/meta.json",'w',encoding='utf-8'),indent=2,ensure_ascii=False); open(f"{ENT}/{d}/meta.json",'a').write('\n')
    fixed+=1
print(f"{'ZAPSÁNO' if WRITE else 'DRY'}: A/B odblokováno={fixed}")
