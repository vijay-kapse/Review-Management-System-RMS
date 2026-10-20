#!/usr/bin/env bash
set -euo pipefail
# Local judge model for TRACE relevance suggestions. CPU only, localhost only.
# 3 of the 4 cores so the other apps stay responsive; --cache-ram 0 because the
# default keeps up to 8 GB of prompt cache in RAM.
cd /home/vkapse/relevance/llama/llama-b11381
exec nice -n 10 ./llama-server \
  -m /home/vkapse/relevance/models/Qwen3.5-9B-Q4_K_M.gguf \
  --host 127.0.0.1 --port 8090 \
  -t 3 -c 4096 -np 1 --cache-ram 0 --no-webui
