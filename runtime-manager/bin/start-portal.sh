#!/usr/bin/env bash
set -euo pipefail
cd /home/vkapse/vijay-portal
export PUBLIC_PATH_PREFIX="${PUBLIC_PATH_PREFIX:-/rms}"
export PUBLIC_BASE_URL="${PUBLIC_BASE_URL:-http://sysrev2.cs.binghamton.edu/rms}"
export COOKIE_SECURE="${COOKIE_SECURE:-false}"
# Shared with TRACE, which reads it from its own secrets file
export SYSREVIEW_SHARED_SECRET="${SYSREVIEW_SHARED_SECRET:-$(grep -m1 '^rms.shared-login.secret=' /home/vkapse/unified-apps/sysreview/secrets.properties | cut -d= -f2-)}"
exec node server.js
