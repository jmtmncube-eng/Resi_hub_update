#!/bin/sh
set -e
ADT=$(curl -s -X POST http://localhost:5000/api/auth/login -H "Content-Type: application/json" -d '{"email":"admin@resihub.co","password":"admin123"}' | jq -r '.data.accessToken')
echo "Admin login: $([ -n "$ADT" ] && [ "$ADT" != null ] && echo OK || echo FAIL)"

ST=$(curl -s -X POST http://localhost:5000/api/auth/login -H "Content-Type: application/json" -d '{"email":"sarah@campus.edu","password":"pass123"}' | jq -r '.data.accessToken')
echo "Student login: $([ -n "$ST" ] && [ "$ST" != null ] && echo OK || echo FAIL)"

echo
echo "=== Residence scoping smoke ==="
echo "[Portfolio] /admin/stats"
curl -s http://localhost:5000/api/admin/stats -H "Authorization: Bearer $ADT" | jq '.data | {students: .students.total, rooms: .rooms.total, monthlyRevenue, urgent: .maintenance.urgent}'
echo "[Lions Den] /admin/stats?residenceId=res_lions_den"
curl -s "http://localhost:5000/api/admin/stats?residenceId=res_lions_den" -H "Authorization: Bearer $ADT" | jq '.data | {students: .students.total, rooms: .rooms.total, monthlyRevenue, urgent: .maintenance.urgent}'
echo "[Great Den] /admin/stats?residenceId=res_great_den"
curl -s "http://localhost:5000/api/admin/stats?residenceId=res_great_den" -H "Authorization: Bearer $ADT" | jq '.data | {students: .students.total, rooms: .rooms.total, monthlyRevenue, urgent: .maintenance.urgent}'

echo
echo "[Lions Den] /admin/ops/insights"
curl -s "http://localhost:5000/api/admin/ops/insights?residenceId=res_lions_den" -H "Authorization: Bearer $ADT" | jq '.data | {monthlyOpsCost, stockKeys: [.stock[] | .key]}'
echo "[Great Den] /admin/ops/insights"
curl -s "http://localhost:5000/api/admin/ops/insights?residenceId=res_great_den" -H "Authorization: Bearer $ADT" | jq '.data | {monthlyOpsCost, stockKeys: [.stock[] | .key]}'
