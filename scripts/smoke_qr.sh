#!/bin/sh
set -e
echo "=== QR / GATE FLOW SMOKE ==="
echo

# Health
echo "[health] $(curl -s -o /dev/null -w '%{http_code}' http://localhost:5000/health)"

# Sarah creates a pass
ST=$(curl -s -X POST http://localhost:5000/api/auth/login -H "Content-Type: application/json" -d '{"email":"sarah@campus.edu","password":"pass123"}' | jq -r '.data.accessToken')
echo "[1] Student login: $([ -n "$ST" ] && [ "$ST" != null ] && echo OK || echo FAIL)"

PASS=$(curl -s -X POST http://localhost:5000/api/visitors -H "Authorization: Bearer $ST" -H "Content-Type: application/json" \
  --data '{"visitorName":"Gate Test Bob","visitorPhone":"0721234567","date":"2026-12-25","timeFrom":"10:00","timeTo":"14:00","purpose":"Lunch"}')
PID=$(echo "$PASS" | jq -r '.data.id')
QR=$(echo "$PASS" | jq -r '.data.qrCode')
echo "[2] Pass created: $QR"

# Public gate scan — no auth
echo "[3] Gate scan #1 (entry)"
curl -s -X POST http://localhost:5000/api/gate/scan -H "Content-Type: application/json" --data "{\"qrCode\":\"$QR\"}" | jq '.data | {action, status: .pass.status, host: .host.name, room: .host.room}'

echo "[4] Sarah polls passes — should see ACTIVE/checkedIn"
curl -s http://localhost:5000/api/visitors -H "Authorization: Bearer $ST" | jq --arg id "$PID" '.data[] | select(.id == $id) | {status, checkedIn, checkedInAt}'

echo "[5] Gate scan #2 (exit)"
curl -s -X POST http://localhost:5000/api/gate/scan -H "Content-Type: application/json" --data "{\"qrCode\":\"$QR\"}" | jq '.data | {action, status: .pass.status}'

echo "[6] Gate scan #3 (already checked out — should reject)"
curl -s -X POST http://localhost:5000/api/gate/scan -H "Content-Type: application/json" --data "{\"qrCode\":\"$QR\"}" | jq -c '{success, error}'

echo "[7] Bad code — should 404"
curl -s -X POST http://localhost:5000/api/gate/scan -H "Content-Type: application/json" --data '{"qrCode":"QR-NONSENSE"}' | jq -c '{success, error}'

echo "[8] No code — should 400"
curl -s -X POST http://localhost:5000/api/gate/scan -H "Content-Type: application/json" --data '{}' | jq -c '{success, error}'

echo "[9] GET form (?code=) also works"
curl -s "http://localhost:5000/api/gate/scan?code=does-not-exist" | jq -c '{success, error}'

echo "[10] Cleanup"
docker exec -i resihub-postgres psql -U resihub -d resihub_db -c "DELETE FROM \"VisitorPass\" WHERE \"qrCode\" = '$QR';" > /dev/null 2>&1 || true
echo "  done"
