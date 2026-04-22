#!/usr/bin/env bash
set -euo pipefail
cd /home/vkapse/unified-apps/survey/survey_group8
exec /home/vkapse/unified-apps/survey/survey_group8/.venv/bin/python manage.py runserver 127.0.0.1:8201
