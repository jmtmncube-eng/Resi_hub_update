import prisma from '../config/database';
import { AppError } from '../middleware/error.middleware';

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
