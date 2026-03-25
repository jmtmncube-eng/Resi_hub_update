import prisma from '../config/database';
import { AppError } from '../middleware/error.middleware';
import { CreateNewsInput } from '../validators/news.validator';

export async function getAllNews(filter?: string) {
  return prisma.news.findMany({
    where: filter && filter !== 'All' ? { type: filter } : undefined,
    include: { author: { select: { id: true, name: true } } },
    orderBy: [{ pinned: 'desc' }, { createdAt: 'desc' }],
  });
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
