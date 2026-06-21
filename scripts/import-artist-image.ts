/**
 * Import artist image z lokálního souboru, zkonvertuje na WebP a zaregistruje.
 *
 * Použití:
 *   npx tsx scripts/import-artist-image.ts <slug> <path-to-image>
 *
 * Příklad:
 *   npx tsx scripts/import-artist-image.ts ektor /tmp/ektor.png
 *
 * Co dělá:
 *   1) Načte zdrojový obrázek (PNG/JPG/WebP)
 *   2) Zkonvertuje na WebP, 1200×1200 (crop na střed), kvalita 82%
 *   3) Uloží do public/images/artists/<slug>.webp
 *   4) Přidá mapování do src/lib/content/images.ts
 *
 * Vyžaduje: PIL/Pillow + Image module pro Python (pro konverzi)
 *
 * Idempotentní — přepíše existující soubor.
 */

import fs from "node:fs";
import path from "node:path";
import { execSync } from "node:child_process";

const slug = process.argv[2];
const srcPath = process.argv[3];

if (!slug || !srcPath) {
  console.error("Usage: npx tsx scripts/import-artist-image.ts <slug> <path>");
  process.exit(1);
}

if (!fs.existsSync(srcPath)) {
  console.error(`Source file not found: ${srcPath}`);
  process.exit(1);
}

const DEST_DIR = path.join(process.cwd(), "public", "images", "artists");
const destPath = path.join(DEST_DIR, `${slug}.webp`);

fs.mkdirSync(DEST_DIR, { recursive: true });

// Konverze přes sips (macOS built-in) nebo fallback na Python+Pillow
console.log(`🎨 Processing ${slug}...`);
console.log(`   Source: ${srcPath}`);
console.log(`   Dest:   ${destPath}`);

try {
  // sips: resize to max 1200, then center-crop to 1200x1200, convert to webp
  // Step 1: Resize to fit 1200x1200
  execSync(`sips -Z 1200 "${srcPath}" --out /tmp/_img_resized.jpg`, { stdio: "inherit" });

  // Step 2: Center-crop to 1200x1200 if needed (sips -c)
  // sips doesn't do center crop well; use a different approach
  // We'll use Python+Pillow if available, otherwise skip crop
  try {
    execSync(
      `python3 << 'EOF'
from PIL import Image
img = Image.open('/tmp/_img_resized.jpg')
w, h = img.size
size = 1200
# Center crop
left = (w - size) // 2
top = (h - size) // 2
if w < size or h < size:
    # Pad with black if smaller
    new = Image.new('RGB', (size, size), (0, 0, 0))
    new.paste(img, ((size - w) // 2, (size - h) // 2))
    img = new
else:
    img = img.crop((left, top, left + size, top + size))
img.save('${destPath.replace(/'/g, "\\'")}', 'WEBP', quality=82, method=6)
print(f'✅ Saved {img.size} → ${destPath}')
EOF`,
      { stdio: "inherit" },
    );
  } catch (e) {
    // Fallback: use sips to convert to webp without cropping
    execSync(`sips -s format webp "${srcPath}" --out "${destPath}"`, { stdio: "inherit" });
    console.log(`⚠️  Used sips fallback (no center crop)`);
  }
} catch (e) {
  console.error(`❌ Conversion failed: ${(e as Error).message}`);
  process.exit(1);
}

// Přidat do images.ts
const IMAGES_FILE = path.join(process.cwd(), "src/lib/content/images.ts");
let imagesContent = fs.readFileSync(IMAGES_FILE, "utf-8");

const entry = `  '${slug}': '/images/artists/${slug}.webp',`;

// Zkontroluj jestli už existuje
const entryRegex = new RegExp(`'${slug}':\\s*'[^']+',`);
if (entryRegex.test(imagesContent)) {
  imagesContent = imagesContent.replace(entryRegex, entry);
  console.log(`🔄 Updated existing mapping for '${slug}'`);
} else {
  // Najdi místo pro vložení — před uzavírací `};`
  imagesContent = imagesContent.replace(/(\n};)/, `\n${entry}\n};`);
  console.log(`➕ Added new mapping for '${slug}'`);
}

fs.writeFileSync(IMAGES_FILE, imagesContent, "utf-8");
console.log(`\n✅ ${slug}.webp uložen a zaregistrován v images.ts`);