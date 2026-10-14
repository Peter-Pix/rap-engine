#!/usr/bin/env python3
"""Krok 1.6.2 — title-based verifikace feat vazeb (bez API, nulové riziko).

Pravidlo:
- feat jméno JE v titulu skladby → verification: verified, source: title
- feat jméno NENÍ v titulu → nechat, označit jako kandidáta na MB ověření

Nic se nemaže. Jen se zapisuje status.
"""
import json,os,sys,re,unicodedata,collections
ROOT=os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
ENT=os.path.join(ROOT,"content","entities")
WRITE="--write" in sys.argv

def norm(s):
    s=unicodedata.normalize("NFD",str(s or "")).encode("ascii","ignore").decode().lower()
    return re.sub(r"[^a-z0-9]","",s)

names={}
for d in os.listdir(ENT):
    if not d.startswith('artist_'): continue
    try: names[d]=norm(json.load(open(f"{ENT}/{d}/meta.json")).get('title',''))
    except: pass

verified=0; candidates=0; noentity=0
cand_list=[]
for d in os.listdir(ENT):
    if not d.startswith('track_'): continue
    rp=f"{ENT}/{d}/relations.json"
    try: r=json.load(open(rp)); m=json.load(open(f"{ENT}/{d}/meta.json"))
    except: continue
    fe=r.get('featuring') or []
    if not fe: continue
    title=norm(m.get('title',''))
    allin=True; anyentity=False
    for f in fe:
        nm=names.get(f,'')
        if not nm: noentity+=1; continue
        anyentity=True
        if nm not in title: allin=False
    if allin and anyentity:
        verified+=1
        if WRITE:
            m['verification']='verified'
            em=m.setdefault('extraMeta',{})
            src=em.setdefault('sources',[])
            if 'title' not in str(src): pass
            em['featVerifiedBy']='title'
            json.dump(m,open(f"{ENT}/{d}/meta.json",'w'),indent=2,ensure_ascii=False); open(f"{ENT}/{d}/meta.json",'a').write('\n')
    else:
        candidates+=1
        cand_list.append(d)

print(f"{'ZAPSÁNO' if WRITE else 'DRY'}: ověřeno titulkem={verified}, kandidátů na MB={candidates}, feat bez entity={noentity}")
json.dump({'verified':verified,'candidates':cand_list},open(os.path.join(ROOT,'.data','feat-title-verify.json'),'w'),ensure_ascii=False,indent=1)
