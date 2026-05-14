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
  // Validate + normalise each uploaded file (MIME whitelist, base64
  // integrity, size cap, magic-byte check). Throws AppError on any issue.
  const idDoc       = validateDocDataUrl('ID document',           idDocUrl);
  const regProof    = validateDocDataUrl('Proof of registration', regProofUrl);
  const fundingProof = validateDocDataUrl('Proof of funding',     fundingProofUrl);
  const signature   = validateDocDataUrl('Signature',            signatureDataUrl);

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
    prisma.document.create({ data: { userId, type: 'ID_DOC',             period, status: 'Submitted', fileUrl: idDoc } }),
    prisma.document.create({ data: { userId, type: 'PROOF_REGISTRATION', period, status: 'Submitted', fileUrl: regProof } }),
    prisma.document.create({ data: { userId, type: 'PROOF_FUNDING',      period, status: 'Submitted', fileUrl: fundingProof } }),
    prisma.document.create({ data: { userId, type: 'SIGNATURE',          period, status: 'Submitted', fileUrl: signature } }),
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

// ── Uploaded-file (data URL) hardening ─────────────────────────
// Compliance docs come in as base64 data URLs. Base64 is lossless so
// storage never corrupts the file — but we still validate hard on the
// way in: whitelist the MIME, prove the base64 decodes cleanly (catches
// truncated / malformed uploads), enforce the size cap, and sanity-check
// the file's magic bytes so a renamed / spoofed file is rejected.

const ALLOWED_DOC_MIME = new Set([
  'image/png', 'image/jpeg', 'image/jpg', 'image/webp', 'image/gif',
  'application/pdf',
]);
const MAX_DOC_BYTES = 5 * 1024 * 1024; // 5 MB raw — matches the frontend limit

/**
 * Validate a base64 data URL for a compliance document.
 * Returns the (trimmed) data URL unchanged on success; throws AppError otherwise.
 * Exported for unit testing — it's the security-critical upload gate.
 */
export function validateDocDataUrl(field: string, raw: unknown): string {
  if (typeof raw !== 'string' || raw.length === 0) {
    throw new AppError(`${field} is required.`, 400);
  }
  const val = raw.trim();
  // Strict shape:  data:<mime>;base64,<payload>
  const match = /^data:([a-zA-Z0-9/+.\-]+);base64,([A-Za-z0-9+/=\s]+)$/.exec(val);
  if (!match) {
    throw new AppError(`${field} must be an uploaded file (PDF or image).`, 400);
  }
  const mime = match[1].toLowerCase();
  const b64  = match[2].replace(/\s/g, '');

  if (!ALLOWED_DOC_MIME.has(mime)) {
    throw new AppError(`${field} must be a PDF or image (PNG, JPG, WEBP, GIF) — got "${mime}".`, 400);
  }

  // Decode + integrity check. Base64 of N bytes is deterministic, so
  // re-encoding the decoded buffer must match the original payload —
  // any mismatch means the upload was truncated or tampered with.
  const bytes = Buffer.from(b64, 'base64');
  if (bytes.length === 0 || bytes.toString('base64') !== b64) {
    throw new AppError(`${field} looks truncated or corrupted — please re-upload.`, 400);
  }
  if (bytes.length > MAX_DOC_BYTES) {
    throw new AppError(
      `${field} is too large (${(bytes.length / 1024 / 1024).toFixed(1)} MB). Max 5 MB.`,
      400,
    );
  }

  // Magic-byte sanity check — rejects a file whose real type doesn't
  // match its declared MIME (e.g. an .exe renamed to .pdf).
  const head = bytes.subarray(0, 12);
  if (mime === 'application/pdf') {
    if (head.subarray(0, 5).toString('latin1') !== '%PDF-') {
      throw new AppError(`${field} is not a valid PDF file.`, 400);
    }
  } else {
    // Image magic bytes
    const isPng  = head[0] === 0x89 && head[1] === 0x50 && head[2] === 0x4e && head[3] === 0x47;
    const isJpeg = head[0] === 0xff && head[1] === 0xd8 && head[2] === 0xff;
    const isGif  = head.subarray(0, 3).toString('latin1') === 'GIF';
    const isWebp = head.subarray(0, 4).toString('latin1') === 'RIFF'
                && head.subarray(8, 12).toString('latin1') === 'WEBP';
    if (!isPng && !isJpeg && !isGif && !isWebp) {
      throw new AppError(`${field} is not a valid image file.`, 400);
    }
  }

  return val;
}

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
  // Signatures are always images (drawn on a canvas); ID / proofs may be
  // PDF or image. validateDocDataUrl whitelists both, so a single call
  // covers it — but reject a PDF for the signature slot explicitly.
  const validated = validateDocDataUrl('File', fileUrl);
  if (type === 'SIGNATURE' && validated.startsWith('data:application/pdf')) {
    throw new AppError('Signature must be an image, not a PDF.', 400);
  }

  // Upsert: replace any prior doc of this type, keep history light.
  await prisma.document.deleteMany({ where: { userId, type: type as ApplicationDocType } });
  const period = `Compliance ${new Date().getFullYear()}`;
  return prisma.document.create({
    data: { userId, type: type as ApplicationDocType, period, status: 'Submitted', fileUrl: validated },
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
