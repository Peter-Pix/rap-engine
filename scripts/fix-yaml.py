#!/usr/bin/env python3
"""fix-yaml.py — fix broken YAML frontmatter in MDX files

Fixes:
1. CRLF → LF (30+ files)
2. Missing --- close in rapper frontmatter (astral-one, badboy-berlin, kamil-hoffmann)
3. Dj Opia: multi-line double-quoted context → block scalar |
4. Bad type: single/lp → Skladba/Album
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

    # ── 1. CRLF → LF ──
    if '\r\n' in text:
        text = text.replace('\r\n', '\n')
        issues.append(f'  CRLF {filepath}')

    lines = text.split('\n')
    if not lines or lines[0].strip() != '---':
        continue

    # ── 2. Missing closing --- ──
    fm_close = -1
    for i in range(1, min(len(lines), 200)):
        if lines[i].strip() == '---':
            fm_close = i
            break

    if fm_close == -1:
        # No closing ---. Find first markdown heading.
        for i in range(1, len(lines)):
            if re.match(r'^#{1,3}\s', lines[i]):
                insert_at = i - 1
                while insert_at > 1 and lines[insert_at].strip() == '':
                    insert_at -= 1
                lines.insert(insert_at + 1, '---')
                text = '\n'.join(lines)
                issues.append(f'  ADDED --- close {filepath} (at line {insert_at+2})')
                break

    # ── 3. Dj Opia: fix multi-line double-quoted context ──
    if 'dj-opia' in filepath:
        # Replace: context: "..." (multi-line) → context: | (block scalar)
        # Find the context: line and convert its string to block scalar
        def fix_context(m):
            prefix = m.group(1)  # indentation spaces
            content = m.group(2)
            # Indent each line with 2 extra spaces
            indented = content.replace('\n', '\n' + prefix + '  ')
            return f'{prefix}context: |\n{prefix}  {indented}'

        text = re.sub(
            r'( *)context: "(.+?)"(?=\n\1\w)',  # match indented group with double quotes
            fix_context,
            text,
            flags=re.DOTALL
        )
        # Simpler: just replace the opening " with |\n  and remove closing "
        text = re.sub(
            r'  context: "(.*?)"(\n\s{2}\w)',
            lambda m: '  context: |\n    ' + m.group(1).replace('\n', '\n    ') + m.group(2),
            text,
            flags=re.DOTALL
        )
        
    # ── 4. Wrong type (single/lp → Skladba/Album) ──
    text = re.sub(r'^type:\s*"?single"?$', 'type: "Skladba"', text, flags=re.MULTILINE)
    text = re.sub(r'^type:\s*"?lp"?$', 'type: "Album"', text, flags=re.MULTILINE)

    if text != original:
        with open(filepath, 'w', encoding='utf-8') as f:
            f.write(text)
        fixed += 1

print(f'Fixed: {fixed} files')
for i in issues:
    print(i)