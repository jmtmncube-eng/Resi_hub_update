import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { TrendingUp, AlertTriangle, CheckCircle2, Clock, Eye, X, Loader2, BarChart3, Send, Calendar } from 'lucide-react';
import { toast } from 'sonner';
import { AxiosError } from 'axios';
import { format } from 'date-fns';
import { getRevenueReport, getAllInvoices, acknowledgePayment, clearPayment, rejectPaymentProof, AdminInvoice } from '../../services/admin.service';
import { useResidence } from '../../contexts/ResidenceContext';
import { bulkCreateInvoices, BulkInvoiceResult } from '../../services/document.service';
import { usePageTitle } from '../../hooks/usePageTitle';
import { formatPeriod, formatRand } from '../../utils/period';
import ConfirmModal from '../../components/ConfirmModal';
import { Modal } from '../../components/Modal';
import { ExportCsvButton } from '../../components/ExportCsvButton';

// Two-step proof clearance — SUBMITTED → ACKNOWLEDGED → CLEARED.
// SUBMITTED  = student uploaded proof; admin to review.
// ACKNOWLEDGED = admin reviewed, looks valid; awaiting bank reconciliation.
// CLEARED    = money confirmed in the bank account; invoice is Paid.
// REJECTED   = proof unclear / wrong; student must re-upload.
const PROOF_LABEL: Record<string, string> = {
  SUBMITTED:    'Proof Submitted',
  ACKNOWLEDGED: 'Pending Bank Confirm',
  CLEARED:      'Cleared',
  REJECTED:     'Rejected',
};
const PROOF_COLOR: Record<string, string> = {
  SUBMITTED:    '#a78bfa',     // purple — needs first look
  ACKNOWLEDGED: '#f59e0b',     // amber  — in flight, waiting on bank
  CLEARED:      'var(--cyan)', // cyan   — done
  REJECTED:     'var(--rose)', // rose   — needs student action
};

