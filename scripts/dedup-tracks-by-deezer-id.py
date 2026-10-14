#!/usr/bin/env python3
"""Dedup track entit podle Deezer track ID (autorita = strukturované ID).

Pár (stejné Deezer ID) = totéž track z různých importů.
KEEP = hezčí slug (bez číselného suffixu) + plnější data.
DROP = druhý; jeho UNIKÁTNÍ vazby se přenesou na KEEP, pak se dropne.

Použití: python3 scripts/dedup-tracks-by-deezer-id.py [--write]
"""
import json,os,sys,collections,shutil,re
ROOT=os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
ENT=os.path.join(ROOT,"content","entities")
BACKUP=os.path.join(ROOT,".backups","entities-track-dedup-20261014")
WRITE="--write" in sys.argv

def ugly(slug):
    """True když slug končí číselným suffixem (např. -95742)."""
    return bool(re.search(r"-\d{3,}$",slug))

def keep_score(d):
    try:
        m=json.load(open(f"{ENT}/{d}/meta.json")); r=json.load(open(f"{ENT}/{d}/relations.json"))
    except Exception: return (-1,)
    nice = 0 if ugly(d) else 1            # hezký slug = prefer
    feat_title = 1 if 'feat' in (m.get('title') or '').lower() else 0
    rel=sum(len(v) for v in r.values() if isinstance(v,list))
    return (nice, feat_title, rel)

byid=collections.defaultdict(list)
for d in os.listdir(ENT):
    if not d.startswith('track_'): continue
    try: m=json.load(open(f"{ENT}/{d}/meta.json"))
    except: continue
    did=None
    for s in (m.get('extraMeta') or {}).get('sources') or []:
        if 'deezer.com/track/' in s: did=s.split('/track/')[1].split('?')[0]
    if did: byid[did].append(d)

pairs={k:v for k,v in byid.items() if len(v)>1}
print(f"Deezer ID s duplikáty: {len(pairs)}")
if WRITE: os.makedirs(BACKUP,exist_ok=True)

def rels(d):
    try: return json.load(open(f"{ENT}/{d}/relations.json"))
    except Exception: return {}

dropped=0
for did,group in pairs.items():
    ranked=sorted(group,key=keep_score,reverse=True)
    keep=ranked[0]; drops=ranked[1:]
    print(f"  KEEP {keep[:46]:48} DROP {', '.join(x for x in drops)}")
    dropped+=len(drops)
    if WRITE:
        kr=rels(keep)
        for drop in drops:
            dr=rels(drop)
            # přenes unikátní vazby
            for k,v in dr.items():
                if isinstance(v,list) and k!='aiEstimates':
                    ex=kr.get(k) or []
                    for x in v:
                        if x not in ex: ex.append(x)
                    kr[k]=ex
            # plnější title (s feat) přesuň
            try:
                km=json.load(open(f"{ENT}/{keep}/meta.json")); dm=json.load(open(f"{ENT}/{drop}/meta.json"))
                if 'feat' in (dm.get('title') or '').lower() and 'feat' not in (km.get('title') or '').lower():
                    km['title']=dm['title']
                for f in ('year','description'):
                    if not km.get(f) and dm.get(f): km[f]=dm[f]
                json.dump(km,open(f"{ENT}/{keep}/meta.json",'w'),indent=2,ensure_ascii=False); open(f"{ENT}/{keep}/meta.json",'a').write('\n')
            except Exception: pass
            # přepoj reference jinde
            for d2 in os.listdir(ENT):
                rp=f"{ENT}/{d2}/relations.json"
                if not os.path.isfile(rp): continue
                r2=json.load(open(rp)); ch=False
                for k,v in r2.items():
                    if isinstance(v,list) and drop in v:
                        r2[k]=list(dict.fromkeys(keep if x==drop else x for x in v)); ch=True
                if ch:
                    json.dump(r2,open(rp,'w'),indent=2,ensure_ascii=False); open(rp,'a').write('\n')
            shutil.move(f"{ENT}/{drop}",f"{BACKUP}/{drop}")
        for k,v in kr.items():
            if isinstance(v,list): kr[k]=list(dict.fromkeys(v))
        json.dump(kr,open(f"{ENT}/{keep}/relations.json",'w'),indent=2,ensure_ascii=False); open(f"{ENT}/{keep}/relations.json",'a').write('\n')
print(f"{'ZAPSÁNO' if WRITE else 'DRY'}: {dropped} duplikátů sloučeno")
