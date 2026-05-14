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
#    2. ensures .env exists — generates strong JWT secrets on first run
#    3. rebuilds the Docker images from scratch (--no-cache)
#    4. recreates the containers
#    5. waits for the backend to come up healthy
#    6. applies database migrations (baselines an existing DB first)
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

# Production override: every `docker compose` call below automatically
# layers docker-compose.prod.yml on top (static nginx frontend build
# instead of the Vite dev server). Local dev keeps using plain
# `docker compose up` with just the base file.
export COMPOSE_FILE="docker-compose.yml:docker-compose.prod.yml"

# ── 1. Sync code ───────────────────────────────────────────────
echo ""
echo "[1/7] Pulling latest code…"
git fetch origin
git reset --hard origin/main      # discard any stray local edits on the VPS
echo "      -> $(git log -1 --oneline)"

# ── 2. Ensure .env (secrets + VPS settings; never clobbers existing) ──
# Strong JWT secrets are GENERATED here on first run and then persisted —
# they never get committed (.env is gitignored) and never get overwritten
# (rotating them would log every user out). Plain settings are backfilled
# only if absent, so hand-edits to .env always win.
echo ""
echo "[2/7] Ensuring .env (secrets + settings)…"
touch .env

# Backfill KEY=VALUE only when KEY is absent.
ensure_env() {
  grep -q "^$1=" .env || { printf '%s=%s\n' "$1" "$2" >> .env; echo "      + $1"; }
}
# A secret counts as "set" only if it has a non-empty value — covers the
# case where .env was copied from .env.example with the keys left blank.
ensure_secret() {
  grep -q "^$1=..*" .env || {
    printf '%s=%s\n' "$1" "$(openssl rand -hex 32)" >> .env
    echo "      + $1 (generated)"
  }
}

ensure_secret JWT_SECRET
ensure_secret JWT_REFRESH_SECRET
ensure_env    JWT_EXPIRES_IN         24h
ensure_env    JWT_REFRESH_EXPIRES_IN 7d
ensure_env    NODE_ENV               production
ensure_env    FRONTEND_URL           https://resihub.athera.co.za
ensure_env    FRONTEND_PORT          3001
ensure_env    VITE_API_BASE_URL      /api
chmod 600 .env 2>/dev/null || true
echo "      -> .env ready (chmod 600)"

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
  # busybox wget (the backend image is node:alpine — no curl). It exits
  # non-zero on a connection failure OR a non-2xx response, so a clean
  # exit is a genuine healthy backend. 127.0.0.1 (not localhost) — inside
  # the container localhost resolves to ::1 first and the server only
  # listens on IPv4, and busybox wget won't fall back like curl does.
  if docker compose exec -T backend wget -q -O /dev/null http://127.0.0.1:5000/health 2>/dev/null; then
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

# ── 6. Apply database migrations ──────────────────────────────
# Versioned migrations replaced `db push --accept-data-loss` — db push
# silently drops a column the day a schema change isn't purely additive.
#
# An EXISTING database (from the old db-push era) already has the tables
# those early migrations describe, so `migrate deploy` would error trying
# to re-create them. We baseline ONLY those db-push-era migrations: mark
# them applied without running. `resolve --applied` on a migration that
# is genuinely already recorded errors — we swallow that.
#
# CRITICAL: only the migrations BELOW are baselined. Every migration
# created AFTER the reconcile point is real, new schema and MUST run via
# `migrate deploy` — baselining those would mark new tables "applied"
# without creating them, and the backend would crash at runtime. This
# list is frozen history — NEVER add a new migration to it.
#
# A FRESH empty database has no "User" table → we skip baselining and
# `migrate deploy` builds the whole schema from scratch.
echo ""
echo "[6/7] Applying database migrations…"
HAS_USER=$(docker compose exec -T postgres psql -U resihub -d resihub_db -tAc \
  "SELECT to_regclass('public.\"User\"') IS NOT NULL;" 2>/dev/null | tr -d '[:space:]')
if [ "$HAS_USER" = "t" ]; then
  echo "      existing schema detected — baselining db-push-era migrations…"
  for m in \
    20260325094212_init \
    20260430182006_add_contract_signing \
    20260501043701_session8_payment_proof_voucher_claims_residence_settings \
    20260501052241_add_triple_quad_room_types \
    20260501095301_chore_proof_news_reads \
    20260501110717_onboarding_and_account_polish \
    20260501114525_account_active_flag \
    20260501122027_multi_tenant_rooms \
    20260501142340_ops_module \
    20260501153205_multi_residence_contractors \
    20260514170000_batch_a_reconcile \
  ; do
    docker compose exec -T backend npx prisma migrate resolve --applied "$m" >/dev/null 2>&1 || true
  done
  echo "      -> baselined (post-reconcile migrations will run normally)"
fi
docker compose exec -T backend npx prisma migrate deploy
# Regenerate the Prisma client in case the migrations advanced the schema.
docker compose exec -T backend npx prisma generate >/dev/null 2>&1 || true

# Back-fill any base64-in-DB uploads onto disk (idempotent — only touches
# rows whose value still starts with "data:", so re-runs are no-ops).
echo "      migrating any base64 uploads → disk…"
docker compose exec -T backend npx ts-node scripts/migrate-base64-uploads.ts || \
  echo "      ⚠ base64 upload migration had issues — check: docker compose logs backend"

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
