# Development Progress Report
## ResiHub — Student Accommodation Management Platform

**Last Updated**: 2026-05-01
**Status**: ✅ Sessions 5–9 Complete — Full Feature Polish & E2E Verified
**Overall Completion**: **92%**

---

## Phase Summary

| Phase | Feature Area | Status | Completion |
|-------|-------------|--------|------------|
| 1 | Foundation, Docker, Scaffold | ✅ Complete | 100% |
| 2 | Authentication & RBAC | ✅ Complete | 100% |
| 3 | Student Core Features | ✅ Complete | 100% |
| 4 | Admin Panel | ✅ Complete | 100% |
| 5 | Pending Student Portal + Wallet Tasks | ✅ Complete | 100% |
| 6 | Security, Polish & E2E Verification | ✅ Complete | 90% |
| 7 | Deployment | ⏳ Pending | 0% |

---

## Session Log

---

### Session 1 — 2026-03-25

**Goal**: Project scaffold, architecture design, documentation

**Completed**:
- ✅ Studied original prototype (`Resihub/resihub.html`) — full feature inventory
- ✅ Decided on tech stack: React + TypeScript + Tailwind (frontend), Node.js + Express + TypeScript + Prisma + PostgreSQL (backend), Docker
- ✅ Created full project directory structure (`frontend/`, `backend/`, `docker/`)
- ✅ Wrote all root-level documentation (README, QUICK_START, PROJECT_SETUP, SYSTEM_ARCHITECTURE, DATABASE_SCHEMA, UI_UX_DESIGN, IMPLEMENTATION_ROADMAP, DEVELOPMENT_PROGRESS, IMPLEMENTATION_STATUS, DEPLOYMENT_GUIDE)
- ✅ Docker configuration (docker-compose.yml, docker-compose.prod.yml, Dockerfiles)
- ✅ Backend + Frontend scaffold (package.json, tsconfig, Prisma schema, vite.config, tailwind.config)
- ✅ `.gitignore`

---

### Session 2 — 2026-03-25

**Goal**: Phase 2 — Authentication & RBAC

**Backend**
- ✅ Prisma singleton client, JWT utils (access + refresh), audit logger
- ✅ Zod validators for auth (login, register, refresh)
- ✅ Middleware: auth (Bearer JWT), role (RBAC), validation (Zod), error (AppError + handler)
- ✅ Auth service + controller + routes (5 endpoints: login, register, refresh, logout, me)
- ✅ Full seed data (8 users, 28 rooms, allocations, tickets, news, visitors, chores, wallets, vouchers, documents)

**Frontend**
- ✅ Auth types, API types, route constants
- ✅ Axios instance with Bearer token + auto-refresh interceptor
- ✅ Auth service, AuthContext with session rehydration
- ✅ ProtectedRoute, DashboardLayout (sidebar + mobile drawer), Login page
- ✅ Full role-protected routing (15 routes, 3 roles)

---

### Session 3 — 2026-03-25

**Goal**: Phase 3 — Student Core Features

**Backend (9 new services)**
- ✅ dashboard.service — allocation, wallet, open tickets, upcoming visitors, pinned news, chores
- ✅ maintenance.service — student CRUD + admin all-tickets with filters
- ✅ news.service — list, get, create, togglePin, delete
- ✅ visitor.service — passes CRUD, QR code gen (UUID-based), check-in
- ✅ chore.service — list, claim (+5), unclaim (-5), complete (+20 credits)
- ✅ wallet.service — wallet, vouchers, earn/redeem credits (Prisma transaction), leaderboard
- ✅ profile.service — get, update, avatar upload (multer)
- ✅ document.service — list resident documents grouped by type
- ✅ housemate.service — same-block residents (excludes self)
- ✅ 9 controllers + 9 route files, all wired into app.ts

