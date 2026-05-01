import prisma from '../config/database';
import { AppError } from '../middleware/error.middleware';
import { CreateNewsInput } from '../validators/news.validator';

export async function getAllNews(filter?: string, userId?: string) {
  const items = await prisma.news.findMany({
    where: filter && filter !== 'All' ? { type: filter } : undefined,
    include: {
      author: { select: { id: true, name: true } },
      reads:  userId ? { where: { userId }, select: { id: true, readAt: true } } : false,
    },
    orderBy: [{ pinned: 'desc' }, { createdAt: 'desc' }],
  });
  // Flatten read flag for the requesting user
  return items.map(item => {
    const reads = (item as any).reads as { id: string; readAt: Date }[] | undefined;
    const { reads: _omit, ...rest } = item as any;
    return { ...rest, read: !!(reads && reads.length > 0) };
  });
}

export async function markNewsRead(newsId: string, userId: string) {
  await prisma.news.findUniqueOrThrow({ where: { id: newsId } }).catch(() => {
    throw new AppError('News item not found', 404);
  });
  await prisma.newsRead.upsert({
    where:  { newsId_userId: { newsId, userId } },
    update: {},
    create: { newsId, userId },
  });
  return { newsId, read: true };
}

export async function markAllNewsRead(userId: string) {
  const all = await prisma.news.findMany({ select: { id: true } });
  if (all.length === 0) return { count: 0 };
  await prisma.newsRead.createMany({
    data: all.map(n => ({ newsId: n.id, userId })),
    skipDuplicates: true,
  });
  return { count: all.length };
}

export async function getNewsById(id: string) {
  const item = await prisma.news.findUnique({
    where: { id },
    include: { author: { select: { id: true, name: true } } },
  });
  if (!item) throw new AppError('News item not found', 404);
  return item;
}

export async function createNews(authorId: string, data: CreateNewsInput) {
  return prisma.news.create({
    data: {
      authorId,
      title:    data.title,
      body:     data.body,
      type:     data.type,
      tag:      data.tag,
      tagColor: data.tagColor ?? '#00CCCC',
      pinned:   data.pinned ?? false,
      date:     data.date,
    },
    include: { author: { select: { id: true, name: true } } },
  });
}

export async function togglePin(id: string) {
  const item = await prisma.news.findUnique({ where: { id } });
  if (!item) throw new AppError('News item not found', 404);
  return prisma.news.update({ where: { id }, data: { pinned: !item.pinned } });
}

export async function deleteNews(id: string) {
  const item = await prisma.news.findUnique({ where: { id } });
  if (!item) throw new AppError('News item not found', 404);
  await prisma.news.delete({ where: { id } });
}
