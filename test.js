const {
  loadEntity,
  getRelatedEntities,
  getSimilarRappers,
  findEntitiesByRelation,
  buildGraph,
} = require("./lib/graph")

// 1. Load an entity
const yzo = loadEntity("raperi", "yzomandias")
console.log("📦 loadEntity:", yzo?.mdx?.split("\n")[0], "\n")

// 2. Get related genres
const genres = getRelatedEntities(yzo, "genres")
console.log("🎵 Genres of Yzomandias:", genres.map((g) => g.slug), "\n")

// 3. Find similar rappers
const similar = getSimilarRappers("yzomandias")
console.log("👥 Similar to Yzomandias:", similar, "\n")

// 4. Dynamic query
const trapRappers = findEntitiesByRelation({
  type: "raperi",
  genres: ["trap"],
})
console.log("🎤 Trap rappers:", trapRappers.map((r) => r.slug), "\n")

// 5. Full graph
const graph = buildGraph()
console.log("🌐 Graph stats:")
console.log("   Nodes:", graph.nodes.length)
console.log("   Edges:", graph.edges.length)
console.log("\n✅ All good")