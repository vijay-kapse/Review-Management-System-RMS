#!/usr/bin/env bash
set -euo pipefail
cd /home/vkapse/unified-apps/relevance
exec nice -n 10 /home/vkapse/relevance/venv/bin/python worker.py loop
