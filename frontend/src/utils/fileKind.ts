/* ------------------------------------------------------------------
 *  File-URL classification
 * ------------------------------------------------------------------
 *  An uploaded file's URL can be in one of two shapes:
 *    • legacy  — a base64 data URL  ("data:application/pdf;base64,…")
 *    • current — a disk URL         ("/api/uploads/doc-<uuid>.pdf")
 *  storage.service.ts on the backend now produces the disk form, but
 *  older rows may still hold data URLs. These helpers treat both.
 * ------------------------------------------------------------------ */

/** True when the stored file is a PDF (vs. an image). */
export function isPdfUrl(url?: string | null): boolean {
  if (!url) return false;
  if (url.startsWith('data:')) return url.startsWith('data:application/pdf');
  return /\.pdf(\?|#|$)/i.test(url);
}
