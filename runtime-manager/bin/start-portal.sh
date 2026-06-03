#!/usr/bin/env bash
set -euo pipefail
cd /home/vkapse/vijay-portal
export PUBLIC_PATH_PREFIX="${PUBLIC_PATH_PREFIX:-/rms}"
export PUBLIC_BASE_URL="${PUBLIC_BASE_URL:-http://sysrev2.cs.binghamton.edu/rms}"
export COOKIE_SECURE="${COOKIE_SECURE:-false}"
exec node server.js
