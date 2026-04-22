#!/usr/bin/env bash
set -euo pipefail
cd /home/vkapse/unified-apps/sysreview
JAR_PATH="build/libs/sysreview-latest.jar"
if [ ! -f "$JAR_PATH" ]; then
  echo "Sysreview boot jar not found at $JAR_PATH" >&2
  exit 1
fi
exec java -jar "$JAR_PATH" --spring.config.import=file:/home/vkapse/unified-apps/sysreview/secrets.properties --server.port=3013
