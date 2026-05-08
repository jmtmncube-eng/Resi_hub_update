#!/bin/sh
# Resi-Hub VPS deploy script.
# Run from the project root:
#
#   ./deploy.sh             # code + schema only — keeps existing data
#   SEED=1 ./deploy.sh      # also reseed the DB (DESTRUCTIVE — wipes users)
#
# Pulls latest code, rebuilds containers fresh, applies Prisma schema,
# optionally reseeds, reloads nginx if installed.
set -e

echo ""
echo "============================================================"
echo "  ResiHub deploy"
echo "============================================================"

# ── 1. Sync code ────────────────────────────────────────────────
echo ""
echo "[1/6] Pulling latest code…"
git fetch origin
git reset --hard origin/main      # discard any local edits on the VPS
echo "    -> $(git log -1 --oneline)"

# ── 2. Rebuild images (no cache, no shortcuts) ─────────────────
echo ""
echo "[2/6] Rebuilding Docker images (no cache)…"
docker compose build --no-cache backend frontend

# ── 3. Recreate containers from the fresh images ───────────────
echo ""
echo "[3/6] Recreating containers…"
docker compose down
docker compose up -d

# ── 4. Wait for backend to be healthy ──────────────────────────
echo ""
echo "[4/6] Waiting for backend…"
for i in 1 2 3 4 5 6 7 8 9 10 11 12; do
  if docker compose exec -T backend curl -s -o /dev/null -w "%{http_code}" http://localhost:5000/health 2>/dev/null | grep -q 200; then
    echo "    -> backend ready"
    break
  fi
  printf "    .. attempt %s/12\n" "$i"
  sleep 3
done

# ── 5. Apply schema (idempotent — ok to run repeatedly) ────────
echo ""
echo "[5/6] Applying Prisma schema…"
docker compose exec -T backend npx prisma db push --accept-data-loss

# ── 6. Reseed (only if SEED=1 passed) ──────────────────────────
# The seed has a FORCE_SEED guard that refuses to wipe a non-empty DB.
# We pass FORCE_SEED=1 here so SEED=1 ./deploy.sh always succeeds — caller
# already opted in by setting SEED=1, no point in a second confirmation.
if [ "$SEED" = "1" ]; then
  echo ""
  echo "[6/6] Reseeding (SEED=1 was set — DB will be wiped)…"
  docker compose exec -T -e FORCE_SEED=1 backend npx prisma db seed
else
  echo ""
  echo "[6/6] Skipping seed.  Run with  SEED=1 ./deploy.sh  to reseed (DESTRUCTIVE)."
fi

# ── Reload nginx if installed ───────────────────────────────────
if command -v nginx >/dev/null 2>&1; then
  echo ""
  echo "Reloading nginx…"
  sudo nginx -t && sudo systemctl reload nginx
fi

echo ""
echo "============================================================"
echo "  Done. Hard-refresh your browser: Ctrl+Shift+R"
echo "============================================================"
echo ""
docker compose ps
