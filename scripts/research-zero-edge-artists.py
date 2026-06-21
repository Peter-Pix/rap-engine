#!/usr/bin/env python3
"""
Search for real data on 39 zero-edge artists.
Uses Deezer API + Discogs API to find basic info.
"""

import json, os, sys, time, re, urllib.request, urllib.error, urllib.parse

BASE = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
ENTITIES = os.path.join(BASE, 'content', 'entities')

def load_json(path):
    with open(path) as f:
        return json.load(f)

def save_json(path, data):
    with open(path, 'w') as f:
        json.dump(data, f, indent=2, ensure_ascii=False)
        f.write('\n')

def search_deezer_artist(name):
    """Search Deezer for an artist."""
    time.sleep(0.25)
    url = f"https://api.deezer.com/search/artist?q={urllib.parse.quote(name)}&limit=5"
    try:
        req = urllib.request.Request(url, headers={'User-Agent': 'RKG/1.0'})
        with urllib.request.urlopen(req, timeout=10) as resp:
            return json.loads(resp.read())
    except:
        return None

def get_deezer_artist(artist_id):
    """Get full artist detail from Deezer."""
    time.sleep(0.25)
    url = f"https://api.deezer.com/artist/{artist_id}"
    try:
        req = urllib.request.Request(url, headers={'User-Agent': 'RKG/1.0'})
        with urllib.request.urlopen(req, timeout=10) as resp:
            return json.loads(resp.read())
    except:
        return None

def search_discogs(query):
    """Search Discogs for an artist."""
    time.sleep(1.0)
    url = f"https://api.discogs.com/database/search?q={urllib.parse.quote(query)}&type=artist&per_page=3"
    try:
        req = urllib.request.Request(url, headers={'User-Agent': 'RKG/1.0 +https://4rap.cz'})
        with urllib.request.urlopen(req, timeout=10) as resp:
            return json.loads(resp.read())
    except:
        return None