**Frontend (8 new pages)**
- ✅ Dashboard — greeting, stat cards (rent, credits, open tickets), 4 quick sections
- ✅ Maintenance — list/report tabs, ticket form with file upload, status/priority display
- ✅ Updates — news feed with type filter tabs, pinned indicator
- ✅ Visitors — pass list, create pass form, QR code modal (qrcode.react), cancel
- ✅ Housemates — housemates grid + chore board (claim/unclaim/complete)
- ✅ Wallet — balance hero, history/shop/leaderboard tabs, voucher redemption
- ✅ Profile — avatar upload, edit form, room info tiles
- ✅ Documents — grouped by type (invoices, contracts, letters), download links
- ✅ All 8 pages wired into App.tsx, replacing ComingSoon stubs
- ✅ Added `.input-base` Tailwind component class to index.css

**Smoke Test**: All 11 backend endpoints returned `"success":true`

---

### Session 4 — 2026-03-25

**Goal**: Phase 4 — Admin Panel

**Backend**
- ✅ `src/validators/admin.validator.ts` — schemas for allocations, accounts, vouchers, credits
- ✅ `src/services/admin.service.ts` — stats, occupancy, allocations CRUD, accounts, vouchers CRUD, credits award, visitor log
- ✅ `src/controllers/admin.controller.ts` — 11 controller actions
- ✅ `src/routes/admin.routes.ts` — all routes gated with `requireRole('ADMIN')`
- ✅ App.ts updated: `app.use('/api/admin', adminRoutes)`

**Frontend (8 new admin pages)**
- ✅ AdminOverview — stat cards (students, occupancy %, tickets, visitors, revenue, vouchers), quick links, occupancy progress bar
- ✅ AdminOccupancy — block filter, room grid with occupied/vacant state, resident name overlay
- ✅ AdminAllocations — table with inline edit (rent, status), create allocation modal with vacant-room picker
- ✅ AdminMaintenance — list with status/priority/search filters, inline update (status, priority, admin note)
- ✅ AdminNews — article list with type filter, create form (title, body, tag, date, pin), pin/delete actions
- ✅ AdminVisitors — full visitor log table (visitor, resident, purpose, date, check-in time, status)
- ✅ AdminRewards — tabs: Vouchers (CRUD cards) + Award Credits (manual credit adjustment)
- ✅ AdminAccounts — user table (avatar, role badge, room, credits, joined date), inline edit (name, role, phone)
- ✅ Admin service added to `frontend/src/services/admin.service.ts`
- ✅ All 8 pages imported into App.tsx, replacing ComingSoon stubs

**Fixes Applied**
- ✅ Added `frontend/src/vite-env.d.ts` (fixes `ImportMeta.env` TS error)
- ✅ Fixed pre-existing queryFn signatures in Housemates, AdminNews, AdminRewards
- ✅ Removed unused imports in Documents, Profile, Wallet
- ✅ Added `getTickets` + `updateTicket` admin functions to maintenance.service.ts
- ✅ Added `createNews`, `togglePin`, `deleteNews` to news.service.ts

**Smoke Test**: All 6 admin API endpoints returned `"success":true`

---

### Sessions 5–9 — 2026-04-01 → 2026-05-01

**Goal**: Pending Student Portal, Wallet Tasks, Security Hardening, Merged Residence Page, E2E Verification

#### Pending Student Portal (Phase 5)
- ✅ `ApplicationStatus.tsx` — progress stepper (Submitted → Reserved → Confirmed → Active)
- ✅ `BrowseRooms.tsx` — room grid with type/price/block filter for PENDING_STUDENT
- ✅ `OnboardingWizard` — 4-step modal (localStorage gate: `rh_onboarding_seen`), mounts in ApplicationStatus
- ✅ `application.routes.ts` + `application.service.ts` + `application.controller.ts` — `/application/status` and `/application/rooms`

#### Wallet Tasks Tab
- ✅ Added Tasks tab to `Wallet.tsx` — task vouchers with proof upload, claim status (PENDING/APPROVED/REJECTED), PIN reveal on APPROVED
- ✅ `submitTaskProof` frontend service + `POST /wallet/task-proof/:voucherId` backend route
- ✅ Backend `getVouchers` hides `pin`/`imageUrl` unless claim is APPROVED (privacy guard)
- ✅ `ConfirmModal` added before credit voucher redemption (prevent accidental one-click claims)
- ✅ Shop tab filtered to credit-only; Tasks tab filtered to `requiresProof` vouchers

