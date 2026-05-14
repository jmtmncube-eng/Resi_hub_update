#!/bin/sh
# ============================================================
#  ResiHub — one-line VPS deploy
# ============================================================
#  Run from the project root:
#
#     ./deploy.sh             # pull + build + migrate — keeps data
#     SEED=1 ./deploy.sh      # also reseed the DB (DESTRUCTIVE — wipes users)
#
#  This is the ONLY command you need on the VPS. It:
#    1. pulls the latest code (hard reset to origin/main)
#    2. makes sure .env exists with the VPS-correct settings
#    3. rebuilds the Docker images from scratch (--no-cache)
#    4. recreates the containers
#    5. waits for the backend to come up healthy
#    6. applies the Prisma schema
#    7. optionally reseeds (SEED=1 only)
#    8. reloads nginx
#
#  First time only:  chmod +x deploy.sh
# ============================================================
set -e

echo ""
echo "============================================================"
echo "  ResiHub deploy"
echo "============================================================"

# ── Pre-flight ─────────────────────────────────────────────────
if [ ! -f docker-compose.yml ]; then
  echo "  ✗ docker-compose.yml not found — run this from the project root."
  exit 1
fi
if ! command -v docker >/dev/null 2>&1; then
  echo "  ✗ docker is not installed / not on PATH."
  exit 1
fi

# ── 1. Sync code ───────────────────────────────────────────────
echo ""
echo "[1/7] Pulling latest code…"
git fetch origin
git reset --hard origin/main      # discard any stray local edits on the VPS
echo "      -> $(git log -1 --oneline)"

# ── 2. Ensure .env (VPS-correct defaults; never clobbers existing) ──
# The VPS already runs other apps on :3000, so the frontend is exposed
# on :3001 and nginx proxies /api/ to the backend (hence VITE_API_BASE_URL=/api).
# If you ever change these, edit .env directly — this block won't overwrite it.
echo ""
echo "[2/7] Checking .env…"
if [ ! -f .env ]; then
  printf 'FRONTEND_PORT=3001\nVITE_API_BASE_URL=/api\n' > .env
  echo "      -> created .env (FRONTEND_PORT=3001, VITE_API_BASE_URL=/api)"
else
  # Backfill any missing keys without touching what's already set.
  grep -q '^FRONTEND_PORT='     .env || { echo 'FRONTEND_PORT=3001'    >> .env; echo "      -> added FRONTEND_PORT=3001"; }
  grep -q '^VITE_API_BASE_URL=' .env || { echo 'VITE_API_BASE_URL=/api' >> .env; echo "      -> added VITE_API_BASE_URL=/api"; }
  echo "      -> .env present"
fi

# ── 3. Rebuild images (no cache, no shortcuts) ────────────────
echo ""
echo "[3/7] Rebuilding Docker images (no cache)…"
docker compose build --no-cache backend frontend

# ── 4. Recreate containers from the fresh images ──────────────
echo ""
echo "[4/7] Recreating containers…"
docker compose down
docker compose up -d

# ── 5. Wait for backend to be healthy ─────────────────────────
echo ""
echo "[5/7] Waiting for backend…"
BACKEND_UP=0
for i in 1 2 3 4 5 6 7 8 9 10 11 12 13 14 15; do
  if docker compose exec -T backend curl -s -o /dev/null -w "%{http_code}" http://localhost:5000/health 2>/dev/null | grep -q 200; then
    echo "      -> backend ready"
    BACKEND_UP=1
    break
  fi
  printf "      .. attempt %s/15\n" "$i"
  sleep 3
done
if [ "$BACKEND_UP" != "1" ]; then
  echo "      ✗ backend did not come up — check: docker compose logs --tail=50 backend"
  exit 1
fi

# ── 6. Apply schema (idempotent — safe to run every deploy) ───
echo ""
echo "[6/7] Applying Prisma schema…"
docker compose exec -T backend npx prisma db push --accept-data-loss

# ── 7. Reseed (only if SEED=1 passed) ─────────────────────────
# seed.ts has a FORCE_SEED guard that refuses to wipe a non-empty DB.
# Passing SEED=1 here forwards FORCE_SEED=1 so the caller's explicit
# opt-in doesn't need a second confirmation.
if [ "$SEED" = "1" ]; then
  echo ""
  echo "[7/7] Reseeding (SEED=1 set — DB will be WIPED and refilled)…"
  docker compose exec -T -e FORCE_SEED=1 backend npx prisma db seed
else
  echo ""
  echo "[7/7] Skipping seed.  Run  SEED=1 ./deploy.sh  to reseed (DESTRUCTIVE)."
fi

# ── nginx reload (best-effort) ─────────────────────────────────
if command -v nginx >/dev/null 2>&1; then
  echo ""
  echo "Reloading nginx…"
  sudo nginx -t && sudo systemctl reload nginx
fi

echo ""
echo "============================================================"
echo "  ✓ Done.  Hard-refresh the browser: Ctrl+Shift+R"
echo "============================================================"
echo ""
docker compose ps
