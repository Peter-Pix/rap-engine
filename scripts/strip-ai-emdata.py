#!/usr/bin/env python3
"""Krok 2.2.3 — vyčistí AI data z track extraMeta/relations.

1. extraMeta.themes/moods (text, duplikát) → smazat (AI odhad z Rap Monitoru)
2. relations.aiEstimates s DANGLING referencemi → smazat (odkazují na
   mood/theme entity, které Fáze 0.1 odstranila)

Použití: python3 scripts/strip-ai-emdata.py [--write]
"""
import json,os,sys
ROOT=os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
ENT=os.path.join(ROOT,"content","entities")
WRITE="--write" in sys.argv
ids=set(os.listdir(ENT))

em_th=em_mo=ai_clean=ai_removed=0
for d in sorted(os.listdir(ENT)):
    if not d.startswith('track_'): continue
    mp=f"{ENT}/{d}/meta.json"; rp=f"{ENT}/{d}/relations.json"
    try:
        m=json.load(open(mp,encoding='utf-8')); r=json.load(open(rp,encoding='utf-8'))
    except Exception: continue
    em=m.get('extraMeta') or {}
    changed=False
    if em.get('themes'): em_th+=1; em.pop('themes',None); changed=True
    if em.get('moods'): em_mo+=1; em.pop('moods',None); changed=True
    ae=r.get('aiEstimates')
    if ae:
        # ponech jen reference, které existují
        new={k:[x for x in v if x in ids] for k,v in ae.items() if isinstance(v,list)}
        new={k:v for k,v in new.items() if v}
        if new: ai_clean+=1
        else: ai_removed+=1
        if new: r['aiEstimates']=new
        else: r.pop('aiEstimates',None)
        changed=True
    if WRITE and changed:
        m['extraMeta']=em
        json.dump(m,open(mp,'w',encoding='utf-8'),indent=2,ensure_ascii=False); open(mp,'a').write('\n')
        json.dump(r,open(rp,'w',encoding='utf-8'),indent=2,ensure_ascii=False); open(rp,'a').write('\n')
print(f"{'ZAPSÁNO' if WRITE else 'DRY'}: extraMeta.themes={em_th} moods={em_mo} aiEstimates vyčištěno={ai_clean} smazáno={ai_removed}")
