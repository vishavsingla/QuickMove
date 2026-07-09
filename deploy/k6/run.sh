#!/usr/bin/env bash
set -euo pipefail
API_URL="${API_URL:-http://localhost:5001}"
SCRIPT="${1:-smoke.js}"
K6_VUS="${K6_VUS:-5}"
K6_DURATION="${K6_DURATION:-30s}"

if ! command -v k6 >/dev/null 2>&1; then
  echo "k6 not installed. Install from https://k6.io/docs/get-started/installation/"
  exit 1
fi

exec k6 run \
  -e "API_URL=${API_URL}" \
  -e "K6_VUS=${K6_VUS}" \
  -e "K6_DURATION=${K6_DURATION}" \
  "$(dirname "$0")/${SCRIPT}"
