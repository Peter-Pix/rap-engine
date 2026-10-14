#!/usr/bin/env python3
"""Oprava chyby: tracky bez noindex, ale s thin content (<400 znaků).

Test noindex-gate.chrání před indexovatelným thin content.
Buď obohatit obsah na 400+, nebo vrátit noindex.

Tento skript VRACÍ noindex+isStub tam, kde obsah < 400 znaků.

Použití: python3 scripts/fix-noindex-thin-tracks.py [--write]
"""
import json,os,sys
ROOT=os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
ENT=os.path.join(ROOT,"content","entities")
WRITE="--write" in sys.argv
MIN=400

fixed=0
for d in sorted(os.listdir(ENT)):
    if not d.startswith('track_'): continue
    try: m=json.load(open(f"{ENT}/{d}/meta.json",encoding='utf-8'))
    except: continue
    em=m.get('extraMeta') or {}
    if em.get('noindex') or em.get('isStub'): continue
    p=f"{ENT}/{d}/entity.mdx"
    c=len(open(p,encoding='utf-8').read()) if os.path.isfile(p) else 0
    if c>=MIN: continue
    if WRITE:
        em['noindex']=True
        em['isStub']=True
        em['stubReason']='thin content < 400 znaků (MDX)'
        m['extraMeta']=em
        json.dump(m,open(f"{ENT}/{d}/meta.json",'w',encoding='utf-8'),indent=2,ensure_ascii=False); open(f"{ENT}/{d}/meta.json",'a').write('\n')
    fixed+=1
print(f"{'ZAPSÁNO' if WRITE else 'DRY'}: vráceno noindex={fixed}")
