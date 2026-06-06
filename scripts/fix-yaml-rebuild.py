#!/usr/bin/env python3
"""fix-yaml-rebuild.py — Rebuild broken YAML frontmatter without pyyaml"""

import re, os, json

files = [
    'content/raperi/astral-one.mdx', 'content/raperi/astralkid22.mdx', 'content/raperi/badboy-berlin.mdx',
    'content/raperi/blako.mdx', 'content/raperi/bobby-blaze.mdx', 'content/raperi/dj-opia.mdx',
    'content/raperi/kamil-hoffmann.mdx', 'content/raperi/robin-zoot.mdx', 'content/raperi/tk27.mdx',
    'content/labely/rychli-kluci.mdx', 'content/labely/ty-nikdy.mdx', 'content/labely/znk.mdx',
    'content/raperi/alla-xul-elu.mdx', 'content/raperi/kvitek.mdx', 'content/raperi/dj-aka.mdx',
    'content/raperi/dj-fatte.mdx', 'content/raperi/jickson.mdx', 'content/raperi/samey.mdx',
    'content/alba/eskort.mdx',
]

SCHEMAS = {
    'raperi': ['title','slug','realName','born','birthPlace','active','label','genre','description','image','featured','publishedAt','updatedAt','relatedRappers','relatedAlbums','deezerId','socials','aliases','origin','hometown','labels','subgenres','subgenre','status','associatedActs','activeSince','createdAt','seo'],
    'alba': ['title','slug','rapper','rapperSlug','label','labelSlug','year','genre','description','image','featured','tracklist','rating','publishedAt','updatedAt','deezerAlbumId','upc','origin','releaseType','features','featuresNames','producers','producersNames','duration','explicit','releaseDate','nbTracks','subgenres','labelName','cover','aliases','activeSince'],
    'labely': ['title','slug','founded','location','description','image','artists','publishedAt','website','city','country','founder','genre'],
}

def parse_inline_list(s):
    """Parse a YAML/JSON inline list like ['a', 'b'] or ['a','b']"""
    s = s.strip()
    if s.startswith('[') and s.endswith(']'):
        inner = s[1:-1]
        items = []
        for part in re.findall(r"'([^']*)'|\"([^\"]*)\"|([^,]+)", inner):
            val = part[0] or part[1] or part[2].strip()
            if val:
                items.append(val)
        return items
    return s

def parse_inline_dict(s):
    """Parse a YAML/JSON inline dict like {a: b, c: d}"""
    s = s.strip()
    if s.startswith('{') and s.endswith('}'):
        inner = s[1:-1]
        d = {}
        for part in re.findall(r'(\w[\w-]*)\s*:\s*("[^"]*"|\'[^\']*\'|[^,]+)', inner):
            key = part[0]
            val = part[1].strip().strip('"\'')
            d[key] = val
        return json.dumps(d, ensure_ascii=False)
    return s

def is_inline_list(s):
    return s.startswith('[') and s.endswith(']')

def is_inline_dict(s):
    return s.startswith('{') and s.endswith('}')

def write_val(key, value, lines):
    """Append properly formatted key:value YAML to lines list."""
    if isinstance(value, bool):
        lines.append(f'{key}: {"true" if value else "false"}\n')
    elif isinstance(value, (int, float)):
        lines.append(f'{key}: {value}\n')
    elif isinstance(value, str):
        if '\n' in value:
            lines.append(f'{key}: |\n')
            for line in value.split('\n'):
                lines.append(f'  {line}\n')
        else:
            lines.append(f'{key}: "{value}"\n')
    elif isinstance(value, list):
        if all(isinstance(v, (str, int, float)) for v in value):
            items = ', '.join(f'"{v}"' if isinstance(v, str) else str(v) for v in value)
            lines.append(f'{key}: [{items}]\n')
        else:
            lines.append(f'{key}:\n')
            for v in value:
                lines.append(f'  - "{v}"\n')
    elif isinstance(value, dict):
        # Simple flat dict
        kv_pairs = ', '.join(f'{k}: {v}' for k, v in value.items())
        lines.append(f'{key}: {{{kv_pairs}}}\n')

for path in files:
    entity_type = path.split('/')[1]
    safe_keys = SCHEMAS[entity_type]
    
    with open(path, 'r', encoding='utf-8') as f:
        text = f.read()
    
    # Extract frontmatter between --- markers
    m = re.match(r'^---\s*\n(.*?)\n---', text, re.DOTALL)
    if not m:
        print(f"  ⚠️ No frontmatter found")
        continue
    
    fm_str = m.group(1)
    body = text[m.end():]
    
    # Find all key: value pairs (ignoring indentation)
    pairs = {}
    
    # Find block scalar values (key: | or key: >)
    block_matches = re.finditer(r'^(\w[\w-]*)\s*:\s*([|>][-+]?)\s*$', fm_str, re.MULTILINE)
    block_keys = set()
    for bm in block_matches:
        key = bm.group(1)
        block_keys.add(key)
        if key not in safe_keys:
            continue
        # Find indented content after this line
        pos = bm.end()
        rest = fm_str[pos:]
        block_lines = []
        for bline in rest.split('\n'):
            if bline.startswith('  ') or bline.startswith('\t'):
                block_lines.append(bline.strip())
            elif bline.strip() == '':
                block_lines.append('')
            else:
                break
        pairs[key] = '\n'.join(block_lines).strip()
    
    # Find simple key: value pairs
    for m2 in re.finditer(r'^(\w[\w-]*)\s*:\s*(.*)', fm_str, re.MULTILINE):
        key = m2.group(1)
        val_str = m2.group(2).strip()
        
        if key in block_keys:
            continue  # already handled above
        
        if key not in safe_keys:
            continue
        
        if val_str == '' or val_str == 'null' or val_str == '~':
            pairs[key] = None
        elif val_str.lower() == 'true':
            pairs[key] = True
        elif val_str.lower() == 'false':
            pairs[key] = False
        elif is_inline_dict(val_str):
            pairs[key] = parse_inline_dict(val_str)
        elif is_inline_list(val_str):
            pairs[key] = parse_inline_list(val_str)
        elif re.match(r'^\d+$', val_str):
            pairs[key] = int(val_str)
        elif re.match(r'^\d+\.\d+$', val_str):
            pairs[key] = float(val_str)
        else:
            # String — strip surrounding quotes
            clean = val_str
            if len(clean) >= 2 and clean[0] == clean[-1] and clean[0] in ('"', "'"):
                clean = clean[1:-1]
            pairs[key] = clean
    
    # Rebuild frontmatter in safe key order
    lines = []
    for key in safe_keys:
        if key in pairs:
            write_val(key, pairs[key], lines)
    
    new_fm = ''.join(lines)
    new_text = f'---\n{new_fm}---{body}'
    
    # Write
    with open(path, 'w', encoding='utf-8') as f:
        f.write(new_text)
    
    # Count fields written
    field_count = sum(1 for k in safe_keys if k in pairs)
    print(f"✅ {path} — {field_count} fields written")
    if pairs:
        expected = set(pairs.keys())
        written = set(k for k in safe_keys if k in pairs)
        missing = expected - written
        if missing:
            print(f"   Missing keys: {missing}")

print("\n🎯 Done!")