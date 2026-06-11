#!/usr/bin/env node
/**
 * Import raw data into the rap-knowledge-graph content structure.
 * Reads taxonomy/*.txt + genre/*.txt → generates content/
 */

const fs = require("fs")
const path = require("path")

const CONTENT = path.join(process.cwd(), "content")
const RAW = path.join(process.cwd(), "raw-data")

// Slugify helper
function slugify(str) {
  return str
    .toLowerCase()
    .replace(/[^a-z0-9\s-]/g, "")
    .replace(/\s+/g, "-")
    .replace(/-+/g, "-")
    .trim()
}

// Ensure directory exists
function ensureDir(dir) {
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true })
}

// Write JSON file
function writeJSON(filepath, data) {
  fs.writeFileSync(filepath, JSON.stringify(data, null, 2) + "\n")
}

// Write MDX file
function writeMDX(filepath, frontmatter, body) {
  const fmLines = []
  for (const [k, v] of Object.entries(frontmatter)) {
    if (typeof v === "string") fmLines.push(`${k}: "${v.replace(/"/g, '\\"')}"`)
    else if (Array.isArray(v)) fmLines.push(`${k}: [${v.map((x) => `"${x}"`).join(", ")}]`)
    else fmLines.push(`${k}: ${v}`)
  }
  const content = `---\n${fmLines.join("\n")}\n---\n\n${body}`
  fs.writeFileSync(filepath, content)
}

// === READ TAXONOMY FILES ===
function parseTaxonomy() {
  const dir = path.join(RAW, "taxonomy")
  const files = fs.readdirSync(dir).filter((f) => f.endsWith(".txt"))
  const rappers = []

  for (const file of files) {
    const content = fs.readFileSync(path.join(dir, file), "utf-8")
    const matches = content.matchAll(/\{([^}]+)\}/g)
    for (const m of matches) {
      try {
        const obj = eval("({" + m[1] + "})")
        rappers.push(obj)
      } catch (e) {
        console.warn("Parse error in", file, m[1])
      }
    }
  }
  return rappers
}

