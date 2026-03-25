import prisma from '../config/database';
import { AppError } from '../middleware/error.middleware';
import { UpdateProfileInput } from '../validators/profile.validator';

export async function getProfile(userId: string) {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    include: {
      allocation: { include: { room: true } },
      wallet: true,
    },
  });
  if (!user) throw new AppError('User not found', 404);
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const { passwordHash: _pw, ...safe } = user;
  return safe;
}

export async function updateProfile(userId: string, data: UpdateProfileInput) {
  const updated = await prisma.user.update({
    where: { id: userId },
    data: {
      ...(data.name       && { name:       data.name }),
      ...(data.phone      !== undefined && { phone:      data.phone }),
      ...(data.bio        !== undefined && { bio:        data.bio }),
      ...(data.university !== undefined && { university: data.university }),
      ...(data.program    !== undefined && { program:    data.program }),
      ...(data.year       !== undefined && { year:       data.year }),
    },
    include: {
      allocation: { include: { room: true } },
      wallet: true,
    },
  });
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const { passwordHash: _pw, ...safe } = updated;
  return safe;
}

export async function updateAvatar(userId: string, avatarUrl: string) {
  const updated = await prisma.user.update({
    where: { id: userId },
    data:  { avatarUrl },
  });
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const { passwordHash: _pw, ...safe } = updated;
  return safe;
}
