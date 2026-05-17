import prisma from '../config/database';
import { AppError } from '../middleware/error.middleware';
import { sendEmail } from './email.service';
import { createNotification } from './notification.service';
import { persistIfDataUrl, deletePersistedFile } from './storage.service';

export async function getMyDocuments(userId: string) {
  return prisma.document.findMany({
    where:   { userId },
    orderBy: { createdAt: 'desc' },
  });
}

export async function getDocumentById(id: string, userId: string, role: string) {
  const doc = await prisma.document.findUnique({ where: { id } });
  if (!doc) throw new AppError('Document not found', 404);
  if (role !== 'ADMIN' && doc.userId !== userId) {
    throw new AppError('Not authorised to access this document', 403);
  }
  return doc;
}

/** Student uploads proof-of-payment (POP) for an invoice. The proof
 *  arrives as a base64 data URL and is persisted to disk — the row
 *  stores the public URL, not the multi-MB blob. */
export async function submitPaymentProof(id: string, userId: string, proofUrl: string) {
  const doc = await prisma.document.findUnique({ where: { id } });
  if (!doc)                  throw new AppError('Document not found', 404);
  if (doc.userId !== userId) throw new AppError('Not authorised', 403);
  if (doc.type !== 'INVOICE') throw new AppError('Only invoices can have payment proof', 400);
  if (doc.proofStatus === 'CLEARED') throw new AppError('Invoice already cleared', 409);

  const storedProof = persistIfDataUrl(proofUrl, 'pop') as string;

  const updated = await prisma.document.update({
    where: { id },
    data:  { proofUrl: storedProof, proofStatus: 'SUBMITTED' },
  });
  // Replacing an earlier proof — drop the superseded file off disk.
  if (doc.proofUrl && doc.proofUrl !== storedProof) deletePersistedFile(doc.proofUrl);
  return updated;
}

/**
 * Admin acknowledges a payment proof — step 1 of the two-step clearance.
 *
 * Admin has reviewed the proof image and it looks legitimate, but the
 * money may not yet reflect in the bank account (EFT takes 1–3 business
 * days). The invoice stays Unpaid but proofStatus flips to ACKNOWLEDGED
 * so the admin queue can distinguish "needs review" from "waiting on
 * bank reconciliation". Student is notified.
 *
 * Step 2 is `clearPayment` — admin sees the money in the account and
 * marks the invoice Paid.
 */
export async function acknowledgePayment(id: string) {
  const doc = await prisma.document.findUnique({
    where:  { id },
    include: { user: { select: { id: true, name: true, email: true } } },
  });
  if (!doc)                              throw new AppError('Document not found', 404);
  if (doc.type !== 'INVOICE')            throw new AppError('Only invoices can be acknowledged', 400);
  if (doc.proofStatus !== 'SUBMITTED')   throw new AppError('Only freshly-submitted proofs can be acknowledged', 400);

  const updated = await prisma.document.update({
    where: { id },
    data:  { proofStatus: 'ACKNOWLEDGED' },
  });

  // Best-effort student notification.
  void sendEmail({
    to:       doc.user.email,
    template: 'paymentProofAcknowledged',
    data:     { name: doc.user.name, period: prettyPeriod(doc.period) },
  });
  void createNotification(doc.user.id, {
    type:  'INVOICE',
    title: `Proof received for ${prettyPeriod(doc.period)}`,
    body:  'Awaiting bank confirmation — your invoice will be marked Paid once the funds reflect.',
    link:  '/documents',
  });

  return updated;
}

/**
 * Admin clears an invoice — step 2 of the two-step clearance, OR a
 * direct one-step clear (used for sponsor payments / cash where there
 * was no proof to acknowledge first). Always notifies the student.
 */
export async function clearPayment(id: string, adminId: string) {
  const doc = await prisma.document.findUnique({
    where:  { id },
    include: { user: { select: { id: true, name: true, email: true } } },
  });
  if (!doc)                       throw new AppError('Document not found', 404);
  if (doc.type !== 'INVOICE')     throw new AppError('Only invoices can be cleared', 400);

  const updated = await prisma.document.update({
    where: { id },
    data:  {
      status:      'Paid',
      proofStatus: 'CLEARED',
      clearedAt:   new Date(),
      clearedBy:   adminId,
    },
  });

  void sendEmail({
    to:       doc.user.email,
    template: 'paymentProofCleared',
    data:     {
      name:   doc.user.name,
      period: prettyPeriod(doc.period),
      amount: String(doc.amount ?? '').replace(/[^0-9.]/g, '') || '0',
    },
  });
  void createNotification(doc.user.id, {
    type:  'INVOICE',
    title: `Payment cleared for ${prettyPeriod(doc.period)}`,
    body:  `Your invoice is now Paid. Thank you!`,
    link:  '/documents',
  });

  return updated;
}

