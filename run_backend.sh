#!/usr/bin/env bash
# =======================================================================
# Start Real-time Facial Recognition & Crowd Dynamics Flask Backend
# Technology Stack: TensorFlow 2.x, OpenCV 4.x, Flask, PostgreSQL / SQLite
# =======================================================================

set -e

echo "=== [1/3] Preparing Python Computer Vision Backend Environment ==="
VENV_DIR="backend/.venv"

if [ ! -d "$VENV_DIR" ]; then
    echo "Creating virtual environment in $VENV_DIR..."
    python3 -m venv "$VENV_DIR"
fi

echo "Activating virtual environment..."
source "$VENV_DIR/bin/activate"

echo "=== [2/3] Checking Dependencies ==="
pip install --upgrade pip
pip install -r backend/requirements.txt

echo "=== [3/3] Launching Flask Computer Vision Server ==="
export PYTHONPATH="."
export FLASK_HOST="0.0.0.0"
export FLASK_PORT=5000
export FLASK_DEBUG=True

python3 -m backend.app