// === READ GENRE FILES ===
function parseGenres() {
  const dir = path.join(RAW, "genre")
  const files = fs.readdirSync(dir).filter((f) => f.endsWith(".txt") && !f.includes(" - kopie"))
  const genres = []

  for (const file of files) {
    const content = fs.readFileSync(path.join(dir, file), "utf-8")
    // Parse frontmatter
    const fmMatch = content.match(/^---\r?\n([\s\S]*?)\r?\n---\r?\n([\s\S]*)$/)
    if (!fmMatch) continue

    const fm = {}
    for (const line of fmMatch[1].split(/\r?\n/)) {
      const kv = line.match(/^(\w+):\s*["'](.+?)["']/)
      if (kv) fm[kv[1]] = kv[2]
    }

    const body = fmMatch[2].trim()
    const slug = fm.slug || slugify(fm.title || file.replace(".txt", ""))
    genres.push({ slug, fm, body })
  }
  return genres
}

// === COLLECT UNIQUE TAXONOMY VALUES ===
function collectTaxonomy(rappers) {
  const sets = {
    styles: new Set(),
    moods: new Set(),
    themes: new Set(),
    scenes: new Set(),
    genres: new Set(),
    locations: new Set(),
  }

  for (const r of rappers) {
    ;(r.style || []).forEach((s) => sets.styles.add(slugify(s)))
    ;(r.vibe || []).forEach((v) => sets.moods.add(slugify(v)))
    ;(r.themes || []).forEach((t) => sets.themes.add(slugify(t)))
    ;(r.scene || []).forEach((s) => sets.scenes.add(slugify(s)))
    ;(r.genre || []).forEach((g) => sets.genres.add(slugify(g)))
  }

  return Object.fromEntries(
    Object.entries(sets).map(([k, v]) => [k, [...v].sort()])
  )
}

// === GENERATE ENTITIES ===
;(() => {
  console.log("🧹 Cleaning old test data...")
  for (const type of ["raperi", "alba", "zanry", "labely", "lokality"]) {
    const dir = path.join(CONTENT, type)
    if (!fs.existsSync(dir)) continue
    for (const folder of fs.readdirSync(dir)) {
      if (folder.startsWith("_")) continue
      const fpath = path.join(dir, folder)
      if (fs.statSync(fpath).isDirectory()) {
        fs.rmSync(fpath, { recursive: true, force: true })
      }
    }
  }

  const rappers = parseTaxonomy()
  const genreFiles = parseGenres()
  const taxonomy = collectTaxonomy(rappers)

  console.log(`📊 Found ${rappers.length} rappers, ${genreFiles.length} genre files`)
  console.log(`📊 Taxonomy: ${taxonomy.genres.length} genres, ${taxonomy.styles.length} styles, ${taxonomy.moods.length} moods, ${taxonomy.themes.length} themes, ${taxonomy.scenes.length} scenes`)

  // === GENERATE GENRE ENTITIES ===
  // Genres that have rich text files + any additional from taxonomy
  const genreSlugsFromFiles = new Set(genreFiles.map((g) => g.slug))

  // Create rich genre entities from text files
  for (const gf of genreFiles) {
    const slug = gf.slug
    const folder = path.join(CONTENT, "zanry", slug)
    ensureDir(folder)

    writeMDX(
      path.join(folder, "index.mdx"),
      {
        title: gf.fm.title || slug,
        slug,
        description: gf.fm.description || "",
        publishedAt: gf.fm.publishedAt || "2024-01-01",
        type: "genre",
        origin: gf.fm.origin || "",
      },
      gf.body
    )

    writeJSON(path.join(folder, "relations.json"), {
      styles: [],
      themes: [],
      moods: [],
      scene: [],
      locations: [],
      related: [],
      influencedBy: [],
      partOf: [],
    })

    console.log(`  ✅ Genre: ${slug}`)
  }

  // Create genre entities from taxonomy that don't have text files
  for (const g of taxonomy.genres) {
    if (genreSlugsFromFiles.has(g)) continue
    const folder = path.join(CONTENT, "zanry", g)
    ensureDir(folder)

    writeMDX(
      path.join(folder, "index.mdx"),
      {
        title: g.charAt(0).toUpperCase() + g.slice(1),
        slug: g,
        description: "",
        publishedAt: "2024-01-01",
        type: "genre",
      },
      `# ${g.charAt(0).toUpperCase() + g.slice(1)}\n\n`
    )

    writeJSON(path.join(folder, "relations.json"), {
      styles: [],
      themes: [],
      moods: [],
      scene: [],
      locations: [],
      related: [],
      influencedBy: [],
      partOf: [],
    })

    console.log(`  ✅ Genre (auto): ${g}`)
  }

  // === GENERATE STYLE ENTITIES ===
  for (const s of taxonomy.styles) {
    const folder = path.join(CONTENT, "styles", s)
    ensureDir(folder)

    writeMDX(
      path.join(folder, "index.mdx"),
      {
        title: s.charAt(0).toUpperCase() + s.slice(1),
        slug: s,
        description: "",
        publishedAt: "2024-01-01",
        type: "style",
      },
      `# ${s.charAt(0).toUpperCase() + s.slice(1)}\n\n`
    )

    writeJSON(path.join(folder, "relations.json"), {
      genres: [],
      themes: [],
      moods: [],
      scene: [],
      locations: [],
      related: [],
      influencedBy: [],
      partOf: [],
    })
  }
  console.log(`  ✅ Styles: ${taxonomy.styles.length}`)

  // === GENERATE MOOD (vibe) ENTITIES ===
  for (const m of taxonomy.moods) {
    const folder = path.join(CONTENT, "moods", m)
    ensureDir(folder)

    writeMDX(
      path.join(folder, "index.mdx"),
      {
        title: m.charAt(0).toUpperCase() + m.slice(1),
        slug: m,
        description: "",
        publishedAt: "2024-01-01",
        type: "mood",
      },
      `# ${m.charAt(0).toUpperCase() + m.slice(1)}\n\n`
    )

    writeJSON(path.join(folder, "relations.json"), {
      genres: [],
      styles: [],
      themes: [],
      scene: [],
      locations: [],
      related: [],
      influencedBy: [],
      partOf: [],
    })
  }
  console.log(`  ✅ Moods: ${taxonomy.moods.length}`)

  // === GENERATE THEME ENTITIES ===
  for (const t of taxonomy.themes) {
    const folder = path.join(CONTENT, "themes", t)
    ensureDir(folder)

    writeMDX(
      path.join(folder, "index.mdx"),
      {
        title: t.split("-").map((w) => w.charAt(0).toUpperCase() + w.slice(1)).join(" "),
        slug: t,
        description: "",
        publishedAt: "2024-01-01",
        type: "theme",
      },
      `# ${t}\n\n`
    )

    writeJSON(path.join(folder, "relations.json"), {
      genres: [],
      styles: [],
      moods: [],
      scene: [],
      locations: [],
      related: [],
      influencedBy: [],
      partOf: [],
    })
  }
  console.log(`  ✅ Themes: ${taxonomy.themes.length}`)

  // === GENERATE SCENE ENTITIES ===
  for (const s of taxonomy.scenes) {
    const folder = path.join(CONTENT, "scenes", s)
    ensureDir(folder)

    writeMDX(
      path.join(folder, "index.mdx"),
      {
        title: s.charAt(0).toUpperCase() + s.slice(1),
        slug: s,
        description: "",
        publishedAt: "2024-01-01",
        type: "scene",
      },
      `# ${s.charAt(0).toUpperCase() + s.slice(1)}\n\n`
    )

    writeJSON(path.join(folder, "relations.json"), {
      genres: [],
      styles: [],
      themes: [],
      moods: [],
      locations: [],
      related: [],
      influencedBy: [],
      partOf: [],
    })
  }
  console.log(`  ✅ Scenes: ${taxonomy.scenes.length}`)

  // === GENERATE RAPPER ENTITIES ===
  for (const r of rappers) {
    const slug = slugify(r.rapper)
    const folder = path.join(CONTENT, "raperi", slug)
    ensureDir(folder)

    writeMDX(
      path.join(folder, "index.mdx"),
      {
        title: r.rapper
          .split("-")
          .map((w) => {
            // Handle names like "nik-tendo-old" → "Nik Tendo Old"
            // Actually let's keep original formatting better
            return w.charAt(0).toUpperCase() + w.slice(1)
          })
          .join(" "),
        slug,
        description: "",
        publishedAt: "2024-01-01",
        type: "rapper",
      },
      `# ${r.rapper}\n\n<!-- Auto-generated from taxonomy. Add content here. -->\n`
    )

    writeJSON(path.join(folder, "relations.json"), {
      genres: (r.genre || []).map((g) => slugify(g)),
      styles: (r.style || []).map((s) => slugify(s)),
      moods: (r.vibe || []).map((v) => slugify(v)),
      themes: (r.themes || []).map((t) => slugify(t)),
      scene: (r.scene || []).map((s) => slugify(s)),
      locations: [],
      labels: [],
      albums: [],
      related: [],
      influencedBy: [],
    })

    console.log(`  ✅ Rapper: ${slug}`)
  }

  // === UPDATE THE GRAPH ENGINE TO SUPPORT NEW TYPES ===
  const graphPath = path.join(process.cwd(), "lib", "graph.js")
  let graphContent = fs.readFileSync(graphPath, "utf-8")
  graphContent = graphContent.replace(
    /const TYPE_MAP = {[\s\S]*?}/,
    `const TYPE_MAP = {\n  raperi: "raperi",\n  alba: "alba",\n  zanry: "zanry",\n  labely: "labely",\n  lokality: "lokality",\n  styles: "styles",\n  moods: "moods",\n  themes: "themes",\n  scenes: "scenes",\n}`
  )
  fs.writeFileSync(graphPath, graphContent)

  console.log(`\n🎉 Done! Import complete.`)
  console.log(`   Genres: ${taxonomy.genres.length}`)
  console.log(`   Styles: ${taxonomy.styles.length}`)
  console.log(`   Moods: ${taxonomy.moods.length}`)
  console.log(`   Themes: ${taxonomy.themes.length}`)
  console.log(`   Scenes: ${taxonomy.scenes.length}`)
  console.log(`   Rappers: ${rappers.length}`)
})()