/** Admin rejects a proof submission — student is notified to re-upload. */
export async function rejectPaymentProof(id: string) {
  const doc = await prisma.document.findUnique({
    where:  { id },
    include: { user: { select: { id: true, name: true, email: true } } },
  });
  if (!doc) throw new AppError('Document not found', 404);

  const updated = await prisma.document.update({
    where: { id },
    data:  { proofStatus: 'REJECTED', proofUrl: null },
  });
  // The rejected proof is cleared off the row — clean it off disk too.
  deletePersistedFile(doc.proofUrl);

  void sendEmail({
    to:       doc.user.email,
    template: 'paymentProofRejected',
    data:     { name: doc.user.name, period: prettyPeriod(doc.period) },
  });
  void createNotification(doc.user.id, {
    type:  'INVOICE',
    title: `Proof rejected for ${prettyPeriod(doc.period)}`,
    body:  'Please re-upload a clearer or corrected proof of payment.',
    link:  '/documents',
  });

  return updated;
}

/** Admin fetches all invoices (for payment management) */
export async function getAllInvoices() {
  return prisma.document.findMany({
    where:   { type: 'INVOICE' },
    include: { user: { select: { id: true, name: true, email: true } } },
    orderBy: { createdAt: 'desc' },
  });
}

// ─────────────────────────────────────────────────────────────────
// Contract auto-provisioning
// ─────────────────────────────────────────────────────────────────

/**
 * Ensure an ACTIVE_STUDENT has a (Pending) lease contract document.
 * Idempotent — if one already exists we just return it. Called whenever
 * an allocation goes ACTIVE so every resident has a contract to sign,
 * view, and download.
 */
export async function ensureContractForUser(userId: string) {
  const existing = await prisma.document.findFirst({
    where: { userId, type: 'CONTRACT' },
  });
  if (existing) return existing;

  // Stamp the period with the move-in month for clarity in the UI
  const user = await prisma.user.findUnique({
    where:   { id: userId },
    include: { allocation: true },
  });
  if (!user) throw new AppError('User not found', 404);

  const moveIn = user.allocation?.moveIn ?? new Date();
  const period = moveIn.toLocaleDateString(undefined, { month: 'short', year: 'numeric' });

  return prisma.document.create({
    data: {
      userId,
      type:   'CONTRACT',
      period,
      status: 'Pending',
    },
  });
}

// ─────────────────────────────────────────────────────────────────
// Invoice creation
// ─────────────────────────────────────────────────────────────────

/** Validate "YYYY-MM" period format */
function assertValidPeriod(period: string): void {
  if (!/^\d{4}-(0[1-9]|1[0-2])$/.test(period)) {
    throw new AppError('Period must be in YYYY-MM format', 400);
  }
}

/**
 * Student initiates a rent invoice for a chosen month. Server reads the
 * authoritative rent from their allocation — students can't pick the
 * amount themselves. Idempotent: if an invoice for that period already
 * exists, return it instead of creating a duplicate.
 */
export async function initiateRentInvoice(userId: string, period: string) {
  assertValidPeriod(period);

  const user = await prisma.user.findUnique({
    where: { id: userId },
    include: { allocation: true },
  });
  if (!user) throw new AppError('User not found', 404);
  if (!user.allocation) {
    throw new AppError('You don\'t have an active room allocation yet', 400);
  }

  // De-dupe: one invoice per (user, period)
  const existing = await prisma.document.findFirst({
    where: { userId, type: 'INVOICE', period },
  });
  if (existing) return existing;

  const created = await prisma.document.create({
    data: {
      userId,
      type:   'INVOICE',
      period,
      amount: String(user.allocation.rent),
      status: 'Pending',
    },
  });

  // Notify the student. Best-effort.
  sendEmail({
    to:       user.email,
    template: 'invoiceCreated',
    data:     {
      name:   user.name,
      period: prettyPeriod(period),
      amount: Number(user.allocation.rent).toLocaleString(),
    },
  }).catch(() => { /* logged inside */ });
  void createNotification(userId, {
    type:  'INVOICE',
    title: `New rent invoice — ${prettyPeriod(period)}`,
    body:  `R${Number(user.allocation.rent).toLocaleString()} due. Upload your proof of payment.`,
    link:  '/documents',
  });

  return created;
}

function prettyPeriod(period: string): string {
  const m = /^(\d{4})-(\d{2})$/.exec(period);
  if (!m) return period;
  const months = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
  return `${months[parseInt(m[2], 10) - 1]} ${m[1]}`;
}

