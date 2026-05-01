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

/** Student uploads base64 proof-of-payment for an invoice */
export async function submitPaymentProof(id: string, userId: string, proofUrl: string) {
  const doc = await prisma.document.findUnique({ where: { id } });
  if (!doc)                  throw new AppError('Document not found', 404);
  if (doc.userId !== userId) throw new AppError('Not authorised', 403);
  if (doc.type !== 'INVOICE') throw new AppError('Only invoices can have payment proof', 400);
  if (doc.proofStatus === 'CLEARED') throw new AppError('Invoice already cleared', 409);

  return prisma.document.update({
    where: { id },
    data:  { proofUrl, proofStatus: 'SUBMITTED' },
  });
}

/** Admin clears an invoice (paid / sponsor payment) */
export async function clearPayment(id: string, adminId: string) {
  const doc = await prisma.document.findUnique({ where: { id } });
  if (!doc) throw new AppError('Document not found', 404);
  if (doc.type !== 'INVOICE') throw new AppError('Only invoices can be cleared', 400);

  return prisma.document.update({
    where: { id },
    data:  {
      status:      'Paid',
      proofStatus: 'CLEARED',
      clearedAt:   new Date(),
      clearedBy:   adminId,
    },
  });
}

/** Admin rejects a proof submission */
export async function rejectPaymentProof(id: string) {
  const doc = await prisma.document.findUnique({ where: { id } });
  if (!doc) throw new AppError('Document not found', 404);

  return prisma.document.update({
    where: { id },
    data:  { proofStatus: 'REJECTED', proofUrl: null },
  });
}

/** Admin fetches all invoices (for payment management) */
export async function getAllInvoices() {
  return prisma.document.findMany({
    where:   { type: 'INVOICE' },
    include: { user: { select: { id: true, name: true, email: true } } },
    orderBy: { createdAt: 'desc' },
  });
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