#### Security Fixes
- ✅ **Task voucher loophole**: `redeemVoucher` now throws 400 if `voucher.requiresProof` — cannot bypass via direct API
- ✅ **File picker fix**: Both `Documents.tsx` and `InvoiceModal.tsx` replaced detached `document.createElement('input')` with DOM-attached `useRef<HTMLInputElement>` hidden input (browser security requirement)
- ✅ **Zero-credits guard**: confirmed working in E2E test

#### Admin Residence Page (merged Occupancy + Settings)
- ✅ `AdminSettings.tsx` — unified "Residence" page with "Info" and "Rooms & Occupancy" tabs
- ✅ Room setup wizard: count → sharing type (SINGLE/DOUBLE/TRIPLE/QUAD) → blocks → price per room → generates rooms
- ✅ `setupRooms` backend service: deletes VACANT rooms, creates new layout, never touches OCCUPIED rooms
- ✅ TRIPLE + QUAD added to `RoomType` enum with Prisma migration `20260501052241_add_triple_quad_room_types`
- ✅ Removed `AdminOccupancy.tsx` (orphaned); `/admin/occupancy` URL redirects to `/admin/settings`
- ✅ Sidebar updated: "Occupancy" → "Residence" with Building2 icon

#### Seed & Data Reset (Session 9)
- ✅ Added `voucherClaim.deleteMany()` and `residenceSettings.deleteMany()` to seed cleanup
- ✅ Rewrote seed with minimal clean data for E2E testing:
  - 3 users: `admin@resihub.co` / `admin123`, `sarah@campus.edu` / `pass123` (Active, Room A101, 45 🪙), `aisha@campus.edu` / `pass123` (Pending — triggers onboarding)
  - 6 rooms: 1 OCCUPIED (Sarah) + 5 VACANT (for BrowseRooms)
  - 1 allocation (Sarah → A101)
  - 2 documents: INVOICE Unpaid + CONTRACT Unsigned (both testable)
  - 3 vouchers: 2 credit-based + 1 task-based
  - 3 chores (1 claimed by Sarah)
  - 1 pinned Welcome notification
  - Sarah wallet: 45 credits + 2 earn transactions

#### E2E Smoke Test Results (all flows verified)
- ✅ Auth: login/me/register for ACTIVE_STUDENT, PENDING_STUDENT, ADMIN
- ✅ Student: documents, wallet, vouchers, chores, news, maintenance, visitor passes
- ✅ Pending: application/status, application/rooms (5 rooms shown), onboarding wizard
- ✅ Admin: accounts (3), occupancy (all rooms), allocations, news creation, voucher claims
- ✅ Security guards: task voucher direct-redeem BLOCKED, zero-credits BLOCKED
- ✅ Task proof: submitted → PENDING → visible in admin/claims
- ✅ Docker Desktop fix: deleted corrupted `dockerInference` socket file

#### Type Fixes
- ✅ `auth.types.ts` Room type updated: added `'TRIPLE' | 'QUAD'` to RoomType union

---

## Architecture Decisions

| Decision | Rationale |
|----------|-----------|
| PostgreSQL over Supabase | Full control, self-hosted via Docker, no vendor lock-in |
| Prisma ORM | Type-safe queries, migration history, schema-as-code |
| Docker Compose | Consistent dev environment across all machines |
| React Query (TanStack) | Server state management, caching, background refetch |
| Zod validation | Shared schemas between frontend forms and backend validators |
| JWT with refresh tokens | Stateless, scalable auth with session refresh support |
| Single admin route group | All admin routes in `/api/admin` with `requireRole('ADMIN')` guard |

---

## Known Issues / Blockers

*None at this stage.*

---

## Database Migrations Applied

| Migration | Description | Date |
|-----------|-------------|------|
| `init` | Initial schema — all models | 2026-03-25 |
| `batch_a_reconcile` | Capture schema drift from the db-push era | 2026-05-14 |
| `notifications_center` | `Notification` model + `NotificationType` enum | 2026-05-14 |
| `staff_roles` | `MANAGER` + `MAINTENANCE` added to `Role` enum | 2026-05-14 |
| `lease_lifecycle` | Lease fields on `Allocation` + `Inspection` model + `DepositStatus`/`InspectionType` enums | 2026-05-14 |
| `recurring_invoices_doc_expiry` | Auto-invoice settings + `Document.expiresAt` | 2026-05-14 |

