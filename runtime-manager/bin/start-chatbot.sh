#!/usr/bin/env bash
set -euo pipefail
cd /home/vkapse/unified-apps/chatbot
exec /home/vkapse/unified-apps/chatbot/venv/bin/python -m uvicorn app.main:app --host 0.0.0.0 --port 3010
