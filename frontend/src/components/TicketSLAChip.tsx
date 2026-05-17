import { useEffect, useState } from 'react';
import { Clock, AlertTriangle, Timer } from 'lucide-react';
import { getTicketSLA, SLATone } from '../lib/ticketSLA';
import type { MaintenanceTicket } from '../types/domain.types';

/**
 * Small SLA status chip — gold-standard ITSM pattern (Freshdesk,
 * ServiceNow, Zendesk all use this exact shape):
 *
 *   ⏱ 4h          (within 50% of budget — gray, calm)
 *   ⏱ due in 30m  (50–100% of budget — amber, warning)
 *   ⚠ 2d late     (over budget — red, urgent)
 *
 * Re-renders every 60s so the clock ticks live without polling the
 * server. Returns null for RESOLVED / CLOSED tickets.
 */
export function TicketSLAChip({ ticket, compact = false }: { ticket: MaintenanceTicket; compact?: boolean }) {
  // Tick the clock every minute so chips on screen stay current. We
  // bump a counter rather than re-storing `Date.now()` to avoid
  // re-renders cascading into child memos.
  const [, setTick] = useState(0);
  useEffect(() => {
    const id = setInterval(() => setTick(t => t + 1), 60_000);
    return () => clearInterval(id);
  }, []);

  const sla = getTicketSLA(ticket);
  if (!sla) return null;

  const palette: Record<SLATone, { bg: string; fg: string; border: string }> = {
    ok:      { bg: 'rgba(107,114,128,.12)', fg: 'var(--text2)', border: 'rgba(107,114,128,.3)' },
    warn:    { bg: 'rgba(245,158,11,.12)',  fg: '#f59e0b',      border: 'rgba(245,158,11,.4)'  },
    overdue: { bg: 'rgba(239,68,68,.15)',   fg: '#ef4444',      border: 'rgba(239,68,68,.5)'   },
  };
  const Icon = sla.tone === 'overdue' ? AlertTriangle : sla.tone === 'warn' ? Timer : Clock;
  const { bg, fg, border } = palette[sla.tone];

  return (
    <span
      title={sla.tooltip}
      style={{
        display: 'inline-flex', alignItems: 'center', gap: 4,
        padding: compact ? '2px 7px' : '3px 9px',
        borderRadius: 999,
        background: bg,
        color: fg,
        border: `1px solid ${border}`,
        fontSize: compact ? 9 : 10,
        fontWeight: 700,
        fontFamily: "'IBM Plex Mono', monospace",
        whiteSpace: 'nowrap',
        letterSpacing: '.03em',
        textTransform: 'uppercase',
      }}
    >
      <Icon size={compact ? 9 : 10} />
      {sla.label}
    </span>
  );
}
