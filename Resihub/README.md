# ResiHub — Student Accommodation Management Platform

<div align="center">

![ResiHub](https://img.shields.io/badge/ResiHub-Student%20Accommodation-00CCCC?style=for-the-badge)
![Status](https://img.shields.io/badge/Status-Active%20Development-E8197A?style=for-the-badge)
![Type](https://img.shields.io/badge/Type-Single%20File%20SPA-0f0f12?style=for-the-badge)
![License](https://img.shields.io/badge/License-MIT-00CCCC?style=for-the-badge)

**A unified platform for booking, tracking, and managing student accommodation — built for both residents and administrators.**

</div>

---

## Overview

ResiHub is a full-featured student residence management system built as a single self-contained HTML file. It is designed for South African student accommodation providers managing multiple blocks, with distinct workflows for students, pending applicants, and administrators.

The platform eliminates paper-based processes — from room allocation and maintenance reporting to visitor management, chore coordination, and a credit reward system — replacing them with a clean, role-gated digital interface that works directly in any browser without installation.

---

## The Problem It Solves

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

## Key Features

### For Students
| Feature | Description |
|---|---|
| **Dashboard** | Rent status, open tickets, pinned notices, chore board at a glance |
| **Maintenance** | Report issues with photos/videos, track status, get admin notes |
| **Residence Updates** | Live news feed published by admin — WiFi upgrades, water shutdowns, events |
| **Visitor Passes** | Invite guests, generate QR codes, manage your pass history |
| **Housemates** | See who lives in your block, message or nudge them, share chores |
| **Chore Board** | Claim chores, mark them done, earn credits toward rewards |
| **Wallet** | Track your credit balance, redeem vouchers, see the block leaderboard |
| **Profile** | Update your details, upload a profile photo visible to housemates |
| **Documents** | Download invoices and contracts, request official letters |

### For Administrators
| Feature | Description |
|---|---|
| **Overview** | Live dashboard — residents, revenue, room reservations, open tickets, action alerts |
| **Occupancy** | Block-by-block room grid showing occupied, reserved, and vacant rooms in real time |
| **Allocations** | Manage current allocations, process room reservations from students, review new applications |
| **Maintenance Tickets** | Full ticket management — update status, add notes visible to the student, filter by priority |
| **News Manager** | Publish, pin, and delete residence notices visible to all students instantly |
| **Visitor Log** | See all visitor passes across all residents, check guests in at reception, remove passes |
| **Rewards Manager** | View all student wallets, adjust credits, manage voucher stock, see full redemption log |
| **Accounts** | Searchable student list with balances, room status, and quick actions |

---

## Credit & Reward System

Students earn credits by participating in the shared responsibility of the residence:

| Action | Credits |
|---|---|
| Claim a chore | **+5 🪙** |
| Complete a chore | **+20 🪙** |
| Unclaim a chore | **-5 🪙** |

Earned credits are redeemed in the **Voucher Shop** for real rewards:

- 🧺 Free Laundry Load — 40 credits
- 📶 1 Month Free WiFi — 150 credits
- ☕ R50 Campus Café Voucher — 80 credits
- 💪 Gym Guest Pass — 30 credits
- 🚗 Parking Day Pass — 25 credits
- 🔧 Priority Maintenance — 60 credits

Admins can grant or deduct credits manually, restock vouchers, and view the full redemption log per student.

---

## Room Reservation Logic

The booking flow is carefully designed to prevent double-allocation:

1. A student selects a vacant room and submits a request — the room is immediately **reserved** and disappears from all other students' available listings
2. Admin sees the reservation in the **Allocations → Reservations** tab with the student's name
3. Admin clicks **Confirm & Allocate** — the room becomes occupied and the student's status updates to active
4. If admin **Declines** or the student **Cancels**, the room returns to available
5. A student cannot hold more than one reservation at a time — the booking page greys out all rooms while a reservation is pending

---

## User Roles

| Role | Access |
|---|---|
| **Active Student** | Dashboard, Maintenance, Updates, Visitors, Housemates, Wallet, Profile, Documents |
| **Pending Student** | Application status tracker, Room browsing only |
| **Admin** | Full admin panel — cannot access student views |

Role gates are enforced in both the navigation and the routing layer — clicking a nav item outside your role returns an error toast and does not load the view.

---

## Technology

ResiHub is intentionally built as a **zero-dependency single HTML file**:

- **No framework** — vanilla JavaScript, no React, Vue, or Angular
- **No build step** — open the file in a browser and it works
- **No CDN dependencies at runtime** — fonts load from Google Fonts, everything else is inline
- **State management** — a single global `S` object drives all rendering through a `render()` function
- **Design system** — CSS custom properties for dark/light theming, Space Grotesk + IBM Plex Mono typography, teal `#00CCCC` and rose `#E8197A` brand palette

This approach was chosen deliberately to keep the barrier to use and distribution as low as possible during development.

---

## Project Structure

```
Resihub/
└── resihub.html          # The entire application — one file
```

When the database is connected, a schema file will also be present:

```
Resihub/
├── resihub.html          # Frontend application
└── resihub_schema.sql    # Supabase PostgreSQL schema (future)
```

---

## Running the Application

1. Download `resihub.html`
2. Double-click to open in any browser (Chrome, Edge, Firefox, Safari)
3. Use the quick-fill buttons on the login screen to test different user roles

No server, no terminal, no installation required.

---

## Demo Accounts

| Role | Email | Password |
|---|---|---|
| Student — Active | `sarah@campus.edu` | `pass123` |
| Student — Active | `marcus@campus.edu` | `pass123` |
| Student — Active | `lerato@campus.edu` | `pass123` |
| Student — Active | `dev@campus.edu` | `pass123` |
| Student — Pending | `aisha@campus.edu` | `pass123` |
| Admin — Platform | `admin@resihub.co` | `admin123` |
| Admin — Facility | `manager@resihub.co` | `admin123` |

---

## Planned: Database Integration (Supabase)

ResiHub is architected to connect to **Supabase** (PostgreSQL + Auth + Realtime + Storage) with minimal changes. The schema is already designed and tested. When connected:

- All data persists across sessions and devices
- Role-based access is enforced at the database level via Row Level Security (RLS)
- Real-time subscriptions push ticket updates, occupancy changes, and news to all connected users simultaneously
- Profile photos upload to Supabase Storage
- Credits and wallet transactions use atomic SQL stored procedures to prevent drift

**Connection steps (when ready):**
1. Sign up at [supabase.com](https://supabase.com) — free tier
2. Run `resihub_schema.sql` in the SQL Editor
3. Create auth users in the Authentication dashboard
4. Replace `SUPABASE_URL` and `SUPABASE_ANON` at the top of `resihub.html`

---

## Planned Enhancements

- [ ] Payment gateway integration (PayFast / Peach Payments)
- [ ] Email and WhatsApp notifications
- [ ] POPIA compliance (privacy policy, consent, data deletion)
- [ ] Digital lease signing
- [ ] Move-in / move-out inspection checklists
- [ ] Facility booking (study rooms, gym, braai area, parking)
- [ ] Parcel and mail management
- [ ] Multi-residence support
- [ ] Admin audit trail
- [ ] Bursary / NSFAS payment flag
- [ ] Progressive Web App (PWA) with offline support
- [ ] Incident reporting system (separate from maintenance)
- [ ] Roommate matching for double rooms

---

## Author

**Jethro Mncube**
GitHub: [@jmtmncube-eng](https://github.com/jmtmncube-eng)

---

## License

MIT — free to use, modify, and distribute with attribution.

---

<div align="center">
  <sub>Built with purpose for South African student residences.</sub>
</div>
