# System Prompt — Rap Knowledge Graph

Create a scalable content + knowledge graph system for a rap/hip-hop website (like 4rap.cz).

🔴 CORE REQUIREMENT:
Every entity MUST be represented as its own folder (not a file).
Each entity is a node in a graph. Relationships between entities are more important than hierarchy.

---

📁 FILESYSTEM STRUCTURE

Generate this base structure:

content/
  raperi/
  alba/
  zanry/
  labely/
  lokality/

Each entity must be its own folder:

Example:
content/raperi/yzomandias/
  index.mdx
  relations.json

---

📦 ENTITY STRUCTURE

Each entity folder must contain:

1) index.mdx → content layer (UI, SEO)
2) relations.json → graph relations (edges)

---

📄 index.mdx TEMPLATE

Generate MDX template with frontmatter:

---
title: "Entity Name"
slug: "entity-slug"
description: "Short description"
publishedAt: "2024-01-01"
---

Main content here...

---

📊 relations.json TEMPLATE

Create a flexible, normalized relations schema:

{
  "genres": [],
  "styles": [],
  "themes": [],
  "moods": [],

  "scene": [],
  "locations": [],
  "labels": [],

  "artists": [],
  "albums": [],

  "related": [],
  "influencedBy": [],
  "partOf": []
}

---

🧠 GRAPH PRINCIPLES

- ALL values are string slugs referencing other folders
- NO duplication of full data (only references)
- SYSTEM MUST BE SYMMETRIC:
  if rapper → genre
  genre can also reference rapper

---

🔗 GRAPH RELATION TYPES

Implement graph logic using these concepts:

- PERFORMS → rapper → genre
- HAS_STYLE → rapper → style
- HAS_THEME → rapper → theme
- HAS_MOOD → rapper → mood
- BELONGS_TO → rapper → scene
- ORIGINATES_FROM → rapper → location

---

⚙️ IMPLEMENTATION TASKS

1. Create utility functions:

- loadEntity(type, slug)
- getRelations(entity)
- resolveRelation(type, slug)
- getRelatedEntities(entity, relationKey)

---

2. Create graph traversal helper:

getSimilarRappers(slug):
 → find rappers with:
   same genre OR
   same mood OR
   same style

---

3. Create relation resolver:

Example:
"trap" → load content/zanry/trap/
"yzomandias" → content/raperi/yzomandias/

---

4. Create dynamic query function:

findEntitiesByRelation({
  type: "raperi",
  genres: ["trap"],
  moods: ["dark"]
})

---

🧱 IMPORTANT DESIGN RULES

- DO NOT create nested structures (no parent folders)
- DO NOT hardcode relationships
- EVERYTHING must be resolved dynamically via slug relations

---

🎯 OPTIONAL (ADVANCED)

Add support for weighted relations:

{
  "genres": [
    { "id": "trap", "weight": 0.9 },
    { "id": "drill", "weight": 0.4 }
  ]
}

---

💡 OUTPUT

Generate:

✅ folder structure
✅ MDX templates
✅ relations.json template
✅ utility JS/TS functions
✅ example entity (rapper + genre)
✅ graph traversal helpers

---

🔴 FINAL GOAL:

System should behave as a graph database:
- filesystem = data storage
- relations.json = edges
- runtime = graph engine

DO NOT build a CMS.
DO NOT build UI.
ONLY build content structure + graph logic.