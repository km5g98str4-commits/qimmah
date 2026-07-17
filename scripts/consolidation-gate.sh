#!/usr/bin/env bash
# Consolidation full gate. Usage: bash scripts/consolidation-gate.sh [--chaos]
set -o pipefail
cd "$(dirname "$0")/.." || exit 2
LOG=/tmp/gate_$$
run() { # name cmd...
  local name="$1"; shift
  echo "=== $name ==="
  if "$@" > "$LOG.$name" 2>&1; then echo "  PASS $name"; else echo "  FAIL $name (exit $?)"; tail -12 "$LOG.$name"; echo "GATE_FAILED:$name"; exit 1; fi
}
run typecheck npm run typecheck
run lint npm run lint
run build npm run build
run testgate npm run test:gate
run observability npm run test:observability
run nativebridge npm run test:native-bridge
if [ "$1" = "--chaos" ]; then run chaos npm run test:chaos; fi
run capsync npx cap sync ios
echo "ALL_GATES_PASS"
