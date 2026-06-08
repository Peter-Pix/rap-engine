#!/bin/bash
# auto-enhance-cron.sh
# Spouští auto-enhance.mjs s správným prostředím.
# Volá se z crontabu každých 10 minut.

export PATH="/opt/homebrew/bin:/usr/local/bin:/usr/bin:/bin:$PATH"
export NVM_DIR="$HOME/.nvm"
[ -s "$NVM_DIR/nvm.sh" ] && . "$NVM_DIR/nvm.sh"

cd "$(dirname "$0")/.."

LOG="work_in_progress/auto-enhance-cron.log"
echo "$(date '+%Y-%m-%d %H:%M:%S') START" >> "$LOG"

node scripts/auto-enhance.mjs >> "$LOG" 2>&1
EXIT_CODE=$?

echo "$(date '+%Y-%m-%d %H:%M:%S') END (exit: $EXIT_CODE)" >> "$LOG"
echo "---" >> "$LOG"
