#!/usr/bin/env python3
"""Doplní MBID (MusicBrainz ID) umělcům — strukturovaná, nezávislá autorita.

Výběr kandidáta (priorita):
1. country CZ/SK
2. disambiguation obsahuje czech/slovak/rapper/rap/mc/hip
3. score >= 90 a jediný výsledek

Ambiguita (víc kandidátů splňujících) → NEZAPISOVAT, jen report.

Použití: python3 scripts/backfill-mbid.py [--write]
"""
import json,os,sys,urllib.request,urllib.parse,time,re
ROOT=os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
ENT=os.path.join(ROOT,"content","entities")
OUT=os.path.join(ROOT,".data","mbid-backfill.json")
WRITE="--write" in sys.argv
UA={"User-Agent":"4rap-research/1.0 (ppix50@gmail.com)"}

def mbid_query(name):
    url="https://musicbrainz.org/ws/2/artist/?"+urllib.parse.urlencode(
        {"query":f'artist:"{name}"',"fmt":"json","limit":8})
    for attempt in range(3):
        try:
            return json.load(urllib.request.urlopen(urllib.request.Request(url,headers=UA),timeout=14)).get('artists',[])
        except Exception:
            time.sleep(3+attempt*3)
    return []

def pick(cands,name):
    """Vrátí (mbid,confidence,info) nebo (None,...)."""
    good=[]
    for a in cands:
        c=(a.get('country') or '').upper()
        dis=(a.get('disambiguation') or '').lower()
        sc=a.get('score',0)
        is_czsk = c in ('CZ','SK')
        is_rap = any(w in dis for w in ('czech','slovak','rapper','rap','mc','hip','trap'))
        if is_czsk or is_rap: good.append((a.get('id'),a.get('name'),c,dis,sc,is_czsk,is_rap))
    if not good: return None,None,[]
    # nejlepší: CZ/SK + rap
    good.sort(key=lambda x:(-(x[5]+x[6]),-x[4]))
    if len(good)>1:
        # víc kandidátů se stejným "kvalitou" → ambiguita
        top=good[0]
        rival=[g for g in good[1:] if (g[5]+g[6])==(top[5]+top[6])]
        if rival: return None,'ambiguous',good
    return good[0],'ok',good

artists={}
for d in os.listdir(ENT):
    if not d.startswith('artist_'): continue
    try: m=json.load(open(f"{ENT}/{d}/meta.json"))
    except: continue
    artists[d]=m.get('title','')

res={}; written=0
for i,(aid,name) in enumerate(artists.items(),1):
    if not name: continue
    cands=mbid_query(name)
    best,conf,good=pick(cands,name)
    res[aid]={'name':name,'mbid':best[0] if best else None,'conf':conf,
              'info':f"{best[2]}|{best[3]}" if best else None,
              'cands':[(g[0],g[1],g[2],g[3]) for g in (good or [])]}
    if best and WRITE:
        p=f"{ENT}/{aid}/meta.json"; m=json.load(open(p))
        if not m.get('mbid'):
            m['mbid']=best[0]
            json.dump(m,open(p,'w'),indent=2,ensure_ascii=False); open(p,'a').write('\n')
            written+=1
    if i%40==0: print(f"  {i}/{len(artists)}",flush=True)
    time.sleep(1.05)

json.dump(res,open(OUT,'w'),ensure_ascii=False,indent=1)
ok=sum(1 for v in res.values() if v['mbid'])
amb=sum(1 for v in res.values() if v['conf']=='ambiguous')
none=sum(1 for v in res.values() if not v['mbid'] and v['conf']!='ambiguous')
print(f"\nMBID přiřazeno: {ok} | ambiguita: {amb} | nenalezeno: {none} | zapsáno: {written}")