---

### Session 5 — 2026-04-26

**Goal**: Apply ResiHub visual design system across all frontend pages

**Changes**
- ✅ `frontend/src/index.css` — full rewrite: CSS custom properties (dark/light), Space Grotesk + IBM Plex Mono fonts, @keyframes, all component classes (.kpi-card, .badge-*, .btn-*, .avatar-*, .nav-item, .modal-*, .toast-*, .card, .card-sm, .skeleton, .field-label, .micro-label, .page-title, .page-sub, .empty-state, .rh-table, .detail-grid)
- ✅ `DashboardLayout.tsx` — sidebar CSS vars, role badge, nav-item class, btn-theme/btn-logout, mobile header
- ✅ `Login.tsx` — modal-card design, field-label inputs, btn-primary submit, card-sm demo accounts
- ✅ `Dashboard.tsx` — kpi-card stat cards, badge-*, avatar-cyan, skeleton loaders
- ✅ `Maintenance.tsx` — page-title/page-sub, btn-primary, card form, field-label, badge-* status
- ✅ `Visitors.tsx` — modal-overlay + modal-card QR modal, avatar-rose, badge-*, field-label
- ✅ `Wallet.tsx` — gradient balance hero, tab switcher CSS vars, card overflow, btn-primary, avatar-cyan + badge-cyan leaderboard
- ✅ `Housemates.tsx` — card-sm housemate cards, avatar-cyan, card-sm chore cards, btn-primary/btn-ghost
- ✅ `Documents.tsx` — micro-label groups, card overflow table, badge-* status, download links preserved
- ✅ `Profile.tsx` — avatar-cyan/rose, badge-*, card sections, field-label, btn-primary save
- ✅ `Updates.tsx` — pill filter chips, card-sm news items with pinned gradient, tag inline styles, skeleton
- ✅ `AdminOverview.tsx` — kpi-card stat grid, badge-*, quick-action card with hover handlers, occupancy progress bar, micro-label
- ✅ `AdminOccupancy.tsx` — pill block filter, CSS var room grid (occupied/vacant state), skeleton spinner
- ✅ `AdminAllocations.tsx` — rh-table, modal-overlay + modal-card, btn-primary/btn-ghost, badge-* status, field-label
- ✅ `AdminMaintenance.tsx` — card-sm ticket cards, filter inputs + selects, btn-primary/btn-ghost, badge-* + priority color, field-label
- ✅ `AdminNews.tsx` — pill type filter, card create form, field-label, btn-primary, card-sm article list, type color badges, pin/delete actions
- ✅ `AdminVisitors.tsx` — rh-table, badge-* status, skeleton, empty-state
- ✅ `AdminRewards.tsx` — tab switcher CSS vars, card create form, card-sm voucher cards, btn-primary/btn-ghost, field-label, Loader2 spinner
- ✅ `AdminAccounts.tsx` — rh-table, avatar-cyan, badge-rose/cyan/gray role badges, btn-primary/btn-ghost, field-label, Loader2, empty-state

**Infrastructure Fixes Applied**
- ✅ `docker/Dockerfile.backend` — added OpenSSL packages for Prisma on Alpine Linux
- ✅ `backend/prisma/schema.prisma` — added `linux-musl-openssl-3.0.x` Prisma binary target
- ✅ Git identity configured: `mbong@resihub.dev` / `Mbongeni`

**Design Approach**
- All styling uses CSS custom properties (var(--cyan), var(--rose), var(--bg), var(--bg2), var(--bg3), var(--border), var(--text), var(--text2), var(--text3), var(--text4), var(--shadow))
- Light mode via `html.light` class overrides on CSS vars + Tailwind utility class overrides
- All application logic, state, mutations, queries, routing, and functions left 100% intact

---

---

### Session 6 — 2026-04-30

**Goal**: UI/UX Polish — Toast notifications, 404 page, dynamic page titles, accessible confirm modals

