#!/usr/bin/env bash
set -euo pipefail

REGISTRY_URL="${NPM_REGISTRY_URL:-https://registry.npmjs.org}"
PING_URL="${REGISTRY_URL%/}/-/ping"

echo "Checking npm access policy for: ${PING_URL}"

set +e
OUTPUT=$(curl -I -sS "$PING_URL" 2>&1)
STATUS=$?
set -e

echo "$OUTPUT"

if [[ $STATUS -eq 0 ]] && echo "$OUTPUT" | rg -q "HTTP/.* 200"; then
  echo "npm registry reachable."
  exit 0
fi

if echo "$OUTPUT" | rg -q "CONNECT tunnel failed, response 403|HTTP/.* 403"; then
  echo "Detected 403 from upstream proxy/policy (Envoy CONNECT rule)."
  echo "Action: set NPM_REGISTRY_URL to your allowed internal registry mirror in CI/local."
  exit 2
fi

echo "Unable to reach npm registry for an unknown reason."
exit 1
