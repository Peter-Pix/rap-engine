#!/usr/bin/env python3
"""Najde Deezer artist ID pro interprety bez obrázku (pro ruční schválení).

Výstup: .data/deezer-artist-candidates.json — slug -> [kandidáti].
NIC nestahuje — jen vyhledá kandidáty, aby je člověk mohl scope-guardovat.

Použití: python3 scripts/find-deezer-artist-images.py
"""
import json,os,re,urllib.request,urllib.parse,time
ENT='content/entities'
im=open('src/lib/content/images.ts').read()
mapped=set(re.findall(r"'([^']+)':\s*'/images/artists/",im))

noimg=[]
for d in os.listdir(ENT):
    if not d.startswith('artist_'): continue
    m=json.load(open(f'{ENT}/{d}/meta.json'))
    if not m.get('image') and m.get('slug') not in mapped:
        noimg.append((m.get('slug'),m.get('title')))

def deezer(name,limit=4):
    url='https://api.deezer.com/search/artist?q='+urllib.parse.quote(name)+f'&limit={limit}'
    try:
        r=urllib.request.urlopen(urllib.request.Request(url,headers={'User-Agent':'4rap.cz/1.0'}),timeout=15)
        j=json.load(r)
        return [{'name':a['name'],'id':a['id'],'img':a.get('picture_medium','')} for a in j.get('data',[])]
    except Exception as e:
        return [{'error':str(e)}]

out={}
for i,(slug,title) in enumerate(noimg):
    out[slug]={'title':title,'candidates':deezer(title)}
    if i%10==0: print(f'{i}/{len(noimg)} …',flush=True)
    time.sleep(0.6)

os.makedirs('.data',exist_ok=True)
json.dump(out,open('.data/deezer-artist-candidates.json','w'),ensure_ascii=False,indent=1)
print(f'\nHotovo: {len(out)} artistů → .data/deezer-artist-candidates.json')