**New Files**
- ✅ `frontend/src/hooks/usePageTitle.ts` — Sets `document.title = "${title} · ResiHub"` with cleanup on unmount
- ✅ `frontend/src/components/ConfirmModal.tsx` — Accessible replace for native `confirm()`: Escape key, scroll-lock, loading state, danger/normal variants
- ✅ `frontend/src/pages/NotFound.tsx` — Gradient 404 page with dot-grid decoration + "Go to homepage" CTA

**App.tsx Changes**
- ✅ Added `<Toaster richColors position="bottom-right" theme="dark" />` (sonner v2)
- ✅ Added `import NotFound` + replaced catch-all redirect with `<Route path="*" element={<NotFound />} />`

**Toast Notifications Added (all mutations)**
- ✅ `Maintenance.tsx` — createTicket: success "Request submitted!" / error fallback
- ✅ `Visitors.tsx` — createPass: success / error; cancelPass: success / error
- ✅ `Profile.tsx` — updateProfile: success / error; uploadAvatar: success / error (removed old `saved` state)
- ✅ `Housemates.tsx` — claim: "+5 🪙" / unclaim / complete "+20 🪙" — all with error toasts
- ✅ `Wallet.tsx` — redeemVoucher: success / error
- ✅ `AdminMaintenance.tsx` — updateTicket: success / error
- ✅ `AdminNews.tsx` — create / pin / delete — all with success/error toasts
- ✅ `AdminAllocations.tsx` — create / update — all with success/error toasts
- ✅ `AdminRewards.tsx` — createV / updateV / deleteV / awardC — all with success/error toasts; removed inline success/error state UI
- ✅ `AdminAccounts.tsx` — updateAccount: success / error

**ConfirmModal Wired (replacing native confirm())**
- ✅ `Visitors.tsx` — cancel visitor pass → ConfirmModal (danger variant)
- ✅ `AdminNews.tsx` — delete article → ConfirmModal (danger variant)
- ✅ `AdminRewards.tsx` — delete voucher → ConfirmModal (danger variant)

**Dynamic Page Titles (usePageTitle added to all 19 pages)**
- ✅ Dashboard, Maintenance, Updates, Visitors, Housemates, Wallet, Profile, Documents
- ✅ ApplicationStatus, BrowseRooms
- ✅ AdminOverview, AdminOccupancy, AdminAllocations, AdminMaintenance, AdminNews, AdminVisitors, AdminRewards, AdminAccounts

**Bonus Fix**
- ✅ Removed unused `Wallet` icon import from `Dashboard.tsx` (TS6133 error)

**TypeScript**: `npx tsc --noEmit` → 0 errors

---

---

### Session 7 — 2026-05-01

**Goal**: Premium sign-up flow, onboarding system, invoice viewer + download, contract signing

**Login Page Enhancement**
- ✅ Right panel: rose-tinted gradient (`#0f0810 → #1c0d18 → #120f14`) matching building left panel
- ✅ Decorative radial rose glow orbs + dot-grid overlay for premium feel
- ✅ Login card border tinted rose; demo account hover rose; "Create one free →" link to /register

**Register Page (new)**
- ✅ `frontend/src/pages/auth/Register.tsx` — full premium split-layout (IsometricScene left, rose form right)
- ✅ Zod schema: name, email, password, confirmPassword (refine match), university, programme, year, phone
- ✅ Rose-themed submit btn; `toast.success('Account created! Welcome to ResiHub 🎉')` on success
- ✅ Wired into App.tsx as public route `/register`; AuthContext.register() calls backend POST /api/auth/register

**Onboarding Wizard (new)**
- ✅ `frontend/src/components/OnboardingWizard.tsx` — 4-step fullscreen overlay for first-time users
- ✅ localStorage-gated (`rh_onboarding_seen`); shown only once per device
- ✅ Steps: Welcome (cyan) → How it works with allocation progress tracker (purple) → Complete profile (orange) → Browse rooms (rose)
- ✅ Per-step accent color: icon bg, progress bar, top glow line
- ✅ Navigation: Back/Next, final step has "Browse Rooms" link + "Get Started"; Skip link always visible
- ✅ Rendered in `ApplicationStatus.tsx` for PENDING_STUDENT users

