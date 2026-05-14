import cron from 'node-cron';
import prisma from '../config/database';
import { bulkCreateInvoices } from '../services/document.service';
import { createNotification, notifyMany } from '../services/notification.service';

// ============================================================
//  Scheduled jobs
// ============================================================
//  A single daily tick (02:00 server time) drives every background
//  job. Each job is independently guarded and idempotent, so a missed
//  run, a double run, or a container restart never causes damage:
//    • auto-invoices  — bulkCreateInvoices skips students who already
//                       have that period's invoice; a "last run" marker
//                       on settings stops same-month re-runs.
//    • doc-expiry     — expiryNotifiedAt de-dupes reminders.
//
//  Every job is wrapped so one failing job never blocks the others.
// ============================================================

/** Schedule the daily tick. Called once from server bootstrap. */
export function startCronJobs(): void {
  // 02:00 every day — quiet hours, low DB contention.
  cron.schedule('0 2 * * *', () => { void runDailyJobs(); });
  console.log('  ⏰ Cron scheduled — daily 02:00 (auto-invoices, doc-expiry reminders)');
}

/** Run every daily job. Exported so it can be triggered manually/in tests. */
export async function runDailyJobs(): Promise<void> {
  await safe('auto-invoices',  autoGenerateInvoices);
  await safe('doc-expiry',     sendDocExpiryReminders);
}

async function safe(name: string, job: () => Promise<void>): Promise<void> {
  try {
    await job();
  } catch (err) {
    console.error(`[cron] ${name} failed:`, err);
  }
}

// ── #13 Recurring invoices ─────────────────────────────────────
/** Raise this month's rent invoices if auto-invoicing is on and today
 *  is the configured day. Idempotent twice over (bulkCreateInvoices
 *  de-dupes per student; the settings marker de-dupes per month). */
export async function autoGenerateInvoices(): Promise<void> {
  const settings = await prisma.residenceSettings.findUnique({ where: { id: 'settings' } });
  if (!settings?.autoInvoiceEnabled) return;

  const today = new Date();
  const day   = Math.min(Math.max(settings.autoInvoiceDay ?? 1, 1), 28);
  if (today.getDate() !== day) return;

  const period = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}`;
  if (settings.autoInvoiceLastRun === period) return;   // already done this month

  const result = await bulkCreateInvoices({ period, includeOwing: true });
  await prisma.residenceSettings.update({
    where: { id: 'settings' },
    data:  { autoInvoiceLastRun: period },
  });
  console.log(`[cron] auto-invoices ${period}: ${result.created} created, ${result.skipped} skipped`);
}

// ── #14 Document-expiry reminders ──────────────────────────────
/** Notify students (and admins) about compliance docs that are expiring
 *  within 30 days or have already expired. expiryNotifiedAt throttles
 *  reminders to at most one per 14 days per document. */
export async function sendDocExpiryReminders(): Promise<void> {
  const now        = new Date();
  const horizon    = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000);
  const reNotifyBefore = new Date(now.getTime() - 14 * 24 * 60 * 60 * 1000);

  const docs = await prisma.document.findMany({
    where: {
      expiresAt: { not: null, lte: horizon },
      OR: [
        { expiryNotifiedAt: null },
        { expiryNotifiedAt: { lte: reNotifyBefore } },
      ],
    },
    select: { id: true, type: true, expiresAt: true, userId: true },
  });
  if (docs.length === 0) return;

  const admins = await prisma.user.findMany({
    where:  { role: { in: ['ADMIN', 'MANAGER'] }, isActive: true },
    select: { id: true },
  });
  const adminIds = admins.map(a => a.id);

  for (const doc of docs) {
    const expired = doc.expiresAt! < now;
    const label   = doc.type.replace(/_/g, ' ').toLowerCase();
    const when    = doc.expiresAt!.toLocaleDateString();

    void createNotification(doc.userId, {
      type:  'GENERAL',
      title: expired ? `Your ${label} has expired` : `Your ${label} expires soon`,
      body:  expired
        ? `It expired on ${when}. Please upload a current copy.`
        : `It expires on ${when}. Please upload a renewed copy.`,
      link:  '/profile',
    });
    void notifyMany(adminIds, {
      type:  'GENERAL',
      title: expired ? `A resident's ${label} has expired` : `A resident's ${label} expires soon`,
      body:  `Document expiry ${when} — review on the Accounts page.`,
      link:  '/admin/accounts',
    });
  }

  await prisma.document.updateMany({
    where: { id: { in: docs.map(d => d.id) } },
    data:  { expiryNotifiedAt: now },
  });
  console.log(`[cron] doc-expiry: ${docs.length} reminder(s) sent`);
}
