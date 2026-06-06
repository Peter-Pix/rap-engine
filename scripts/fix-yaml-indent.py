#!/usr/bin/env python3
"""fix-yaml-indent.py — Fix indentation and type issues from cleanup"""

import re, os

fixes = []

# ─── FIX 1: Normalize indentation in all broken files ───
yaml_broken = [
    'raperi/astral-one.mdx', 'raperi/astralkid22.mdx', 'raperi/badboy-berlin.mdx',
    'raperi/blako.mdx', 'raperi/bobby-blaze.mdx', 'raperi/dj-opia.mdx',
    'raperi/kamil-hoffmann.mdx', 'raperi/robin-zoot.mdx', 'raperi/tk27.mdx',
    'labely/rychli-kluci.mdx', 'labely/ty-nikdy.mdx', 'labely/znk.mdx',
]

for filepath in yaml_broken:
    path = f'content/{filepath}'
    with open(path, 'r', encoding='utf-8') as f:
        text = f.read()
    
    lines = text.split('\n')
    in_fm = False
    fm_end = -1
    # Check if frontmatter has extra indentation
    fixed_lines = []
    for i, line in enumerate(lines):
        stripped = line.strip()
        if stripped == '---' and not in_fm:
            in_fm = True
            fixed_lines.append('---')
            continue
        elif stripped == '---' and in_fm and fm_end < 0:
            fm_end = i
            fixed_lines.append('---')
            continue
        elif not in_fm or i > fm_end:
            fixed_lines.append(line)
            continue
        
        # In frontmatter — check if line is indented but should be top-level
        # Lines starting with 2+ spaces that are not list items
        if line.startswith('  ') and not line.lstrip().startswith('- '):
            # This is over-indented — de-indent
            fixed_lines.append(line.lstrip())
        else:
            fixed_lines.append(line)
    
    if fixed_lines != lines:
        with open(path, 'w', encoding='utf-8') as f:
            f.write('\n'.join(fixed_lines))
        print(f"✅ {filepath} — fixed indentation")
    else:
        print(f"  {filepath} — no indentation changes needed")

# ─── FIX 2: Fix incompatible types ───
# origin as object → string
for f, field, fix_val in [
    ('raperi/alla-xul-elu.mdx', None, None),  # handled specially
    ('raperi/kvitek.mdx', None, None),
]:
    pass  # handled below

# alla-xul-elu: origin: {"city":"Detroit",...} → string
path = 'content/raperi/alla-xul-elu.mdx'
with open(path, 'r', encoding='utf-8') as f:
    text = f.read()
text = text.replace(
    'origin: {"city":"Detroit","state":"Michigan","country":"USA"}',
    'origin: "Detroit, Michigan, USA"'
)
with open(path, 'w', encoding='utf-8') as f:
    f.write(text)
print(f"✅ {path} — fixed origin object→string")

# kvitek: origin: ["Ctětín", ...] → string
path = 'content/raperi/kvitek.mdx'
with open(path, 'r', encoding='utf-8') as f:
    text = f.read()
text = text.replace(
    'origin: ["Ctětín (část obce)","Pardubický kraj","Czech Republic"]',
    'origin: "Ctětín, Pardubický kraj, Czech Republic"'
)
with open(path, 'w', encoding='utf-8') as f:
    f.write(text)
print(f"✅ {path} — fixed origin list→string")

# dj-aka: origin: ["Praha, Czech Republic"] → string
path = 'content/raperi/dj-aka.mdx'
with open(path, 'r', encoding='utf-8') as f:
    text = f.read()
text = text.replace(
    'origin: ["Praha, Czech Republic"]',
    'origin: "Praha, Czech Republic"'
)
with open(path, 'w', encoding='utf-8') as f:
    f.write(text)
print(f"✅ {path} — fixed origin list→string")

# activeSince: number → string in 4 files
for f in ['dj-fatte', 'jickson', 'samey']:
    path = f'content/raperi/{f}.mdx'
    with open(path, 'r', encoding='utf-8') as fh:
        text = fh.read()
    # Find activeSince: number
    m = re.search(r'activeSince: (\d+)', text)
    if m:
        num = m.group(1)
        text = text.replace(f'activeSince: {num}', f'activeSince: "{num}"')
        with open(path, 'w', encoding='utf-8') as fh:
            fh.write(text)
        print(f"✅ {path} — activeSince number→string ({num})")

# alba/eskort.mdx activeSince
path = 'content/alba/eskort.mdx'
with open(path, 'r', encoding='utf-8') as fh:
    text = fh.read()
m = re.search(r'activeSince: (\d+)', text)
if m:
    num = m.group(1)
    text = text.replace(f'activeSince: {num}', f'activeSince: "{num}"')
    with open(path, 'w', encoding='utf-8') as fh:
        fh.write(text)
    print(f"✅ {path} — activeSince number→string ({num})")

print("\n🎯 YAML fixes applied!")