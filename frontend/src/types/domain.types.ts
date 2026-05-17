// ── Maintenance ─────────────────────────────────────────────────
export type TicketStatus   = 'OPEN' | 'IN_PROGRESS' | 'RESOLVED' | 'CLOSED';
export type TicketPriority = 'LOW' | 'NORMAL' | 'HIGH' | 'EMERGENCY';

/** One row from the ticket audit trail. `changes` is a structured diff
 *  ({ field: { from, to } }) so the UI can render rich timeline rows. */
export interface MaintenanceTicketUpdate {
  id:        string;
  actorId:   string | null;
  actorName: string;
  summary:   string;
  changes:   Record<string, { from: unknown; to: unknown }>;
  createdAt: string;
}

export interface MaintenanceTicket {
  id:          string;
  studentId:   string;
  category:    string;
  location:    string;
  description: string;
  priority:    TicketPriority;
  status:      TicketStatus;
  mediaUrls:   string[];
  adminNote?:  string;
  createdAt:   string;
  updatedAt:   string;
  student?: { id: string; name: string; avatarUrl?: string };
  /** Audit trail — newest first. Backend includes it on every ticket fetch. */
  updates?: MaintenanceTicketUpdate[];
}

// ── News ────────────────────────────────────────────────────────
export interface NewsItem {
  id:        string;
  type:      string;
  tag:       string;
  tagColor:  string;
  pinned:    boolean;
  authorId:  string;
  title:     string;
  date:      string;
  body:      string;
  createdAt: string;
  read?:     boolean;
  author?:   { id: string; name: string };
}

// ── Visitors ────────────────────────────────────────────────────
export type PassStatus = 'UPCOMING' | 'ACTIVE' | 'EXPIRED' | 'CANCELLED';

export interface VisitorPass {
  id:           string;
  hostId:       string;
  visitorName:  string;
  visitorPhone: string;
  date:         string;
  timeFrom:     string;
  timeTo:       string;
  purpose:      string;
  status:       PassStatus;
  checkedIn:    boolean;
  checkedInAt?: string;
  qrCode:       string;
  createdAt:    string;
  host?: { id: string; name: string; avatarUrl?: string };
}

// ── Chores ──────────────────────────────────────────────────────
export interface ChoreLog {
  id:        string;
  choreId:   string;
  userId:    string;
  action:    'CLAIMED' | 'UNCLAIMED' | 'COMPLETED';
  note?:     string;
  createdAt: string;
  user?: { name: string };
}

export type ChoreProofStatus = 'PENDING' | 'APPROVED' | 'REJECTED';

export interface Chore {
  id:          string;
  icon:        string;
  name:        string;
  description: string;
  frequency:   string;
  block:       string;
  claimedById?: string;
  doneById?:    string;
  doneAt?:      string;
  proofUrl?:    string | null;
  proofStatus?: ChoreProofStatus | null;
  proofSubmittedAt?: string | null;
  approvalDeadline?: string | null;
  approvedAt?:  string | null;
  approvedById?: string | null;
  adminNote?:   string | null;
  createdAt:    string;
  logs:         ChoreLog[];
}

// ── Wallet ──────────────────────────────────────────────────────
export type TransactionType = 'EARN' | 'REDEEM' | 'ADJUST';

export interface WalletTransaction {
  id:        string;
  walletId:  string;
  type:      TransactionType;
  amount:    number;
  note:      string;
  createdAt: string;
}

export interface WalletData {
  id:           string;
  userId:       string;
  credits:      number;
  transactions: WalletTransaction[];
}

export interface Voucher {
  id:          string;
  name:        string;
  description: string;
  cost:        number;
  icon:        string;
  stock:       number;
  isActive:    boolean;
}

export interface LeaderboardEntry {
  id:      string;
  credits: number;
  user:    { id: string; name: string; avatarUrl?: string };
}

// ── Documents ───────────────────────────────────────────────────
export type DocumentType = 'INVOICE' | 'CONTRACT' | 'LETTER';

export interface ResidentDocument {
  id:            string;
  userId:        string;
  type:          DocumentType;
  period:        string;
  amount?:       string;
  status:        string;
  fileUrl?:      string;
  signedAt?:     string;
  signedByName?: string;
  proofUrl?:     string;
  proofStatus?:  string;   // SUBMITTED | CLEARED | REJECTED
  clearedAt?:    string;
  createdAt:     string;
}

// ── Dashboard ───────────────────────────────────────────────────
export interface DashboardData {
  user:              { id: string; name: string; role: string; avatarUrl?: string };
  allocation?:       import('./auth.types').Allocation;
  wallet?:           import('./auth.types').Wallet;
  openTickets:       MaintenanceTicket[];
  upcomingVisitors:  VisitorPass[];
  pinnedNews:        NewsItem[];
  activeChores:      Chore[];
}
