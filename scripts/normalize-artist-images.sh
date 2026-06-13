#!/bin/bash
# normalize-artist-images.sh — Sjednotí všechny profilové fotky rapperů
#
# Používá: sips (macOS) pro crop+resize, cwebp pro konverzi na webp
#
# Každý obrázek:
# 1. Ořízne na čtverec (center crop)
# 2. Změní velikost na 400×400px
# 3. Zkonvertuje na .webp (quality 80)
# 4. Smaže původní ne-webp soubor
#
# Usage: bash scripts/normalize-artist-images.sh

set -euo pipefail

REPO="$(cd "$(dirname "$0")/.." && pwd)"
IMG_DIR="$REPO/public/images/artists"
LOG="$REPO/logs/normalize-images.log"

mkdir -p "$(dirname "$LOG")"
echo "[$(date '+%Y-%m-%d %H:%M:%S')] ═══════ NORMALIZE IMAGES ═══════" | tee -a "$LOG"

count=0
skipped=0

# Projdeme všechny obrázky (vyjma .webp — ty řešíme zvlášť)
for f in "$IMG_DIR"/*.{jpg,jpeg,JPG,png,PNG}; do
  [ -f "$f" ] || continue

  base="$(basename "$f")"
  name="${base%.*}"
  echo "  → $base ($(stat -f%z "$f" 2>/dev/null) bytes)" | tee -a "$LOG"

  # 1) Zjistíme rozměry pomocí sips
  dims=$(sips -g pixelWidth -g pixelHeight "$f" 2>/dev/null | awk '/pixelWidth/{w=$2} /pixelHeight/{h=$2} END{print w, h}')
  w=$(echo "$dims" | cut -d' ' -f1)
  h=$(echo "$dims" | cut -d' ' -f2)
  [ -z "$w" ] && { echo "  ✗ nelze zjistit rozměry" | tee -a "$LOG"; continue; }

  # 2) Crop na čtverec: sips neumí center crop přímo, použijeme offset
  #    Necháme sips resize na 400×400 (zachová poměr), pak ořízneme
  tmp_resized="$IMG_DIR/.tmp_${name}_resized.png"
  tmp_cropped="$IMG_DIR/.tmp_${name}_cropped.png"

  # Resize: nejdelší strana = 400px
  sips -Z 400 "$f" --out "$tmp_resized" 2>/dev/null || { echo "  ✗ resize selhal" | tee -a "$LOG"; continue; }

  # Teď máme obrázek kde delší strana = 400. Potřebujeme center crop na 400×400.
  # sips umí cropToHeightWidth s offsetem
  dims2=$(sips -g pixelWidth -g pixelHeight "$tmp_resized" 2>/dev/null | awk '/pixelWidth/{w=$2} /pixelHeight/{h=$2} END{print w, h}')
  w2=$(echo "$dims2" | cut -d' ' -f1)
  h2=$(echo "$dims2" | cut -d' ' -f2)

  if [ "$w2" -eq "$h2" ]; then
    # Už je čtverec
    mv "$tmp_resized" "$tmp_cropped"
  else
    # Center crop
    if [ "$w2" -gt "$h2" ]; then
      # širší než vyšší: crop šířku
      offset=$(( (w2 - h2) / 2 ))
      sips --cropToHeightWidth 400 400 --padColor FFFFFF "$tmp_resized" --out "$tmp_cropped" 2>/dev/null || true
      # Pokud sips crop nefungoval, použijeme pixel-based crop
      if [ ! -f "$tmp_cropped" ]; then
        sips -c 400 400 0 0 "$tmp_resized" --out "$tmp_cropped" 2>/dev/null || true
      fi
    else
      # vyšší než širší: crop výšku
      sips --cropToHeightWidth 400 400 --padColor FFFFFF "$tmp_resized" --out "$tmp_cropped" 2>/dev/null || true
      if [ ! -f "$tmp_cropped" ]; then
        sips -c 400 400 0 0 "$tmp_resized" --out "$tmp_cropped" 2>/dev/null || true
      fi
    fi
  fi

  # Fallback: pokud crop selhal, použijeme resized obrázek
  if [ ! -f "$tmp_cropped" ]; then
    mv "$tmp_resized" "$tmp_cropped" 2>/dev/null || continue
  fi

  # 3) Konverze na webp pomocí cwebp
  out="$IMG_DIR/${name}.webp"
  cwebp -q 80 -resize 400 400 "$tmp_cropped" -o "$out" 2>/dev/null || {
    echo "  ✗ webp konverze selhala pro $base" | tee -a "$LOG"
    rm -f "$tmp_resized" "$tmp_cropped"
    continue
  }

  # 4) Vyčistit
  rm -f "$f" "$tmp_resized" "$tmp_cropped"
  echo "  ✓ ${name}.webp ($(stat -f%z "$out" 2>/dev/null) bytes)" | tee -a "$LOG"
  ((count++))
done

# Teď projdeme už existující .webp soubory a přeškálujeme je
for f in "$IMG_DIR"/*.webp; do
  [ -f "$f" ] || continue
  base="$(basename "$f")"
  name="${base%.webp}"

  # Zjistíme rozměry
  dims=$(sips -g pixelWidth -g pixelHeight "$f" 2>/dev/null | awk '/pixelWidth/{w=$2} /pixelHeight/{h=$2} END{print w, h}')
  w=$(echo "$dims" | cut -d' ' -f1)
  h=$(echo "$dims" | cut -d' ' -f2)

  if [ "$w" = "400" ] && [ "$h" = "400" ]; then
    ((skipped++))
    continue
  fi

  echo "  → $base ($w×$h)" | tee -a "$LOG"

  # Resize + crop pomocí sips, pak zpátky na webp
  tmp_png="$IMG_DIR/.tmp_${name}_resize.png"
  sips -Z 400 "$f" --out "$tmp_png" 2>/dev/null || continue

  out="$IMG_DIR/${name}.webp"
  cwebp -q 80 -resize 400 400 "$tmp_png" -o "$out" 2>/dev/null || continue
  rm -f "$tmp_png"
  echo "  ✓ ${name}.webp (400×400)" | tee -a "$LOG"
  ((count++))
done

echo ""
echo "Hotovo: $count upraveno, $skipped přeskočeno" | tee -a "$LOG"
echo ""