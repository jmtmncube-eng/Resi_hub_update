import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { TrendingUp, AlertTriangle, CheckCircle2, Clock, Eye, X, Loader2, BarChart3 } from 'lucide-react';
import { toast } from 'sonner';
import { format } from 'date-fns';
import { getRevenueReport, getAllInvoices, clearPayment, rejectPaymentProof, AdminInvoice } from '../../services/admin.service';
import { usePageTitle } from '../../hooks/usePageTitle';
import ConfirmModal from '../../components/ConfirmModal';

const PROOF_LABEL: Record<string, string> = {
  SUBMITTED: 'Proof Submitted',
  CLEARED:   'Cleared',
  REJECTED:  'Rejected',
};
const PROOF_COLOR: Record<string, string> = {
  SUBMITTED: 'var(--cyan)',
  CLEARED:   'var(--cyan)',
  REJECTED:  'var(--rose)',
};

export default function AdminPayments() {
  usePageTitle('Payments · Admin');
  const qc = useQueryClient();
  const [tab, setTab] = useState<'overview' | 'invoices' | 'late'>('overview');
  const [proofModal, setProofModal] = useState<AdminInvoice | null>(null);
  const [clearTarget, setClearTarget] = useState<AdminInvoice | null>(null);

  const { data: report, isLoading: repLoading } = useQuery({
    queryKey: ['admin-revenue'],
    queryFn:  getRevenueReport,
  });

  const { data: invoices = [], isLoading: invLoading } = useQuery({
    queryKey: ['admin-invoices'],
    queryFn:  getAllInvoices,
  });

  const clearMut = useMutation({
    mutationFn: (id: string) => clearPayment(id),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['admin-invoices'] });
      qc.invalidateQueries({ queryKey: ['admin-revenue'] });
      setClearTarget(null);
      setProofModal(null);
      toast.success('Payment cleared!');
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

  const pending   = invoices.filter(i => i.proofStatus === 'SUBMITTED');
  const overdue   = invoices.filter(i => i.status === 'Overdue' && i.proofStatus !== 'CLEARED');

  return (
    <div className="space-y-6 appear">
      <div>
        <h1 className="page-title">Payments</h1>
        <p className="page-sub">Revenue tracking, proof reviews, and late-payer management</p>
      </div>

      {/* KPI strip */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(180px, 1fr))', gap: 14 }}>
        <KPI label="Projected Monthly" value={`R${(report?.projectedMonthly ?? 0).toLocaleString()}`} icon={<TrendingUp size={16} />} color="var(--cyan)" loading={repLoading} />
        <KPI label="Awaiting Review"   value={String(pending.length)}   icon={<Clock size={16} />}         color="#a78bfa" loading={invLoading} />
        <KPI label="Overdue Invoices"  value={String(overdue.length)}   icon={<AlertTriangle size={16} />} color="var(--rose)" loading={invLoading} />
        <KPI label="Active Students"   value={String(report?.totalActiveStudents ?? '—')} icon={<CheckCircle2 size={16} />} color="var(--cyan)" loading={repLoading} />
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
                  <span style={{ flex: 2, fontSize: 13, fontWeight: 500, color: 'var(--text)' }}>{row.period}</span>
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
      {tab === 'invoices' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          {invLoading ? (
            [...Array(5)].map((_, i) => <div key={i} className="skeleton" style={{ height: 60, borderRadius: 8 }} />)
          ) : invoices.length === 0 ? (
            <div className="card empty-state">
              <p>No invoices found</p>
            </div>
          ) : (
            <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
              {invoices.map((inv, idx) => (
                <div
                  key={inv.id}
                  style={{
                    display: 'flex', alignItems: 'center', gap: 14, padding: '12px 18px',
                    borderBottom: idx < invoices.length - 1 ? '1px solid var(--border)' : 'none',
                  }}
                >
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <p style={{ fontSize: 13, fontWeight: 500, color: 'var(--text)', marginBottom: 2 }}>{inv.user.name}</p>
                    <p style={{ fontFamily: "'IBM Plex Mono', monospace", fontSize: 11, color: 'var(--text3)' }}>{inv.period} · {inv.amount ?? '—'}</p>
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
                    {inv.proofStatus === 'SUBMITTED' && (
                      <button
                        onClick={() => setProofModal(inv)}
                        style={{ display: 'flex', alignItems: 'center', gap: 4, padding: '5px 10px', borderRadius: 6, background: 'rgba(167,139,250,.12)', border: '1px solid rgba(167,139,250,.25)', color: '#a78bfa', fontSize: 12, cursor: 'pointer' }}
                      >
                        <Eye size={12} /> Review
                      </button>
                    )}
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
      )}

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
                      {lp.user.email} · {lp.period} · {lp.amount ?? '—'}
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
      {proofModal && (
        <div className="modal-overlay" onClick={() => setProofModal(null)} style={{ zIndex: 9999 }}>
          <div className="modal-card appear" onClick={e => e.stopPropagation()} style={{ maxWidth: 560, padding: 0, overflow: 'hidden' }}>
            <div style={{ padding: '20px 24px', borderBottom: '1px solid var(--border)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div>
                <p style={{ fontFamily: "'IBM Plex Mono', monospace", fontSize: 10, color: 'var(--text3)', letterSpacing: '.06em', marginBottom: 2 }}>PAYMENT PROOF</p>
                <p style={{ fontSize: 15, fontWeight: 700, color: 'var(--text)' }}>{proofModal.user.name} — {proofModal.period}</p>
              </div>
              <button onClick={() => setProofModal(null)} style={{ background: 'none', border: 'none', color: 'var(--text3)', cursor: 'pointer', padding: 4 }}>
                <X size={16} />
              </button>
            </div>
            <div style={{ padding: 24 }}>
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
              <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end' }}>
                <button onClick={() => setProofModal(null)} className="btn-ghost" style={{ padding: '9px 18px', fontSize: 13 }}>Close</button>
                <button
                  onClick={() => rejectMut.mutate(proofModal.id)}
                  disabled={rejectMut.isPending}
                  style={{ padding: '9px 18px', fontSize: 13, borderRadius: 8, background: 'rgba(232,25,122,.12)', border: '1px solid rgba(232,25,122,.25)', color: 'var(--rose)', cursor: 'pointer' }}
                >
                  {rejectMut.isPending ? <Loader2 size={12} className="animate-spin" /> : 'Reject'}
                </button>
                <button
                  onClick={() => setClearTarget(proofModal)}
                  disabled={clearMut.isPending}
                  className="btn-primary"
                  style={{ padding: '9px 18px', fontSize: 13 }}
                >
                  <CheckCircle2 size={14} /> Approve & Clear
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      <ConfirmModal
        open={!!clearTarget}
        title="Clear payment"
        message={`Mark ${clearTarget?.user.name}'s invoice (${clearTarget?.period}) as Paid? This can be used for sponsor or direct payments too.`}
        confirmLabel="Clear Payment"
        loading={clearMut.isPending}
        onConfirm={() => clearTarget && clearMut.mutate(clearTarget.id)}
        onCancel={() => setClearTarget(null)}
      />
    </div>
  );
}

function KPI({ label, value, icon, color, loading }: { label: string; value: string; icon: React.ReactNode; color: string; loading: boolean }) {
  return (
    <div className="kpi-card" style={{ borderTop: `2px solid ${color}` }}>
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
