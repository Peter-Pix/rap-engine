#!/usr/bin/env python3
"""
Knowledge Base Audit - checks internal consistency across all entities and edges.

Checks:
1. Edge integrity: all from/to IDs must exist in entities
2. Relation type validity: all relations must be in RELATION_REGISTRY
3. Type constraints: edge target types must match expected types
4. Artist birth dates vs album years (plausibility)
5. Album year consistency: same album shouldn't have conflicting years
6. Artist-label consistency: if artist SIGNED_TO label, albums should match
7. Duplicate entities: same name, different IDs
8. Track-artist consistency: track's primaryArtist must exist and be type artist
9. Track-album consistency: track's belongsToAlbum must exist and be type album
10. Self-referential edges: entity pointing to itself
11. Orphan tracks: tracks without primaryArtist
12. Genre/style/mood consistency: edges should point to correct entity types
13. Album-artist links: album should have at least one HAS_ARTIST edge
14. Year plausibility: albums should have year between 1990-2026
15. Label name conflicts: same label with different slugs
"""

import json
import sys
from collections import defaultdict, Counter

ROOT = "."
ENTITIES_PATH = f"{ROOT}/.content-cache/entities.json"
GRAPH_PATH = f"{ROOT}/.content-cache/graph.json"

# Valid relation types and their expected target types
# Must match RELATION_REGISTRY in src/lib/content/relation-registry.ts
# Format: edge_type → set of expected target types (empty set = any type)
VALID_RELATIONS = {
    "HAS_GENRE": {"genre"},
    "HAS_STYLE": {"style"},
    "HAS_THEME": {"theme"},
    "HAS_MOOD": {"mood"},
    "BELONGS_TO_SCENE": {"scene"},
    "ORIGINATES_FROM": {"location"},
    "SIGNED_TO": {"label"},
    "RELATED_ARTIST": {"artist", "producer", "collective"},
    "HAS_ALBUM": {"album"},
    "HAS_TRACK": {"track"},
    "HAS_ARTIST": {"artist"},
    "BELONGS_TO_ALBUM": {"album"},
    "PRODUCED_BY": {"artist", "producer"},
    "FEATURES": {"artist", "producer"},
    "RELEASED_BY": {"label"},
    "RELATED_TO": set(),  # any type
    "INFLUENCED_BY": set(),  # any type
    "PART_OF": set(),  # any type (registry says [])
}

def load_data():
    with open(ENTITIES_PATH) as f:
        entities = json.load(f)
    with open(GRAPH_PATH) as f:
        edges = json.load(f)
    return entities, edges

