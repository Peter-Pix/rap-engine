#!/usr/bin/env node
// fix-entitytype-raperi.mjs — doplní entityType všem rapperům co ho nemají
import { readFileSync, writeFileSync, readdirSync } from 'fs'
import { join, dirname } from 'path'
import { fileURLToPath } from 'url'

const __dirname = dirname(fileURLToPath(import.meta.url))
const dir = join(__dirname, '..', 'content/raperi')

let updated = 0
for (const file of readdirSync(dir).filter(f => f.endsWith('.mdx'))) {
  const path = join(dir, file)
  let text = readFileSync(path, 'utf8')

  if (text.includes('entityType:')) continue

  text = text.replace(/^description:/m, 'entityType: "rapper"\ndescription:')
  writeFileSync(path, text, 'utf8')
  updated++
}

console.log(`✅ entityType doplněno ${updated} rapperům`)