interface BulkInvoiceArgs {
  period: string;
  /** When true, also tag the new invoice with the user's prior overdue
   *  balance in the status line so admins/students see what's owing. */
  includeOwing?: boolean;
  /** When true, send each student an email via the existing
   *  `invoiceCreated` template. Off by default so testing doesn't
   *  burn through the Resend monthly quota — admin opts in per run. */
  notifyByEmail?: boolean;
}

interface BulkInvoiceResult {
  period: string;
  created: number;
  skipped: number;
  totalActive: number;
  invoices: Array<{ id: string; userId: string; userName: string; amount: string }>;
}

/**
 * Admin generates rent invoices for ALL active students with an
 * allocation, for a given month. Skips students who already have an
 * invoice for that period. Returns counts so the UI can summarise.
 */
export async function bulkCreateInvoices(args: BulkInvoiceArgs): Promise<BulkInvoiceResult> {
  const { period, includeOwing = false, notifyByEmail = false } = args;
  assertValidPeriod(period);

  // Active students with a current allocation
  const students = await prisma.user.findMany({
    where: { role: 'ACTIVE_STUDENT', allocation: { isNot: null } },
    include: { allocation: true },
  });

  // Existing invoices for this period — to skip duplicates
  const existing = await prisma.document.findMany({
    where:  { type: 'INVOICE', period, userId: { in: students.map(s => s.id) } },
    select: { userId: true },
  });
  const haveInvoice = new Set(existing.map(e => e.userId));

  // For owing — tally each student's open invoices (Pending / Overdue,
  // not yet cleared) so we can flag carry-over balance.
  let owingByUser = new Map<string, number>();
  if (includeOwing) {
    const open = await prisma.document.findMany({
      where: {
        type: 'INVOICE',
        userId: { in: students.map(s => s.id) },
        proofStatus: { not: 'CLEARED' },
        status: { not: 'Paid' },
      },
      select: { userId: true, amount: true },
    });
    owingByUser = open.reduce((acc, doc) => {
      const n = Number(doc.amount ?? 0);
      acc.set(doc.userId, (acc.get(doc.userId) ?? 0) + (Number.isFinite(n) ? n : 0));
      return acc;
    }, new Map<string, number>());
  }

  const toCreate = students.filter(s => !haveInvoice.has(s.id));

  // Use a transaction so partial failures don't leave half-created state
  const created = await prisma.$transaction(
    toCreate.map(s => {
      const owing = owingByUser.get(s.id) ?? 0;
      const status = includeOwing && owing > 0
        ? `Pending · prior balance R${owing.toLocaleString()}`
        : 'Pending';
      return prisma.document.create({
        data: {
          userId: s.id,
          type:   'INVOICE',
          period,
          amount: String(s.allocation!.rent),
          status,
        },
        select: { id: true, userId: true, amount: true, user: { select: { name: true } } },
      });
    }),
  );

  // In-app notification per student. Best-effort — never blocks the run.
  for (const c of created) {
    void createNotification(c.userId, {
      type:  'INVOICE',
      title: `New rent invoice — ${prettyPeriod(period)}`,
      body:  `R${Number(c.amount ?? 0).toLocaleString()} due. Upload your proof of payment.`,
      link:  '/documents',
    });
  }

  // Email per student — gated by the opt-in flag. Done in parallel with
  // Promise.allSettled so one delivery failure doesn't drop the rest.
  // Each student row already has their email loaded above (`students`).
  if (notifyByEmail && created.length > 0) {
    const studentById = new Map(students.map(s => [s.id, s] as const));
    void Promise.allSettled(created.map(c => {
      const s = studentById.get(c.userId);
      if (!s) return Promise.resolve();
      return sendEmail({
        to:       s.email,
        template: 'invoiceCreated',
        data:     {
          name:   s.name,
          period: prettyPeriod(period),
          amount: Number(c.amount ?? 0).toLocaleString(),
        },
      });
    }));
  }

  return {
    period,
    created:     created.length,
    skipped:     students.length - created.length,
    totalActive: students.length,
    invoices:    created.map(c => ({
      id: c.id, userId: c.userId, amount: c.amount ?? '0', userName: c.user.name,
    })),
  };
}

export async function signDocument(id: string, userId: string, signedByName: string) {
  const doc = await prisma.document.findUnique({ where: { id } });
  if (!doc)              throw new AppError('Document not found', 404);
  if (doc.userId !== userId) throw new AppError('Not authorised', 403);
  if (doc.type !== 'CONTRACT') throw new AppError('Only contracts can be signed', 400);
  if (doc.status === 'Signed')  throw new AppError('Contract already signed', 409);

  return prisma.document.update({
    where: { id },
    data: {
      status:       'Signed',
      signedAt:     new Date(),
      signedByName: signedByName.trim(),
    },
  });
}