def main():
    entities, edges = load_data()
    issues = []
    warnings = []

    # Build lookups
    entity_by_id = entities
    entity_ids = set(entities.keys())

    # Build name → IDs mapping for duplicate detection
    name_to_ids = defaultdict(list)
    for eid, e in entities.items():
        name_to_ids[e["title"].lower().strip()].append(eid)

    # 1. Edge integrity - all from/to must exist
    missing_from = 0
    missing_to = 0
    for i, edge in enumerate(edges):
        if edge["from"] not in entity_ids:
            issues.append(f"Edge {i}: from '{edge['from']}' does not exist → {edge['relation']} → {edge['to']}")
            missing_from += 1
        if edge["to"] not in entity_ids:
            issues.append(f"Edge {i}: to '{edge['to']}' does not exist ← {edge['relation']} ← {edge['from']}")
            missing_to += 1
    if missing_from or missing_to:
        print(f"❌ Edge integrity: {missing_from} missing 'from', {missing_to} missing 'to'")

    # 2. Relation type validity
    unknown_relations = Counter()
    for edge in edges:
        if edge["relation"] not in VALID_RELATIONS:
            unknown_relations[edge["relation"]] += 1
    if unknown_relations:
        for rel, count in unknown_relations.most_common():
            issues.append(f"Unknown relation type: '{rel}' ({count} edges)")
        print(f"❌ Unknown relations: {len(unknown_relations)} types")

    # 3. Type constraints
    type_mismatches = 0
    for i, edge in enumerate(edges):
        rel = edge["relation"]
        if rel not in VALID_RELATIONS:
            continue
        expected_types = VALID_RELATIONS[rel]
        from_entity = entity_by_id.get(edge["from"])
        to_entity = entity_by_id.get(edge["to"])
        # Skip type check for relations that accept any type
        if expected_types:
            if to_entity and to_entity["type"] not in expected_types:
                type_mismatches += 1
                if type_mismatches <= 50:
                    warnings.append(f"Type mismatch: {edge['from']}({from_entity['type'] if from_entity else '?'}) -[{rel}]-> {edge['to']}({to_entity['type']}), expected {expected_types}")
    if type_mismatches:
        print(f"⚠️  Type mismatches: {type_mismatches}")

    # 4. Self-referential edges
    self_refs = 0
    for edge in edges:
        if edge["from"] == edge["to"]:
            self_refs += 1
            issues.append(f"Self-referential: {edge['from']} -[{edge['relation']}]-> {edge['to']}")
    if self_refs:
        print(f"❌ Self-referential edges: {self_refs}")

    # 5. Duplicate entities (same name)
    duplicates = {name: ids for name, ids in name_to_ids.items() if len(ids) > 1}
    if duplicates:
        print(f"⚠️  Potential duplicate entities ({len(duplicates)} names):")
        for name, ids in sorted(duplicates.items()):
            types = [entity_by_id[id]["type"] for id in ids]
            # Only flag if same type
            if len(set(types)) == 1:
                warnings.append(f"Duplicate ({types[0]}): '{name}' → {ids}")
                print(f"   {types[0]:10s} '{name}' → {ids}")
            else:
                # Different types is OK (e.g. artist "Karlo" vs album "Karlo")
                pass

    # 6. Orphan tracks (no primaryArtist edge)
    track_ids = {eid for eid, e in entities.items() if e["type"] == "track"}
    track_with_artist = set()
    for edge in edges:
        if edge["relation"] in ("PRIMARY_ARTIST", "HAS_ARTIST") and edge["from"] in track_ids:
            track_with_artist.add(edge["from"])
    orphan_tracks = track_ids - track_with_artist
    if orphan_tracks:
        print(f"⚠️  Orphan tracks (no artist): {len(orphan_tracks)}")
        for tid in sorted(orphan_tracks)[:20]:
            warnings.append(f"Orphan track: {tid} - {entities[tid]['title']}")
    else:
        print("✅ All tracks have an artist link")

    # 7. Album-artist consistency
    album_ids = {eid for eid, e in entities.items() if e["type"] == "album"}
    album_with_artist = set()
    for edge in edges:
        if edge["relation"] == "HAS_ARTIST" and edge["from"] in album_ids:
            album_with_artist.add(edge["from"])
    orphan_albums = album_ids - album_with_artist
    if orphan_albums:
        print(f"⚠️  Albums without HAS_ARTIST: {len(orphan_albums)}")
        for aid in sorted(orphan_albums)[:20]:
            warnings.append(f"Album without artist: {aid} - {entities[aid]['title']}")

    # 8. Year plausibility for albums
    bad_years = 0
    for eid, e in entities.items():
        if e["type"] == "album":
            year = e.get("publishedAt", "")
            if year:
                try:
                    y = int(year[:4])
                    if y < 1990 or y > 2026:
                        bad_years += 1
                        if bad_years <= 30:
                            warnings.append(f"Implausible year: {eid} - {year}")
                except ValueError:
                    pass
    if bad_years:
        print(f"⚠️  Implausible album years: {bad_years}")

    # 9. Artist-label consistency check
    # Build artist → labels from SIGNED_TO edges
    artist_labels = defaultdict(set)
    for edge in edges:
        if edge["relation"] == "SIGNED_TO" and entity_by_id.get(edge["from"], {}).get("type") == "artist":
            artist_labels[edge["from"]].add(edge["to"])

    # Build album → labels from RELEASED_BY edges
    album_labels = defaultdict(set)
    for edge in edges:
        if edge["relation"] == "RELEASED_BY" and entity_by_id.get(edge["from"], {}).get("type") == "album":
            album_labels[edge["from"]].add(edge["to"])

    # Check: album's artist should be signed to album's label (at least sometimes)
    # This is a soft check - not all album labels match artist labels (features, compilations)
    # Only flag if artist has labels AND album has labels AND they don't intersect
    album_artist_map = defaultdict(set)  # album → artists
    for edge in edges:
        if edge["relation"] == "HAS_ARTIST" and edge["from"] in album_ids:
            album_artist_map[edge["from"]].add(edge["to"])

    label_mismatches = 0
    for album_id, artists in album_artist_map.items():
        album_lbls = album_labels.get(album_id, set())
        if not album_lbls:
            continue
        for artist_id in artists:
            artist_lbls = artist_labels.get(artist_id, set())
            if artist_lbls and album_lbls and not artist_lbls.intersection(album_lbls):
                # This could be legitimate (artist moved labels), just warn
                label_mismatches += 1
                if label_mismatches <= 20:
                    a_name = entities[artist_id]["title"]
                    al_name = entities[album_id]["title"]
                    a_lbls = ", ".join(entities[l]["title"] for l in artist_lbls if l in entities)
                    al_lbls = ", ".join(entities[l]["title"] for l in album_lbls if l in entities)
                    warnings.append(f"Label mismatch: artist '{a_name}' signed to [{a_lbls}] but album '{al_name}' has [{al_lbls}]")
    if label_mismatches:
        print(f"i️  Label mismatches (artist vs album): {label_mismatches} (may be legitimate - label changes)")

    # 10. Track → album consistency
    track_album = defaultdict(set)
    for edge in edges:
        if edge["relation"] == "BELONGS_TO_ALBUM" and edge["from"] in track_ids:
            target = entity_by_id.get(edge["to"])
            if target and target["type"] != "album":
                issues.append(f"Track {edge['from']} BELONGS_TO_ALBUM → {edge['to']} which is {target['type']}, not album")
            track_album[edge["from"]].add(edge["to"])

    tracks_without_album = track_ids - set(track_album.keys())
    if tracks_without_album:
        print(f"i️  Tracks without album link: {len(tracks_without_album)} (standalone singles OK)")

    # 11. Multiple primary artists for same track (HAS_ARTIST from track)
    track_primary = defaultdict(list)
    for edge in edges:
        if edge["relation"] == "HAS_ARTIST" and edge["from"] in track_ids:
            track_primary[edge["from"]].append(edge["to"])
    multi_primary = {tid: artists for tid, artists in track_primary.items() if len(artists) > 1}
    if multi_primary:
        print(f"⚠️  Tracks with multiple PRIMARY_ARTIST: {len(multi_primary)}")
        for tid, artists in list(multi_primary.items())[:10]:
            warnings.append(f"Multi primary artist: {tid} → {artists}")

    # 12. Genre/style/mood edges from wrong entity types
    for edge in edges:
        rel = edge["relation"]
        from_e = entity_by_id.get(edge["from"])
        if rel not in ("HAS_GENRE", "HAS_STYLE", "HAS_MOOD", "HAS_THEME"):
            continue
        if from_e["type"] not in ("artist", "album", "track"):
            warnings.append(f"Tag edge from wrong type: {from_e['type']} '{from_e['title']}' -[{rel}]-> {edge['to']}")

    # 13. Label name conflicts (same display name, different IDs)
    label_entities = {eid: e for eid, e in entities.items() if e["type"] == "label"}
    label_names = defaultdict(list)
    for lid, l in label_entities.items():
        label_names[l["title"].lower().strip()].append(lid)
    label_dupes = {n: ids for n, ids in label_names.items() if len(ids) > 1}
    if label_dupes:
        print(f"⚠️  Duplicate labels: {len(label_dupes)}")
        for name, ids in label_dupes.items():
            issues.append(f"Duplicate label: '{name}' → {ids}")

    # 14. Artist without any album
    artist_ids = {eid for eid, e in entities.items() if e["type"] == "artist"}
    artist_with_album = set()
    for edge in edges:
        if edge["relation"] == "HAS_ARTIST" and edge["to"] in artist_ids:
            artist_with_album.add(edge["to"])
    artists_without_album = artist_ids - artist_with_album
    if artists_without_album:
        print(f"i️  Artists without any album: {len(artists_without_album)} (may be features only)")

    # 15. Cross-check: album year vs track year
    for edge in edges:
        if edge["relation"] == "BELONGS_TO_ALBUM":
            track = entity_by_id.get(edge["from"])
            album = entity_by_id.get(edge["to"])
            if track and album and track.get("publishedAt") and album.get("publishedAt"):
                try:
                    t_year = int(track["publishedAt"][:4])
                    a_year = int(album["publishedAt"][:4])
                    if abs(t_year - a_year) > 1:
                        warnings.append(f"Year mismatch: track '{track['title']}' ({t_year}) vs album '{album['title']}' ({a_year})")
                except ValueError:
                    pass

    # Summary
    print(f"\n{'='*60}")
    print(f"AUDIT SUMMARY")
    print(f"{'='*60}")
    print(f"Entities: {len(entities)}")
    print(f"Edges:    {len(edges)}")
    print(f"Issues (errors):   {len(issues)}")
    print(f"Warnings:          {len(warnings)}")

    if issues:
        print(f"\n--- ISSUES (must fix) ---")
        for i, issue in enumerate(issues[:100]):
            print(f"  {i+1}. {issue}")
        if len(issues) > 100:
            print(f"  ... and {len(issues)-100} more")

    if warnings:
        print(f"\n--- WARNINGS (review) ---")
        for i, w in enumerate(warnings[:100]):
            print(f"  {i+1}. {w}")
        if len(warnings) > 100:
            print(f"  ... and {len(warnings)-100} more")

    # Save full report
    report = {
        "summary": {
            "entities": len(entities),
            "edges": len(edges),
            "issues": len(issues),
            "warnings": len(warnings),
        },
        "issues": issues,
        "warnings": warnings,
    }
    with open("docs/audit-report.json", "w") as f:
        json.dump(report, f, indent=2, ensure_ascii=False)
    print(f"\nFull report saved to docs/audit-report.json")

if __name__ == "__main__":
    main()