#!/usr/bin/env bash
# ════════════════════════════════════════════════════════════════
# JanDrishti – Local Development Startup Script
# ════════════════════════════════════════════════════════════════
set -e

PROJECT_ROOT="$(cd "$(dirname "$0")" && pwd)"
BACKEND_DIR="$PROJECT_ROOT/backend"
FRONTEND_DIR="$PROJECT_ROOT/frontend"
VENV="$BACKEND_DIR/.venv"

echo ""
echo "╔══════════════════════════════════════════════════════════╗"
echo "║   JanDrishti – Urban Infrastructure Intelligence         ║"
echo "╚══════════════════════════════════════════════════════════╝"
echo ""

# ── 1. Python venv ───────────────────────────────────────────
if [ ! -d "$VENV" ]; then
    echo "⚙  Creating Python virtual environment..."
    python3 -m venv "$VENV"
fi

echo "⚙  Installing backend dependencies..."
"$VENV/bin/pip" install -q -r "$BACKEND_DIR/requirements.txt"

# ── 2. Node modules ──────────────────────────────────────────
echo "⚙  Installing frontend dependencies..."
cd "$FRONTEND_DIR" && npm install --silent

# ── 3. Start Backend ─────────────────────────────────────────
echo ""
echo "🚀 Starting Backend  → http://localhost:8199"
echo "   API Docs         → http://localhost:8199/docs"
cd "$PROJECT_ROOT"
"$VENV/bin/uvicorn" backend.app.main:app \
    --host 0.0.0.0 \
    --port 8199 \
    --reload \
    --log-level info &
BACKEND_PID=$!

sleep 2

# ── 4. Start Frontend ────────────────────────────────────────
echo "🚀 Starting Frontend → http://localhost:5199"
echo ""
cd "$FRONTEND_DIR" && npm run dev &
FRONTEND_PID=$!

echo ""
echo "════════════════════════════════════════════════════════════"
echo "  ✅  JanDrishti is running!"
echo "  Frontend : http://localhost:5199"
echo "  Backend  : http://localhost:8199"
echo "  API Docs : http://localhost:8199/docs"
echo "════════════════════════════════════════════════════════════"
echo "  Press Ctrl+C to stop both servers"
echo ""

# Wait and handle Ctrl+C
trap "echo ''; echo 'Stopping servers...'; kill $BACKEND_PID $FRONTEND_PID 2>/dev/null; exit 0" INT TERM
wait $BACKEND_PID $FRONTEND_PID
