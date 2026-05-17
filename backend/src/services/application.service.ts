import prisma from '../config/database';
import { AppError } from '../middleware/error.middleware';
import { persistIfDataUrl, deletePersistedFile } from './storage.service';

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
        select: { id: true, type: true, status: true, fileUrl: true, expiresAt: true, createdAt: true },
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

  // Persist each validated data URL to disk → public URL. Stored on the
  // row instead of the multi-MB base64 blob (see storage.service.ts).
  const idDocStored        = persistIfDataUrl(idDoc,        'iddoc')     as string;
  const regProofStored     = persistIfDataUrl(regProof,     'regproof')  as string;
  const fundingProofStored = persistIfDataUrl(fundingProof, 'fundproof') as string;
  const signatureStored    = persistIfDataUrl(signature,    'signature') as string;

  // Capture prior docs' files so we can clean them off disk after the
  // re-submit succeeds (don't orphan the old uploads).
  const priorDocs = await prisma.document.findMany({
    where: {
      userId,
      type: { in: ['ID_DOC', 'PROOF_REGISTRATION', 'PROOF_FUNDING', 'SIGNATURE'] },
    },
    select: { fileUrl: true },
  });

  // Replace any prior application documents (re-submit case)
  await prisma.document.deleteMany({
    where: {
      userId,
      type: { in: ['ID_DOC', 'PROOF_REGISTRATION', 'PROOF_FUNDING', 'SIGNATURE'] },
    },
  });

  const period = `Application ${new Date().getFullYear()}`;

  await prisma.$transaction([
    prisma.document.create({ data: { userId, type: 'ID_DOC',             period, status: 'Submitted', fileUrl: idDocStored } }),
    prisma.document.create({ data: { userId, type: 'PROOF_REGISTRATION', period, status: 'Submitted', fileUrl: regProofStored } }),
    prisma.document.create({ data: { userId, type: 'PROOF_FUNDING',      period, status: 'Submitted', fileUrl: fundingProofStored } }),
    prisma.document.create({ data: { userId, type: 'SIGNATURE',          period, status: 'Submitted', fileUrl: signatureStored } }),
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

  // Re-submit cleanup — the new rows are committed, drop the old files.
  priorDocs.forEach(d => deletePersistedFile(d.fileUrl));

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
    select: { id: true, type: true, status: true, fileUrl: true, expiresAt: true, createdAt: true },
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
  // Persist the validated data URL to disk → public URL on the row.
  const stored = persistIfDataUrl(validated, type.toLowerCase()) as string;

  // Upsert: replace any prior doc of this type, keep history light.
  const priorDocs = await prisma.document.findMany({
    where:  { userId, type: type as ApplicationDocType },
    select: { fileUrl: true },
  });
  await prisma.document.deleteMany({ where: { userId, type: type as ApplicationDocType } });
  const period = `Compliance ${new Date().getFullYear()}`;
  const created = await prisma.document.create({
    data: { userId, type: type as ApplicationDocType, period, status: 'Submitted', fileUrl: stored },
    select: { id: true, type: true, status: true, fileUrl: true, createdAt: true },
  });
  priorDocs.forEach(d => deletePersistedFile(d.fileUrl));

  // Notify admins/managers that a doc is awaiting review. Best-effort —
  // upload must not fail because of email/notification delivery.
  void notifyAdminsOfDocUpload(userId, type as ApplicationDocType).catch(() => { /* logged inside */ });

  return created;
}

async function notifyAdminsOfDocUpload(userId: string, type: ApplicationDocType): Promise<void> {
  const [student, admins] = await Promise.all([
    prisma.user.findUnique({ where: { id: userId }, select: { name: true } }),
    prisma.user.findMany({
      where:  { role: { in: ['ADMIN', 'MANAGER'] }, isActive: true },
      select: { id: true, name: true, email: true },
    }),
  ]);
  if (!student || admins.length === 0) return;
  const { sendEmail }  = await import('./email.service');
  const { notifyMany } = await import('./notification.service');
  const docLabel = DOC_TYPE_LABELS[type];
  await Promise.all(admins.map(a =>
    sendEmail({
      to:       a.email,
      template: 'complianceDocUploaded',
      data:     { adminName: a.name, studentName: student.name, docType: docLabel },
    }),
  ));
  void notifyMany(admins.map(a => a.id), {
    type:  'APPLICATION',
    title: `Compliance doc to review: ${student.name}`,
    body:  `${student.name} uploaded their ${docLabel}.`,
    link:  '/admin/compliance',
  });
}

// Per-doc review verdict (separate from whole-application approve/reject).
// Used by the new admin compliance review page; rejection notifies the
// student so they know to re-upload, with the admin's reason attached.
export async function decideDocument(
  docId: string,
  decision: 'APPROVED' | 'REJECTED',
  adminId: string,
  note?: string,
) {
  const doc = await prisma.document.findUnique({
    where:  { id: docId },
    include: { user: { select: { id: true, name: true, email: true } } },
  });
  if (!doc) throw new AppError('Document not found', 404);
  if (!APPLICATION_DOC_TYPES.includes(doc.type as ApplicationDocType)) {
    throw new AppError('Only compliance documents can be reviewed here', 400);
  }
  if (decision === 'REJECTED' && !note?.trim()) {
    throw new AppError('A rejection reason is required so the student knows what to fix.', 400);
  }
  const updated = await prisma.document.update({
    where: { id: docId },
    data:  {
      status:     decision === 'APPROVED' ? 'Approved' : 'Rejected',
      reviewedAt: new Date(),
      reviewedBy: adminId,
      reviewNote: note?.trim() || null,
    },
    select: { id: true, type: true, status: true, fileUrl: true, reviewedAt: true, reviewNote: true, createdAt: true },
  });
  if (decision === 'REJECTED') {
    // Tell the student (in-app + email) which doc to re-upload and why.
    const docLabel = DOC_TYPE_LABELS[doc.type as ApplicationDocType];
    const { sendEmail }  = await import('./email.service');
    const { createNotification } = await import('./notification.service');
    void sendEmail({
      to:       doc.user.email,
      template: 'complianceDocRejected',
      data:     { name: doc.user.name, docType: docLabel, reason: note!.trim() },
    });
    void createNotification(doc.user.id, {
      type:   'APPLICATION',
      title:  `Your ${docLabel} was rejected`,
      body:   note!.trim(),
      link:   '/profile',
    });
  }
  return updated;
}

const DOC_TYPE_LABELS: Record<ApplicationDocType, string> = {
  ID_DOC:             'ID document',
  PROOF_REGISTRATION: 'Proof of registration',
  PROOF_FUNDING:      'Proof of funding',
  SIGNATURE:          'Signature',
};

// Admin: nudge a student to upload one or more missing compliance docs.
// Sends a single in-app notification + email listing every doc type the
// admin chose to remind about. Defensive: validates the types, and only
// reminds about types the student hasn't already uploaded (so admins
// can't accidentally pester someone whose ID is sitting in review).
export async function sendComplianceReminder(userId: string, types: string[]) {
  if (!Array.isArray(types) || types.length === 0) {
    throw new AppError('At least one document type is required', 400);
  }
  const invalid = types.find(t => !APPLICATION_DOC_TYPES.includes(t as ApplicationDocType));
  if (invalid) throw new AppError(`Unknown document type: ${invalid}`, 400);

  const user = await prisma.user.findUnique({
    where:  { id: userId },
    select: { id: true, name: true, email: true, isActive: true,
              documents: {
                where: { type: { in: types as ApplicationDocType[] } },
                select: { type: true },
              } },
  });
  if (!user) throw new AppError('User not found', 404);
  if (!user.isActive) throw new AppError('Cannot remind a deactivated account', 400);

  // Strip out anything they've ALREADY uploaded — the admin sees an
  // "Uploaded" state on the profile, but they might tick reminder anyway.
  const alreadyHave = new Set(user.documents.map(d => d.type));
  const missing     = types.filter(t => !alreadyHave.has(t as ApplicationDocType));
  if (missing.length === 0) {
    throw new AppError('Nothing to remind — all selected docs are already uploaded.', 400);
  }
  const labels = missing.map(t => DOC_TYPE_LABELS[t as ApplicationDocType]);

  const { sendEmail }          = await import('./email.service');
  const { createNotification } = await import('./notification.service');
  void sendEmail({
    to:       user.email,
    template: 'complianceDocReminder',
    data:     { name: user.name, docTypes: labels },
  });
  void createNotification(user.id, {
    type:  'APPLICATION',
    title: missing.length === 1
      ? `Reminder: please upload your ${labels[0]}`
      : `Reminder: ${missing.length} compliance docs needed`,
    body:  labels.join(' · '),
    link:  '/profile',
  });
  return { remindedTypes: missing };
}

// Admin: every compliance doc currently awaiting review (Submitted status),
// across BOTH pending applicants and active students who re-uploaded.
export async function listDocsAwaitingReview() {
  return prisma.document.findMany({
    where: {
      type:   { in: ['ID_DOC', 'PROOF_REGISTRATION', 'PROOF_FUNDING', 'SIGNATURE'] },
      status: 'Submitted',
    },
    select: {
      id: true, type: true, status: true, fileUrl: true, createdAt: true,
      user: { select: { id: true, name: true, email: true, role: true } },
    },
    orderBy: { createdAt: 'asc' },
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
        select: { id: true, type: true, fileUrl: true, expiresAt: true, createdAt: true },
        orderBy: { createdAt: 'desc' },
      },
    },
    orderBy: { applicationSubmittedAt: 'desc' },
  });
}

// ── Compliance-doc expiry (#14) ────────────────────────────────
// Admin/manager records when a compliance document expires. A daily
// cron then reminds the student (and admins) as the date approaches.
// expiresAt = null clears the expiry. Resetting it also clears the
// reminder throttle so a fresh date re-arms the cron.
export async function setDocExpiry(docId: string, expiresAt: string | null) {
  const doc = await prisma.document.findUnique({ where: { id: docId } });
  if (!doc) throw new AppError('Document not found', 404);
  if (!APPLICATION_DOC_TYPES.includes(doc.type as ApplicationDocType)) {
    throw new AppError('Only compliance documents can have an expiry date', 400);
  }
  let parsed: Date | null = null;
  if (expiresAt) {
    parsed = new Date(expiresAt);
    if (isNaN(parsed.getTime())) throw new AppError('Invalid expiry date', 400);
  }
  return prisma.document.update({
    where: { id: docId },
    data:  { expiresAt: parsed, expiryNotifiedAt: null },
    select: { id: true, type: true, status: true, fileUrl: true, expiresAt: true, createdAt: true },
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
