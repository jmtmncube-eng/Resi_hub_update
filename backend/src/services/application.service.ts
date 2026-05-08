import prisma from '../config/database';
import { AppError } from '../middleware/error.middleware';

const TYPE_CAPACITY: Record<string, number> = {
  SINGLE: 1, DOUBLE: 2, TRIPLE: 3, QUAD: 4, STUDIO: 1,
};

// ── Application Status ─────────────────────────────────────────
// Returns the pending student's allocation with room details (or null)
// PLUS application metadata + uploaded application docs.
export async function getApplicationStatus(userId: string) {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: {
      id:                     true,
      name:                   true,
      email:                  true,
      role:                   true,
      university:             true,
      program:                true,
      year:                   true,
      idNumber:               true,
      applicationStatus:      true,
      applicationSubmittedAt: true,
      applicationApprovedAt:  true,
      applicationRejectedAt:  true,
      applicationAdminNote:   true,
      createdAt:              true,
      allocation: {
        select: {
          id:        true,
          status:    true,
          moveIn:    true,
          rent:      true,
          createdAt: true,
          room: {
            select: {
              id:     true,
              number: true,
              block:  true,
              type:   true,
              price:  true,
            },
          },
        },
      },
      documents: {
        where: { type: { in: ['ID_DOC', 'PROOF_REGISTRATION', 'PROOF_FUNDING', 'SIGNATURE'] } },
        select: { id: true, type: true, status: true, fileUrl: true, createdAt: true },
        orderBy: { createdAt: 'desc' },
      },
    },
  });

  if (!user) return null;

  return user;
}

// ── Submit application ─────────────────────────────────────────
// Pending student uploads ID + proof of registration + proof of funding
// + signature. Stored as data URLs in the existing Document table.
// Re-submission overwrites previous documents.
export async function submitApplication(userId: string, payload: {
  idNumber:        string;
  idDocUrl:        string;
  regProofUrl:     string;
  fundingProofUrl: string;
  signatureDataUrl:string;
}) {
  const { idNumber, idDocUrl, regProofUrl, fundingProofUrl, signatureDataUrl } = payload;

  // ── Validation ────────────────────────────────────────────────
  if (!/^\d{13}$/.test(idNumber)) {
    throw new AppError('ID number must be exactly 13 digits.', 400);
  }
  for (const [field, val] of Object.entries({ idDocUrl, regProofUrl, fundingProofUrl, signatureDataUrl })) {
    if (!val || typeof val !== 'string' || !val.startsWith('data:')) {
      throw new AppError(`${field} is required and must be a data URL.`, 400);
    }
    // Cap at ~6.5 MB base64 (~5 MB raw)
    if (val.length > 6_500_000) {
      throw new AppError(`${field} is too large (max 5 MB).`, 400);
    }
  }

  const user = await prisma.user.findUnique({ where: { id: userId } });
  if (!user)                              throw new AppError('User not found', 404);
  if (user.role !== 'PENDING_STUDENT')    throw new AppError('Only pending students can submit an application.', 403);
  if (user.applicationStatus === 'APPROVED') {
    throw new AppError('Your application is already approved.', 409);
  }

  // Replace any prior application documents (re-submit case)
  await prisma.document.deleteMany({
    where: {
      userId,
      type: { in: ['ID_DOC', 'PROOF_REGISTRATION', 'PROOF_FUNDING', 'SIGNATURE'] },
    },
  });

  const period = `Application ${new Date().getFullYear()}`;

  await prisma.$transaction([
    prisma.document.create({ data: { userId, type: 'ID_DOC',             period, status: 'Submitted', fileUrl: idDocUrl } }),
    prisma.document.create({ data: { userId, type: 'PROOF_REGISTRATION', period, status: 'Submitted', fileUrl: regProofUrl } }),
    prisma.document.create({ data: { userId, type: 'PROOF_FUNDING',      period, status: 'Submitted', fileUrl: fundingProofUrl } }),
    prisma.document.create({ data: { userId, type: 'SIGNATURE',          period, status: 'Submitted', fileUrl: signatureDataUrl } }),
    prisma.user.update({
      where: { id: userId },
      data: {
        idNumber,
        applicationStatus:      'SUBMITTED',
        applicationSubmittedAt: new Date(),
        applicationRejectedAt:  null,
        applicationAdminNote:   null,
      },
    }),
  ]);

  return getApplicationStatus(userId);
}

// ── Compliance docs (re-upload) ────────────────────────────────
// Active students can append missing ID / proof-of-registration / etc
// AFTER they're already approved — useful for landlord audits or when
// admin asks for a fresh copy. Pending students can also use this to
// update individual docs without re-running the full submitApplication
// flow.

const APPLICATION_DOC_TYPES = ['ID_DOC', 'PROOF_REGISTRATION', 'PROOF_FUNDING', 'SIGNATURE'] as const;
type ApplicationDocType = typeof APPLICATION_DOC_TYPES[number];

export async function getMyApplicationDocs(userId: string) {
  const docs = await prisma.document.findMany({
    where: { userId, type: { in: APPLICATION_DOC_TYPES as unknown as ApplicationDocType[] } },
    select: { id: true, type: true, status: true, fileUrl: true, createdAt: true },
    orderBy: { createdAt: 'desc' },
  });
  // Group by type so the frontend can quickly see which are missing
  const byType: Record<ApplicationDocType, typeof docs[number] | null> = {
    ID_DOC: null, PROOF_REGISTRATION: null, PROOF_FUNDING: null, SIGNATURE: null,
  };
  for (const d of docs) {
    const t = d.type as ApplicationDocType;
    if (!byType[t]) byType[t] = d;        // newest one wins (orderBy desc)
  }
  return byType;
}

