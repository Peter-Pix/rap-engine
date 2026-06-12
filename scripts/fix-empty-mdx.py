#!/usr/bin/env python3
"""Fix all empty entity.mdx files by adding description from meta.json."""
import os, re, json

BASE = "content/entities"
fixed = 0
for d in sorted(os.listdir(BASE)):
    mdx_path = os.path.join(BASE, d, "entity.mdx")
    meta_path = os.path.join(BASE, d, "meta.json")
    if not os.path.exists(mdx_path) or not os.path.exists(meta_path):
        continue
    text = open(mdx_path, "r", encoding="utf-8").read()
    body = re.sub(r"^---\n.*?---\n", "", text, flags=re.DOTALL, count=1).strip()
    if not body:
        meta = json.load(open(meta_path, "r", encoding="utf-8"))
        desc = meta.get("description", meta.get("title", ""))
        # Append description after frontmatter
        new_text = text.rstrip() + f"\n\n{desc}\n"
        with open(mdx_path, "w", encoding="utf-8") as f:
            f.write(new_text)
        fixed += 1
        print(f"Fixed: {d}")

print(f"\nTotal fixed: {fixed}")
