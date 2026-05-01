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
