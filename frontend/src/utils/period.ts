/**
 * Single source of truth for how rent-period strings are displayed.
 *
 * Periods come from the backend in two shapes for historical reasons:
 *  - "YYYY-MM"  (e.g. "2026-07")  — produced by initiateRentInvoice & bulkCreateInvoices
 *  - "Mon YYYY" (e.g. "Jul 2026") — produced by older seeds and ensureContractForUser
 *
 * Both must render identically in the UI as "Jul 2026". We never want raw
 * numeric months leaking into copy that real humans read.
 */

const MONTHS = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];

export function formatPeriod(period: string | null | undefined): string {
  if (!period) return '—';
  // YYYY-MM
  const m = /^(\d{4})-(\d{2})$/.exec(period);
  if (m) {
    const idx = parseInt(m[2], 10) - 1;
    if (idx >= 0 && idx < 12) return `${MONTHS[idx]} ${m[1]}`;
  }
  // Already pretty (e.g. "Jul 2026", "May 2026", "Feb 2025")
  return period;
}

/** Currency: always "R 4,500" with thousands separators. */
export function formatRand(amount: string | number | null | undefined): string {
  if (amount == null || amount === '') return '—';
  const n = typeof amount === 'string' ? Number(amount) : amount;
  if (!Number.isFinite(n)) return '—';
  return `R${n.toLocaleString()}`;
}
