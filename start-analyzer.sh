#!/usr/bin/env bash
# start-analyzer.sh — Start the Python Green Space Analyzer FastAPI service
set -e

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
ANALYZER_DIR="$SCRIPT_DIR/analyzer"

cd "$ANALYZER_DIR"

# Create venv if not exists
if [ ! -d ".venv" ]; then
  echo "Creating Python virtual environment..."
  python -m venv .venv
fi

# Activate venv
source .venv/bin/activate || source .venv/Scripts/activate

# Install dependencies
echo "Installing Python dependencies..."
pip install -r requirements.txt -q

# Start FastAPI
echo "Starting Green Space Analyzer on http://localhost:8000"
uvicorn main:app --reload --port 8000 --host 0.0.0.0
