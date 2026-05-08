#!/bin/sh
set -e
ADT=$(curl -s -X POST http://localhost:5000/api/auth/login -H "Content-Type: application/json" -d '{"email":"admin@resihub.co","password":"admin123"}' | jq -r '.data.accessToken')

echo "=== Stats — portfolio (no residenceId) ==="
curl -s "http://localhost:5000/api/admin/stats" -H "Authorization: Bearer $ADT" | jq '.data | {students: .students.total, rooms: .rooms.total, monthlyRevenue, urgent: .maintenance.urgent}'

echo "=== Stats — Lions Den only ==="
curl -s "http://localhost:5000/api/admin/stats?residenceId=res_lions_den" -H "Authorization: Bearer $ADT" | jq '.data | {students: .students.total, rooms: .rooms.total, monthlyRevenue}'

echo "=== Stats — Great Den only ==="
curl -s "http://localhost:5000/api/admin/stats?residenceId=res_great_den" -H "Authorization: Bearer $ADT" | jq '.data | {students: .students.total, rooms: .rooms.total, monthlyRevenue}'

echo "=== Ops insights — Lions Den only ==="
curl -s "http://localhost:5000/api/admin/ops/insights?residenceId=res_lions_den" -H "Authorization: Bearer $ADT" | jq '.data | {monthlyOpsCost, stockKeys: [.stock[] | .key], reminders: (.reminders | length)}'

echo "=== Ops insights — Great Den only ==="
curl -s "http://localhost:5000/api/admin/ops/insights?residenceId=res_great_den" -H "Authorization: Bearer $ADT" | jq '.data | {monthlyOpsCost, stockKeys: [.stock[] | .key], reminders: (.reminders | length)}'

echo "=== Revenue report — Lions Den only ==="
curl -s "http://localhost:5000/api/admin/revenue?residenceId=res_lions_den" -H "Authorization: Bearer $ADT" | jq '.data | {projectedMonthly, totalActiveStudents, late: (.latePayers | length)}'

echo "=== Maintenance scoped to Great Den ==="
curl -s "http://localhost:5000/api/maintenance/admin/all?residenceId=res_great_den" -H "Authorization: Bearer $ADT" | jq '.data | length'