export default function AdminPayments() {
  usePageTitle('Payments · Admin');
  const qc = useQueryClient();
  const { selectedId: residenceId } = useResidence();
  const [tab, setTab] = useState<'overview' | 'invoices' | 'late'>('overview');
  // Secondary filter inside the Invoices tab. The "Awaiting Review" /
  // "Pending Bank Confirm" / "Overdue" KPI tiles flip this so the
  // table scopes to just the matching rows — same click-to-filter
  // pattern Stripe uses on the Payments dashboard.
  const [invoiceFilter, setInvoiceFilter] = useState<'all' | 'awaiting' | 'acknowledged' | 'overdue'>('all');
  const [proofModal, setProofModal] = useState<AdminInvoice | null>(null);
  const [clearTarget, setClearTarget] = useState<AdminInvoice | null>(null);
  const [bulkOpen, setBulkOpen] = useState(false);

  function jumpToInvoices(filter: 'all' | 'awaiting' | 'acknowledged' | 'overdue') {
    setInvoiceFilter(filter);
    setTab('invoices');
  }

  const { data: report, isLoading: repLoading } = useQuery({
    queryKey: ['admin-revenue', residenceId],
    queryFn:  () => getRevenueReport(residenceId ?? undefined),
  });

  const { data: invoices = [], isLoading: invLoading } = useQuery({
    queryKey: ['admin-invoices'],
    queryFn:  getAllInvoices,
  });

  // Step 1: acknowledge — student notified, invoice stays Unpaid.
  const ackMut = useMutation({
    mutationFn: (id: string) => acknowledgePayment(id),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['admin-invoices'] });
      qc.invalidateQueries({ queryKey: ['admin-revenue'] });
      setProofModal(null);
      toast.success('Proof received — student notified. Mark as Cleared once funds reflect.');
    },
    onError: () => toast.error('Failed to acknowledge proof.'),
  });

  // Step 2 (or direct): clear — invoice flips to Paid.
  const clearMut = useMutation({
    mutationFn: (id: string) => clearPayment(id),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['admin-invoices'] });
      qc.invalidateQueries({ queryKey: ['admin-revenue'] });
      setClearTarget(null);
      setProofModal(null);
      toast.success('Payment cleared — student notified.');
    },
    onError: () => toast.error('Failed to clear payment.'),
  });

  const rejectMut = useMutation({
    mutationFn: (id: string) => rejectPaymentProof(id),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['admin-invoices'] });
      setProofModal(null);
      toast.success('Proof rejected — student notified.');
    },
    onError: () => toast.error('Failed to reject proof.'),
  });

  const pending      = invoices.filter(i => i.proofStatus === 'SUBMITTED');
  const acknowledged = invoices.filter(i => i.proofStatus === 'ACKNOWLEDGED');
  const overdue      = invoices.filter(i => i.status === 'Overdue' && i.proofStatus !== 'CLEARED');

  return (
    <div className="space-y-6 appear">
      <div style={{ display: 'flex', alignItems: 'flex-end', justifyContent: 'space-between', gap: 16, flexWrap: 'wrap' }}>
        <div>
          <h1 className="page-title">Payments</h1>
          <p className="page-sub">Revenue tracking, proof reviews, and late-payer management</p>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <ExportCsvButton type="invoices" />
          <button
            onClick={() => setBulkOpen(true)}
            className="btn-primary press-soft"
            style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '10px 18px', fontSize: 13 }}
          >
            <Send size={14} />
            Generate invoices
          </button>
        </div>
      </div>

      {/* KPI strip */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(180px, 1fr))', gap: 14 }}>
        <KPI label="Projected Monthly" value={`R${(report?.projectedMonthly ?? 0).toLocaleString()}`} icon={<TrendingUp size={16} />} color="var(--cyan)" loading={repLoading} />
        <KPI label="Awaiting Review"     value={String(pending.length)}      icon={<Clock size={16} />}         color="#a78bfa" loading={invLoading}
             onClick={pending.length > 0 ? () => jumpToInvoices('awaiting') : undefined}
             active={tab === 'invoices' && invoiceFilter === 'awaiting'} />
        <KPI label="Pending Bank Confirm" value={String(acknowledged.length)} icon={<Clock size={16} />}         color="#f59e0b" loading={invLoading}
             onClick={acknowledged.length > 0 ? () => jumpToInvoices('acknowledged') : undefined}
             active={tab === 'invoices' && invoiceFilter === 'acknowledged'} />
        <KPI label="Overdue Invoices"    value={String(overdue.length)}      icon={<AlertTriangle size={16} />} color="var(--rose)" loading={invLoading}
             onClick={overdue.length > 0 ? () => jumpToInvoices('overdue') : undefined}
             active={tab === 'invoices' && invoiceFilter === 'overdue'} />
        <KPI label="Active Students"     value={String(report?.totalActiveStudents ?? '—')} icon={<CheckCircle2 size={16} />} color="var(--cyan)" loading={repLoading} />
      </div>

      {/* Tab switcher */}
      <div style={{ display: 'inline-flex', background: 'var(--bg3)', borderRadius: 10, padding: 4, gap: 2 }}>
        {([
          { key: 'overview',  label: '📊 Revenue'   },
          { key: 'invoices',  label: '📋 Invoices'  },
          { key: 'late',      label: '⚠️ Late Payers' },
        ] as const).map(({ key, label }) => (
          <button
            key={key}
            onClick={() => setTab(key)}
            style={{
              padding: '7px 16px', borderRadius: 7, fontSize: 13, border: 'none', cursor: 'pointer',
              fontWeight: tab === key ? 600 : 400,
              background: tab === key ? 'var(--bg2)' : 'transparent',
              color: tab === key ? 'var(--text)' : 'var(--text3)',
              fontFamily: "'Space Grotesk', sans-serif", transition: 'all .18s',
            }}
          >
            {label}
          </button>
        ))}
      </div>

      {/* Overview tab */}
      {tab === 'overview' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          {repLoading ? (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              {[...Array(4)].map((_, i) => <div key={i} className="skeleton" style={{ height: 52, borderRadius: 8 }} />)}
            </div>
          ) : (report?.monthlyBreakdown ?? []).length === 0 ? (
            <div className="card empty-state">
              <BarChart3 size={28} style={{ color: 'var(--text4)', margin: '0 auto 12px' }} />
              <p style={{ fontWeight: 600, color: 'var(--text2)' }}>No revenue data yet</p>
              <p>Invoice data will appear here once invoices are created</p>
            </div>
          ) : (
            <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
              <div style={{ padding: '14px 18px', borderBottom: '1px solid var(--border)', display: 'flex', gap: 16 }}>
                {(['Period', 'Expected', 'Cleared', 'Submitted', 'Pending'] as const).map(h => (
                  <span key={h} style={{ flex: h === 'Period' ? 2 : 1, fontFamily: "'IBM Plex Mono', monospace", fontSize: 10, color: 'var(--text4)', letterSpacing: '.06em', textTransform: 'uppercase' }}>{h}</span>
                ))}
              </div>
              {(report?.monthlyBreakdown ?? []).map(row => (
                <div key={row.period} style={{ display: 'flex', gap: 16, padding: '13px 18px', borderBottom: '1px solid var(--border)', alignItems: 'center' }}>
                  <span style={{ flex: 2, fontSize: 13, fontWeight: 500, color: 'var(--text)' }}>{formatPeriod(row.period)}</span>
                  <span style={{ flex: 1, fontFamily: "'IBM Plex Mono', monospace", fontSize: 12, color: 'var(--text2)' }}>R{row.expected.toLocaleString()}</span>
                  <span style={{ flex: 1, fontFamily: "'IBM Plex Mono', monospace", fontSize: 12, color: 'var(--cyan)' }}>R{row.cleared.toLocaleString()}</span>
                  <span style={{ flex: 1, fontFamily: "'IBM Plex Mono', monospace", fontSize: 12, color: '#a78bfa' }}>R{row.submitted.toLocaleString()}</span>
                  <span style={{ flex: 1, fontFamily: "'IBM Plex Mono', monospace", fontSize: 12, color: 'var(--rose)' }}>R{row.pending.toLocaleString()}</span>
                </div>
              ))}
            </div>
          )}

          {/* Prediction note */}
          {!repLoading && (
            <div style={{ background: 'rgba(0,204,204,.06)', border: '1px solid rgba(0,204,204,.15)', borderRadius: 10, padding: '12px 16px' }}>
              <p style={{ fontFamily: "'IBM Plex Mono', monospace", fontSize: 11, color: 'var(--text3)' }}>
                📈 Projected monthly revenue based on {report?.totalActiveStudents} active allocations:
                <strong style={{ color: 'var(--cyan)', marginLeft: 6 }}>R{(report?.projectedMonthly ?? 0).toLocaleString()}</strong>
              </p>
            </div>
          )}
        </div>
      )}

      {/* Invoices tab */}
      {tab === 'invoices' && (() => {
        const visible = invoiceFilter === 'awaiting'     ? pending
                      : invoiceFilter === 'acknowledged' ? acknowledged
                      : invoiceFilter === 'overdue'      ? overdue
                      : invoices;
        return (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          {/* Filter banner — shows when arriving here via a KPI tile,
              with a Clear button to drop back to All. */}
          {invoiceFilter !== 'all' && (() => {
            const palette = invoiceFilter === 'awaiting'     ? { bg: 'rgba(167,139,250,.08)', border: 'rgba(167,139,250,.3)', fg: '#a78bfa' }
                          : invoiceFilter === 'acknowledged' ? { bg: 'rgba(245,158,11,.08)',  border: 'rgba(245,158,11,.3)',  fg: '#f59e0b' }
                          :                                    { bg: 'rgba(232,25,122,.06)', border: 'rgba(232,25,122,.3)', fg: 'var(--rose)' };
            const message = invoiceFilter === 'awaiting'
              ? `Showing ${pending.length} invoice${pending.length === 1 ? '' : 's'} awaiting your review`
              : invoiceFilter === 'acknowledged'
                ? `Showing ${acknowledged.length} invoice${acknowledged.length === 1 ? '' : 's'} where you've acknowledged the proof — confirm cleared once funds reflect`
                : `Showing ${overdue.length} overdue invoice${overdue.length === 1 ? '' : 's'}`;
            return (
            <div style={{
              display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap',
              padding: '10px 14px', borderRadius: 8,
              background: palette.bg, border: `1px solid ${palette.border}`,
            }}>
              <span style={{ fontSize: 12, fontWeight: 600, color: palette.fg }}>
                {message}
              </span>
              <span style={{ flex: 1 }} />
              <button
                onClick={() => setInvoiceFilter('all')}
                className="btn-ghost press-soft"
                style={{ padding: '4px 10px', fontSize: 11 }}
              >
                Show all invoices ×
              </button>
            </div>
            );
          })()}

          {invLoading ? (
            [...Array(5)].map((_, i) => <div key={i} className="skeleton" style={{ height: 60, borderRadius: 8 }} />)
          ) : visible.length === 0 ? (
            <div className="card empty-state">
              <p>No invoices found</p>
            </div>
          ) : (
            <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
              {visible.map((inv, idx) => (
                <div
                  key={inv.id}
                  style={{
                    display: 'flex', alignItems: 'center', gap: 14, padding: '12px 18px',
                    borderBottom: idx < visible.length - 1 ? '1px solid var(--border)' : 'none',
                  }}
                >
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <p style={{ fontSize: 13, fontWeight: 500, color: 'var(--text)', marginBottom: 2 }}>{inv.user.name}</p>
                    <p style={{ fontFamily: "'IBM Plex Mono', monospace", fontSize: 11, color: 'var(--text3)' }}>{formatPeriod(inv.period)} · {formatRand(inv.amount)}</p>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    {inv.proofStatus && (
                      <span style={{
                        fontFamily: "'IBM Plex Mono', monospace", fontSize: 10,
                        padding: '2px 8px', borderRadius: 20,
                        background: `${PROOF_COLOR[inv.proofStatus]}18`,
                        color: PROOF_COLOR[inv.proofStatus],
                        border: `1px solid ${PROOF_COLOR[inv.proofStatus]}30`,
                      }}>
                        {PROOF_LABEL[inv.proofStatus] ?? inv.proofStatus}
                      </span>
                    )}
                    <span className={`badge ${inv.status === 'Paid' ? 'badge-cyan' : inv.status === 'Overdue' ? 'badge-rose' : 'badge-gray'}`}>
                      {inv.status}
                    </span>
                    {/* Review button — opens the proof modal where the
                        admin can Acknowledge (step 1) or Clear directly.
                        Shown for SUBMITTED (first review) AND
                        ACKNOWLEDGED (revisit). */}
                    {(inv.proofStatus === 'SUBMITTED' || inv.proofStatus === 'ACKNOWLEDGED') && inv.proofUrl && (
                      <button
                        onClick={() => setProofModal(inv)}
                        style={{ display: 'flex', alignItems: 'center', gap: 4, padding: '5px 10px', borderRadius: 6,
                          background: inv.proofStatus === 'ACKNOWLEDGED' ? 'rgba(245,158,11,.12)' : 'rgba(167,139,250,.12)',
                          border:     `1px solid ${inv.proofStatus === 'ACKNOWLEDGED' ? 'rgba(245,158,11,.25)' : 'rgba(167,139,250,.25)'}`,
                          color:      inv.proofStatus === 'ACKNOWLEDGED' ? '#f59e0b' : '#a78bfa',
                          fontSize: 12, cursor: 'pointer' }}
                      >
                        <Eye size={12} /> Review
                      </button>
                    )}
                    {/* Direct Clear button — for invoices with no proof
                        in the system (sponsor payments, EFT we just
                        confirmed via the bank statement). Always
                        available until the invoice is CLEARED. */}
                    {inv.proofStatus !== 'CLEARED' && (
                      <button
                        onClick={() => setClearTarget(inv)}
                        style={{ display: 'flex', alignItems: 'center', gap: 4, padding: '5px 10px', borderRadius: 6, background: 'rgba(0,204,204,.1)', border: '1px solid rgba(0,204,204,.2)', color: 'var(--cyan)', fontSize: 12, cursor: 'pointer' }}
                      >
                        <CheckCircle2 size={12} /> Clear
                      </button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
        );
      })()}

      {/* Late payers tab */}
      {tab === 'late' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          {repLoading ? (
            [...Array(3)].map((_, i) => <div key={i} className="skeleton" style={{ height: 60, borderRadius: 8 }} />)
          ) : (report?.latePayers ?? []).length === 0 ? (
            <div className="card empty-state">
              <CheckCircle2 size={28} style={{ color: 'var(--cyan)', margin: '0 auto 12px' }} />
              <p style={{ fontWeight: 600, color: 'var(--text2)' }}>No late payers</p>
              <p>All invoices older than 30 days have been cleared</p>
            </div>
          ) : (
            <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
              {(report?.latePayers ?? []).map((lp, idx) => (
                <div
                  key={lp.id}
                  style={{
                    display: 'flex', alignItems: 'center', gap: 14, padding: '14px 18px',
                    borderBottom: idx < (report?.latePayers.length ?? 1) - 1 ? '1px solid var(--border)' : 'none',
                    background: 'rgba(232,25,122,.02)',
                  }}
                >
                  <div style={{ width: 8, height: 8, borderRadius: '50%', background: 'var(--rose)', flexShrink: 0 }} />
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <p style={{ fontSize: 13, fontWeight: 600, color: 'var(--text)' }}>{lp.user.name}</p>
                    <p style={{ fontFamily: "'IBM Plex Mono', monospace", fontSize: 11, color: 'var(--text3)', marginTop: 2 }}>
                      {lp.user.email} · {formatPeriod(lp.period)} · {formatRand(lp.amount)}
                    </p>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    <span style={{ fontFamily: "'IBM Plex Mono', monospace", fontSize: 10, color: 'var(--text3)' }}>
                      Since {format(new Date(lp.createdAt), 'dd MMM yyyy')}
                    </span>
                    <span className="badge badge-rose">{lp.status}</span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Proof review modal */}
      <Modal open={!!proofModal} onClose={() => setProofModal(null)} maxWidth={560}>
        {proofModal && (
          <>
            <div style={{ marginBottom: 18, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div>
                <p style={{ fontFamily: "'IBM Plex Mono', monospace", fontSize: 10, color: 'var(--text3)', letterSpacing: '.06em', marginBottom: 2 }}>PAYMENT PROOF</p>
                <p style={{ fontSize: 15, fontWeight: 700, color: 'var(--text)' }}>{proofModal.user.name} — {formatPeriod(proofModal.period)}</p>
              </div>
              <button onClick={() => setProofModal(null)} style={{ background: 'none', border: 'none', color: 'var(--text3)', cursor: 'pointer', padding: 4 }}>
                <X size={16} />
              </button>
            </div>
            {proofModal.proofUrl ? (
              <img
                src={proofModal.proofUrl}
                alt="Payment proof"
                style={{ width: '100%', maxHeight: 400, objectFit: 'contain', borderRadius: 8, background: 'var(--bg3)', marginBottom: 20 }}
              />
            ) : (
              <div style={{ background: 'var(--bg3)', borderRadius: 8, padding: 40, textAlign: 'center', marginBottom: 20 }}>
                <p style={{ color: 'var(--text3)' }}>No image uploaded</p>
              </div>
            )}
            {/* Current state chip — important context for the admin
                because the action set changes between SUBMITTED and
                ACKNOWLEDGED. */}
            <div style={{
              display: 'flex', alignItems: 'center', gap: 8,
              padding: '8px 12px', borderRadius: 8, marginBottom: 16,
              background: `${PROOF_COLOR[proofModal.proofStatus ?? '']}12`,
              border:     `1px solid ${PROOF_COLOR[proofModal.proofStatus ?? '']}30`,
              fontSize: 12,
            }}>
              <Clock size={13} style={{ color: PROOF_COLOR[proofModal.proofStatus ?? ''] }} />
              <span style={{ color: 'var(--text2)' }}>
                {proofModal.proofStatus === 'ACKNOWLEDGED'
                  ? "You've acknowledged this proof. Confirm cleared once the funds reflect in the residence account."
                  : "Step 1: mark as received once the proof looks valid. Step 2: confirm cleared once funds reflect in the bank."}
              </span>
            </div>
            <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end', flexWrap: 'wrap' }}>
              <button onClick={() => setProofModal(null)} className="btn-ghost" style={{ padding: '9px 18px', fontSize: 13 }}>Close</button>
              <button
                onClick={() => rejectMut.mutate(proofModal.id)}
                disabled={rejectMut.isPending || ackMut.isPending || clearMut.isPending}
                style={{ padding: '9px 18px', fontSize: 13, borderRadius: 8, background: 'rgba(232,25,122,.12)', border: '1px solid rgba(232,25,122,.25)', color: 'var(--rose)', cursor: 'pointer' }}
              >
                {rejectMut.isPending ? <Loader2 size={12} className="animate-spin" /> : 'Reject'}
              </button>
              {/* Step 1 button — only available before acknowledgement */}
              {proofModal.proofStatus === 'SUBMITTED' && (
                <button
                  onClick={() => ackMut.mutate(proofModal.id)}
                  disabled={ackMut.isPending || rejectMut.isPending || clearMut.isPending}
                  style={{ padding: '9px 18px', fontSize: 13, borderRadius: 8, background: 'rgba(245,158,11,.12)', border: '1px solid rgba(245,158,11,.3)', color: '#f59e0b', cursor: 'pointer', display: 'inline-flex', alignItems: 'center', gap: 6 }}
                >
                  {ackMut.isPending ? <Loader2 size={12} className="animate-spin" /> : <Clock size={13} />}
                  Mark received
                </button>
              )}
              {/* Step 2 — confirm cleared. Available from either state. */}
              <button
                onClick={() => setClearTarget(proofModal)}
                disabled={clearMut.isPending || ackMut.isPending || rejectMut.isPending}
                className="btn-primary"
                style={{ padding: '9px 18px', fontSize: 13 }}
              >
                <CheckCircle2 size={14} /> Confirm cleared
              </button>
            </div>
          </>
        )}
      </Modal>

      <ConfirmModal
        open={!!clearTarget}
        title="Clear payment"
        message={`Mark ${clearTarget?.user.name}'s invoice (${formatPeriod(clearTarget?.period)}) as Paid? This can be used for sponsor or direct payments too.`}
        confirmLabel="Clear Payment"
        loading={clearMut.isPending}
        onConfirm={() => clearTarget && clearMut.mutate(clearTarget.id)}
        onCancel={() => setClearTarget(null)}
      />

      {bulkOpen && (
        <BulkInvoiceModal
          onClose={() => setBulkOpen(false)}
          onDone={() => {
            qc.invalidateQueries({ queryKey: ['admin-invoices'] });
            qc.invalidateQueries({ queryKey: ['admin-revenue'] });
          }}
        />
      )}
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────
// BulkInvoiceModal — admin generates invoices for all active students
// ─────────────────────────────────────────────────────────────────

function bulkMonths(): { value: string; label: string }[] {
  const out: { value: string; label: string }[] = [];
  const now = new Date();
  // Two prior months + current + four ahead = 7 buttons in two rows
  for (let i = -2; i <= 4; i++) {
    const d = new Date(now.getFullYear(), now.getMonth() + i, 1);
    const value = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
    const label = d.toLocaleDateString(undefined, { month: 'short', year: 'numeric' });
    out.push({ value, label });
  }
  return out;
}

function BulkInvoiceModal({ onClose, onDone }: { onClose: () => void; onDone: () => void }) {
  const months = bulkMonths();
  const defaultMonth = months[2].value; // current month
  const [period, setPeriod]             = useState(defaultMonth);
  const [includeOwing, setIncludeOwing]   = useState(true);
  // Email notification is OPT-IN: defaults OFF so testing doesn't burn
  // through the Resend monthly quota. Admin ticks the box for real runs.
  const [notifyByEmail, setNotifyByEmail] = useState(false);
  const [result, setResult]               = useState<BulkInvoiceResult | null>(null);

  const generate = useMutation({
    mutationFn: () => bulkCreateInvoices(period, includeOwing, notifyByEmail),
    onSuccess:  (r) => {
      setResult(r);
      onDone();
      if (r.created === 0) toast.message(`No new invoices — all ${r.totalActive} students already have one for ${formatPeriod(r.period)}`);
      else toast.success(`${r.created} invoice${r.created > 1 ? 's' : ''} generated for ${formatPeriod(r.period)}`);
    },
    onError: (err: unknown) => {
      const msg = err instanceof AxiosError ? err.response?.data?.error : null;
      toast.error(msg || 'Failed to generate invoices');
    },
  });

  return (
    <Modal open={true} onClose={onClose} maxWidth={520}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 18 }}>
          <div>
            <p style={{ fontSize: 16, fontWeight: 700, color: 'var(--text)' }}>Generate invoices</p>
            <p style={{ fontSize: 11, color: 'var(--text3)', fontFamily: "'IBM Plex Mono', monospace", marginTop: 2 }}>
              Create rent invoices for every active student in one go
            </p>
          </div>
          <button onClick={onClose} className="btn-ghost" style={{ padding: 6, borderRadius: 8 }} aria-label="Close">
            <X size={14} />
          </button>
        </div>

        {!result ? (
          <>
            <label className="field-label">
              <Calendar size={11} style={{ display: 'inline', marginRight: 4, verticalAlign: 'middle' }} />
              Billing month
            </label>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 6, marginTop: 8, marginBottom: 16 }}>
              {months.map(m => {
                const active = period === m.value;
                return (
                  <button
                    key={m.value}
                    onClick={() => setPeriod(m.value)}
                    className="press-soft"
                    style={{
                      padding: '10px 8px',
                      borderRadius: 8,
                      border: `1px solid ${active ? 'var(--cyan)' : 'var(--border)'}`,
                      background: active ? 'rgba(0,204,204,.08)' : 'var(--bg3)',
                      color: active ? 'var(--text)' : 'var(--text2)',
                      fontSize: 12,
                      fontFamily: "'IBM Plex Mono', monospace",
                      fontWeight: active ? 600 : 400,
                      cursor: 'pointer',
                    }}
                  >
                    {m.label}
                  </button>
                );
              })}
            </div>

            <label
              style={{
                display: 'flex', alignItems: 'flex-start', gap: 10,
                padding: '12px 14px',
                borderRadius: 10,
                background: includeOwing ? 'rgba(232,25,122,.06)' : 'var(--bg3)',
                border: `1px solid ${includeOwing ? 'rgba(232,25,122,.25)' : 'var(--border)'}`,
                cursor: 'pointer',
                marginBottom: 16,
              }}
            >
              <input
                type="checkbox"
                checked={includeOwing}
                onChange={e => setIncludeOwing(e.target.checked)}
                style={{ marginTop: 2, accentColor: 'var(--rose)' }}
              />
              <div>
                <p style={{ fontSize: 13, fontWeight: 600, color: 'var(--text)' }}>
                  Tag students with prior balance owing
                </p>
                <p style={{ fontSize: 11, color: 'var(--text3)', marginTop: 3, lineHeight: 1.5 }}>
                  When on, the new invoice's status notes any unpaid amount carried over so the student sees it at a glance.
                </p>
              </div>
            </label>

            {/* Opt-in email notification — off by default to conserve
                Resend quota during testing. In-app notifications fire
                regardless of this toggle. */}
            <label
              style={{
                display: 'flex', alignItems: 'flex-start', gap: 10,
                padding: '12px 14px',
                borderRadius: 10,
                background: notifyByEmail ? 'rgba(0,204,204,.06)' : 'var(--bg3)',
                border: `1px solid ${notifyByEmail ? 'rgba(0,204,204,.25)' : 'var(--border)'}`,
                cursor: 'pointer',
                marginBottom: 16,
              }}
            >
              <input
                type="checkbox"
                checked={notifyByEmail}
                onChange={e => setNotifyByEmail(e.target.checked)}
                style={{ marginTop: 2, accentColor: 'var(--cyan)' }}
              />
              <div>
                <p style={{ fontSize: 13, fontWeight: 600, color: 'var(--text)' }}>
                  Also email each student
                </p>
                <p style={{ fontSize: 11, color: 'var(--text3)', marginTop: 3, lineHeight: 1.5 }}>
                  Sends an "invoice ready" email via Resend in addition to
                  the in-app bell notification. Leave off during testing to
                  avoid burning your Resend monthly quota.
                </p>
              </div>
            </label>

            <p style={{ fontSize: 11, color: 'var(--text3)', fontFamily: "'IBM Plex Mono', monospace", marginBottom: 16 }}>
              ℹ Students who already have an invoice for {formatPeriod(period)} will be skipped — no duplicates.
            </p>

            <div style={{ display: 'flex', gap: 10 }}>
              <button
                onClick={() => generate.mutate()}
                disabled={generate.isPending}
                className="btn-primary press-soft"
                style={{ flex: 1, padding: '10px 0', fontSize: 13, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6 }}
              >
                {generate.isPending
                  ? <><Loader2 size={13} className="animate-spin" /> Generating…</>
                  : <><Send size={13} /> Generate for {formatPeriod(period)}</>}
              </button>
              <button onClick={onClose} className="btn-ghost" style={{ flex: 1, padding: '10px 0', fontSize: 13 }}>
                Cancel
              </button>
            </div>
          </>
        ) : (
          /* Result summary */
          <div>
            <div style={{
              padding: '20px 16px', marginBottom: 16,
              borderRadius: 12,
              background: 'linear-gradient(135deg, rgba(0,204,204,.10), var(--bg3))',
              border: '1px solid rgba(0,204,204,.25)',
              textAlign: 'center',
            }}>
              <p style={{ fontSize: 36, fontWeight: 700, color: 'var(--cyan)', fontFamily: "'Space Grotesk', sans-serif", lineHeight: 1 }}>
                {result.created}
              </p>
              <p style={{ fontSize: 12, color: 'var(--text2)', marginTop: 6 }}>
                invoice{result.created !== 1 ? 's' : ''} created for {formatPeriod(result.period)}
              </p>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8, marginBottom: 16 }}>
              <Stat label="Skipped (already on file)" value={result.skipped} />
              <Stat label="Active students" value={result.totalActive} />
            </div>

            {result.invoices.length > 0 && (
              <div style={{
                maxHeight: 160, overflowY: 'auto',
                border: '1px solid var(--border)', borderRadius: 8,
                marginBottom: 16,
              }}>
                {result.invoices.map(inv => (
                  <div key={inv.id} style={{
                    display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                    padding: '8px 12px', borderBottom: '1px solid var(--border)',
                    fontSize: 12,
                  }}>
                    <span style={{ color: 'var(--text2)' }}>{inv.userName}</span>
                    <span style={{ fontFamily: "'IBM Plex Mono', monospace", color: 'var(--cyan)' }}>
                      R{Number(inv.amount).toLocaleString()}
                    </span>
                  </div>
                ))}
              </div>
            )}

            <button onClick={onClose} className="btn-primary press-soft" style={{ width: '100%', padding: '10px 0', fontSize: 13 }}>
              Done
            </button>
          </div>
        )}
    </Modal>
  );
}

function Stat({ label, value }: { label: string; value: number }) {
  return (
    <div style={{ padding: '10px 12px', borderRadius: 8, background: 'var(--bg3)', border: '1px solid var(--border)' }}>
      <p style={{ fontSize: 10, color: 'var(--text3)', fontFamily: "'IBM Plex Mono', monospace", textTransform: 'uppercase', letterSpacing: '.05em' }}>{label}</p>
      <p style={{ fontSize: 18, fontWeight: 700, color: 'var(--text)', marginTop: 2 }}>{value}</p>
    </div>
  );
}

function KPI({ label, value, icon, color, loading, onClick, active }: {
  label: string; value: string; icon: React.ReactNode; color: string; loading: boolean;
  onClick?: () => void; active?: boolean;
}) {
  const interactive = !!onClick;
  return (
    <div
      onClick={onClick}
      role={interactive ? 'button' : undefined}
      tabIndex={interactive ? 0 : undefined}
      onKeyDown={interactive ? e => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); onClick(); } } : undefined}
      className={interactive ? 'kpi-card hover-lift press-soft' : 'kpi-card'}
      style={{
        borderTop: `2px solid ${color}`,
        cursor: interactive ? 'pointer' : 'default',
        boxShadow: active ? `inset 0 0 0 1px ${color}` : undefined,
      }}
    >
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 }}>
        <span className="kpi-card-label">{label}</span>
        <span style={{ color, opacity: .8 }}>{icon}</span>
      </div>
      {loading
        ? <div className="skeleton" style={{ height: 28, borderRadius: 4, width: '60%' }} />
        : <span className="kpi-card-value" style={{ color }}>{value}</span>
      }
    </div>
  );
}
