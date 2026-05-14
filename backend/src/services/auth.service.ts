import bcrypt from 'bcrypt';
import prisma from '../config/database';
import { signAccessToken, signRefreshToken, verifyRefreshToken } from '../utils/jwt.util';
import { AppError } from '../middleware/error.middleware';
import { LoginInput, RegisterInput } from '../validators/auth.validator';

const SALT_ROUNDS = 12;

export async function loginUser(data: LoginInput) {
  const user = await prisma.user.findUnique({
    where: { email: data.email.toLowerCase() },
    include: {
      allocation: {
        include: { room: true },
      },
    },
  });

  if (!user) {
    throw new AppError('Invalid email or password', 401, 'INVALID_CREDENTIALS');
  }

  const passwordMatch = await bcrypt.compare(data.password, user.passwordHash);
  if (!passwordMatch) {
    throw new AppError('Invalid email or password', 401, 'INVALID_CREDENTIALS');
  }

  // Deactivated accounts can't sign in — admins can re-activate at any time.
  if (!user.isActive) {
    throw new AppError('This account has been deactivated. Contact management.', 403, 'ACCOUNT_DEACTIVATED');
  }

  const tokenPayload = { userId: user.id, role: user.role, email: user.email };
  const accessToken  = signAccessToken(tokenPayload);
  const refreshToken = signRefreshToken(tokenPayload);

  return {
    accessToken,
    refreshToken,
    user: sanitizeUser(user),
  };
}

export async function registerUser(data: RegisterInput) {
  const existing = await prisma.user.findUnique({
    where: { email: data.email.toLowerCase() },
  });

  if (existing) {
    throw new AppError('Email already registered', 409, 'EMAIL_TAKEN');
  }

  const passwordHash = await bcrypt.hash(data.password, SALT_ROUNDS);

  const user = await prisma.user.create({
    data: {
      email:        data.email.toLowerCase(),
      passwordHash,
      name:         data.name,
      role:         'PENDING_STUDENT',
      university:   data.university,
      program:      data.program,
      year:         data.year,
      phone:        data.phone,
    },
  });

  // Create a wallet for the new student
  await prisma.wallet.create({ data: { userId: user.id, credits: 0 } });

  // Notify every active admin that a new applicant just signed up.
  // Best-effort, fire-and-forget — registration must not fail on email.
  void notifyAdminsOfNewApplicant(user).catch(() => { /* logged inside */ });

  const tokenPayload = { userId: user.id, role: user.role, email: user.email };
  const accessToken  = signAccessToken(tokenPayload);
  const refreshToken = signRefreshToken(tokenPayload);

  return {
    accessToken,
    refreshToken,
    user: sanitizeUser(user),
  };
}

async function notifyAdminsOfNewApplicant(applicant: { name: string; email: string }): Promise<void> {
  const { sendEmail } = await import('./email.service');
  const { notifyMany } = await import('./notification.service');
  // Owners + managers both review applications.
  const admins = await prisma.user.findMany({
    where:  { role: { in: ['ADMIN', 'MANAGER'] }, isActive: true },
    select: { id: true, name: true, email: true },
  });
  await Promise.all(admins.map(a =>
    sendEmail({
      to:       a.email,
      template: 'newApplicant',
      data:     { adminName: a.name, applicantName: applicant.name, applicantEmail: applicant.email },
    }),
  ));
  // Durable in-app notification for every admin.
  void notifyMany(admins.map(a => a.id), {
    type:  'APPLICATION',
    title: `New applicant: ${applicant.name}`,
    body:  `${applicant.email} is awaiting review.`,
    link:  '/admin/accounts',
  });
}

export async function refreshTokens(token: string) {
  let payload;
  try {
    payload = verifyRefreshToken(token);
  } catch {
    throw new AppError('Invalid or expired refresh token', 401, 'INVALID_REFRESH_TOKEN');
  }

  const user = await prisma.user.findUnique({ where: { id: payload.userId } });
  if (!user) {
    throw new AppError('User not found', 404, 'USER_NOT_FOUND');
  }

  const tokenPayload = { userId: user.id, role: user.role, email: user.email };
  return {
    accessToken:  signAccessToken(tokenPayload),
    refreshToken: signRefreshToken(tokenPayload),
  };
}

export async function getMe(userId: string) {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    include: {
      allocation: {
        include: { room: true },
      },
      wallet: true,
    },
  });

  if (!user) {
    throw new AppError('User not found', 404, 'USER_NOT_FOUND');
  }

  return sanitizeUser(user);
}

// Strip passwordHash from any user object before sending to client
function sanitizeUser(user: Record<string, unknown>) {
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const { passwordHash: _pw, ...safe } = user;
  return safe;
}
