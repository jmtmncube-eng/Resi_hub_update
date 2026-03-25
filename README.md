# ResiHub — Student Accommodation Management Platform

<div align="center">

![ResiHub](https://img.shields.io/badge/ResiHub-Student%20Accommodation-00CCCC?style=for-the-badge)
![Status](https://img.shields.io/badge/Status-Active%20Development-E8197A?style=for-the-badge)
![Stack](https://img.shields.io/badge/Stack-React%20%2B%20Node.js%20%2B%20PostgreSQL-0f0f12?style=for-the-badge)
![License](https://img.shields.io/badge/License-MIT-00CCCC?style=for-the-badge)

**A unified platform for booking, tracking, and managing student accommodation — built for both residents and administrators.**

</div>

---

## 📋 Table of Contents

- [Overview](#overview)
- [The Problem It Solves](#the-problem-it-solves)
- [Key Features](#key-features)
- [Technology Stack](#technology-stack)
- [System Architecture](#system-architecture)
- [Getting Started](#getting-started)
- [Project Structure](#project-structure)
- [Documentation](#documentation)
- [Development](#development)
- [Deployment](#deployment)
- [Roadmap](#roadmap)
- [Demo Accounts](#demo-accounts)
- [License](#license)

---

## 🎯 Overview

ResiHub is a full-featured student residence management system built for South African student accommodation providers. It manages multiple blocks with distinct role-gated workflows for active students, pending applicants, and administrators.

The platform eliminates paper-based processes — from room allocation and maintenance reporting to visitor management, chore coordination, and a credit reward system — replacing them with a clean, scalable digital interface accessible from any browser.

---

## 🔧 The Problem It Solves

South African student residences typically manage the following through WhatsApp groups, spreadsheets, paper forms, and word of mouth:

- Room applications and allocations
- Maintenance fault reporting
- Visitor logbooks at reception
- Monthly invoice distribution
- Chore rosters and accountability
- News and notice distribution
- Admin oversight of who lives where, who owes what, and what is broken

ResiHub centralises all of these into one platform that any student can access on their phone and any admin can manage from a browser tab.

---

## ✨ Key Features

### For Students
| Feature | Description |
|---|---|
| **Dashboard** | Rent status, open tickets, pinned notices, chore board at a glance |
| **Maintenance** | Report issues with photos/videos, track status, get admin notes |
| **Residence Updates** | Live news feed published by admin |
| **Visitor Passes** | Invite guests, generate QR codes, manage pass history |
| **Housemates** | See who lives in your block, share chores |
| **Chore Board** | Claim chores, mark them done, earn credits toward rewards |
| **Wallet** | Track credit balance, redeem vouchers, view block leaderboard |
| **Profile** | Update details, upload profile photo |
| **Documents** | Download invoices and contracts, request official letters |

### For Administrators
| Feature | Description |
|---|---|
| **Overview** | Live dashboard — residents, revenue, open tickets, action alerts |
| **Occupancy** | Block-by-block room grid showing occupied, reserved, and vacant rooms |
| **Allocations** | Manage allocations, process reservations, review applications |
| **Maintenance Tickets** | Full ticket management — status, notes, priority filtering |
| **News Manager** | Publish, pin, and delete residence notices |
| **Visitor Log** | All passes across all residents, check in guests at reception |
| **Rewards Manager** | Adjust credits, manage voucher stock, view redemption log |
| **Accounts** | Searchable student list with balances and room status |

---

## 🛠 Technology Stack

### Frontend
- **Framework**: React 18 + TypeScript
- **Styling**: Tailwind CSS (ResiHub brand-aligned)
- **State Management**: React Context + React Query (TanStack Query)
- **Forms**: React Hook Form + Zod validation
- **Routing**: React Router v6
- **File Upload**: react-dropzone (maintenance media)
- **HTTP Client**: Axios
- **Icons**: Lucide React

### Backend
- **Runtime**: Node.js 18+
- **Framework**: Express.js + TypeScript
- **Database ORM**: Prisma
- **Authentication**: JWT + bcrypt
- **Validation**: Zod
- **File Storage**: Local (S3-ready)
- **Scheduled Jobs**: node-cron
- **Email**: Nodemailer

### Database
- **Primary**: PostgreSQL 15+
- **ORM**: Prisma with full migration history
- **Features**: ACID compliance, RLS-ready, indexed queries

### DevOps
- **Containerisation**: Docker + Docker Compose
- **Version Control**: Git
- **CI/CD**: GitHub Actions *(planned)*
- **Hosting**: Cloud-ready (Railway, DigitalOcean, AWS)

---

## 🏗 System Architecture

```
┌─────────────────────────────────────┐
│     PRESENTATION LAYER (Client)      │
│  React + TypeScript + Tailwind CSS   │
│       3 roles · 15+ pages            │
└─────────────────────────────────────┘
                 ↕ REST API (JWT)
┌─────────────────────────────────────┐
│    APPLICATION LAYER (Backend)       │
│    Node.js + Express + TypeScript    │
│   Route groups · Controllers         │
│       Services · Middleware          │
└─────────────────────────────────────┘
                 ↕ Prisma ORM
┌─────────────────────────────────────┐
│       DATA LAYER (Database)          │
│       PostgreSQL 15+ + Prisma        │
│   13 models · full audit logging     │
└─────────────────────────────────────┘
```

---

## 🚀 Getting Started

### Prerequisites
- Node.js v18+ and npm v9+
- Docker + Docker Compose
- Git

### Quick Start (Docker — Recommended)

```bash
# 1. Clone the repository
git clone <repository-url>
cd Resi_hub

# 2. Copy environment files
cp backend/.env.example backend/.env
cp frontend/.env.example frontend/.env

# 3. Start all services
docker-compose up

# 4. Run database migrations (first time only)
docker-compose exec backend npx prisma migrate dev

# 5. Seed demo data
docker-compose exec backend npm run db:seed

# Access the application
# Frontend:      http://localhost:3000
# Backend API:   http://localhost:5000
# Prisma Studio: http://localhost:5555
```

See [QUICK_START.md](./QUICK_START.md) for detailed setup instructions.

---

## 📁 Project Structure

```
Resi_hub/
├── frontend/                    # React application
│   ├── src/
│   │   ├── components/         # Reusable UI components
│   │   │   ├── common/         # Button, Input, Card, Badge, Toast
│   │   │   ├── layout/         # DashboardLayout, ProtectedRoute, Sidebar
│   │   │   ├── dashboard/      # DashboardWidgets
│   │   │   ├── maintenance/    # TicketCard, TicketForm
│   │   │   ├── visitors/       # VisitorPass, QRCode
│   │   │   ├── wallet/         # CreditBalance, VoucherCard
│   │   │   ├── chores/         # ChoreBoard, ChoreCard
│   │   │   └── admin/          # OccupancyGrid, AdminStats
│   │   ├── pages/
│   │   │   ├── auth/           # Login
│   │   │   ├── student/        # Dashboard, Maintenance, Updates, Visitors, Housemates, Wallet, Profile, Documents
│   │   │   ├── admin/          # Overview, Occupancy, Allocations, Tickets, News, Visitors, Rewards, Accounts
│   │   │   └── pending/        # ApplicationStatus, RoomBrowse
│   │   ├── hooks/              # Custom React Query hooks
│   │   ├── services/           # Axios API service files
│   │   ├── contexts/           # AuthContext
│   │   ├── types/              # TypeScript interfaces
│   │   ├── utils/              # Helpers
│   │   └── constants/          # Enums and static values
│   └── package.json
│
├── backend/                     # Node.js + Express API
│   ├── src/
│   │   ├── controllers/        # Request handlers
│   │   ├── services/           # Business logic
│   │   ├── middleware/         # auth, role, error, validation, upload
│   │   ├── routes/             # API route files
│   │   ├── validators/         # Zod schemas
│   │   ├── types/              # TypeScript types
│   │   ├── utils/              # jwt, audit, date helpers
│   │   └── config/             # database, storage config
│   ├── prisma/
│   │   ├── schema.prisma       # Database schema
│   │   ├── migrations/         # Migration history
│   │   └── seed.ts             # Demo data seeder
│   └── package.json
│
├── docker/                      # Docker configuration
│   ├── Dockerfile.backend
│   ├── Dockerfile.frontend
│   ├── Dockerfile.backend.prod
│   └── Dockerfile.frontend.prod
│
├── Resihub/                     # Original single-file prototype (reference)
│   └── resihub.html
│
├── docker-compose.yml           # Development environment
├── docker-compose.prod.yml      # Production environment
├── .gitignore
│
├── README.md                    ← You are here
├── QUICK_START.md               # 5-minute setup guide
├── PROJECT_SETUP.md             # Full setup + configuration reference
├── SYSTEM_ARCHITECTURE.md       # Architecture, API design, data models
├── DATABASE_SCHEMA.md           # ERD, models, indexes
├── UI_UX_DESIGN.md              # Design system, components, layouts
├── IMPLEMENTATION_ROADMAP.md    # Phase-by-phase delivery plan
├── DEVELOPMENT_PROGRESS.md      # Live progress tracker
├── IMPLEMENTATION_STATUS.md     # Feature completion checklist
└── DEPLOYMENT_GUIDE.md          # Production deployment guide
```

---

## 📚 Documentation

| Document | Purpose |
|---|---|
| [QUICK_START.md](./QUICK_START.md) | Get running in 5 minutes |
| [PROJECT_SETUP.md](./PROJECT_SETUP.md) | Full setup guide and configuration |
| [SYSTEM_ARCHITECTURE.md](./SYSTEM_ARCHITECTURE.md) | Architecture, API routes, business logic |
| [DATABASE_SCHEMA.md](./DATABASE_SCHEMA.md) | ERD, models, indexes, migrations |
| [UI_UX_DESIGN.md](./UI_UX_DESIGN.md) | Design system, brand, component library |
| [IMPLEMENTATION_ROADMAP.md](./IMPLEMENTATION_ROADMAP.md) | Phase-by-phase delivery plan |
| [DEVELOPMENT_PROGRESS.md](./DEVELOPMENT_PROGRESS.md) | Live progress tracker (updated per session) |
| [IMPLEMENTATION_STATUS.md](./IMPLEMENTATION_STATUS.md) | Feature-by-feature completion status |
| [DEPLOYMENT_GUIDE.md](./DEPLOYMENT_GUIDE.md) | Production deployment and hosting |

---

## 💻 Development

### Development Workflow

```bash
# Start with Docker (recommended)
docker-compose up

# Or run manually
# Terminal 1 — Backend
cd backend && npm run dev

# Terminal 2 — Frontend
cd frontend && npm run dev
```

### Available Scripts

#### Backend
```bash
npm run dev           # Start development server (nodemon + ts-node)
npm run build         # Compile TypeScript
npm run start         # Start production server
npm run migrate:dev   # Run Prisma migrations (dev)
npm run db:seed       # Seed demo data
npm run db:studio     # Open Prisma Studio (http://localhost:5555)
npm run lint          # Run ESLint
```

#### Frontend
```bash
npm run dev           # Start Vite dev server
npm run build         # Production build
npm run preview       # Preview production build
npm run lint          # Run ESLint
```

---

## 🗺 Roadmap

### ✅ Phase 1: Foundation — Scaffold
- Project structure, Docker, environment setup
- Database schema (13 models)
- Design system and brand alignment

### 🔄 Phase 2: Auth & Core — In Progress
- [ ] JWT authentication (login, register, refresh)
- [ ] Role-based access control (ACTIVE_STUDENT, PENDING_STUDENT, ADMIN)
- [ ] Student dashboard
- [ ] Admin overview dashboard

### 📋 Phase 3: Student Features — Planned
- [ ] Maintenance ticket system (with media upload)
- [ ] Visitor pass & QR code generation
- [ ] News / residence updates feed
- [ ] Housemates view
- [ ] Profile management

### 📋 Phase 4: Chores & Wallet — Planned
- [ ] Chore board with claim/complete flow
- [ ] Credit system (earn / redeem)
- [ ] Voucher shop

### 📋 Phase 5: Admin Panel — Planned
- [ ] Occupancy grid
- [ ] Allocation management (reserve → confirm)
- [ ] Ticket management
- [ ] Accounts and billing

### 📋 Phase 6: Deployment — Planned
- [ ] Docker production build
- [ ] GitHub Actions CI/CD
- [ ] Production environment (Railway + Vercel)
- [ ] Domain + SSL

### 🔮 Future
- PayFast / Peach Payments integration
- Email and WhatsApp notifications
- POPIA compliance
- Digital lease signing
- PWA + offline support
- Multi-residence support

---

## 🎭 Demo Accounts

| Role | Email | Password |
|---|---|---|
| Student — Active | `sarah@campus.edu` | `pass123` |
| Student — Active | `marcus@campus.edu` | `pass123` |
| Student — Pending | `aisha@campus.edu` | `pass123` |
| Admin | `admin@resihub.co` | `admin123` |

---

## 🎨 Design System

| Token | Hex | Usage |
|---|---|---|
| Cyan (Primary) | `#00CCCC` | Buttons, highlights, focus rings |
| Rose (Accent) | `#E8197A` | Badges, alerts, secondary actions |
| Dark BG | `#0f0f12` | Page background |
| Surface | `#16161b` | Cards, panels |
| Border | `rgba(255,255,255,0.07)` | Dividers |

**Typography**: Space Grotesk (UI) + IBM Plex Mono (data/code)

---

## 📝 License

MIT — free to use, modify, and distribute with attribution.

---

## 👤 Author

**Jethro Mncube**
GitHub: [@jmtmncube-eng](https://github.com/jmtmncube-eng)

---

<div align="center">
  <sub>Built with purpose for South African student residences.</sub>
</div>
