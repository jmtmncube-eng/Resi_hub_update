# Deployment Guide
## ResiHub — Student Accommodation Management Platform

**Last Updated**: 2026-03-25
**Audience**: Developer / Business Owner

---

## 1. Recommended Production Architecture

```
            ┌──────────────────────────────────────┐
            │          Cloudflare (Free)             │
            │    CDN + DDoS Protection + SSL         │
            └───────────────┬──────────────────────┘
                            │
           ┌────────────────┼─────────────────┐
           │                                  │
  ┌────────▼────────┐              ┌──────────▼───────┐
  │  Vercel (Pro)   │              │ Railway (Hobby)   │
  │ React Frontend  │              │ Node.js Backend   │
  │ resihub.co.za   │              │ api.resihub.co.za │
  └─────────────────┘              └──────────┬───────┘
                                              │
                            ┌─────────────────┼──────────────┐
                            │                 │              │
                  ┌─────────▼──────┐  ┌───────▼──────┐  ┌──▼──────────┐
                  │  PostgreSQL    │  │   AWS S3     │  │  Sentry     │
                  │ (Railway DB)   │  │  af-south-1  │  │  (Errors)   │
                  └────────────────┘  └──────────────┘  └─────────────┘
```

### Why this stack
- **Vercel** — Zero-config React/Vite hosting, global CDN, automatic preview deployments
- **Railway** — Simple Node.js hosting with managed PostgreSQL, no infrastructure management
- **AWS S3 (af-south-1)** — Files stored in Cape Town for POPIA data residency
- **Cloudflare** — Free SSL, DDoS protection, CDN
- **Sentry** — Error tracking (free tier: 5,000 errors/month)

---

## 2. Cost Breakdown (South African Residences)

All prices early 2026. ZAR at ~R18/USD.

### Starter (1 residence, up to 50 students)

| Service | Plan | USD/month | ZAR/month |
|---------|------|-----------|-----------|
| Railway (backend + DB) | Hobby | $5 | ~R90 |
| Vercel (frontend) | Pro | $20 | ~R360 |
| AWS S3 (storage) | Pay-as-you-go | ~$2 | ~R36 |
| Cloudflare | Free | $0 | R0 |
| UptimeRobot | Free | $0 | R0 |
| Sentry | Free | $0 | R0 |
| **Total** | | **~$27/month** | **~R486/month** |

### Growth (multi-residence, 200+ students)

| Service | Plan | USD/month | ZAR/month |
|---------|------|-----------|-----------|
| Railway Pro | Pro | $20 | ~R360 |
| Managed PostgreSQL (Neon/Supabase) | Pro | $25 | ~R450 |
| Vercel | Pro | $20 | ~R360 |
| AWS S3 | Pay-as-you-go | ~$10 | ~R180 |
| **Total** | | **~$75/month** | **~R1,350/month** |

---

## 3. Security Requirements

- ✅ HTTPS enforced everywhere (Cloudflare handles SSL)
- ✅ JWT tokens — short-lived (24h access, 7d refresh)
- ✅ bcrypt password hashing (12 rounds in production)
- ✅ Zod validation on all API inputs
- ✅ Helmet.js security headers
- ✅ CORS locked to frontend origin
- ✅ Rate limiting on `/api/auth` endpoints
- ✅ File upload: MIME type + size validation
- ✅ Prisma parameterised queries (SQL injection prevention)

---

## 4. POPIA Compliance (South African Data Law)

The Protection of Personal Information Act (POPIA) applies to all personal data of South African residents.

### Key Requirements

| Requirement | Implementation |
|-------------|----------------|
| Data stored in SA | AWS S3 af-south-1 (Cape Town) |
| User consent | Registration consent checkbox |
| Right to access | `GET /api/profile` returns all personal data |
| Right to deletion | `DELETE /api/profile` — hard delete flow |
| Privacy policy | `/privacy-policy` page |
| Breach notification | Sentry alerts + manual reporting process |
| Minimum data collection | Only collect what's needed for residence management |

---

## 5. Environment Configuration

### Backend Production `.env`
```env
DATABASE_URL="postgresql://user:pass@host:5432/resihub_prod"
JWT_SECRET="<32+ char random string>"
JWT_REFRESH_SECRET="<32+ char random string>"
JWT_EXPIRES_IN="24h"
JWT_REFRESH_EXPIRES_IN="7d"
PORT=5000
NODE_ENV=production
FRONTEND_URL="https://resihub.co.za"
STORAGE_TYPE="s3"
AWS_REGION="af-south-1"
AWS_BUCKET_NAME="resihub-files-prod"
AWS_ACCESS_KEY_ID="<key>"
AWS_SECRET_ACCESS_KEY="<secret>"
SMTP_HOST="smtp.sendgrid.net"
SMTP_PORT=587
SMTP_USER="apikey"
SMTP_PASSWORD="<sendgrid-api-key>"
EMAIL_FROM="noreply@resihub.co.za"
```

### Frontend Production `.env`
```env
VITE_API_BASE_URL=https://api.resihub.co.za/api
VITE_APP_NAME="ResiHub"
```

---

## 6. Deployment Steps

### Backend (Railway)

```bash
# 1. Push to GitHub
git push origin main

# 2. Connect Railway to GitHub repo
# railway.app → New Project → Deploy from GitHub

# 3. Set environment variables in Railway dashboard

# 4. Add PostgreSQL plugin in Railway
# DATABASE_URL is auto-injected

# 5. Run migrations on deploy
# Add to Railway start command:
npx prisma migrate deploy && node dist/server.js

# 6. Build command:
npm run build
```

### Frontend (Vercel)

```bash
# 1. Push to GitHub

# 2. Connect Vercel to GitHub repo
# vercel.com → New Project → Import Git Repository

# 3. Build settings:
#   Framework: Vite
#   Build command: npm run build
#   Output directory: dist

# 4. Set environment variables in Vercel dashboard

# 5. Deploy triggers automatically on push to main
```

### Database Migration (Production)

```bash
# Run on Railway via CLI or dashboard terminal
npx prisma migrate deploy

# Verify
npx prisma migrate status
```

---

## 7. Monitoring & Alerting

| Tool | Purpose | Setup |
|------|---------|-------|
| UptimeRobot | Uptime monitoring (ping every 5 min) | Free — monitor `https://api.resihub.co.za/health` |
| Sentry | Error tracking + performance | Add `@sentry/node` to backend |
| Railway Metrics | Container CPU/memory | Built into Railway dashboard |
| Cloudflare Analytics | Traffic + threats | Built into Cloudflare dashboard |

---

## 8. Database Backups

### Railway (Automatic)
- Daily automated snapshots (retained 7 days on Hobby plan)
- Manual snapshot before every major migration

### Manual Backup
```bash
pg_dump $DATABASE_URL > backup_$(date +%Y%m%d).sql
```

---

**Document Version**: 1.0
**Last Updated**: 2026-03-25
