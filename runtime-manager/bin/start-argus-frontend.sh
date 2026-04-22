#!/usr/bin/env bash
set -euo pipefail
cd /home/vkapse/unified-apps/argus/Argus_Frontend-master
export PORT=3011
export BACKEND_URL=http://127.0.0.1:8100
exec node server.js
