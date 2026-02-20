#!/usr/bin/env bash
set -euo pipefail

BASE_URL="${1:-http://localhost:3002}"
EMAIL="${2:-admin@rehabvet.com}"
PASS="${3:-2809Leonie!}"
COOKIE_FILE="/tmp/rehabvet.cookie"

printf "[QA] Base URL: %s\n" "$BASE_URL"

printf "[QA] Health... "
HEALTH=$(curl -s "$BASE_URL/api/health")
python3 - <<'PY' "$HEALTH"
import json,sys
j=json.loads(sys.argv[1])
ok=j.get('ok')
db=j.get('db')
print(f"ok={ok} db={db}")
if not ok:
    raise SystemExit(1)
PY

printf "[QA] Login... "
LOGIN_CODE=$(curl -s -o /tmp/rehabvet_login.json -w '%{http_code}' -c "$COOKIE_FILE" \
  -X POST "$BASE_URL/api/auth/login" \
  -H 'content-type: application/json' \
  -d "{\"email\":\"$EMAIL\",\"password\":\"$PASS\"}")
[[ "$LOGIN_CODE" == "200" ]] || { echo "failed ($LOGIN_CODE)"; cat /tmp/rehabvet_login.json; exit 1; }
echo "ok"

ENDPOINTS=(
  "/api/dashboard"
  "/api/staff"
  "/api/clients"
  "/api/patients"
  "/api/appointments?start_date=2026-02-01&end_date=2026-02-28"
  "/api/treatment-types"
  "/api/reports"
)

for ep in "${ENDPOINTS[@]}"; do
  code=$(curl -s -o /tmp/rehabvet_ep.json -w '%{http_code}' -b "$COOKIE_FILE" "$BASE_URL$ep")
  if [[ "$code" != "200" ]]; then
    echo "[QA] FAIL $ep -> HTTP $code"
    cat /tmp/rehabvet_ep.json
    exit 1
  fi
  bytes=$(wc -c < /tmp/rehabvet_ep.json | tr -d ' ')
  echo "[QA] OK   $ep -> $code (${bytes} bytes)"
done

echo "[QA] Smoke passed"