**Invoice Modal (new)**
- ✅ `frontend/src/components/InvoiceModal.tsx` — formatted invoice viewer (invoice #, billed-to, period, line items, total)
- ✅ Client-side HTML blob download (no external PDF lib); Escape key + scroll lock
- ✅ Overdue warning banner; cyan/rose total amount colour based on status

**Contract Sign Modal (new)**
- ✅ `frontend/src/components/ContractSignModal.tsx` — lease contract viewer + e-signature
- ✅ Pending state: typed-name signature input; Signed state: signed-by + date in cyan UI
- ✅ `useMutation` → `POST /documents/:id/sign` → toast success/error; invalidates `['documents']` query
- ✅ Contract HTML blob download with conditional signature block

**Documents Page (rewritten)**
- ✅ Clickable rows open InvoiceModal (invoices) or ContractSignModal (contracts)
- ✅ DocRow shows: "Sign" CTA (rose) for unsigned contracts, download icon for invoices, eye for letters
- ✅ Shows "✓ Signed by {name}" mono text on signed contract rows

**Backend: Contract Signing API**
- ✅ Prisma migration `20260430182006_add_contract_signing`: `signedAt DateTime?` + `signedByName String?` on Document
- ✅ `backend/src/services/document.service.ts` — `signDocument()`: validates ownership, type, prevents double-sign
- ✅ `backend/src/controllers/document.controller.ts` — `signDocument` controller
- ✅ `backend/src/routes/document.routes.ts` — `POST /:id/sign`
- ✅ `frontend/src/services/document.service.ts` — `signContract(id, signedByName)` helper
- ✅ `frontend/src/types/domain.types.ts` — `signedAt?` + `signedByName?` added to ResidentDocument

**TypeScript**: `tsc --noEmit` → 0 errors

---

---

### Session 8 — 2026-05-01

**Goal**: Login sparks animation, liquid glass dashboard, admin residence settings, revenue reports, payment proof flow, voucher PIN/image, task proof system, prominent student payment UI

**Visual / UX**
- ✅ `SparkParticles.tsx` (new) — canvas-based rising spark particles with radial glow halos; `requestAnimationFrame` loop, `ResizeObserver`
- ✅ Sparks slowed to match isometric building float pace (~0.09–0.15 px/frame): `vy: -(0.42+0.11)`, `vx: 0.28`, `decay: 0.0012–0.0027`, `rate: 0.14`
- ✅ `Login.tsx` — `<SparkParticles color="#E8197A" rate={0.14} />` added to rose right panel
- ✅ `index.css` — blob animation keyframes (`blob1/2/3`) + `.card` backdrop-filter glass effect (`blur(14px) saturate(160%)`)
- ✅ `DashboardLayout.tsx` — fixed ambient blob background divs (cyan/rose/purple) animating behind all dashboard content; `zIndex` layering; Payments + Settings added to adminNav

**Backend — New Models & Migrations**
- ✅ `ResidenceSettings` model (single-row, `id = "settings"`) — name, tagline, address, phone, email, description
- ✅ `Voucher` expanded — `requiresProof Bool`, `taskTitle String?`, `pin String?`, `imageUrl String?`
- ✅ `VoucherClaim` model — `@@unique([voucherId, userId])`, proofUrl, proofStatus, claimedAt
- ✅ `Document` expanded — `proofUrl String?`, `proofStatus String?`, `clearedAt DateTime?`, `clearedBy String?`, `@@index([proofStatus])`
- ✅ Prisma migration applied

**Backend — New Services & Routes**
- ✅ `settings.service.ts` + `settings.controller.ts` + `settings.routes.ts` — GET (any auth), PUT (ADMIN only); upsert pattern
- ✅ `document.service.ts` — `submitPaymentProof`, `clearPayment`, `rejectPaymentProof`, `getAllInvoices`
- ✅ `document.routes.ts` — `POST /:id/proof`, `GET /admin/invoices`, `POST /:id/clear`, `POST /:id/reject-proof`
- ✅ `admin.service.ts` — `getRevenueReport` (monthly breakdown, projectedMonthly, latePayers >30 days), `getVoucherClaims`, `approveVoucherClaim`, `rejectVoucherClaim`
- ✅ `admin.routes.ts` — `/revenue`, `/claims`, `/claims/:id/approve`, `/claims/:id/reject`
- ✅ `wallet.service.ts` — `getVouchers(userId)` hides pin/imageUrl until claim APPROVED; `submitTaskProof` (upserts rejected claims)
- ✅ `wallet.routes.ts` — `POST /task-proof/:voucherId`
- ✅ `app.ts` — `settingsRoutes` registered at `/api/settings`

**Frontend — New Pages**
- ✅ `AdminSettings.tsx` — residence settings form with live preview card; fields: name, tagline, address, phone, email, description
- ✅ `AdminPayments.tsx` — KPI strip (projected monthly, awaiting review, overdue, active students); Revenue tab (monthly table), Invoices tab (proof review modal, clear/reject), Late Payers tab; ConfirmModal for destructive clear

**Frontend — Modified Pages / Components**
- ✅ `AdminRewards.tsx` — Task Claims tab (PENDING/APPROVED/REJECTED filter, proof image modal); voucher create form with task toggle, taskTitle, PIN, image upload (FileReader base64)
- ✅ `InvoiceModal.tsx` — proof upload section (SUBMITTED/CLEARED/REJECTED status states, image picker, preview, submit mutation)
- ✅ `Documents.tsx` — `ProofBadge` component; rose payment banner; inline proof-upload panel expands below invoice row; prominent "Upload Proof" / "Re-upload Proof" CTA on each unpaid invoice; progress states (Under Review, Cleared)
- ✅ `frontend/src/constants/routes.ts` — `ADMIN_PAYMENTS`, `ADMIN_SETTINGS`
- ✅ `frontend/src/services/admin.service.ts` — `getVoucherClaims`, `approveVoucherClaim`, `rejectVoucherClaim`, `getRevenueReport`, `getAllInvoices`, `clearPayment`, `rejectPaymentProof`, `getSettings`, `updateSettings`; new types: `AdminVoucherClaim`, `AdminInvoice`, `RevenueReport`, `ResidenceSettings`
- ✅ `frontend/src/services/document.service.ts` — `submitPaymentProof`
- ✅ `frontend/src/types/domain.types.ts` — `Voucher` expanded; `VoucherClaim` interface; `ResidentDocument` proof fields
- ✅ `App.tsx` — `AdminPayments` and `AdminSettings` imported and routed

**TypeScript**: `tsc --noEmit` → 0 errors (both batches)

**Session 8 addendum — Wallet task-voucher UI**
- ✅ `wallet.service.ts` — `submitTaskProof(voucherId, proofUrl)` helper added
- ✅ `Wallet.tsx` — Tasks tab added alongside Voucher Shop, History, Leaderboard
  - `TaskCard` component: task requirement block, inline FileReader proof upload, preview + submit/change/cancel
  - `ClaimBadge` component: PENDING (purple), APPROVED (cyan), REJECTED (rose) pill
  - PENDING state → purple "Awaiting review" notice; no re-upload allowed
  - APPROVED state → reveals PIN (mono, large) and/or voucher image
  - REJECTED state → "Re-upload Proof" CTA allows resubmission
  - Voucher Shop tab filtered to credit-only vouchers (`requiresProof=false`)
- TypeScript: 0 errors

---

---

### Session 8 — Full Audit & Bug Fixes

**Root-cause bugs found and fixed:**

1. **File picker never opened (payment proof broken)** — Both `Documents.tsx` and `InvoiceModal.tsx` created a transient `<input>` element via `document.createElement` and called `.click()` on it without appending it to the DOM. Browsers block programmatic clicks on detached inputs, so the file picker silently did nothing. Fixed by using a hidden `<input ref>` element that lives in the DOM.

2. **Documents.tsx UX overhaul** — "Upload Proof" button no longer immediately opens a file dialog. It now expands an inline panel. Inside the panel a dashed "Select Image" drop-zone opens the picker. After file selection, a preview + "Submit Proof" button appear. "Change" / "Cancel" work correctly.

3. **Task vouchers unguarded at backend** — `wallet.service.ts` `redeemVoucher` had no check for `requiresProof`. Students could call `POST /wallet/redeem/:id` directly to claim task vouchers without submitting proof. Fixed with a 400 guard.

4. **One-click voucher redemption** — The Voucher Shop "Redeem" button spent credits in a single click with no confirmation. Now shows `ConfirmModal` with the credit cost and current balance before committing.

**TypeScript**: 0 errors (frontend + backend)

---

### Session 10 — 2026-05-14 — Hardening (Batches A, C, D)

**Batch A — Foundation**
- Secrets: `docker-compose` reads `${VAR:-fallback}` refs; `deploy.sh` generates
  strong JWT secrets into a gitignored `.env`; Postgres + backend ports locked
  to `127.0.0.1`. `.env.example` added.
- Migrations: `deploy.sh` switched from `db push` to versioned
  `prisma migrate deploy` (baselines a pre-existing DB first);
  `batch_a_reconcile` captures accumulated drift.
- Production frontend build: compose split into base + `docker-compose.override.yml`
  (dev Vite) + `docker-compose.prod.yml` (static nginx); `VITE_*` baked as build args.

**Batch C — Trust**
- Automated tests: Vitest backend suite — 46 pure unit tests (JWT, error
  middleware, auth validators, the upload security gate, storage service).
- Object storage: `storage.service.ts` unifies all uploads onto disk
  (`persistIfDataUrl` / `deletePersistedFile`, S3 seam documented); compliance
  docs + payment proofs moved off base64-in-DB; idempotent back-fill script in
  `deploy.sh`.

**Batch D**
- #9 Notifications centre: `Notification` model + service/controller/routes;
  `createNotification` wired into all 7 event sites (invoices incl. bulk,
  chore approve/reject, maintenance status, application, account approve/
  deactivate); `NotificationBell` in the dashboard header — unread badge,
  dropdown history, mark-read / mark-all-read, 45s unread-count poll.
- #11 Staff roles: `MANAGER` (admin-lite — all day-to-day ops, no audit
  log / residence settings / role changes) and `MAINTENANCE` (handyman —
  tickets + ops logs only) added to the `Role` enum. Semantic route
  groups (`ADMIN_ONLY` / `MANAGEMENT` / `OPS_STAFF`) in role.middleware.ts;
  every admin route re-tiered. Service-level privilege guards block a
  manager from changing roles or touching staff/admin accounts. Frontend:
  per-role nav + route guards, role assignment on the Accounts page
  (admin-only). Verified end-to-end — every permission boundary holds.

