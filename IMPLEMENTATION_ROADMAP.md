# Implementation Roadmap
## ResiHub — Student Accommodation Management Platform

**Created**: 2026-03-25
**Status**: 🔄 Phase 1 In Progress

> This document is the master delivery plan. See DEVELOPMENT_PROGRESS.md for live session-by-session updates.

---

## 🎯 Project Phases Overview

```
Phase 1 : Foundation & Docker Setup         ← Current
Phase 2 : Authentication & Authorization
Phase 3 : Student Core Features
Phase 4 : Chores, Wallet & Credits
Phase 5 : Admin Panel
Phase 6 : Polish, Testing & Deployment
```

---

## Phase 1: Foundation & Setup

### Project Scaffold
- [x] Define system architecture
- [x] Define database schema (13 models)
- [x] Define design system and brand alignment
- [x] Create folder structure (frontend, backend, docker)
- [x] Write all documentation files
- [x] docker-compose.yml (dev + prod)
- [x] Dockerfiles (frontend, backend)
- [x] .gitignore

### Backend Setup
- [ ] Initialize Node.js + Express + TypeScript project
- [ ] Configure Prisma with PostgreSQL
- [ ] Implement database schema and run initial migration
- [ ] Set up ESLint + Prettier
- [ ] Configure environment variables
- [ ] Basic Express server (health check endpoint)
- [ ] Error handling middleware

**Deliverables**:
- Backend running on `localhost:5000`
- Database with all tables created via Prisma migrate
- Health check: `GET /health` → `{ status: "ok" }`

### Frontend Setup
- [ ] Initialize React + Vite + TypeScript project
- [ ] Configure Tailwind CSS with ResiHub brand tokens
- [ ] Set up path aliases (`@/`)
- [ ] Create folder structure
- [ ] Build base component library (Button, Input, Card, Badge, Toast)
- [ ] Set up React Router v6
- [ ] Configure Axios + React Query
- [ ] Auth context skeleton

**Deliverables**:
- Frontend running on `localhost:3000`
- Design system tokens implemented
- Base components styled and ready
- Routing structure scaffolded

---

## Phase 2: Authentication & Authorization

### Backend Auth
- [ ] User model with bcrypt password hashing
- [ ] JWT token generation + verification utility
- [ ] Auth middleware (verify Bearer token)
- [ ] Role-based authorization middleware (`ACTIVE_STUDENT`, `PENDING_STUDENT`, `ADMIN`)
- [ ] Audit logging utility
- [ ] Auth endpoints:
  - `POST /api/auth/login`
  - `POST /api/auth/register`
  - `POST /api/auth/logout`
  - `POST /api/auth/refresh`
  - `GET /api/auth/me`
- [ ] Zod input validation on all auth routes

**Deliverables**:
- JWT auth working end-to-end
- Role-gated routes enforced

### Frontend Auth
- [ ] Login page (email + password)
- [ ] AuthContext with JWT storage + refresh
- [ ] ProtectedRoute wrapper
- [ ] Role-based navigation (student vs admin vs pending)
- [ ] Token expiry handling + auto-refresh
- [ ] Logout flow

**Deliverables**:
- Login / logout fully functional
- Role-appropriate redirect after login
- Session persists on page refresh

---

## Phase 3: Student Core Features

### Dashboard
- [ ] Dashboard layout with sidebar navigation
- [ ] Dashboard overview widgets:
  - Rent status card
  - Open maintenance tickets count
  - Pinned news notices
  - Chore board summary
- [ ] Backend: `GET /api/student/dashboard`

### Maintenance Tickets
- [ ] Backend:
  - `POST /api/maintenance` — create ticket
  - `GET /api/maintenance` — list my tickets
  - `GET /api/maintenance/:id` — ticket detail
  - File upload: `POST /api/maintenance/:id/media`
- [ ] Frontend:
  - Report issue form (category, location, description, priority, media)
  - Media upload (react-dropzone — images/video)
  - Ticket list with status badges
  - Ticket detail view with admin notes

### Residence Updates (News Feed)
- [ ] Backend: `GET /api/news` — list news (pinned first)
- [ ] Frontend: News feed page with tag filters

### Visitor Passes
- [ ] Backend:
  - `POST /api/visitors` — create pass
  - `GET /api/visitors/mine` — my passes
  - `DELETE /api/visitors/:id` — cancel pass
- [ ] Frontend:
  - Create visitor pass form
  - QR code display (generated from pass data)
  - My passes list

### Housemates
- [ ] Backend: `GET /api/housemates` — students in same block
- [ ] Frontend: Housemates list page with profile cards

### Profile
- [ ] Backend:
  - `GET /api/profile`
  - `PUT /api/profile`
  - `POST /api/profile/avatar`
- [ ] Frontend: Profile edit form with avatar upload

### Documents
- [ ] Backend: `GET /api/documents` — list my documents
- [ ] Frontend: Documents list with download links

---

## Phase 4: Chores, Wallet & Credits

