/* ------------------------------------------------------------------
 *  Compliance-document expiry helpers
 * ------------------------------------------------------------------
 *  A document's `expiresAt` can be null (no expiry tracked), in the
 *  past (expired), within 30 days (expiring soon), or further out (ok).
 *  The backend cron sends reminders on the same 30-day horizon.
 * ------------------------------------------------------------------ */

export type ExpiryState = 'none' | 'expired' | 'soon' | 'ok';

const DAY = 24 * 60 * 60 * 1000;

function daysUntil(iso: string): number {
  return Math.ceil((new Date(iso).getTime() - Date.now()) / DAY);
}

export function expiryState(iso: string | null | undefined): ExpiryState {
  if (!iso) return 'none';
  const d = daysUntil(iso);
  if (d < 0)  return 'expired';
  if (d <= 30) return 'soon';
  return 'ok';
}

/** Short human label — "Expired 3 Mar", "Expires in 12d", "Expires 3 Mar 2027". */
export function expiryLabel(iso: string | null | undefined): string {
  if (!iso) return '';
  const d    = daysUntil(iso);
  const date = new Date(iso).toLocaleDateString();
  if (d < 0)   return `Expired ${date}`;
  if (d === 0) return 'Expires today';
  if (d <= 30) return `Expires in ${d}d`;
  return `Expires ${date}`;
}

/** Colour token for the expiry state — feeds inline styles. */
export function expiryColor(state: ExpiryState): string {
  switch (state) {
    case 'expired': return '#f87171';
    case 'soon':    return '#f59e0b';
    case 'ok':      return '#4ade80';
    default:        return 'var(--text4)';
  }
}
