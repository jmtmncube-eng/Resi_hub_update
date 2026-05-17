/**
 * Password-reset flow.
 *
 * Two-step: `requestReset` issues a single-use token and emails the link;
 * `resetPassword` validates the token + sets a new bcrypt hash.
 *
 * Security choices:
 *   - We always return success on requestReset, even if the email doesn't
 *     exist — prevents account enumeration via the public endpoint.
 *   - Tokens are 32 bytes of CSPRNG, hex-encoded (64 chars).
 *   - 60-minute lifetime. `usedAt` ensures one-time use.
 *   - On successful reset we also revoke any *other* outstanding tokens
 *     for that user so a stolen-but-unused token can't be replayed.
 */

import crypto from 'crypto';
import bcrypt from 'bcrypt';
import prisma from '../config/database';
import { AppError } from '../middleware/error.middleware';
import { sendEmail } from './email.service';

const TOKEN_BYTES       = 32;
const EXPIRES_MINUTES   = 60;
const SALT_ROUNDS       = 12;

function buildResetUrl(token: string): string {
  const appUrl = process.env.APP_URL ?? 'http://localhost:3000';
  return `${appUrl}/reset-password?token=${encodeURIComponent(token)}`;
}

export async function requestReset(email: string): Promise<void> {
  const user = await prisma.user.findUnique({
    where:  { email: email.toLowerCase() },
    select: { id: true, name: true, email: true, isActive: true },
  });

  // Silent no-op for unknown / inactive users — prevents enumeration.
  if (!user || !user.isActive) return;

  const token     = crypto.randomBytes(TOKEN_BYTES).toString('hex');
  const expiresAt = new Date(Date.now() + EXPIRES_MINUTES * 60_000);

  await prisma.passwordResetToken.create({
    data: { userId: user.id, token, expiresAt },
  });

  // Best-effort; if email transport fails, we don't surface it to the
  // caller (would leak which addresses exist). Failure is logged inside
  // the email service.
  await sendEmail({
    to:       user.email,
    template: 'passwordReset',
    data:     { name: user.name, resetUrl: buildResetUrl(token), expiresInMinutes: EXPIRES_MINUTES },
  });
}

export async function resetPassword(token: string, newPassword: string): Promise<void> {
  const row = await prisma.passwordResetToken.findUnique({
    where:   { token },
    include: { user: { select: { id: true, isActive: true } } },
  });

  if (!row || row.usedAt || row.expiresAt < new Date() || !row.user.isActive) {
    throw new AppError('This reset link is invalid or has expired. Request a new one.', 400, 'INVALID_RESET_TOKEN');
  }

  const passwordHash = await bcrypt.hash(newPassword, SALT_ROUNDS);

  await prisma.$transaction([
    prisma.user.update({
      where: { id: row.user.id },
      data:  { passwordHash },
    }),
    prisma.passwordResetToken.update({
      where: { id: row.id },
      data:  { usedAt: new Date() },
    }),
    // Revoke any other outstanding tokens for this user.
    prisma.passwordResetToken.updateMany({
      where: { userId: row.user.id, usedAt: null, id: { not: row.id } },
      data:  { usedAt: new Date() },
    }),
  ]);
}