### Chore Board
- [ ] Backend:
  - `GET /api/chores` — list chores for my block
  - `POST /api/chores/:id/claim` — claim a chore (+5 credits)
  - `DELETE /api/chores/:id/claim` — unclaim (-5 credits)
  - `POST /api/chores/:id/complete` — mark done (+20 credits)
- [ ] Frontend:
  - Chore board with card per chore
  - Claim / unclaim / complete actions
  - Chore history log
  - Credit notification on action

### Wallet & Credits
- [ ] Backend:
  - `GET /api/wallet` — my balance + transaction history
  - `GET /api/vouchers` — available vouchers
  - `POST /api/vouchers/:id/redeem` — redeem voucher
  - `GET /api/wallet/leaderboard` — block credit leaderboard
- [ ] Frontend:
  - Balance card with transaction history
  - Voucher shop grid
  - Leaderboard tab

---

## Phase 5: Admin Panel

### Admin Overview Dashboard
- [ ] Backend: `GET /api/admin/overview`
  - Total residents, vacant rooms, occupancy %
  - Open ticket count
  - Overdue balance count
  - Recent activity
- [ ] Frontend: Admin overview page with stat cards

### Occupancy Management
- [ ] Backend: `GET /api/admin/occupancy` — room grid by block
- [ ] Frontend: Block-by-block room grid (occupied / reserved / vacant)

### Allocation Management
- [ ] Backend:
  - `GET /api/admin/allocations` — current + reservations + applications
  - `POST /api/admin/allocations/:id/confirm` — confirm reservation
  - `DELETE /api/admin/allocations/:id` — decline reservation
- [ ] Frontend: Three-tab allocation panel (Current / Reservations / Applications)

### Maintenance Ticket Admin
- [ ] Backend:
  - `GET /api/admin/maintenance` — all tickets with filters
  - `PUT /api/admin/maintenance/:id` — update status + admin note
- [ ] Frontend: Ticket queue with status/priority filters, inline note editing

### News Manager (Admin)
- [ ] Backend:
  - `POST /api/admin/news` — publish
  - `PUT /api/admin/news/:id` — pin/unpin/edit
  - `DELETE /api/admin/news/:id` — delete
- [ ] Frontend: News form + list management

### Visitor Log (Admin)
- [ ] Backend:
  - `GET /api/admin/visitors` — all passes
  - `PUT /api/admin/visitors/:id/checkin` — check in guest
  - `DELETE /api/admin/visitors/:id` — remove pass
- [ ] Frontend: Visitor log table with check-in actions

### Rewards Manager (Admin)
- [ ] Backend:
  - `GET /api/admin/wallets` — all student wallets
  - `POST /api/admin/wallets/:userId/adjust` — manual credit adjustment
  - `PUT /api/admin/vouchers/:id/restock` — restock voucher
  - `GET /api/admin/redemptions` — full redemption log
- [ ] Frontend: Wallet table + voucher stock manager

### Accounts (Admin)
- [ ] Backend: `GET /api/admin/accounts` — student list with balances
- [ ] Frontend: Searchable accounts table

---

## Phase 6: Polish, Testing & Deployment

### Testing
- [ ] Backend unit tests (services, validators, utilities)
- [ ] Backend integration tests (API endpoints)
- [ ] Frontend component tests
- [ ] E2E tests (login, maintenance flow, room reservation)

### Performance
- [ ] Add database indexes (check query plans)
- [ ] Implement pagination on all list endpoints
- [ ] Add caching headers for static data (rooms, vouchers)
- [ ] Frontend: lazy loading, code splitting, bundle analysis

### Security
- [ ] Verify all RBAC middleware is applied
- [ ] File upload security (MIME type + size validation)
- [ ] Rate limiting on auth endpoints
- [ ] Helmet.js security headers
- [ ] CORS locked to frontend origin

### Deployment
- [ ] Production Dockerfiles (multi-stage builds)
- [ ] docker-compose.prod.yml
- [ ] GitHub Actions CI/CD pipeline
- [ ] Production environment (Railway backend + Vercel frontend)
- [ ] Managed PostgreSQL + S3 file storage
- [ ] Domain + SSL (Cloudflare)
- [ ] Uptime monitoring (UptimeRobot)
- [ ] Error tracking (Sentry)

---

## Future Enhancements (Post-Launch)

- PayFast / Peach Payments gateway
- Email and WhatsApp notifications (lesson reminders, ticket updates)
- POPIA compliance (privacy policy, consent, data deletion)
- Digital lease signing
- Move-in / move-out inspection checklists
- Facility booking (study rooms, gym, braai area, parking)
- Parcel and mail management
- Multi-residence support
- Admin audit trail viewer
- Bursary / NSFAS payment flag
- Progressive Web App (PWA) with offline support
- Roommate matching for double rooms

---

**Document Version**: 1.0
**Last Updated**: 2026-03-25
**Status**: Phase 1 In Progress
