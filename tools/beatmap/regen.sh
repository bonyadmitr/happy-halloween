#!/usr/bin/env bash
# ============================================================================
#  Пересобрать карту битов ритм-игры (js/rhythm-beatmap.js).
#
#  Использование:
#     tools/beatmap/regen.sh [MIN_GAP] [TOP]
#
#  MIN_GAP — минимальная пауза между нотами, сек. БОЛЬШЕ = МЕНЬШЕ нот. (по умолч. 0.55)
#  TOP     — доля самых сильных акцентов песни, 0..1. БОЛЬШЕ = БОЛЬШЕ нот. (по умолч. 0.70)
#
#  venv (один раз):  uv venv --python 3.12 tools/beatmap/.venv && \
#                    uv pip install --python tools/beatmap/.venv/bin/python librosa
# ============================================================================
set -e
cd "$(dirname "$0")/../.."

AUDIO="assets/audio/this-is-halloween-loop.mp3"   # сменил песню → поправь путь тут
MIN_GAP="${1:-0.55}"
TOP="${2:-0.70}"

tools/beatmap/.venv/bin/python tools/beatmap/extract.py \
  "$AUDIO" --src "$AUDIO" \
  --out js/rhythm-beatmap.js --accent --min-gap "$MIN_GAP" --top "$TOP"
