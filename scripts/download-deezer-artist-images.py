#!/usr/bin/env python3
"""Stáhne a zaregistruje Deezer obrázky z bezpečných (ručně scope-guardovaných) matchů.

Vstup: .data/deezer-safe-matches.json (slug,title,id,img,name)
Pro každého: stáhne picture_big z Deezer API → webp 1200×1200 → images.ts + meta.image.

Použití:
  python3 scripts/download-deezer-artist-images.py          # DRY run — jen vypíše
  DRY=0 python3 scripts/download-deezer-artist-images.py      # reálně stáhne
"""
import json,os,re,urllib.request,subprocess,time
from PIL import Image
import io

ROOT=os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
ENT=os.path.join(ROOT,'content','entities')
IM=os.path.join(ROOT,'src','lib','content','images.ts')
ART=os.path.join(ROOT,'public','images','artists')
DRY=os.environ.get('DRY','1')!='0'

matches=json.load(open(os.path.join(ROOT,'.data','deezer-safe-matches.json')))
os.makedirs(ART,exist_ok=True)

def picture_big(dzid):
    url=f'https://api.deezer.com/artist/{dzid}'
    r=urllib.request.urlopen(urllib.request.Request(url,headers={'User-Agent':'4rap.cz/1.0'}),timeout=15)
    j=json.load(r)
    return j.get('picture_big') or j.get('picture_xl') or j.get('picture_medium') or ''

ok=0; fail=0
for m in matches:
    slug=m['slug']; dzid=m['id']
    out=os.path.join(ART,f'{slug}.webp')
    if os.path.exists(out) and os.path.getsize(out)>1000:
        print(f'  skip (existuje): {slug}'); continue
    url=picture_big(dzid)
    if not url or 'placeholder' in url:
        print(f'  FAIL (placeholder): {slug} ({m["title"]})'); fail+=1; continue
    if DRY:
        print(f'  [DRY] {slug:28} {m["title"]} → {dzid}'); ok+=1; continue
    try:
        r=urllib.request.urlopen(urllib.request.Request(url,headers={'User-Agent':'4rap.cz/1.0'}),timeout=30)
        img=Image.open(io.BytesIO(r.read())).convert('RGB')
        # čtvercový crop na střed
        w,h=img.size; s=min(w,h)
        img=img.crop(((w-s)//2,(h-s)//2,(w+s)//2,(h+s)//2))
        img=img.resize((1200,1200),Image.LANCZOS)
        img.save(out,'WEBP',quality=82,method=6)
        if os.path.getsize(out)<1000:
            os.remove(out); print(f'  FAIL (malý soubor): {slug}'); fail+=1; continue
        print(f'  OK {slug:28} {m["title"]} ({os.path.getsize(out)//1024} KB)'); ok+=1
    except Exception as e:
        print(f'  FAIL {slug}: {e}'); fail+=1
        if os.path.exists(out): os.remove(out)
    time.sleep(0.4)

print(f'\nOK {ok} · FAIL {fail} · DRY={DRY}')
