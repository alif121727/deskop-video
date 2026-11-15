#!/usr/bin/env bash
# Salin hasil kerja ke repo GitHub setiap 10 menit.
# Jalankan di latar belakang:  nohup scripts/auto-push.sh > /tmp/auto-push.log 2>&1 &
# Hentikan dengan:             pkill -f auto-push.sh
set -u

REPO_DIR="${REPO_DIR:-/workspace/project}"
REMOTE="${REMOTE:-origin}"
BRANCH="${BRANCH:-main}"
INTERVAL="${INTERVAL:-600}"          # detik (10 menit)
LOG="${LOG:-/tmp/auto-push.log}"

log() { printf '%s %s\n' "$(date -u +%Y-%m-%dT%H:%M:%SZ)" "$*"; }

cd "$REPO_DIR" || { log "FATAL: $REPO_DIR tidak ada"; exit 1; }

log "auto-push aktif: $REPO_DIR -> $REMOTE/$BRANCH tiap ${INTERVAL}s"
while true; do
  if [ -n "$(git status --porcelain)" ]; then
    git add -A
    git commit -q -m "Auto-sync $(date -u +%Y-%m-%dT%H:%M:%SZ)

Co-authored-by: openhands <openhands@all-hands.dev>" && log "commit: $(git rev-parse --short HEAD)"
  fi
  if git push -q "$REMOTE" "$BRANCH" 2>>"$LOG"; then
    log "push OK -> $(git rev-parse --short HEAD)"
  else
    log "push GAGAL (akan dicoba lagi)"
  fi
  sleep "$INTERVAL"
done