export async function uploadApplicationDoc(userId: string, type: string, fileUrl: string) {
  if (!APPLICATION_DOC_TYPES.includes(type as ApplicationDocType)) {
    throw new AppError(`Unknown document type: ${type}`, 400);
  }
  if (!fileUrl || typeof fileUrl !== 'string' || !fileUrl.startsWith('data:')) {
    throw new AppError('fileUrl must be a data URL', 400);
  }
  if (fileUrl.length > 6_500_000) {
    throw new AppError('File is too large (max 5 MB).', 400);
  }

  // Upsert: replace any prior doc of this type, keep history light.
  await prisma.document.deleteMany({ where: { userId, type: type as ApplicationDocType } });
  const period = `Compliance ${new Date().getFullYear()}`;
  return prisma.document.create({
    data: { userId, type: type as ApplicationDocType, period, status: 'Submitted', fileUrl },
    select: { id: true, type: true, status: true, fileUrl: true, createdAt: true },
  });
}

// ── Admin: review applications ─────────────────────────────────
export async function listSubmittedApplications() {
  return prisma.user.findMany({
    where: {
      role: 'PENDING_STUDENT',
      applicationStatus: { in: ['SUBMITTED', 'REJECTED'] },
    },
    select: {
      id:                     true,
      name:                   true,
      email:                  true,
      phone:                  true,
      university:             true,
      program:                true,
      year:                   true,
      idNumber:               true,
      applicationStatus:      true,
      applicationSubmittedAt: true,
      applicationRejectedAt:  true,
      applicationAdminNote:   true,
      createdAt:              true,
      documents: {
        where: { type: { in: ['ID_DOC', 'PROOF_REGISTRATION', 'PROOF_FUNDING', 'SIGNATURE'] } },
        select: { id: true, type: true, fileUrl: true, createdAt: true },
        orderBy: { createdAt: 'desc' },
      },
    },
    orderBy: { applicationSubmittedAt: 'desc' },
  });
}

export async function decideApplication(userId: string, decision: 'APPROVED' | 'REJECTED', note?: string) {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    include: { allocation: true },
  });
  if (!user) throw new AppError('Applicant not found', 404);
  if (user.applicationStatus !== 'SUBMITTED') {
    throw new AppError(`Cannot ${decision.toLowerCase()} — application is ${user.applicationStatus}.`, 400);
  }

  const now = new Date();

  if (decision === 'REJECTED') {
    return prisma.user.update({
      where: { id: userId },
      data:  { applicationStatus: 'REJECTED', applicationRejectedAt: now, applicationAdminNote: note?.trim() || null },
    });
  }

  // APPROVED: also promote to ACTIVE_STUDENT in one step. If they already
  // picked a room (RESERVED allocation), activate it. The lease contract
  // + first rent invoice are provisioned by approveAccount() which is the
  // canonical promote-to-active path; we mirror its behaviour here.
  return prisma.user.update({
    where: { id: userId },
    data: {
      applicationStatus:    'APPROVED',
      applicationApprovedAt: now,
      applicationAdminNote: note?.trim() || null,
      role:                 'ACTIVE_STUDENT',
      ...(user.allocation && user.allocation.status === 'RESERVED' && {
        allocation: {
          update: { status: 'ACTIVE', moveIn: user.allocation.moveIn ?? now },
        },
      }),
    },
  });
}

// ── Browse Rooms ───────────────────────────────────────────────
// Returns rooms with capacity info so students see "X/Y filled" and pick
// any room that still has at least one open slot (not just fully VACANT ones).
export async function getAvailableRooms() {
  const rooms = await prisma.room.findMany({
    where: { status: { in: ['VACANT', 'RESERVED'] } },
    orderBy: [{ block: 'asc' }, { number: 'asc' }],
    include: {
      allocations: {
        where: { status: { in: ['ACTIVE', 'RESERVED'] } },
        select: { id: true },
      },
    },
  });

  return rooms.map(r => {
    const capacity   = r.capacity || TYPE_CAPACITY[r.type] || 1;
    const occupied   = r.allocations.length;
    return {
      id:        r.id,
      number:    r.number,
      block:     r.block,
      type:      r.type,
      price:     r.price,
      status:    r.status,
      capacity,
      occupied,
      vacantSlots: capacity - occupied,
    };
  }).filter(r => r.vacantSlots > 0);
}

/**
 * Pending student self-selects a room. Creates a RESERVED allocation —
 * admin then activates it once they actually move in.
 */
export async function selectRoom(userId: string, roomId: string) {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    include: { allocation: true },
  });
  if (!user) throw new AppError('User not found', 404);
  if (user.allocation) {
    throw new AppError('You already have a room — contact management to change it', 409);
  }

  const room = await prisma.room.findUnique({
    where:   { id: roomId },
    include: { allocations: { where: { status: { in: ['ACTIVE', 'RESERVED'] } } } },
  });
  if (!room) throw new AppError('Room not found', 404);

  const capacity = room.capacity || TYPE_CAPACITY[room.type] || 1;
  if (room.allocations.length >= capacity) {
    throw new AppError('Sorry, that room just filled up — pick another', 409);
  }

  const allocation = await prisma.allocation.create({
    data: {
      userId,
      roomId,
      rent:   room.price,
      status: 'RESERVED',
    },
    include: {
      room: { select: { id: true, number: true, block: true, type: true } },
    },
  });

  // Recompute room status (VACANT → RESERVED, or stay RESERVED)
  const stillHasSlot = (room.allocations.length + 1) < capacity;
  await prisma.room.update({
    where: { id: roomId },
    data:  { status: stillHasSlot ? 'RESERVED' : 'OCCUPIED' },
  });

  return allocation;
}
