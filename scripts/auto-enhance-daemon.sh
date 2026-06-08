#!/bin/bash
# auto-enhance-daemon.sh
# Background daemon — volá auto-enhance každých 10 minut.
# Použití: ./scripts/auto-enhance-daemon.sh start|stop|status

export PATH="/opt/homebrew/bin:/usr/local/bin:/usr/bin:/bin:$PATH"
DIR="$(cd "$(dirname "$0")/.." && pwd)"
PIDFILE="$DIR/.auto-enhance.pid"
LOG="$DIR/work_in_progress/auto-enhance-daemon.log"

start() {
  if [ -f "$PIDFILE" ] && kill -0 "$(cat "$PIDFILE")" 2>/dev/null; then
    echo "⚠️  Daemon již běží (PID: $(cat "$PIDFILE"))"
    exit 1
  fi

  echo "🚀 Spouštím daemon..."
  (
    cd "$DIR"
    while true; do
      echo "$(date '+%Y-%m-%d %H:%M:%S') cycle start" >> "$LOG"
      node scripts/auto-enhance.mjs >> "$LOG" 2>&1
      echo "$(date '+%Y-%m-%d %H:%M:%S') cycle end" >> "$LOG"
      echo "---" >> "$LOG"
      sleep 600
    done
  ) &
  echo $! > "$PIDFILE"
  echo "✅ Daemon běží (PID: $!) — log: $LOG"
}

stop() {
  if [ -f "$PIDFILE" ]; then
    PID=$(cat "$PIDFILE")
    if kill -0 "$PID" 2>/dev/null; then
      kill "$PID"
      rm -f "$PIDFILE"
      echo "🛑 Daemon zastaven"
    else
      echo "⚠️  PID neaktivní, čistím..."
      rm -f "$PIDFILE"
    fi
  else
    echo "⚠️  Daemon neběží"
  fi
}

status() {
  if [ -f "$PIDFILE" ] && kill -0 "$(cat "$PIDFILE")" 2>/dev/null; then
    echo "✅ Daemon běží (PID: $(cat "$PIDFILE"))"
    echo "📄 Log: $LOG"
    tail -5 "$LOG" 2>/dev/null || echo "(log prázdný)"
  else
    echo "⏹️  Daemon neběží"
    rm -f "$PIDFILE" 2>/dev/null
  fi
}

case "${1:-status}" in
  start) start ;;
  stop) stop ;;
  status) status ;;
  *) echo "Použití: $0 start|stop|status" ;;
esac