**Batch E**
- #12 Lease lifecycle: the lease now lives on the `Allocation` (term
  dates, deposit amount/status/refund, notice + move-out tracking) plus a
  new `Inspection` model (move-in / routine / move-out, condition, notes,
  photos). `lease.service.ts` owns every transition — set terms, record
  deposit, renew, give notice, schedule move-out, complete move-out
  (frees the room), refund deposit, log inspections — with notifications
  on the tenant-visible ones. New `/api/lease` routes (student reads own;
  management mutates). Frontend: `MyLeaseCard` on the student Profile
  (read-only + give-notice) and a `LeaseManageModal` from the admin
  account drawer (full lifecycle console). Verified end-to-end.

**Batch F**
- #13 Recurring invoices: a daily node-cron (02:00) raises the month's
  rent invoices on a configurable day when enabled in residence
  settings. Idempotent twice over (per-student + per-month markers).
- #14 Compliance-doc expiry: `Document.expiresAt` + the same cron warns
  residents/admins about docs expiring within 30 days; a management-only
  endpoint sets expiry; ApplicationReviewModal + ComplianceDocsCard
  surface it.
- #15 Analytics: GET /admin/analytics computes 6-month trends from
  existing rows (rent billed vs collected, tickets, new residents) +
  a snapshot; AnalyticsSection on the Admin Overview with CSS bar charts.
  Also fixed the seed's invoice period format to "YYYY-MM".
- #16 Global search + CSV export: GET /admin/search spans residents,
  rooms, invoices, tickets — a debounced GlobalSearch box in the topbar
  (management only). GET /admin/export/:type streams RFC-4180 CSV;
  Export buttons on the Accounts, Payments and Maintenance pages.

**Skipped** (need external infrastructure): #2 backups, #5 error monitoring,
#7 password reset, #10 email reliability.

**TypeScript**: 0 errors (frontend + backend) · **Tests**: 46 passing

---

**Document Version**: 2.3
**Last Updated**: 2026-05-14
