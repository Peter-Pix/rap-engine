#!/usr/bin/env node
// ═══════════════════════════════════════════════════════════════
// fix-yaml.mjs — fix broken YAML frontmatter in MDX files
//
// Fixes:
// 1. CRLF → LF (30 files)
// 2. Missing --- close in rapper frontmatter (astral-one, badboy-berlin, kamil-hoffmann)
// 3. Dj Opia broken context quote
// 4. Albums with wrong type: (single/lp → Album/Skladba)
// ═══════════════════════════════════════════════════════════════

import { readFileSync, writeFileSync } from 'fs'
import { globSync } from 'glob'

// Not available as dependency — let's use a recursive file scan
import { readdirSync, statSync } from 'fs'
import { join } from 'path'

function findMdxFiles(dir) {
  const results = []
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    const full = join(dir, entry.name)
    if (entry.isDirectory()) {
      results.push(...findMdxFiles(full))
    } else if (entry.name.endsWith('.mdx')) {
      results.push(full)
    }
  }
  return results
}

const files = findMdxFiles('content')
let fixed = 0
let skipped = 0
const issues = []

for (const file of files) {
  const raw = readFileSync(file)
  const hasCrlf = raw.includes('\r\n')
  let text = raw.toString('utf-8')

  // ── Fix 1: CRLF → LF ──
  if (hasCrlf) {
    text = text.replace(/\r\n/g, '\n')
    issues.push(`  ✓ CRLF → LF: ${file}`)
  }

  // ── Fix 2: Check if frontmatter has closing --- ──
  const lines = text.split('\n')
  let firstLine = lines[0]?.trim()
  let fmCloseIndex = -1
  if (firstLine === '---') {
    for (let i = 1; i < Math.min(lines.length, 200); i++) {
      if (lines[i].trim() === '---') {
        fmCloseIndex = i
        break
      }
    }
    if (fmCloseIndex === -1) {
      // No closing --- found. Find where body (markdown heading) starts
      let bodyStart = -1
      for (let i = 1; i < lines.length; i++) {
        const line = lines[i]
        // Markdown headings or blank-line-then-heading signals body
        if (line.startsWith('## ') || line.startsWith('# ')) {
          // Go back to find the last YAML content line (non-empty)
          bodyStart = i
          break
        }
      }
      if (bodyStart > 1) {
        // Find insertion point: last non-empty line before body
        let insertAt = bodyStart - 1
        while (insertAt > 1 && lines[insertAt].trim() === '') {
          insertAt--
        }
        // Insert --- after insertAt
        lines.splice(insertAt + 1, 0, '---')
        text = lines.join('\n')
        issues.push(`  ✓ Added --- close: ${file} (before line ${bodyStart + 1})`)
      }
    }
  }

  // ── Fix 3: Dj Opia — convert context from double-quoted to block scalar ──
  if (file.includes('dj-opia')) {
    // The context field has a multi-line double-quoted YAML value spanning paragraphs.
    // Replace the quoted string content with a | block scalar to avoid quote issues.
    const newText = text.replace(
      /context: "([^"]*?)"/s,
      (match, content) => {
        // If the content spans multiple lines, use a block scalar
        if (content.includes('\n')) {
          // Indent each line of content with 2 spaces (matching YAML indent)
          const indented = '  ' + content.replace(/\n/g, '\n  ')
          return 'context: |\n' + indented
        }
        return match
      }
    )
    if (newText !== text) {
      text = newText
      issues.push(`  ✓ Fixed dj-opia context: double-quoted → block scalar`)
    }
  }

  // ── Fix 4: REMOVE reserved `type:` field (breaks contentlayer2) ──
  // contentlayer2 uses `type` as document type name — having `type: "album"` in
  // frontmatter makes it look for a document type called "album", which doesn't exist.
  // The document type is determined by filePathPattern, not by frontmatter `type:`.
  if (file.startsWith('content/')) {
    const parts = file.split('/')
    const filename = parts[parts.length - 1]
    
    // Remove any `type:` field — it's reserved and breaks contentlayer2
    const typeMatch = text.match(/^type:\s*.+$/m)
    if (typeMatch) {
      text = text.replace(/^type:\s*.+\n/m, '')
      issues.push(`  ✓ Removed reserved type: field from ${filename}`)
    }
  }

  // ── Fix: Check content/zanry files with wrong date format ──
  if (file.startsWith('content/zanry/')) {
    // Ensure publishedAt dates don't have trailing issues
    // The error was "Unexpected scalar at node end" — LF fix should handle this
  }

  // Write if changed
  const newRaw = Buffer.from(text, 'utf-8')
  if (!newRaw.equals(raw)) {
    writeFileSync(file, newRaw, 'utf-8')
    fixed++
  } else {
    skipped++
  }
}

console.log(`\n📊 Results:`)
console.log(`  Fixed: ${fixed} files`)
console.log(`  Skipped: ${skipped} files`)
console.log(`\nIssues fixed:`)
for (const issue of issues) {
  console.log(issue)
}