def main():
    # Artists to research, grouped by priority
    artists = [
        # Has some info - priority
        ('gipsy', 'Gipsy', 'Český producent a rapper, spolupracoval s Marpem'),
        ('haha-crew', 'Haha Crew', 'Slovenská rapová skupina'),
        ('matej-straka', 'Matej Straka', 'Rapper, hostoval s Dame, Irit, Majk Spirit, MOMO'),
        ('robert-burian', 'Robert Burian', 'Slovenský producent, autor hitu Žijeme len raz'),
        ('moma', 'Moma', 'Slovenský rapper'),
        ('tomi', 'Tomi', 'Slovenský rapper'),
        ('youv-dee', 'Youv Dee', 'Umělec'),
        ('pam-rabbit', 'Pam Rabbit', 'Umělec'),
        ('badboy-berlin', 'Badboy Berlin', 'Umělec'),
        ('danny-marr', 'Danny Marr', 'Umělec'),
        ('lenny', 'Lenny', 'Umělec'),
        ('cyper-sound', 'Cyper Sound', 'Umělec'),
        ('tante-elze', 'Tante Elze', 'Umělec'),
        ('tkx', 'Tkx', 'Umělec'),
        ('under-my-pillow', 'Under My Pillow', 'Umělec'),
        # Pure stubs
        ('66domo', '66Domo', 'Umělec'),
        ('anki', 'Anki', 'Umělec'),
        ('apollo27', 'Apollo27', 'Umělec'),
        ('arny', 'Arny', 'Umělec'),
        ('cigo', 'Cigo', 'Umělec'),
        ('dj-kadr', 'Dj Kadr', 'Umělec'),
        ('dolin', 'Dolin', 'Umělec'),
        ('ekoo', 'Ekoo', 'Umělec'),
        ('fill', 'Fill', 'Umělec'),
        ('fillipian', 'Fillipian', 'Umělec'),
        ('hajtkovic', 'Hajtkovic', 'Umělec'),
        ('humla', 'Humla', 'Umělec'),
        ('jay-am', 'Jay Am', 'Umělec'),
        ('loudz-one', 'Loudz One', 'Umělec'),
        ('lucas-blakk', 'Lucas Blakk', 'Umělec'),
        ('meiton', 'Meiton', 'Umělec'),
        ('meizmen', 'Meizmen', 'Umělec'),
        ('mikolaj-trybulec', 'Mikolaj Trybulec', 'Umělec'),
        ('ota-petrina', 'Ota Petřina', 'Umělec'),
        ('rook', 'Rook', 'Umělec'),
        ('seinys', 'Seinys', 'Umělec'),
        ('smolki', 'Smolki', 'Umělec'),
        ('vavra', 'Vávra', 'Umělec'),
        ('vektor', 'Vektor', 'Umělec'),
    ]

    results = {}

    for slug, name, desc in artists:
        print(f"\n{'='*60}")
        print(f"  {name:30s} | {slug}")
        print(f"{'='*60}")
        
        result = {
            'slug': slug,
            'name': name,
            'found': False,
            'deezer': None,
            'discogs': None,
            'genres': [],
            'origin': None,
            'occupation': [],
            'related': [],
        }
        
        # Search Deezer
        print(f"  🔍 Deezer...")
        dz = search_deezer_artist(name)
        if dz and dz.get('data'):
            for artist in dz['data']:
                a_name = artist['name'].lower()
                q_name = name.lower()
                
                # Check if it's a good match
                if q_name in a_name or a_name in q_name:
                    aid = artist['id']
                    detail = get_deezer_artist(aid)
                    if detail:
                        result['deezer'] = {
                            'id': aid,
                            'name': detail.get('name', ''),
                            'picture': detail.get('picture_xl', ''),
                            'nb_fan': detail.get('nb_fan', 0),
                            'nb_album': detail.get('nb_album', 0),
                        }
                        result['found'] = True
                        
                        # Extract genre from Deezer (limited)
                        if detail.get('radio'):
                            result['genres'].append('rap-hip-hop')
                        
                        print(f"    ✅ Found: {detail.get('name')} ({detail.get('nb_album',0)} albums, {detail.get('nb_fan',0)} fans)")
                        break
        
        if not result['found']:
            print(f"    ❌ Not on Deezer")
        
        # Search Discogs
        print(f"  🔍 Discogs...")
        dg = search_discogs(name)
        if dg and dg.get('results'):
            for r in dg['results'][:3]:
                r_title = r.get('title', '').lower()
                r_type = r.get('type', '')
                
                if name.lower() in r_title and r_type == 'artist':
                    result['discogs'] = {
                        'title': r.get('title', ''),
                        'year': r.get('year'),
                        'genre': r.get('genre', []),
                        'style': r.get('style', []),
                    }
                    result['found'] = True
                    
                    # Extract genres
                    for g in r.get('genre', []):
                        if g.lower() in ('hip hop', 'hip-hop', 'rap'):
                            result['genres'].append('rap-hip-hop')
                    
                    print(f"    ✅ Found: {r.get('title')} | genre={r.get('genre',[])} | style={r.get('style',[])}")
                    break
                elif r_type == 'artist':
                    print(f"    ⚠️  Partial: {r.get('title')} (type={r_type})")
        
        if not result.get('discogs'):
            print(f"    ❌ Not on Discogs")
        
        results[slug] = result
    
    # Summary
    print(f"\n{'='*60}")
    print(f"SUMMARY")
    print(f"{'='*60}")
    found = sum(1 for r in results.values() if r['found'])
    print(f"Found on Deezer/Discogs: {found}/{len(results)}")
    
    for slug, r in results.items():
        status = '✅' if r['found'] else '❌'
        sources = []
        if r['deezer']: sources.append('Deezer')
        if r['discogs']: sources.append('Discogs')
        print(f"  {status} {r['name']:25s} | {', '.join(sources) if sources else 'NOT FOUND'} | genres={r['genres']}")

if __name__ == '__main__':
    main()
