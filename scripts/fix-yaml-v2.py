#!/usr/bin/env python3
"""fix-yaml-v2.py — round 2: fix remaining YAML issues

Fixes:
1. BOM removal (\ufeff before ---)
2. Missing --- closing frontmatter (all rapper files without it)
3. Dj Opia: broken double-quoted context field
4. Wrong type: single/lp → Skladba/Album
"""

import os, re, glob

content_dir = 'content'
fixed = 0
issues = []

for filepath in sorted(glob.glob(f'{content_dir}/**/*.mdx', recursive=True)):
    with open(filepath, 'rb') as f:
        raw = f.read()
    text = raw.decode('utf-8')
    original = text

    was_changed = False

    # ── 1. Strip BOM ──
    if text.startswith('\ufeff'):
        text = text[1:]
        issues.append(f'  BOM {filepath}')
        was_changed = True

    lines = text.split('\n')

    # Only process files that start with ---
    if not lines or lines[0].strip() != '---':
        continue

    # ── 2. Missing closing --- ──
    fm_close = -1
    for i in range(1, min(len(lines), 250)):
        if lines[i].strip() == '---':
            fm_close = i
            break

    if fm_close == -1:
        # Find first markdown heading
        for i in range(1, len(lines)):
            if re.match(r'^#{1,3}\s', lines[i]):
                insert_at = i - 1
                while insert_at > 1 and lines[insert_at].strip() == '':
                    insert_at -= 1
                lines.insert(insert_at + 1, '---')
                text = '\n'.join(lines)
                issues.append(f'  ADDED --- close {filepath} (at line {insert_at+2})')
                was_changed = True
                break

    # ── 3. Dj Opia: fix multi-line double-quoted context ──
    if 'dj-opia' in filepath:
        # The context field has multi-line content in double quotes.
        # Replace: "  context: \"long text...\"" with block scalar
        text = re.sub(
            r'  context: "(.+?)"(?=\n\s{2}\w)',
            lambda m: '  context: |\n    ' + m.group(1).replace('\n', '\n    '),
            text,
            flags=re.DOTALL
        )
        if text != original or was_changed:
            # Re-check if changed
            if text != original:
                issues.append(f'  FIXED dj-opia context quote → block scalar')
                was_changed = True

    # ── 4. Wrong type ──
    # Contentlayer uses the "type" field (or config.documentTypeField) to determine doc type
    new_text = re.sub(r'^type:\s*"?single"?$', 'type: "Skladba"', text, flags=re.MULTILINE)
    if new_text != text and not was_changed:
        issues.append(f'  FIXED type: single→Skladba {filepath}')
    text = new_text
    new_text = re.sub(r'^type:\s*"?lp"?$', 'type: "Album"', text, flags=re.MULTILINE)
    if new_text != text and not was_changed:
        issues.append(f'  FIXED type: lp→Album {filepath}')
    text = new_text
    if text != original:
        was_changed = True

    if was_changed:
        with open(filepath, 'w', encoding='utf-8') as f:
            f.write(text)
        fixed += 1

print(f'Fixed: {fixed} files')
for i in issues:
    print(i)