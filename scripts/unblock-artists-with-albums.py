#!/usr/bin/env python3
"""
Odblokuje noindex/draft u interpretů, kteří mají reálná alba.

Kontext: scripts/cleanup-entities.ts (2026-06-19) označil CZ/SK interprety
s quality_score <= 1 jako draft/noindex — ale ignoroval, že někteří mají
plnou diskografii. 10 reálných rapperů tak bylo skrytých z Googlu.

Kritéria pro odblokování (VŠECHNA musí platit):
  1. type == artist
  2. má >= 1 album v relations.json
  3. alespoň jedno album má >= 3 tracky (reálné album, ne prázdný stub)
  4. NENÍ v explicitním blacklistu (mediální projekty, ne rappeři)

Akce: odstraní `status: draft`, `isStub`, `noindex` z meta.json.
Backup před změnou.
"""
import json, os, shutil, sys

ROOT = "content/entities"
BACKUP = ".backups/unblock-artists-20261013"
DRY = "--write" not in sys.argv

# Mediální projekty / nejednoznačné entity — NEODBLOKOVÁVAT
BLACKLIST = {
    "artist_the-mag",  # videomagazín, není rapper
}

def main():
    ents = {}
    for d in sorted(os.listdir(ROOT)):
        mp = os.path.join(ROOT, d, "meta.json")
        if not os.path.exists(mp):
            continue
        ents[d] = json.load(open(mp, encoding="utf-8"))

    def rel(d):
        p = os.path.join(ROOT, d, "relations.json")
        return json.load(open(p, encoding="utf-8")) if os.path.exists(p) else {}

    candidates = []
    for slug, m in ents.items():
        if not slug.startswith("artist_"):
            continue
        blocked = m.get("isStub") is True or m.get("noindex") is True or m.get("status") == "draft"
        if not blocked or slug in BLACKLIST:
            continue
        r = rel(slug)
        albums = r.get("albums", []) or []
        # ověř, že alespoň jedno album má >= 3 tracky
        good_albums = 0
        for aid in albums:
            ar = rel(aid)
            if len(ar.get("tracks", []) or []) >= 3:
                good_albums += 1
        if albums and good_albums >= 1:
            candidates.append((slug, m.get("title"), len(albums), good_albums))

    print(f"{'[DRY RUN] ' if DRY else ''}Kandidáti na odblokování: {len(candidates)}\n")
    for slug, title, na, ng in sorted(candidates, key=lambda x: -x[2]):
        print(f"  {title:<20} alba:{na:>2} (s tracky:{ng:>2})  {slug}")

    if DRY:
        print("\nNic zapsáno. Spusť s --write.")
        return

    os.makedirs(BACKUP, exist_ok=True)
    changed = 0
    for slug, title, _, _ in candidates:
        mp = os.path.join(ROOT, slug, "meta.json")
        shutil.copy2(mp, os.path.join(BACKUP, slug + ".meta.json"))
        m = json.load(open(mp, encoding="utf-8"))
        for k in ("status", "isStub", "noindex", "stubReason", "draftReason"):
            m.pop(k, None)
        m["verification"] = m.get("verification") or "unverified"
        json.dump(m, open(mp, "w", encoding="utf-8"), ensure_ascii=False, indent=2)
        changed += 1
    print(f"\n✅ Odblokováno: {changed} interpretů. Backup: {BACKUP}")

if __name__ == "__main__":
    main()
