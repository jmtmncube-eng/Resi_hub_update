# Project Setup Guide
## ResiHub — Student Accommodation Management Platform

---

## Prerequisites

### Required
- **Node.js**: v18+ (LTS)
- **npm**: v9+
- **Docker Desktop**: Latest (includes Docker Compose v2)
- **Git**: Latest

### Recommended Tools
- **VS Code** with extensions:
  - Prisma
  - ESLint
  - Prettier
  - Tailwind CSS IntelliSense
  - TypeScript and JavaScript Language Features
  - Docker
- **Postman** or **Thunder Client** — API testing
- **TablePlus** or **pgAdmin** — Database browser (or use Prisma Studio)

---

## Project Structure

```
Resi_hub/
├── frontend/                    # React + Vite + TypeScript
│   ├── src/
│   │   ├── components/
│   │   │   ├── common/         # Button, Input, Card, Badge, Toast, Modal
│   │   │   ├── layout/         # DashboardLayout, Sidebar, ProtectedRoute
│   │   │   ├── dashboard/      # Stat cards, widgets
│   │   │   ├── maintenance/    # TicketCard, TicketForm, StatusBadge
│   │   │   ├── visitors/       # VisitorPassCard, QRCode
│   │   │   ├── wallet/         # BalanceCard, VoucherCard, Leaderboard
│   │   │   ├── chores/         # ChoreCard, ChoreBoard
│   │   │   └── admin/          # OccupancyGrid, AdminStatCard
│   │   ├── pages/
│   │   │   ├── auth/           # Login.tsx
│   │   │   ├── student/        # Dashboard, Maintenance, Updates, Visitors,
│   │   │   │                   # Housemates, Wallet, Profile, Documents
│   │   │   ├── admin/          # Overview, Occupancy, Allocations, Tickets,
│   │   │   │                   # News, Visitors, Rewards, Accounts
│   │   │   └── pending/        # ApplicationStatus, RoomBrowse
│   │   ├── hooks/              # useAuth, useMaintenance, useChores, etc.
│   │   ├── services/           # auth.service, maintenance.service, etc.
│   │   ├── contexts/           # AuthContext
│   │   ├── types/              # TypeScript interfaces
│   │   ├── utils/              # formatters, helpers
│   │   └── constants/          # routes, enums
│   ├── index.html
│   ├── package.json
│   ├── vite.config.ts
│   ├── tailwind.config.js
│   ├── tsconfig.json
│   └── .env.example
│
├── backend/                     # Node.js + Express + TypeScript
│   ├── src/
│   │   ├── controllers/
│   │   │   ├── auth.controller.ts
│   │   │   ├── maintenance.controller.ts
│   │   │   ├── visitors.controller.ts
│   │   │   ├── chores.controller.ts
│   │   │   ├── wallet.controller.ts
│   │   │   ├── news.controller.ts
│   │   │   ├── profile.controller.ts
│   │   │   ├── documents.controller.ts
│   │   │   └── admin.controller.ts
│   │   ├── services/
│   │   │   ├── auth.service.ts
│   │   │   ├── maintenance.service.ts
│   │   │   ├── visitor.service.ts
│   │   │   ├── chore.service.ts
│   │   │   ├── wallet.service.ts
│   │   │   ├── news.service.ts
│   │   │   ├── profile.service.ts
│   │   │   ├── document.service.ts
│   │   │   └── admin.service.ts
│   │   ├── middleware/
│   │   │   ├── auth.middleware.ts       # verify JWT
│   │   │   ├── role.middleware.ts       # RBAC check
│   │   │   ├── error.middleware.ts      # global error handler
│   │   │   ├── validation.middleware.ts # Zod request validation
│   │   │   └── upload.middleware.ts     # Multer file handling
│   │   ├── routes/
│   │   │   ├── auth.routes.ts
│   │   │   ├── maintenance.routes.ts
│   │   │   ├── visitor.routes.ts
│   │   │   ├── chore.routes.ts
│   │   │   ├── wallet.routes.ts
│   │   │   ├── news.routes.ts
│   │   │   ├── profile.routes.ts
│   │   │   ├── documents.routes.ts
│   │   │   └── admin.routes.ts
│   │   ├── validators/
│   │   │   ├── auth.validator.ts
│   │   │   ├── maintenance.validator.ts
│   │   │   ├── visitor.validator.ts
│   │   │   └── ...
│   │   ├── utils/
│   │   │   ├── jwt.util.ts
│   │   │   ├── audit.util.ts
│   │   │   └── date.util.ts
│   │   ├── config/
│   │   │   ├── database.ts
│   │   │   └── storage.ts
│   │   ├── app.ts
│   │   └── server.ts
│   ├── prisma/
│   │   ├── schema.prisma
│   │   ├── migrations/
│   │   └── seed.ts
│   ├── uploads/
│   │   └── .gitkeep
│   ├── package.json
│   ├── tsconfig.json
│   ├── nodemon.json
│   └── .env.example
│
├── docker/
│   ├── Dockerfile.backend
│   ├── Dockerfile.frontend
│   ├── Dockerfile.backend.prod
│   └── Dockerfile.frontend.prod
│
├── Resihub/                     # Original prototype (reference only)
│   └── resihub.html
│
├── docker-compose.yml
├── docker-compose.prod.yml
├── .gitignore
└── [documentation .md files]
```

