/**
 * Batch import artist images z /tmp/incoming-media/.
 *
 * Workflow:
 *   1) Uživatel dá obrázky do /tmp/incoming-media/<slug>.<ext>
 *      Příklad: /tmp/incoming-media/ektor.jpg, rest.png, james-cole.webp
 *   2) Pustí: npx tsx scripts/batch-import-images.ts
 *   3) Skript projde složku, každý obrázek zpracuje
 *      (resize 1200x1200, WebP q82, center crop) + zaregistruje v images.ts
 *
 * Každý rapper dostane vlastní commit.
 */

import fs from "node:fs";
import path from "node:path";
import { execSync } from "node:child_process";

const SRC_DIR = "/tmp/incoming-media";
const DEST_DIR = path.join(process.cwd(), "public", "images", "artists");
const IMAGES_FILE = path.join(process.cwd(), "src/lib/content/images.ts");

const VALID_EXTS = [".jpg", ".jpeg", ".png", ".webp", ".tiff", ".heic"];

if (!fs.existsSync(SRC_DIR)) {
  console.error(`❌ Složka ${SRC_DIR} neexistuje.`);
  console.error(`   Vytvoř ji: mkdir -p ${SRC_DIR}`);
  console.error(`   A dej tam obrázky: <slug>.jpg, <slug>.png, ...`);
  process.exit(1);
}

const files = fs.readdirSync(SRC_DIR).filter((f) => {
  const ext = path.extname(f).toLowerCase();
  return VALID_EXTS.includes(ext);
});

if (files.length === 0) {
  console.error(`❌ Žádné obrázky v ${SRC_DIR}`);
  process.exit(1);
}

fs.mkdirSync(DEST_DIR, { recursive: true });

let imagesContent = fs.readFileSync(IMAGES_FILE, "utf-8");
let processed = 0;
let failed = 0;

for (const file of files) {
  const slug = path.basename(file, path.extname(file)).toLowerCase();
  const srcPath = path.join(SRC_DIR, file);
  const destPath = path.join(DEST_DIR, `${slug}.webp`);

  console.log(`\n${"─".repeat(60)}`);
  console.log(`🎨 ${slug}: ${file}`);

  try {
    // Step 1: Resize to max 1200 (preserve aspect)
    execSync(`sips -Z 1200 "${srcPath}" --out /tmp/_img_resized.jpg`, { stdio: "pipe" });

    // Step 2: Center-crop to 1200x1200 + WebP conversion
    execSync(
      `python3 << 'EOF'
from PIL import Image
img = Image.open('/tmp/_img_resized.jpg')
w, h = img.size
size = 1200
# Center crop, or pad with black if smaller
if w < size or h < size:
    new = Image.new('RGB', (size, size), (0, 0, 0))
    new.paste(img, ((size - w) // 2, (size - h) // 2))
    img = new
else:
    left = (w - size) // 2
    top = (h - size) // 2
    img = img.crop((left, top, left + size, top + size))
img.save('${destPath}', 'WEBP', quality=82, method=6)
print(f'   ✅ ${destPath} ({img.size[0]}x{img.size[1]})')
EOF`,
      { stdio: "inherit" },
    );

    // Step 3: Registrace v images.ts
    const entry = `  '${slug}': '/images/artists/${slug}.webp',`;
    const entryRegex = new RegExp(`'${slug}':\\s*'[^']+',`);

    if (entryRegex.test(imagesContent)) {
      imagesContent = imagesContent.replace(entryRegex, entry);
      console.log(`   🔄 Updated mapping`);
    } else {
      imagesContent = imagesContent.replace(/(\n};)/, `\n${entry}\n};`);
      console.log(`   ➕ Added mapping`);
    }

    processed++;
  } catch (e) {
    console.error(`   ❌ Failed: ${(e as Error).message}`);
    failed++;
  }
}

if (processed > 0) {
  fs.writeFileSync(IMAGES_FILE, imagesContent, "utf-8");
  console.log(`\n${"═".repeat(60)}`);
  console.log(`✅ Zpracováno: ${processed}`);
  console.log(`❌ Selhalo:    ${failed}`);
  console.log(`📝 images.ts aktualizován`);
  console.log(`\nDalší kroky:`);
  console.log(`  cd /Users/petrpiskacek/.openclaw/workspace/rap-knowledge-graph`);
  console.log(`  git add public/images/artists/*.webp src/lib/content/images.ts`);
  console.log(`  git commit -m "feat(images): batch import (${processed} rapperů)"`);
}