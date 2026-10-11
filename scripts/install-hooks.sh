#!/bin/sh
# Nainstaluje git hooky pro ochranu původního obsahu.
# Spouští se automaticky přes `npm install` (prepare script).
set -e

HOOK_DIR="$(git rev-parse --git-dir)/hooks"
mkdir -p "$HOOK_DIR"

cat > "$HOOK_DIR/pre-commit" <<'HOOK'
#!/bin/sh
# Ochrana původního obsahu: zablokuj commit, pokud entita ztratí >30 % obsahu.
# Viz scripts/check-content-regression.ts a scripts/lib/content-guard.ts.
# Záměrný úbytek: CONTENT_REGRESSION_OK=1 git commit ...

if [ "$CONTENT_REGRESSION_OK" = "1" ]; then
  echo "⚠️  pre-commit: kontrola regrese obsahu PŘESKOČENA (CONTENT_REGRESSION_OK=1)"
  exit 0
fi

# 1) Kontrola regrese obsahu (>30 % úbytek = pravděpodobné přepsání ručního textu)
npx tsx scripts/check-content-regression.ts || {
  echo ""
  echo "❌ Commit zablokován: entita ztratila >30 % obsahu."
  echo "   Obnov soubor:  git checkout HEAD -- <cesta>"
  echo "   Nebo potvrď:   CONTENT_REGRESSION_OK=1 git commit ..."
  exit 1
}

# 2) Typecheck kritických skriptů — chytí změnu signatury sdílené funkce,
#    která by mohla skript potichu shodit na nebezpečný fallback (incident #2).
#    Přeskoč, když se žádný skript nezměnil.
if git diff --cached --name-only | grep -qE '^(scripts/|tsconfig\.scripts\.json)'; then
  npx tsc -p tsconfig.scripts.json || {
    echo ""
    echo "❌ Commit zablokován: typecheck skriptů selhal."
    echo "   Oprav typy, nebo (jen výjimečně) potvrď: CONTENT_REGRESSION_OK=1 git commit ..."
    exit 1
  }
fi
HOOK
chmod +x "$HOOK_DIR/pre-commit"
echo "✅ git hooky nainstalovány do $HOOK_DIR"
