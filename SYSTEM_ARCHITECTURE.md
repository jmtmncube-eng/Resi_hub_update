# System Architecture
## ResiHub — Student Accommodation Management Platform

---

## 1. Branding & Design System

### Color Palette
```css
:root {
  /* Primary Brand Colors */
  --cyan:  #00CCCC;   /* Primary — buttons, highlights, focus */
  --rose:  #E8197A;   /* Accent — badges, alerts, tags */

  /* Dark Theme (default) */
  --bg:     #0f0f12;
  --bg2:    #16161b;
  --bg3:    #1e1e26;
  --border: rgba(255,255,255,.07);
  --text:   #ffffff;
  --text2:  rgba(255,255,255,.65);

  /* Semantic */
  --success: #10b981;
  --warning: #f59e0b;
  --error:   #ef4444;
  --info:    #3b82f6;
}
```

### Typography
- **UI Font**: Space Grotesk — 300, 400, 500, 600, 700
- **Data/Mono Font**: IBM Plex Mono — 300, 400, 500
- **Base size**: 16px

### Design Principles
- Dark-first (light mode supported via CSS custom properties)
- Mobile-responsive
- Consistent spacing using 0.5rem base unit
- Clear role-based UI separation (student vs admin layouts differ)

---

## 2. System Architecture

### Three-Tier Architecture

```
┌─────────────────────────────────────┐
│     PRESENTATION LAYER (Client)      │
│  React 18 + TypeScript + Tailwind    │
│     3 roles · 15+ pages             │
└──────────────────┬──────────────────┘
                   │ REST API (JWT Bearer)
                   │ HTTP/HTTPS
┌──────────────────▼──────────────────┐
│    APPLICATION LAYER (Backend)       │
│    Node.js 18 + Express + TypeScript │
│   Route groups · Controllers         │
│   Services · Middleware · Validators │
└──────────────────┬──────────────────┘
                   │ Prisma ORM
                   │ Connection Pool
┌──────────────────▼──────────────────┐
│       DATA LAYER (Database)          │
│       PostgreSQL 15+ + Prisma        │
│   13 models · migrations · indexes  │
└─────────────────────────────────────┘
```

### Docker Network (Development)

```
┌─────────────────────────────────────────┐
│         docker-compose network           │
│                                          │
│  ┌──────────────┐   ┌──────────────┐    │
│  │   frontend   │   │   backend    │    │
│  │  :3000       │──▶│  :5000       │    │
│  │  Vite dev    │   │  Express     │    │
│  └──────────────┘   └──────┬───────┘    │
│                             │            │
│                    ┌────────▼───────┐   │
│                    │   postgres     │   │
│                    │   :5432        │   │
│                    │  PostgreSQL 15  │   │
│                    └────────────────┘   │
└─────────────────────────────────────────┘
```

---

## 3. Technology Stack

### Frontend
| Technology | Version | Purpose |
|---|---|---|
| React | 18 | UI framework |
| TypeScript | 5 | Type safety |
| Vite | 5 | Build tool + dev server |
| Tailwind CSS | 3 | Utility-first styling |
| React Router | 6 | Client-side routing |
| TanStack Query | 5 | Server state + caching |
| React Hook Form | 7 | Form management |
| Zod | 3 | Schema validation |
| Axios | 1 | HTTP client |
| Lucide React | latest | Icon library |
| react-dropzone | 14 | File upload |
| qrcode.react | 3 | QR code generation |

### Backend
| Technology | Version | Purpose |
|---|---|---|
| Node.js | 18+ | Runtime |
| Express | 4 | HTTP framework |
| TypeScript | 5 | Type safety |
| Prisma | 5 | ORM + migrations |
| PostgreSQL | 15 | Primary database |
| bcrypt | 5 | Password hashing |
| jsonwebtoken | 9 | JWT auth tokens |
| Zod | 3 | Request validation |
| Multer | 1 | File upload handling |
| node-cron | 3 | Scheduled jobs |
| Nodemailer | 6 | Email delivery |
| Helmet | 7 | Security headers |
| cors | 2 | CORS policy |

---

## 4. API Design

### Base URL
- Development: `http://localhost:5000/api`
- Production: `https://api.resihub.co.za/api`

### Authentication
All protected endpoints require:
```
Authorization: Bearer <access_token>
```

Access token TTL: `24h`
Refresh token TTL: `7d`

### Response Format
```json
{
  "success": true,
  "data": { ... },
  "message": "Optional message"
}
```

