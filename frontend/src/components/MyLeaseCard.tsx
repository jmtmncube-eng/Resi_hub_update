import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { AxiosError } from 'axios';
import { toast } from 'sonner';
import {
  ScrollText, CalendarClock, Wallet, LogOut, ClipboardCheck, Loader2,
} from 'lucide-react';
import { getMyLease, giveNoticeSelf, LeaseView, DepositStatus } from '../services/lease.service';
import { useConfirm } from './useConfirm';

/**
 * "My lease" card — lives on the student's Profile page.
 * Read-only window onto the lease lifecycle the residence manages:
 * term dates, deposit status, scheduled move-out, and inspection
 * history. The one action a tenant can take is giving notice to vacate.
 */

const DEPOSIT_LABEL: Record<DepositStatus, string> = {
  NONE:               'Not recorded',
  HELD:               'Held',
  PARTIALLY_REFUNDED: 'Partially refunded',
  REFUNDED:           'Refunded',
};

const fmtDate = (iso: string | null) =>
  iso ? new Date(iso).toLocaleDateString(undefined, { day: 'numeric', month: 'short', year: 'numeric' }) : '—';
const fmtR = (v: string | number | null | undefined) =>
  v == null ? '—' : `R${Number(v).toLocaleString()}`;

export default function MyLeaseCard() {
  const qc = useQueryClient();
  const confirm = useConfirm();

  const { data: lease, isLoading } = useQuery({
    queryKey: ['my-lease'],
    queryFn:  getMyLease,
  });

  const notice = useMutation({
    mutationFn: giveNoticeSelf,
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['my-lease'] });
      toast.success('Notice to vacate recorded — management will be in touch.');
    },
    onError: (err: unknown) => {
      const msg = err instanceof AxiosError ? err.response?.data?.error : null;
      toast.error(msg ?? 'Could not record your notice');
    },
  });

  // No allocation yet (pending students, or active student awaiting a room)
  // — skip the card entirely rather than render an empty shell.
  if (!isLoading && !lease) return null;

  async function handleGiveNotice() {
    const ok = await confirm({
      title: 'Give notice to vacate?',
      message: 'This tells management you intend to move out. They will confirm a move-out date with you.',
      confirmLabel: 'Give notice',
      tone: 'rose',
    });
    if (ok) notice.mutate();
  }

  return (
    <div className="card-sm" style={{ padding: '18px 20px' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 14 }}>
        <div style={{
          width: 38, height: 38, borderRadius: 10,
          background: 'rgba(0,204,204,.12)', border: '1px solid rgba(0,204,204,.3)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
        }}>
          <ScrollText size={18} style={{ color: 'var(--cyan)' }} />
        </div>
        <div>
          <p style={{ fontSize: 14, fontWeight: 700, color: 'var(--text)' }}>My lease</p>
          <p style={{ fontSize: 11, color: 'var(--text3)', marginTop: 2 }}>
            {isLoading ? 'Loading…' : 'Your tenancy term, deposit and move-out status'}
          </p>
        </div>
      </div>

      {isLoading || !lease ? (
        <div style={{ padding: 20, display: 'flex', justifyContent: 'center' }}>
          <Loader2 size={18} className="animate-spin" style={{ color: 'var(--cyan)' }} />
        </div>
      ) : (
        <LeaseBody lease={lease} onGiveNotice={handleGiveNotice} givingNotice={notice.isPending} />
      )}
    </div>
  );
}

