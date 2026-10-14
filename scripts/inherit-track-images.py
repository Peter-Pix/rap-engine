#!/usr/bin/env python3
"""Krok 2.3 — tracky dědí obrázek z alba (cover art).

Track nemá vlastní cover — používá cover alba, na kterém vyšel.
Signál hasImage má váhu 10.

Použití: python3 scripts/inherit-track-images.py [--write]
"""
import json,os,sys
ROOT=os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
ENT=os.path.join(ROOT,"content","entities")
WRITE="--write" in sys.argv

def load(a,f="meta.json"):
    try: return json.load(open(f"{ENT}/{a}/{f}",encoding='utf-8'))
    except Exception: return None

# cache coverů alb
album_img={}
for d in os.listdir(ENT):
    if not d.startswith('album_'): continue
    m=load(d)
    if m and m.get('image'): album_img[d]=m['image']
print("alb s obrázkem:",len(album_img))

got=0; noalbum=0; hasimg=0
for d in sorted(os.listdir(ENT)):
    if not d.startswith('track_'): continue
    m=load(d)
    if not m: continue
    if m.get('image'): hasimg+=1; continue
    r=load(d,"relations.json") or {}
    al=r.get('belongsToAlbum') or []
    if not al: noalbum+=1; continue
    img=next((album_img[a] for a in al if a in album_img), None)
    if not img: noalbum+=1; continue
    if WRITE:
        m['image']=img
        json.dump(m,open(f"{ENT}/{d}/meta.json",'w',encoding='utf-8'),indent=2,ensure_ascii=False); open(f"{ENT}/{d}/meta.json",'a').write('\n')
    got+=1
print(f"{'ZAPSÁNO' if WRITE else 'DRY'}: dostane obrázek={got} už má={hasimg} album bez coveru={noalbum}")
