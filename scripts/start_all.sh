#!/usr/bin/env bash
# ==============================================================================
# JanDrishti – Integrated Development Startup Script
# Starts Backend (FastAPI) and Frontend (Vite) concurrently
# ==============================================================================

set -e

echo "=========================================================="
echo " Starting JanDrishti Urban Infrastructure Platform"
echo "=========================================================="

# Check Python environment
if [ ! -f ".env" ]; then
    echo "[!] No .env file found. Copying from .env.example..."
    cp .env.example .env
fi

# Function to clean up background processes on Ctrl+C
cleanup() {
    echo ""
    echo "[*] Shutting down JanDrishti services..."
    kill $(jobs -p) 2>/dev/null || true
    exit 0
}
trap cleanup SIGINT SIGTERM

echo "[1/2] Launching Backend API (http://localhost:8000)..."
cd backend
python3 -m uvicorn app.main:app --host 0.0.0.0 --port 8000 --reload &
BACKEND_PID=$!
cd ..

sleep 2

echo "[2/2] Launching Frontend Development Server (http://localhost:5173)..."
cd frontend
if [ ! -d "node_modules" ]; then
    echo "[*] Installing frontend dependencies..."
    npm install
fi
npm run dev &
FRONTEND_PID=$!
cd ..

echo ""
echo "=========================================================="
echo " JanDrishti is Running!"
echo " - Dashboard:  http://localhost:5173"
echo " - REST API:   http://localhost:8000/api/v1"
echo " - Swagger UI: http://localhost:8000/docs"
echo "=========================================================="
echo "Press Ctrl+C to stop all services."

wait