Error format:
```json
{
  "success": false,
  "error": "Error message",
  "code": "ERROR_CODE"
}
```

### Route Groups

| Prefix | Auth | Roles | Description |
|--------|------|-------|-------------|
| `/api/auth` | Public | — | Login, register, refresh |
| `/api/student/dashboard` | Required | ACTIVE_STUDENT | Dashboard data |
| `/api/maintenance` | Required | ACTIVE_STUDENT | Ticket CRUD |
| `/api/news` | Required | Any student | News feed |
| `/api/visitors` | Required | ACTIVE_STUDENT | Visitor passes |
| `/api/housemates` | Required | ACTIVE_STUDENT | Block residents |
| `/api/profile` | Required | Any student | Profile management |
| `/api/documents` | Required | ACTIVE_STUDENT | Document list |
| `/api/chores` | Required | ACTIVE_STUDENT | Chore board |
| `/api/wallet` | Required | ACTIVE_STUDENT | Credits + vouchers |
| `/api/rooms` | Required | PENDING_STUDENT | Available rooms |
| `/api/admin/*` | Required | ADMIN | Full admin panel |
| `/health` | Public | — | Health check |

---

## 5. Role-Based Access Control

### Roles
```typescript
enum Role {
  ACTIVE_STUDENT  = "ACTIVE_STUDENT",
  PENDING_STUDENT = "PENDING_STUDENT",
  ADMIN           = "ADMIN"
}
```

### Role Permissions Matrix

| Feature | ACTIVE_STUDENT | PENDING_STUDENT | ADMIN |
|---------|:-:|:-:|:-:|
| Dashboard | ✅ | ❌ | ❌ |
| Maintenance tickets | ✅ | ❌ | ❌ |
| News feed | ✅ | ✅ | ❌ |
| Visitor passes | ✅ | ❌ | ❌ |
| Housemates | ✅ | ❌ | ❌ |
| Chore board | ✅ | ❌ | ❌ |
| Wallet + vouchers | ✅ | ❌ | ❌ |
| Profile | ✅ | ✅ | ❌ |
| Documents | ✅ | ❌ | ❌ |
| Browse rooms | ❌ | ✅ | ❌ |
| Admin overview | ❌ | ❌ | ✅ |
| Admin tickets | ❌ | ❌ | ✅ |
| Admin allocations | ❌ | ❌ | ✅ |
| Admin news manager | ❌ | ❌ | ✅ |
| Admin visitor log | ❌ | ❌ | ✅ |
| Admin rewards | ❌ | ❌ | ✅ |
| Admin accounts | ❌ | ❌ | ✅ |

---

## 6. Business Logic Rules

### Room Reservation Flow
1. Pending student selects a vacant room → status immediately changes to `RESERVED`
2. Reserved room disappears from all other students' available listings
3. Admin sees reservation in Allocations → Reservations tab
4. Admin confirms → room becomes `OCCUPIED`, student status → `ACTIVE_STUDENT`
5. Admin declines OR student cancels → room returns to `VACANT`
6. A student cannot hold more than one reservation simultaneously

### Credit System
| Action | Credits |
|--------|---------|
| Claim a chore | +5 🪙 |
| Complete a chore | +20 🪙 |
| Unclaim a chore | -5 🪙 |
| Admin manual adjustment | ±any |

Credits are always atomic — a transaction record is written for every change.

### Maintenance Ticket Statuses
`OPEN` → `IN_PROGRESS` → `RESOLVED` → `CLOSED`

Only admins can change ticket status. Students can only create tickets and view updates.

### Visitor Pass Logic
- Pass is active from `timeFrom` to `timeTo` on the specified `date`
- Status auto-transitions: `UPCOMING` → `ACTIVE` → `EXPIRED`
- Admin can check in a guest (sets `checkedIn = true`, records `checkedInAt`)
- Student can cancel an `UPCOMING` pass; cannot cancel an `ACTIVE` pass

---

## 7. File Storage

### Development
Files stored locally in `backend/uploads/`:
```
uploads/
├── maintenance/    # Maintenance ticket photos/videos
├── avatars/        # Student profile photos
└── documents/      # Invoices, contracts
```

### Production
Files stored in S3-compatible storage (AWS S3 / DigitalOcean Spaces):
- Bucket: `resihub-files`
- Region: `af-south-1` (Cape Town — POPIA data residency)
- Max file size: 10MB
- Allowed types: images (jpg, png, webp), video (mp4), PDF

---

**Document Version**: 1.0
**Last Updated**: 2026-03-25
