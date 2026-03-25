# Quick Start Guide
## ResiHub — Student Accommodation Management Platform

**Get running in under 5 minutes using Docker.**

---

## Prerequisites

- [Docker Desktop](https://www.docker.com/products/docker-desktop/) installed and running
- Git

---

## 1. Clone & Configure

```bash
git clone <repository-url>
cd Resi_hub

# Copy environment files
cp backend/.env.example backend/.env
cp frontend/.env.example frontend/.env
```

---

## 2. Start All Services

```bash
docker-compose up
```

This starts 3 containers:
| Container | Service | URL |
|---|---|---|
| `resihub-postgres` | PostgreSQL 15 database | `localhost:5432` |
| `resihub-backend` | Node.js + Express API | `http://localhost:5000` |
| `resihub-frontend` | React + Vite | `http://localhost:3000` |

---

## 3. First-Time Database Setup

```bash
# In a new terminal — run migrations
docker-compose exec backend npx prisma migrate dev --name init

# Seed demo data
docker-compose exec backend npm run db:seed
```

---

## 4. Open the App

| URL | What |
|---|---|
| `http://localhost:3000` | ResiHub application |
| `http://localhost:5000/health` | API health check |
| `http://localhost:5555` | Prisma Studio (database browser) |

---

## 5. Login with Demo Accounts

| Role | Email | Password |
|---|---|---|
| Active Student | `sarah@campus.edu` | `pass123` |
| Active Student | `marcus@campus.edu` | `pass123` |
| Pending Student | `aisha@campus.edu` | `pass123` |
| Admin | `admin@resihub.co` | `admin123` |

---

## Useful Commands

```bash
# View logs
docker-compose logs -f

# View only backend logs
docker-compose logs -f backend

# Stop all services
docker-compose down

# Stop and remove database volume (full reset)
docker-compose down -v

# Rebuild after code changes (if not hot-reloading)
docker-compose up --build

# Open Prisma Studio
docker-compose exec backend npm run db:studio

# Run a migration
docker-compose exec backend npx prisma migrate dev --name your_migration_name

# Re-seed data
docker-compose exec backend npm run db:seed
```

---

## Without Docker (Manual Setup)

If you prefer running without Docker:

```bash
# 1. Start PostgreSQL locally (or use existing instance)
# Update DATABASE_URL in backend/.env accordingly

# 2. Backend
cd backend
npm install
npx prisma migrate dev
npx prisma generate
npm run db:seed
npm run dev        # Starts on http://localhost:5000

# 3. Frontend (new terminal)
cd frontend
npm install
npm run dev        # Starts on http://localhost:3000
```

---

For full setup options, environment variable reference, and troubleshooting — see [PROJECT_SETUP.md](./PROJECT_SETUP.md).