---

## Environment Variables

### Backend (`backend/.env`)
```env
# Database
DATABASE_URL="postgresql://resihub:resihub@localhost:5432/resihub_db?schema=public"

# JWT
JWT_SECRET="your-super-secret-jwt-key-change-in-production"
JWT_EXPIRES_IN="24h"
JWT_REFRESH_SECRET="your-super-secret-refresh-key-change-in-production"
JWT_REFRESH_EXPIRES_IN="7d"

# Server
PORT=5000
NODE_ENV=development

# CORS
FRONTEND_URL="http://localhost:3000"

# File Storage
UPLOAD_DIR="./uploads"
MAX_FILE_SIZE=10485760

# Storage type: local | s3
STORAGE_TYPE="local"

# AWS S3 (when STORAGE_TYPE=s3)
AWS_REGION="af-south-1"
AWS_BUCKET_NAME="resihub-files"
AWS_ACCESS_KEY_ID=""
AWS_SECRET_ACCESS_KEY=""

# Email (Nodemailer)
SMTP_HOST="smtp.gmail.com"
SMTP_PORT=587
SMTP_USER=""
SMTP_PASSWORD=""
EMAIL_FROM="noreply@resihub.co.za"
```

### Frontend (`frontend/.env`)
```env
VITE_API_BASE_URL=http://localhost:5000/api
VITE_APP_NAME="ResiHub"
VITE_MAX_FILE_SIZE=10485760
```

---

## Step-by-Step Manual Setup

### 1. Backend
```bash
cd backend
npm install
cp .env.example .env
# Edit .env with your DB credentials

npx prisma migrate dev --name init
npx prisma generate
npm run db:seed
npm run dev
```

### 2. Frontend
```bash
cd frontend
npm install
cp .env.example .env
npm run dev
```

### 3. Docker (Recommended)
```bash
# From project root
cp backend/.env.example backend/.env
cp frontend/.env.example frontend/.env

docker-compose up

# First time only
docker-compose exec backend npx prisma migrate dev --name init
docker-compose exec backend npm run db:seed
```

---

## Backend Scripts

```json
{
  "dev":           "nodemon src/server.ts",
  "build":         "tsc",
  "start":         "node dist/server.js",
  "migrate:dev":   "prisma migrate dev",
  "migrate:deploy":"prisma migrate deploy",
  "migrate:reset": "prisma migrate reset",
  "db:seed":       "ts-node prisma/seed.ts",
  "db:studio":     "prisma studio",
  "generate":      "prisma generate",
  "lint":          "eslint src --ext .ts",
  "format":        "prettier --write \"src/**/*.ts\""
}
```

## Frontend Scripts

```json
{
  "dev":     "vite",
  "build":   "tsc && vite build",
  "preview": "vite preview",
  "lint":    "eslint src --ext ts,tsx",
  "format":  "prettier --write \"src/**/*.{ts,tsx}\""
}
```

---

## Troubleshooting

### Port already in use
```bash
# Kill port 5000
npx kill-port 5000

# Kill port 3000
npx kill-port 3000
```

### Prisma client out of sync
```bash
cd backend && npx prisma generate
```

### Database connection failed
```bash
# Check container is running
docker-compose ps

# Check DATABASE_URL in backend/.env
# For Docker: host must be "postgres" (service name), not "localhost"
DATABASE_URL="postgresql://resihub:resihub@postgres:5432/resihub_db"
```

### Full reset
```bash
docker-compose down -v   # removes all volumes (database wiped)
docker-compose up
docker-compose exec backend npx prisma migrate dev --name init
docker-compose exec backend npm run db:seed
```

---

## Roles Reference

| Role | Description |
|------|-------------|
| `ACTIVE_STUDENT` | Fully allocated resident — full student portal |
| `PENDING_STUDENT` | Applicant — status tracker + room browse only |
| `ADMIN` | Staff — full admin panel |

## Demo Accounts (after seed)

| Role | Email | Password |
|------|-------|----------|
| Active Student | `sarah@campus.edu` | `pass123` |
| Active Student | `marcus@campus.edu` | `pass123` |
| Active Student | `lerato@campus.edu` | `pass123` |
| Pending Student | `aisha@campus.edu` | `pass123` |
| Admin | `admin@resihub.co` | `admin123` |

---

**Document Version**: 1.0
**Last Updated**: 2026-03-25
