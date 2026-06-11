/**
 * Rap Knowledge Graph Engine
 *
 * filesystem = data storage
 * relations.json = edges
 * runtime = graph engine
 */

const fs = require("fs")
const path = require("path")

const CONTENT_ROOT = path.join(process.cwd(), "content")

const TYPE_MAP = {
  raperi: "raperi",
  alba: "alba",
  zanry: "zanry",
  labely: "labely",
  lokality: "lokality",
  styles: "styles",
  moods: "moods",
  themes: "themes",
  scenes: "scenes",
}

/**
 * Load a single entity by type and slug
 */
function loadEntity(type, slug) {
  const folder = path.join(CONTENT_ROOT, type, slug)
  if (!fs.existsSync(folder)) return null

  const mdxPath = path.join(folder, "index.mdx")
  const relationsPath = path.join(folder, "relations.json")

  const mdx = fs.existsSync(mdxPath) ? fs.readFileSync(mdxPath, "utf-8") : ""
  const relations = fs.existsSync(relationsPath)
    ? JSON.parse(fs.readFileSync(relationsPath, "utf-8"))
    : {}

  return { type, slug, mdx, relations }
}

/**
 * Get relations from an entity
 */
function getRelations(entity) {
  return entity?.relations ?? {}
}

/**
 * Resolve a slug reference to its full entity
 * e.g. "trap" → load("zanry", "trap")
 */
function resolveRelation(type, slug) {
  // If type is known, use it directly
  const knownType = Object.keys(TYPE_MAP).find((t) => t === type)
  if (knownType) return loadEntity(knownType, slug)

  // Otherwise try to resolve dynamically by sniffing all types
  for (const t of Object.keys(TYPE_MAP)) {
    const entity = loadEntity(t, slug)
    if (entity) return entity
  }
  return null
}

/**
 * Get related entities by relation key
 * e.g. getRelatedEntities(entity, "genres") → [entity, entity, ...]
 */
function getRelatedEntities(entity, relationKey) {
  const rels = getRelations(entity)
  const slugs = rels[relationKey] ?? []
  return slugs.flatMap((slug) => {
    // Try all type folders
    const found = Object.keys(TYPE_MAP)
      .map((t) => loadEntity(t, slug))
      .find(Boolean)
    return found ? [found] : []
  })
}

/**
 * Find similar rappers:
 * same genre OR same mood OR same style
 */
function getSimilarRappers(slug) {
  const rapper = loadEntity("raperi", slug)
  if (!rapper) return []

  const { genres = [], moods = [], styles = [] } = getRelations(rapper)

  const categories = [...genres, ...moods, ...styles]
  const candidates = new Map()

  for (const cat of categories) {
    // Try all relation keys
    for (const [key, slugs] of Object.entries({
      genres: [],
      moods: [],
      styles: [],
    })) {
      const entity = resolveRelation(null, cat)
      if (!entity) continue
      const entityRels = getRelations(entity)
      const relatedSlugs = entityRels[key] ?? []
      for (const s of relatedSlugs) {
        if (s !== slug) {
          candidates.set(s, (candidates.get(s) ?? 0) + 1)
        }
      }
    }
  }

  // Also check entities that reference this slug in their relations
  for (const t of Object.keys(TYPE_MAP)) {
    const dir = path.join(CONTENT_ROOT, t)
    if (!fs.existsSync(dir)) continue
    for (const folder of fs.readdirSync(dir)) {
      if (folder.startsWith("_")) continue
      const relationsPath = path.join(dir, folder, "relations.json")
      if (!fs.existsSync(relationsPath)) continue
      const rels = JSON.parse(fs.readFileSync(relationsPath, "utf-8"))
      for (const values of Object.values(rels)) {
        if (Array.isArray(values) && values.includes(slug)) {
          candidates.set(folder, (candidates.get(folder) ?? 0) + 1)
        }
      }
    }
  }

  return [...candidates.entries()]
    .sort((a, b) => b[1] - a[1])
    .map(([s, score]) => ({ slug: s, score }))
}

/**
 * Dynamic query: find entities matching criteria
 *
 * findEntitiesByRelation({
 *   type: "raperi",
 *   genres: ["trap"],
 *   moods: ["dark"]
 * })
 */
function findEntitiesByRelation(query) {
  const { type, ...criteria } = query
  const dir = path.join(CONTENT_ROOT, type)
  if (!fs.existsSync(dir)) return []

  const results = []

  for (const folder of fs.readdirSync(dir)) {
    if (folder.startsWith("_")) continue
    const entity = loadEntity(type, folder)
    if (!entity) continue

    const rels = getRelations(entity)
    let match = true

    for (const [key, wantedValues] of Object.entries(criteria)) {
      if (!Array.isArray(wantedValues)) continue
      const entityValues = rels[key] ?? []
      const hasMatch = wantedValues.some((v) => entityValues.includes(v))
      if (!hasMatch) {
        match = false
        break
      }
    }

    if (match) results.push(entity)
  }

  return results
}

/**
 * Get all entities of a given type
 */
function getAllEntities(type) {
  const dir = path.join(CONTENT_ROOT, type)
  if (!fs.existsSync(dir)) return []
  return fs
    .readdirSync(dir)
    .filter((f) => !f.startsWith("_"))
    .map((slug) => loadEntity(type, slug))
    .filter(Boolean)
}

/**
 * Build a full graph of all entities and their relations
 */
function buildGraph() {
  const graph = { nodes: [], edges: [] }

  for (const type of Object.keys(TYPE_MAP)) {
    const entities = getAllEntities(type)
    for (const entity of entities) {
      graph.nodes.push({
        id: `${type}/${entity.slug}`,
        type,
        slug: entity.slug,
      })

      const rels = getRelations(entity)
      for (const [relationType, targets] of Object.entries(rels)) {
        if (!Array.isArray(targets)) continue
        for (const target of targets) {
          graph.edges.push({
            from: entity.slug,
            relation: relationType.toUpperCase(),
            to: target,
          })
        }
      }
    }
  }

  return graph
}

module.exports = {
  loadEntity,
  getRelations,
  resolveRelation,
  getRelatedEntities,
  getSimilarRappers,
  findEntitiesByRelation,
  getAllEntities,
  buildGraph,
}