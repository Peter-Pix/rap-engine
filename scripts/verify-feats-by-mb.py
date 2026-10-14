#!/usr/bin/env python3
"""Krok 1.6.3 — ověření feat vazeb přes MusicBrainz recording artist-credit.

Pro tracky, kde feat není v titulu: MB lookup recording → artist-credit.
- MB potvrzuje feataře → verification: verified, source: musicbrainz
- MB mlčí → unverified (nechat, jen označit)
- MB rozpor (jiný umělec) → report k ručnímu review (NEMAŽE se)

Použití: python3 scripts/verify-feats-by-mb.py [--write] [--limit N]
"""
import json,os,sys,re,unicodedata,urllib.request,urllib.parse,time
ROOT=os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
ENT=os.path.join(ROOT,"content","entities")
OUT=os.path.join(ROOT,".data","feat-mb-verify.json")
WRITE="--write" in sys.argv
UA={"User-Agent":"4rap-research/1.0 (ppix50@gmail.com)"}
LIMIT=None
for a in sys.argv:
    if a.startswith("--limit="): LIMIT=int(a.split("=")[1])

def norm(s):
    s=unicodedata.normalize("NFD",str(s or "")).encode("ascii","ignore").decode().lower()
    return re.sub(r"[^a-z0-9]","",s)

# feat kandidáti = tracky, kde feat NENÍ v titulu (z předchozího kroku)
tj=os.path.join(ROOT,'.data','feat-title-verify.json')
cands=json.load(open(tj))['candidates'] if os.path.isfile(tj) else []
if LIMIT: cands=cands[:LIMIT]
print(f"kandidátů k MB ověření: {len(cands)}")

names={}
for d in os.listdir(ENT):
    if not d.startswith('artist_'): continue
    try: names[d]=json.load(open(f"{ENT}/{d}/meta.json")).get('title','')
    except: pass

def mb_rec(title,artist):
    q=f'recording:"{title}" AND artist:"{artist}"'
    url="https://musicbrainz.org/ws/2/recording/?"+urllib.parse.urlencode({"query":q,"fmt":"json","limit":3})
    for att in range(3):
        try:
            return json.load(urllib.request.urlopen(urllib.request.Request(url,headers=UA),timeout=14)).get('recordings',[])
        except Exception: time.sleep(3+att*3)
    return []

res={}; confirmed=0; silent=0; conflict=0
for i,t in enumerate(cands,1):
    try: m=json.load(open(f"{ENT}/{t}/meta.json")); r=json.load(open(f"{ENT}/{t}/relations.json"))
    except: continue
    fe=r.get('featuring') or []
    pa=r.get('primaryArtist') or []
    title=m.get('title','')
    # hlavní interpret (jméno pro MB query)
    main=names.get(pa[0],'') if pa else ''
    recs=mb_rec(title,main)
    mb_artists=set()
    for rec in recs:
        for ac in rec.get('artist-credit',[]):
            if isinstance(ac,dict): mb_artists.add(norm(ac.get('artist',{}).get('name','')))
    feats_in_mb=[f for f in fe if norm(names.get(f,'')) in mb_artists]
    feats_not_mb=[f for f in fe if norm(names.get(f,'')) not in mb_artists]
    if not recs:
        silent+=1; status='silent'
    elif feats_in_mb and not feats_not_mb:
        confirmed+=1; status='confirmed'
    elif feats_in_mb:
        confirmed+=1; status='partial'
    else:
        conflict+=1; status='conflict'
    res[t]={'status':status,'feats':fe,'in_mb':feats_in_mb,'not_mb':feats_not_mb,'recs':len(recs)}
    if WRITE and recs and feats_in_mb:
        m['verification']='verified'
        m.setdefault('extraMeta',{})['featVerifiedBy']='musicbrainz'
        json.dump(m,open(f"{ENT}/{t}/meta.json",'w'),indent=2,ensure_ascii=False); open(f"{ENT}/{t}/meta.json",'a').write('\n')
    if i%50==0: print(f"  {i}/{len(cands)} confirmed:{confirmed} silent:{silent} conflict:{conflict}",flush=True)
    time.sleep(1.05)

json.dump(res,open(OUT,'w'),ensure_ascii=False,indent=1)
print(f"\n{'ZAPSÁNO' if WRITE else 'DRY'}: confirmed={confirmed} silent={silent} conflict={conflict}")
