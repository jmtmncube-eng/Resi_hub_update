import prisma from '../config/database';
import { AppError } from '../middleware/error.middleware';
import type { NotificationType } from '@prisma/client';

// ============================================================
//  Notification service — the persistent notification centre
// ============================================================
//  Every event that sends a (best-effort) email also drops an in-app
//  notification here, so the bell dropdown is a durable record even
//  when email delivery is off or the user was logged out at the time.
//
//  createNotification / notifyMany are intentionally best-effort: they
//  never throw. A notification failing to write must never break the
//  business action (raising an invoice, approving a chore, etc.) it
//  rode along with — exactly like sendEmail.
// ============================================================

const MAX_LIST = 50; // bell dropdown shows the most recent N

interface NewNotification {
  type:  NotificationType;
  title: string;
  body?: string;
  /** In-app route to open on click, e.g. "/documents". */
  link?: string;
}

/** Create one notification for one user. Best-effort — never throws. */
export async function createNotification(userId: string, n: NewNotification): Promise<void> {
  try {
    await prisma.notification.create({
      data: {
        userId,
        type:  n.type,
        title: n.title,
        body:  n.body ?? null,
        link:  n.link ?? null,
      },
    });
  } catch (err) {
    console.error('[notification] create failed:', err);
  }
}

/** Fan a single notification out to many users (e.g. all admins). */
export async function notifyMany(userIds: string[], n: NewNotification): Promise<void> {
  if (userIds.length === 0) return;
  try {
    await prisma.notification.createMany({
      data: userIds.map(userId => ({
        userId,
        type:  n.type,
        title: n.title,
        body:  n.body ?? null,
        link:  n.link ?? null,
      })),
    });
  } catch (err) {
    console.error('[notification] notifyMany failed:', err);
  }
}

/** Recent notifications for a user, newest first. */
export async function listNotifications(userId: string) {
  return prisma.notification.findMany({
    where:   { userId },
    orderBy: { createdAt: 'desc' },
    take:    MAX_LIST,
  });
}

/** Count of unread notifications — drives the bell badge. */
export async function unreadCount(userId: string): Promise<number> {
  return prisma.notification.count({ where: { userId, read: false } });
}

/** Mark one notification read. Scoped to the owner so you can't touch
 *  someone else's row by guessing an id. */
export async function markRead(userId: string, id: string) {
  const notif = await prisma.notification.findUnique({ where: { id } });
  if (!notif || notif.userId !== userId) {
    throw new AppError('Notification not found', 404);
  }
  if (notif.read) return notif;
  return prisma.notification.update({
    where: { id },
    data:  { read: true, readAt: new Date() },
  });
}

/** Mark every unread notification for a user read. Returns the count. */
export async function markAllRead(userId: string): Promise<{ count: number }> {
  const { count } = await prisma.notification.updateMany({
    where: { userId, read: false },
    data:  { read: true, readAt: new Date() },
  });
  return { count };
}
