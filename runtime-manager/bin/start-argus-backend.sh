#!/usr/bin/env bash
set -euo pipefail
cd /home/vkapse/unified-apps/argus/searchLite
exec /home/vkapse/unified-apps/argus/searchLite/.venv/bin/python manage.py runserver 127.0.0.1:8100
