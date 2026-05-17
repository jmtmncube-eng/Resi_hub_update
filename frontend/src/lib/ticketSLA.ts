/**
 * Ticket SLA computation — Freshdesk / ServiceNow-style.
 *
 * Two questions per open ticket:
 *   1. How long has it been waiting? (elapsed since createdAt OR last
 *      admin update, whichever is most recent — same clock Freshdesk
 *      uses for "first response" / "next response")
 *   2. Is that within the SLA budget for its priority?
 *
 * Budgets are constants here (not configurable yet); when admins want
 * to tune them per residence we'd move them to ResidenceSettings.
 *
 * Returns null for RESOLVED / CLOSED tickets — the clock stops once
 * the work is done, matching every ITSM tool's convention.
 */

import type { MaintenanceTicket, TicketPriority, TicketStatus, MaintenanceTicketUpdate } from '../types/domain.types';

/** Per-priority SLA budget, in milliseconds.
 *
 * EMERGENCY → flood/gas/electrical → 2 h first touch, must be in
 *   progress same business day. Numbers chosen to match the urgency
 *   most South African residences treat these as.
 * HIGH      → broken lock, hot water out → same-day attention.
 * NORMAL    → leaky tap, lightbulb     → within 24 h.
 * LOW       → cosmetic, scuff marks     → within a working week.
 */
export const SLA_BUDGET_MS: Record<TicketPriority, number> = {
  EMERGENCY:  2 * 60 * 60 * 1000,  // 2 hours
  HIGH:       8 * 60 * 60 * 1000,  // 8 hours
  NORMAL:    24 * 60 * 60 * 1000,  // 1 day
  LOW:       72 * 60 * 60 * 1000,  // 3 days
};

export type SLATone = 'ok' | 'warn' | 'overdue';

export interface SLAState {
  tone:      SLATone;     // ok = within 50%, warn = 50–100%, overdue = >100%
  elapsedMs: number;      // ms since reference timestamp
  budgetMs:  number;      // priority's budget
  remainingMs: number;    // budget - elapsed (negative = overdue by N)
  /** Short label for the chip itself, e.g. "4h", "due in 30m", "2d late". */
  label:     string;
  /** Longer phrase for tooltips / detail header. */
  tooltip:   string;
}

const TERMINAL: TicketStatus[] = ['RESOLVED', 'CLOSED'];

export function getTicketSLA(ticket: MaintenanceTicket, now: Date = new Date()): SLAState | null {
  if (TERMINAL.includes(ticket.status)) return null;

  // Reference clock: latest admin update (status / priority / note) if
  // any, otherwise creation. Mirrors Freshdesk's "next response" SLA
  // which resets on every agent reply.
  const lastUpdate: MaintenanceTicketUpdate | undefined = ticket.updates?.[0]; // newest-first from backend
  const referenceIso = lastUpdate?.createdAt ?? ticket.createdAt;
  const elapsed   = now.getTime() - new Date(referenceIso).getTime();
  const budget    = SLA_BUDGET_MS[ticket.priority] ?? SLA_BUDGET_MS.NORMAL;
  const remaining = budget - elapsed;
  const ratio     = elapsed / budget;

  const tone: SLATone = ratio < 0.5 ? 'ok' : ratio < 1 ? 'warn' : 'overdue';

  // Friendly relative-time formatters
  const fmtShort = (ms: number) => {
    const abs = Math.abs(ms);
    const m = Math.floor(abs / 60_000);
    if (m < 60)         return `${m}m`;
    const h = Math.floor(m / 60);
    if (h < 24)         return `${h}h`;
    const d = Math.floor(h / 24);
    return `${d}d`;
  };

  const label = tone === 'overdue'
    ? `${fmtShort(-remaining)} late`
    : tone === 'warn'
      ? `due in ${fmtShort(remaining)}`
      : fmtShort(elapsed);

  const tooltip = tone === 'overdue'
    ? `Overdue by ${fmtShort(-remaining)} (budget ${fmtShort(budget)} for ${ticket.priority})`
    : tone === 'warn'
      ? `${fmtShort(remaining)} remaining of ${fmtShort(budget)} (${ticket.priority})`
      : `Open ${fmtShort(elapsed)} of ${fmtShort(budget)} budget (${ticket.priority})`;

  return { tone, elapsedMs: elapsed, budgetMs: budget, remainingMs: remaining, label, tooltip };
}
