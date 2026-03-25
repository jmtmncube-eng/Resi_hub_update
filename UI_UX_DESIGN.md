# UI/UX Design System
## ResiHub — Student Accommodation Management Platform

---

## 1. Brand Identity

### Color Tokens
```css
/* Primary palette */
--cyan:   #00CCCC;    /* Teal — primary actions, focus states */
--rose:   #E8197A;    /* Rose — accents, alerts, tags */

/* Dark theme (default) */
--bg:     #0f0f12;    /* Page background */
--bg2:    #16161b;    /* Cards, panels */
--bg3:    #1e1e26;    /* Elevated surfaces, modals */
--border: rgba(255,255,255,.07);
--border2: rgba(255,255,255,.13);
--text:   #ffffff;
--text2:  rgba(255,255,255,.65);
--text3:  rgba(255,255,255,.32);

/* Light theme */
--bg:     #f2f4f7;
--bg2:    #ffffff;
--bg3:    #e8eaef;
--border: rgba(0,0,0,.08);
--text:   #0f0f12;
--text2:  rgba(15,15,18,.65);

/* Semantic */
--success: #10b981;
--warning: #f59e0b;
--error:   #ef4444;
--info:    #3b82f6;
```

### Tailwind Config Mapping
```javascript
colors: {
  'rh-cyan':  '#00CCCC',
  'rh-rose':  '#E8197A',
  'rh-bg':    '#0f0f12',
  'rh-bg2':   '#16161b',
  'rh-bg3':   '#1e1e26',
}
```

---

## 2. Typography

| Style | Font | Weight | Size |
|-------|------|--------|------|
| Heading XL | Space Grotesk | 700 | 2rem |
| Heading LG | Space Grotesk | 600 | 1.5rem |
| Heading MD | Space Grotesk | 600 | 1.25rem |
| Body | Space Grotesk | 400 | 1rem |
| Small | Space Grotesk | 400 | 0.875rem |
| Mono | IBM Plex Mono | 400 | 0.8125rem |
| Mono Small | IBM Plex Mono | 400 | 0.75rem |

Use `font-mono` (IBM Plex Mono) for:
- Balances, amounts, credit values
- Room numbers, IDs
- Timestamps, dates

---

## 3. Layout

### Student Layout
```
┌─────────────────────────────────────┐
│  Sidebar (desktop) / Bottom nav (mobile) │
│  Logo · Nav items · User avatar     │
├─────────────────────────────────────┤
│  Page header (title + breadcrumb)   │
├─────────────────────────────────────┤
│  Page content                        │
│  (max-width: 1200px, centred)       │
└─────────────────────────────────────┘
```

### Admin Layout
```
┌──────────┬──────────────────────────┐
│ Sidebar  │  Top bar (admin badge)   │
│ 240px    ├──────────────────────────┤
│          │  Page content            │
│          │  (full width panels)     │
└──────────┴──────────────────────────┘
```

---

## 4. Component Library

### Button
```tsx
// Variants: primary | secondary | ghost | danger
// Sizes: sm | md | lg
<Button variant="primary" size="md">Confirm</Button>
<Button variant="ghost" size="sm">Cancel</Button>
<Button variant="danger" size="md">Delete</Button>
```

Styles:
- Primary: `bg-rh-cyan text-black font-semibold hover:bg-opacity-90`
- Secondary: `border border-rh-cyan text-rh-cyan hover:bg-rh-cyan/10`
- Ghost: `text-text2 hover:text-text hover:bg-white/5`
- Danger: `bg-rose-600 text-white hover:bg-rose-700`

### Badge / Tag
```tsx
// Status badges
<Badge color="green">Active</Badge>
<Badge color="rose">Overdue</Badge>
<Badge color="cyan">Reserved</Badge>
<Badge color="gray">Expired</Badge>
```

Ticket priority tags:
- Emergency → rose background
- High → amber
- Normal → cyan border
- Low → gray

### Card
```tsx
<Card>
  <CardHeader title="Maintenance" />
  <CardBody>...</CardBody>
</Card>
```
Style: `bg-bg2 border border-border rounded-xl p-4`

### Input / Select / Textarea
```tsx
<Input label="Description" placeholder="Describe the issue..." />
<Select label="Category" options={[...]} />
<Textarea label="Notes" rows={4} />
```
Focus: `border-rh-cyan bg-cyan-50/5`

### Toast Notifications
```tsx
toast('Ticket submitted successfully', 'success')
toast('Not enough credits', 'error')
toast('Room reserved', 'info')
```
Position: bottom-right, stacked, auto-dismiss 4s

### Status Badge (Tickets)
```
OPEN        → cyan border, cyan text
IN_PROGRESS → amber background
RESOLVED    → green background
CLOSED      → gray background
```

---

## 5. Page Designs

### Student Dashboard
```
┌─── Greeting ──────────────────────────┐
│ Welcome back, Sarah                    │
├───────────┬───────────┬───────────────┤
│ Rent      │ Tickets   │ Credits       │
│ R4,500    │ 2 Open    │ 65 🪙        │
│ ✅ Paid   │           │               │
├───────────┴───────────┴───────────────┤
│ 📌 Pinned Notice (if any)             │
├───────────────────────────────────────┤
│ Chore Board (quick view, 3 chores)    │
└───────────────────────────────────────┘
```

### Maintenance — Report Form
```
Category:   [WiFi / Internet ▾]
Location:   [Room 204         ]
Priority:   [Normal ▾         ]
Description:
[                              ]
[                              ]

📎 Attach Photos / Videos
[ Drop files here or click ]

[    Submit Ticket    ]
```

### Chore Board
```
┌─────────────────────────────────────┐
│ 🗑️ Take out dustbin               │
│ Weekly · Tuesdays                   │
│ [Available]          [Claim →]     │
├─────────────────────────────────────┤
│ 🔒 Lock front gate                 │
│ Daily · Nightly                     │
│ Claimed by Marcus W.  [Mark Done →]│
└─────────────────────────────────────┘
```

### Wallet Page (Tabs)
```
[Balance] [History] [Voucher Shop] [Leaderboard]

Balance tab:
┌──────────────────┐
│  65 🪙           │
│  Your Credits    │
└──────────────────┘

Voucher Shop tab:
┌──────────┐ ┌──────────┐ ┌──────────┐
│ 🧺 40🪙  │ │ 📶 150🪙 │ │ ☕ 80🪙  │
│ Laundry  │ │ WiFi     │ │ Café     │
│[Redeem]  │ │[Redeem]  │ │[Redeem]  │
└──────────┘ └──────────┘ └──────────┘
```

### Admin Occupancy Grid
```
Block A                     Block B
┌────┬────┬────┬────┐      ┌────┬────┬────┐
│101 │102 │103 │104 │      │201 │202 │203 │
│ ●  │ ○  │ ●  │ ○  │      │ ○  │ ●  │ ○  │
└────┴────┴────┴────┘      └────┴────┴────┘

● Occupied  ◑ Reserved  ○ Vacant
```

---

## 6. Responsive Breakpoints

| Breakpoint | Width | Layout |
|---|---|---|
| Mobile | < 768px | Single column, bottom nav |
| Tablet | 768px–1024px | Two columns, collapsible sidebar |
| Desktop | > 1024px | Full sidebar + multi-column content |

### Navigation
- **Desktop**: Fixed left sidebar (240px)
- **Mobile**: Bottom navigation bar (5 icons max)
- **Tablet**: Hamburger menu → slide-in drawer

---

**Document Version**: 1.0
**Last Updated**: 2026-03-25
