import { randomUUID } from 'crypto';
import fs from 'fs';
import path from 'path';
import { AppError } from '../middleware/error.middleware';

// ============================================================
//  Storage service — one place all uploaded files flow through
// ============================================================
//  Files used to be stored two different ways: avatars / ticket photos
//  on disk (multer), but compliance docs and payment proofs as base64
//  data URLs *inside the database row*. The base64-in-DB approach bloats
//  every table scan that touches fileUrl/proofUrl and inflates request
//  bodies. This service unifies on disk storage.
//
//  STORAGE_TYPE selects the backend. Only "local" is implemented; the
//  "s3" branch is a deliberate seam — when a bucket exists, fill in
//  putObject/deleteObject there and nothing upstream has to change,
//  because callers only ever see public URL strings.
// ============================================================

const STORAGE_TYPE = (process.env.STORAGE_TYPE || 'local').toLowerCase();

// Physical directory uploads are written to. Must match the path app.ts
// serves statically. __dirname here is .../src/services (or
// .../dist/services in a prod build) — two levels up is the backend root.
export const UPLOADS_DIR = path.join(__dirname, '..', '..', 'uploads');

// Public URL prefix stored ON the row. /api/uploads (not /uploads)
// because nginx proxies /api/* to the backend — a bare /uploads/... URL
// would resolve against the frontend container and 404 in production.
const PUBLIC_PREFIX = '/api/uploads';

const MIME_EXT: Record<string, string> = {
  'application/pdf': 'pdf',
  'image/png':  'png',
  'image/jpeg': 'jpg',
  'image/jpg':  'jpg',
  'image/webp': 'webp',
  'image/gif':  'gif',
};

// Generous hard ceiling — the per-feature validators (e.g. the 5 MB
// compliance-doc cap) are stricter; this is just a backstop.
const MAX_BYTES = 10 * 1024 * 1024;

fs.mkdirSync(UPLOADS_DIR, { recursive: true });

/** True for a base64 data URL (`data:<mime>;base64,...`). */
export function isDataUrl(v: unknown): v is string {
  return typeof v === 'string' && v.startsWith('data:');
}

/** True for a URL this service has already persisted to disk. */
export function isPersistedUrl(v: unknown): v is string {
  return typeof v === 'string'
    && (v.startsWith('/api/uploads/') || v.startsWith('/uploads/'));
}

/**
 * If `value` is a base64 data URL, decode + write it to disk and return
 * the public URL to store on the row. If it's already a persisted URL,
 * empty, or null/undefined, return it unchanged.
 *
 * Safe to call unconditionally and idempotent on re-runs — that's what
 * lets the data-migration script and the live upload paths share it.
 */
export function persistIfDataUrl(
  value: string | null | undefined,
  prefix: string,
): string | null | undefined {
  if (!value || !isDataUrl(value)) return value;

  const match = /^data:([a-zA-Z0-9/+.\-]+);base64,([A-Za-z0-9+/=\s]+)$/.exec(value.trim());
  if (!match) throw new AppError('Uploaded file is not a valid data URL.', 400);

  const mime = match[1].toLowerCase();
  const ext  = MIME_EXT[mime];
  if (!ext) throw new AppError(`Unsupported file type: ${mime}`, 400);

  const bytes = Buffer.from(match[2].replace(/\s/g, ''), 'base64');
  if (bytes.length === 0) throw new AppError('Uploaded file is empty.', 400);
  if (bytes.length > MAX_BYTES) {
    throw new AppError(`Uploaded file is too large (max ${MAX_BYTES / 1024 / 1024} MB).`, 400);
  }

  if (STORAGE_TYPE !== 'local') {
    // ── S3 seam ──────────────────────────────────────────────────
    // When STORAGE_TYPE=s3: putObject(bucket, `${prefix}-${uuid}.${ext}`,
    // bytes, mime) and return the object's public URL. Intentionally
    // unimplemented until a bucket actually exists.
    throw new AppError(`STORAGE_TYPE="${STORAGE_TYPE}" is not implemented — only "local".`, 500);
  }

  const filename = `${prefix}-${randomUUID()}.${ext}`;
  fs.writeFileSync(path.join(UPLOADS_DIR, filename), bytes);
  return `${PUBLIC_PREFIX}/${filename}`;
}

/**
 * Best-effort delete of a previously persisted file, given the public
 * URL stored on a row. Silently ignores data URLs, external URLs, empty
 * values and already-missing files — callers replacing or clearing a
 * row should never have to wrap this in a try/catch.
 */
export function deletePersistedFile(value: string | null | undefined): void {
  if (!isPersistedUrl(value)) return;

  const filename = path.basename(value);
  const target   = path.join(UPLOADS_DIR, filename);
  // Defensive: never let a crafted ../ in the stored URL escape the dir.
  if (path.dirname(target) !== UPLOADS_DIR) return;

  try {
    fs.unlinkSync(target);
  } catch {
    /* already gone / never written — nothing to do */
  }
}
