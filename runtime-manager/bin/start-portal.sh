#!/usr/bin/env bash
set -euo pipefail
cd /home/vkapse/vijay-portal
export PUBLIC_PATH_PREFIX="${PUBLIC_PATH_PREFIX:-/rms}"
export PUBLIC_BASE_URL="${PUBLIC_BASE_URL:-https://sysrev2.cs.binghamton.edu/rms}"
export COOKIE_SECURE="${COOKIE_SECURE:-true}"
exec node server.js
