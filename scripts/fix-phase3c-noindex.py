#!/usr/bin/env python3
"""Oprava: pás C (holá metadata) MUSÍ mít noindex+isStub, i když má dlouhý MDX.

Smlouva fáze 3: pás C = holá metadata → thin content → noindex zůstává.

Použití: python3 scripts/fix-phase3c-noindex.py [--write]
"""
import json,os,sys
ROOT=os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
ENT=os.path.join(ROOT,"content","entities")
WRITE="--write" in sys.argv
fixed=0
for d in sorted(os.listdir(ENT)):
    if not d.startswith('track_'): continue
    try: m=json.load(open(f"{ENT}/{d}/meta.json",encoding='utf-8'))
    except: continue
    em=m.get('extraMeta') or {}
    if em.get('phase3Pas')!='C': continue
    if em.get('noindex') and em.get('isStub'): continue
    if WRITE:
        em['noindex']=True; em['isStub']=True
        em['stubReason']='pás C (holá metadata) — thin content'
        m['extraMeta']=em
        json.dump(m,open(f"{ENT}/{d}/meta.json",'w',encoding='utf-8'),indent=2,ensure_ascii=False); open(f"{ENT}/{d}/meta.json",'a').write('\n')
    fixed+=1
print(f"{'ZAPSÁNO' if WRITE else 'DRY'}: pás C vráceno noindex={fixed}")
