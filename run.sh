#!/bin/bash

# ── Placement Portal — macOS startup script ──
# Run from the project root: bash run.sh
# Stop everything: Ctrl+C

PROJECT_ROOT="$(cd "$(dirname "$0")" && pwd)"
BACKEND="$PROJECT_ROOT/backend"
VENV="$PROJECT_ROOT/venv/bin"

echo "================================================"
echo "  Placement Portal — Starting all services"
echo "================================================"

# ── 1. Redis ─────────────────────────────────────
if redis-cli ping &>/dev/null; then
  echo "[Redis]   Already running."
else
  echo "[Redis]   Starting..."
  redis-server --daemonize yes --logfile /tmp/ppa-redis.log
  sleep 1
  if redis-cli ping &>/dev/null; then
    echo "[Redis]   Started."
  else
    echo "[Redis]   ERROR: Could not start Redis. Is it installed? (brew install redis)"
    exit 1
  fi
fi

# ── 2. Flask ─────────────────────────────────────
echo "[Flask]   Starting on http://localhost:5000 ..."
cd "$BACKEND"
"$VENV/python" app.py > /tmp/ppa-flask.log 2>&1 &
FLASK_PID=$!
sleep 1
echo "[Flask]   PID $FLASK_PID"

# ── 3. Celery Worker ─────────────────────────────
echo "[Celery]  Starting worker..."
"$VENV/celery" -A app.celery worker --loglevel=info > /tmp/ppa-celery-worker.log 2>&1 &
WORKER_PID=$!
sleep 1
echo "[Celery]  Worker PID $WORKER_PID"

# ── 4. Celery Beat ───────────────────────────────
echo "[Beat]    Starting scheduler..."
"$VENV/celery" -A app.celery beat --loglevel=info > /tmp/ppa-celery-beat.log 2>&1 &
BEAT_PID=$!
sleep 1
echo "[Beat]    PID $BEAT_PID"

echo ""
echo "================================================"
echo "  All services running!"
echo "  App:    http://localhost:5000"
echo "  Logs:   /tmp/ppa-*.log"
echo "  Stop:   Ctrl+C"
echo "================================================"
echo ""

# ── Graceful shutdown on Ctrl+C ──────────────────
cleanup() {
  echo ""
  echo "Stopping all services..."
  kill $FLASK_PID $WORKER_PID $BEAT_PID 2>/dev/null
  redis-cli shutdown nosave 2>/dev/null
  echo "Done."
  exit 0
}

trap cleanup SIGINT SIGTERM

# Keep script alive, tail Flask log to console
tail -f /tmp/ppa-flask.log