function LeaseBody({ lease, onGiveNotice, givingNotice }: {
  lease: LeaseView; onGiveNotice: () => void; givingNotice: boolean;
}) {
  const ended      = lease.status === 'ENDED';
  const noticeGiven = !!lease.noticeGivenAt;
  const moveOutSet  = !!lease.moveOutDate;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
      {/* Term */}
      <Row icon={<CalendarClock size={14} style={{ color: 'var(--cyan)' }} />} label="Lease term">
        <span style={{ fontSize: 13, color: 'var(--text)' }}>
          {fmtDate(lease.leaseStart)} → {fmtDate(lease.leaseEnd)}
        </span>
      </Row>

      {/* Deposit */}
      <Row icon={<Wallet size={14} style={{ color: 'var(--cyan)' }} />} label="Deposit">
        <span style={{ fontSize: 13, color: 'var(--text)' }}>
          {fmtR(lease.depositAmount)}
          <span style={{
            marginLeft: 8, fontSize: 10, fontWeight: 700,
            fontFamily: "'IBM Plex Mono', monospace",
            padding: '1px 6px', borderRadius: 4,
            background: lease.depositStatus === 'HELD' ? 'rgba(0,204,204,.12)' : 'rgba(74,222,128,.12)',
            color:      lease.depositStatus === 'HELD' ? 'var(--cyan)' : '#4ade80',
          }}>
            {DEPOSIT_LABEL[lease.depositStatus].toUpperCase()}
          </span>
        </span>
      </Row>
      {lease.depositRefunded != null && (
        <p style={{ fontSize: 11, color: 'var(--text3)', marginTop: -6, marginLeft: 26 }}>
          {fmtR(lease.depositRefunded)} refunded{lease.depositNote ? ` · ${lease.depositNote}` : ''}
        </p>
      )}

      {/* Move-out status */}
      {(noticeGiven || moveOutSet || ended) && (
        <Row icon={<LogOut size={14} style={{ color: 'var(--rose)' }} />} label="Move-out">
          <span style={{ fontSize: 13, color: 'var(--text)' }}>
            {ended
              ? `Completed ${fmtDate(lease.moveOutCompletedAt)}`
              : moveOutSet
                ? `Scheduled for ${fmtDate(lease.moveOutDate)}`
                : `Notice given ${fmtDate(lease.noticeGivenAt)}`}
          </span>
        </Row>
      )}

      {/* Inspections */}
      {lease.inspections.length > 0 && (
        <div style={{ marginTop: 2 }}>
          <p style={{
            fontSize: 10, fontWeight: 700, letterSpacing: '.06em', textTransform: 'uppercase',
            color: 'var(--text3)', fontFamily: "'IBM Plex Mono', monospace", marginBottom: 6,
          }}>
            Inspections
          </p>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
            {lease.inspections.map(ins => (
              <div key={ins.id} style={{
                display: 'flex', alignItems: 'center', gap: 8,
                padding: '7px 10px', borderRadius: 8,
                background: 'var(--bg3)', border: '1px solid var(--border)',
              }}>
                <ClipboardCheck size={13} style={{ color: 'var(--text3)', flexShrink: 0 }} />
                <span style={{ fontSize: 12, color: 'var(--text2)', flex: 1 }}>
                  {ins.type.replace('_', '-').toLowerCase()} · {ins.condition}
                </span>
                <span style={{ fontSize: 10, color: 'var(--text4)', fontFamily: "'IBM Plex Mono', monospace" }}>
                  {fmtDate(ins.inspectedAt)}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Give notice */}
      {!ended && !noticeGiven && (
        <button
          onClick={onGiveNotice}
          disabled={givingNotice}
          className="press-soft"
          style={{
            marginTop: 4, padding: '9px 0', borderRadius: 8,
            background: 'rgba(232,25,122,.08)', color: 'var(--rose)',
            border: '1px solid rgba(232,25,122,.25)',
            fontSize: 12, fontWeight: 600, cursor: 'pointer',
            display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6,
          }}
        >
          {givingNotice ? <Loader2 size={12} className="animate-spin" /> : <LogOut size={12} />}
          Give notice to vacate
        </button>
      )}
      {noticeGiven && !ended && (
        <p style={{
          fontSize: 11, color: 'var(--text3)', textAlign: 'center', marginTop: 2,
          fontFamily: "'IBM Plex Mono', monospace",
        }}>
          Notice on file — management will confirm your move-out date.
        </p>
      )}
    </div>
  );
}

function Row({ icon, label, children }: {
  icon: React.ReactNode; label: string; children: React.ReactNode;
}) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
      <span style={{ display: 'flex', flexShrink: 0 }}>{icon}</span>
      <span style={{ fontSize: 12, color: 'var(--text3)', width: 78, flexShrink: 0 }}>{label}</span>
      <span style={{ flex: 1, minWidth: 0 }}>{children}</span>
    </div>
  );
}
