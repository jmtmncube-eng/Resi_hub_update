# Database Schema
## ResiHub — Student Accommodation Management Platform

---

## Entity Relationship Overview

```
User ──────────────┬──── Allocation ───── Room
  │                │
  ├── MaintenanceTicket
  ├── VisitorPass
  ├── ChoreLog ────────── Chore
  ├── Wallet ──────────── WalletTransaction
  │                            └── VoucherRedemption ── Voucher
  ├── Document
  └── AuditLog

News (authored by Admin User)
```

---

## Models

### User
```prisma
model User {
  id           String   @id @default(cuid())
  email        String   @unique
  passwordHash String
  role         Role     @default(PENDING_STUDENT)
  name         String
  avatarUrl    String?
  university   String?
  program      String?
  year         Int?
  phone        String?
  bio          String?
  createdAt    DateTime @default(now())
  updatedAt    DateTime @updatedAt

  allocation      Allocation?
  maintenanceTickets MaintenanceTicket[]
  visitorPasses   VisitorPass[]
  choreLogs       ChoreLog[]
  wallet          Wallet?
  documents       Document[]
  auditLogs       AuditLog[]
  newsAuthored    News[]
}
```

### Room
```prisma
model Room {
  id     String   @id @default(cuid())
  number String   @unique
  block  String
  type   RoomType
  price  Decimal
  status RoomStatus @default(VACANT)

  allocation  Allocation?
}
```

### Allocation
```prisma
model Allocation {
  id        String           @id @default(cuid())
  userId    String           @unique
  roomId    String           @unique
  status    AllocationStatus @default(RESERVED)
  moveIn    DateTime?
  rent      Decimal
  createdAt DateTime         @default(now())
  updatedAt DateTime         @updatedAt

  user      User   @relation(fields: [userId], references: [id])
  room      Room   @relation(fields: [roomId], references: [id])
}
```

### MaintenanceTicket
```prisma
model MaintenanceTicket {
  id         String         @id @default(cuid())
  studentId  String
  category   String
  location   String
  description String
  priority   Priority       @default(NORMAL)
  status     TicketStatus   @default(OPEN)
  mediaUrls  String[]
  adminNote  String?
  createdAt  DateTime       @default(now())
  updatedAt  DateTime       @updatedAt

  student    User           @relation(fields: [studentId], references: [id])
}
```

### VisitorPass
```prisma
model VisitorPass {
  id           String      @id @default(cuid())
  hostId       String
  visitorName  String
  visitorPhone String
  date         DateTime
  timeFrom     String
  timeTo       String
  purpose      String
  status       PassStatus  @default(UPCOMING)
  checkedIn    Boolean     @default(false)
  checkedInAt  DateTime?
  qrCode       String      @unique
  createdAt    DateTime    @default(now())

  host         User        @relation(fields: [hostId], references: [id])
}
```

### Chore
```prisma
model Chore {
  id          String    @id @default(cuid())
  icon        String
  name        String
  description String
  frequency   String
  block       String
  claimedById String?
  doneById    String?
  doneAt      DateTime?
  createdAt   DateTime  @default(now())
  updatedAt   DateTime  @updatedAt

  logs        ChoreLog[]
}
```

### ChoreLog
```prisma
model ChoreLog {
  id       String   @id @default(cuid())
  choreId  String
  userId   String
  action   ChoreAction
  note     String?
  createdAt DateTime @default(now())

  chore    Chore    @relation(fields: [choreId], references: [id])
  user     User     @relation(fields: [userId], references: [id])
}
```

### Wallet
```prisma
model Wallet {
  id       String   @id @default(cuid())
  userId   String   @unique
  credits  Int      @default(0)
  createdAt DateTime @default(now())
  updatedAt DateTime @updatedAt

  user         User                @relation(fields: [userId], references: [id])
  transactions WalletTransaction[]
}
```

### WalletTransaction
```prisma
model WalletTransaction {
  id        String          @id @default(cuid())
  walletId  String
  type      TransactionType
  amount    Int
  note      String
  createdAt DateTime        @default(now())

  wallet    Wallet          @relation(fields: [walletId], references: [id])
  redemption VoucherRedemption?
}
```

### Voucher
```prisma
model Voucher {
  id          String   @id @default(cuid())
  name        String
  description String
  cost        Int
  icon        String
  stock       Int      @default(0)
  createdAt   DateTime @default(now())
  updatedAt   DateTime @updatedAt

  redemptions VoucherRedemption[]
}
```

### VoucherRedemption
```prisma
model VoucherRedemption {
  id            String   @id @default(cuid())
  walletId      String
  voucherId     String
  transactionId String   @unique
  createdAt     DateTime @default(now())

  voucher     Voucher           @relation(fields: [voucherId], references: [id])
  transaction WalletTransaction @relation(fields: [transactionId], references: [id])
}
```

### News
```prisma
model News {
  id         String   @id @default(cuid())
  type       String
  tag        String
  tagColor   String
  pinned     Boolean  @default(false)
  authorId   String
  title      String
  date       String
  body       String
  createdAt  DateTime @default(now())
  updatedAt  DateTime @updatedAt

  author     User     @relation(fields: [authorId], references: [id])
}
```

### Document
```prisma
model Document {
  id       String       @id @default(cuid())
  userId   String
  type     DocumentType
  period   String
  amount   String?
  status   String
  fileUrl  String?
  createdAt DateTime    @default(now())

  user     User         @relation(fields: [userId], references: [id])
}
```

### AuditLog
```prisma
model AuditLog {
  id        String   @id @default(cuid())
  userId    String
  action    String
  entity    String
  entityId  String?
  meta      Json?
  ip        String?
  createdAt DateTime @default(now())

  user      User     @relation(fields: [userId], references: [id])
}
```

---

## Enums

```prisma
enum Role {
  ACTIVE_STUDENT
  PENDING_STUDENT
  ADMIN
}

enum RoomType {
  SINGLE
  DOUBLE
  STUDIO
}

enum RoomStatus {
  VACANT
  RESERVED
  OCCUPIED
}

enum AllocationStatus {
  RESERVED
  ACTIVE
  ENDED
}

enum Priority {
  LOW
  NORMAL
  HIGH
  EMERGENCY
}

enum TicketStatus {
  OPEN
  IN_PROGRESS
  RESOLVED
  CLOSED
}

enum PassStatus {
  UPCOMING
  ACTIVE
  EXPIRED
  CANCELLED
}

enum ChoreAction {
  CLAIMED
  UNCLAIMED
  COMPLETED
}

enum TransactionType {
  EARN
  REDEEM
  ADJUST
}

enum DocumentType {
  INVOICE
  CONTRACT
  LETTER
}
```

---

## Indexes

```prisma
@@index([block])          // Room — filter by block
@@index([status])         // Room, Ticket, Pass — filter by status
@@index([studentId])      // MaintenanceTicket — filter by student
@@index([hostId])         // VisitorPass — filter by host
@@index([choreId])        // ChoreLog — filter by chore
@@index([walletId])       // WalletTransaction — filter by wallet
@@index([authorId])       // News — filter by author
@@index([userId])         // AuditLog — filter by user
@@index([createdAt])      // All models — sort/filter by date
```

---

## Migration Strategy

All schema changes go through Prisma migrations:

```bash
# Create a new migration
npx prisma migrate dev --name descriptive_migration_name

# Apply migrations in production
npx prisma migrate deploy

# View migration history
npx prisma migrate status
```

**Naming convention**: `YYYYMMDDHHMMSS_descriptive_name`

---

**Document Version**: 1.0
**Last Updated**: 2026-03-25
