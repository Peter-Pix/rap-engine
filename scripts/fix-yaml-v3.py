#!/usr/bin/env python3
"""fix-yaml-v3.py — final round: fix remaining type & field issues

Fixes:
1. Remove `type:` field from all files (Contentlayer infers type from filePathPattern)
2. Rename artist/artistSlug → rapper/rapperSlug in erupce.mdx
"""

import os, re, glob

content_dir = 'content'
fixed = 0
issues = []

for filepath in sorted(glob.glob(f'{content_dir}/**/*.mdx', recursive=True)):
    with open(filepath, 'r', encoding='utf-8') as f:
        text = f.read()
    original = text
    was_changed = False

    lines = text.split('\n')
    if not lines or lines[0].strip() != '---':
        continue

    # Find frontmatter range
    fm_end = -1
    for i in range(1, min(len(lines), 250)):
        if lines[i].strip() == '---':
            fm_end = i
            break
    if fm_end == -1:
        continue

    fm_lines = lines[1:fm_end]

    # ── 1. Remove `type` field from frontmatter ──
    new_fm = []
    removed_type = False
    for line in fm_lines:
        if re.match(r'^type:\s', line):
            removed_type = True
        else:
            new_fm.append(line)
    if removed_type:
        lines = [lines[0]] + new_fm + lines[fm_end:]
        text = '\n'.join(lines)
        issues.append(f'  REMOVED type field: {filepath}')
        was_changed = True

    # ── 2. erupce.mdx: artist/artistSlug → rapper/rapperSlug ──
    # Re-parse lines since frontmatter shifted
    if 'erupce' in filepath:
        lines = text.split('\n')
        new_text = re.sub(r'^artist:\s*"(.+?)"', r'rapper: "\1"', text, flags=re.MULTILINE)
        new_text = re.sub(r'^artistSlug:\s*"(.+?)"', r'rapperSlug: "\1"', new_text, flags=re.MULTILINE)
        if new_text != text:
            text = new_text
            issues.append(f'  FIXED artist→rapper in {filepath}')
            was_changed = True

    if was_changed:
        with open(filepath, 'w', encoding='utf-8') as f:
            f.write(text)
        fixed += 1

print(f'Fixed: {fixed} files')
for i in issues:
    print(i)