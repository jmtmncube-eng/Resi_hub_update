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
# ts-node compiles the whole TS project on a fresh --no-cache image; on a
# small VPS that can take 1–2 minutes. We poll for up to ~3 minutes. If it
# still isn't up we WARN and carry on rather than aborting — the next two
# steps (prisma db push) will fail loudly on their own if the backend is
# genuinely dead, and more often than not it just needed another few seconds.
echo ""
echo "[5/7] Waiting for backend (up to ~3 min — ts-node compile)…"
BACKEND_UP=0
i=1
while [ "$i" -le 45 ]; do
  if docker compose exec -T backend curl -s -o /dev/null -w "%{http_code}" http://localhost:5000/health 2>/dev/null | grep -q 200; then
    echo "      -> backend ready (after ~$((i * 4))s)"
    BACKEND_UP=1
    break
  fi
  [ $((i % 5)) -eq 0 ] && printf "      .. still compiling (%ss elapsed)\n" "$((i * 4))"
  i=$((i + 1))
  sleep 4
done
if [ "$BACKEND_UP" != "1" ]; then
  echo "      ⚠ backend still not responding after ~3 min — continuing anyway."
  echo "        If the next steps fail, check: docker compose logs --tail=50 backend"
fi

# ── 6. Apply schema (idempotent — safe to run every deploy) ───
# Retry once: if the backend was still finishing its compile during the
# wait above, the first prisma call can race it — a single retry covers it.
echo ""
echo "[6/7] Applying Prisma schema…"
if ! docker compose exec -T backend npx prisma db push --accept-data-loss; then
  echo "      first attempt failed — waiting 15s and retrying once…"
  sleep 15
  docker compose exec -T backend npx prisma db push --accept-data-loss
fi

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
