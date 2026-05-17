import { Link } from 'react-router-dom';
import { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Bell, CheckCircle2, XCircle, Pin, Image as ImageIcon, Clock, FileDown, Loader2 } from 'lucide-react';
import {
  getAdminStats, AdminStats, getRevenueReport,
} from '../../services/admin.service';
import {
  getChorePendingApprovals, approveChoreProof, rejectChoreProof,
} from '../../services/chore.service';
import { getOpsInsights } from '../../services/ops.service';
import { listContractors, listContractorInvoices } from '../../services/residence.service';
import { getNews } from '../../services/news.service';
import { getTickets } from '../../services/maintenance.service';
import { getTicketSLA } from '../../lib/ticketSLA';
import { usePageTitle } from '../../hooks/usePageTitle';
import { ResiMark } from '../../components/Brand';
import { Modal } from '../../components/Modal';
import { WeatherWidget } from '../../components/WeatherWidget';
import { AnalyticsSection } from '../../components/AnalyticsSection';
import { useResidence } from '../../contexts/ResidenceContext';
import { downloadHealthReportPdf } from '../../utils/pdf';

/** Pull a meaningful error message from an axios-or-other rejection. */
function errMsg(e: unknown, fallback: string): string {
  return (e as { response?: { data?: { error?: string } } })?.response?.data?.error ?? fallback;
}
import { toast } from 'sonner';
import { formatDistanceToNow } from 'date-fns';

export default function AdminOverview() {
  usePageTitle('Admin Overview');
  const qc = useQueryClient();
  const { selectedId: residenceId } = useResidence();
  const [proofPreview, setProofPreview] = useState<string | null>(null);

  const { data: stats, isLoading, isError } = useQuery<AdminStats>({
    queryKey: ['admin-stats', residenceId],
    queryFn: () => getAdminStats(residenceId ?? undefined),
    refetchInterval: 30_000,
  });

  const { data: pendingChores = [] } = useQuery({
    queryKey: ['admin-chore-pending'],
    queryFn: getChorePendingApprovals,
    refetchInterval: 30_000,
  });

  // Pull all OPEN + IN_PROGRESS tickets so we can compute the SLA-breach
  // count. Two batched calls (one per status) — keeps cache shape simple
  // and lets us share the OPEN slice with the sidebar badge cache.
  const { data: openTickets       = [] } = useQuery({
    queryKey: ['admin-tickets', { status: 'OPEN' }],
    queryFn:  () => getTickets({ status: 'OPEN' }),
    refetchInterval: 60_000,
  });
  const { data: inProgressTickets = [] } = useQuery({
    queryKey: ['admin-tickets', { status: 'IN_PROGRESS' }],
    queryFn:  () => getTickets({ status: 'IN_PROGRESS' }),
    refetchInterval: 60_000,
  });
  const slaBreachCount = [...openTickets, ...inProgressTickets].filter(t => {
    const sla = getTicketSLA(t);
    return sla?.tone === 'overdue';
  }).length;
  const slaWarnCount = [...openTickets, ...inProgressTickets].filter(t => {
    const sla = getTicketSLA(t);
    return sla?.tone === 'warn';
  }).length;

  const { data: news = [] } = useQuery({
    queryKey: ['news', 'admin-overview'],
    queryFn: () => getNews(),
  });

  const approveChoreMut = useMutation({
    mutationFn: approveChoreProof,
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['admin-chore-pending'] });
      qc.invalidateQueries({ queryKey: ['chores'] });
      toast.success('Chore approved · student credited +20 🪙');
    },
    onError: (e) => toast.error(errMsg(e, 'Failed to approve chore')),
  });

  const rejectChoreMut = useMutation({
    mutationFn: (id: string) => rejectChoreProof(id, 'Proof not sufficient — please redo and resubmit'),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['admin-chore-pending'] });
      qc.invalidateQueries({ queryKey: ['chores'] });
      toast.success('Chore proof rejected');
    },
    onError: (e) => toast.error(errMsg(e, 'Failed to reject chore')),
  });

  // ── Download full health report PDF ──────────────────────────
  const reportMut = useMutation({
    mutationFn: async () => {
      // Pull the four data sources we don't already have on this page in
      // parallel — stats is already loaded at this point.
      const [ops, revenue, contractors, contractorInvoices] = await Promise.all([
        getOpsInsights(residenceId ?? undefined),
        getRevenueReport(residenceId ?? undefined),
        listContractors(residenceId ?? undefined),
        listContractorInvoices(),
      ]);
      const visibleInvoices = residenceId
        ? contractorInvoices.filter(i => i.contractor?.residenceId === residenceId)
        : contractorInvoices;

      const contractorRows = contractors.map(c => {
        const pending = visibleInvoices.filter(i => i.contractorId === c.id && i.status === 'Pending');
        return {
          name:                 c.name,
          type:                 c.type,
          rate:                 c.rate,
          rateUnit:             c.rateUnit,
          active:               c.active,
          paymentType:          c.paymentType,
          pendingInvoiceCount:  pending.length,
          pendingInvoiceTotal:  pending.reduce((s, i) => s + Number(i.amount), 0),
        };
      });

      downloadHealthReportPdf({
        residenceName: residenceId
          ? (contractors[0]?.residence?.name ?? 'Selected residence')
          : 'All residences (portfolio)',
        generatedAt:   new Date(),
        stats:         stats!,
        ops,
        revenue,
        contractors:   contractorRows,
      });
    },
    onSuccess: () => toast.success('Health report downloaded'),
    onError:   (e) => toast.error(errMsg(e, 'Failed to build report')),
  });

  if (isError) return (
    <p style={{ color: 'var(--rose)', fontSize: 13, padding: 24 }}>Failed to load stats. Is the backend running?</p>
  );

  if (isLoading || !stats) {
    return (
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: 240 }}>
        <div style={{ width: 32, height: 32, border: '2px solid var(--cyan)', borderTopColor: 'transparent', borderRadius: '50%' }} className="animate-spin" />
      </div>
    );
  }

  // Revenue / financial KPIs come FIRST so admin's eye lands there.
  // Student / operational KPIs sit in their own visual group below.
  type CardTone = 'cyan' | 'rose';
  // Slot-level occupancy reflects shared-room utilisation accurately
  // (a half-filled DOUBLE shows up as 50% rather than 0%).
  const occRate = stats.rooms.slotOccupancyRate ?? stats.occupancyRate;
  const occHint = stats.rooms.totalSlots > 0
    ? `${stats.rooms.filledSlots} / ${stats.rooms.totalSlots} bed-slots`
    : `${stats.rooms.vacant} vacant`;
  const revenueCards: Array<{ label: string; value: string | number; note: string; color: CardTone; icon: string }> = [
    // Headline now reflects ACTUAL money cleared in the last 30 days — i.e.
    // it moves when admins clear invoices in Payments. The projected
    // "would collect" figure stays available as a sub-label so the
    // shortfall is still visible at a glance.
    { label: 'Collected (30d)',  value: `R${stats.revenueCollected30d.toLocaleString()}`, note: `of R${stats.monthlyRevenue.toLocaleString()} projected`, color: stats.revenueCollected30d < stats.monthlyRevenue ? 'rose' : 'cyan', icon: '💰' },
    { label: 'Net (Rev − Cost)', value: `R${stats.netMonthly.toLocaleString()}`,     note: `cost R${stats.monthlyTotalCost.toLocaleString()} (ops + contractors)`, color: stats.netMonthly < 0 ? 'rose' : 'cyan', icon: '📈' },
    { label: 'Occupancy',        value: `${occRate}%`,                                note: occHint,                       color: 'cyan', icon: '🏠' },
    { label: 'Active Vouchers',  value: stats.vouchers.active,                        note: 'in reward shop',              color: 'cyan', icon: '🎁' },
  ];
  const operationalCards: Array<{ label: string; value: string | number; note: string; color: CardTone; icon: string; to?: string }> = [
    { label: 'Active Students',  value: stats.students.total,              note: `${stats.students.pending} pending`,    color: 'cyan', icon: '🎓' },
    { label: "Today's Visitors", value: stats.visitors.today,              note: `${stats.visitors.total} total`,        color: 'cyan', icon: '🪪' },
    { label: 'Open Tickets',     value: stats.maintenance.open,            note: `${stats.maintenance.urgent} urgent`,   color: stats.maintenance.urgent > 0 ? 'rose' : 'cyan', icon: '🔧', to: '/admin/maintenance' },
    // SLA breach widget — only renders when there's something to flag,
    // so a clean queue doesn't waste a tile slot. Click → maintenance
    // page filtered to overdue tickets only.
    ...(slaBreachCount > 0 || slaWarnCount > 0 ? [{
      label: 'SLA breach',
      value: slaBreachCount,
      note:  slaWarnCount > 0 ? `${slaWarnCount} due soon` : 'tickets overdue',
      color: 'rose' as const,
      icon:  '⏰',
      to:    '/admin/maintenance?filter=overdue',
    }] : []),
  ];

  const recentNews = news.slice(0, 5);

  return (
    <div className="space-y-6 appear">

      {/* Header — left: title; right: live clock + pending approvals chip */}
      <div style={{ display: 'flex', alignItems: 'flex-end', justifyContent: 'space-between', gap: 16, flexWrap: 'wrap' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
          <ResiMark size={40} />
          <div>
            <h1 className="page-title">Admin Overview</h1>
            <p className="page-sub">Real-time residence statistics</p>
          </div>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12, flexWrap: 'wrap' }}>
          {pendingChores.length > 0 && (
            <span className="badge badge-fill-rose" style={{ fontSize: 11, padding: '6px 12px' }}>
              {pendingChores.length} pending approval{pendingChores.length === 1 ? '' : 's'}
            </span>
          )}
          <button
            onClick={() => reportMut.mutate()}
            disabled={reportMut.isPending}
            className="btn-primary press-soft"
            title="Download a full health report PDF for this residence"
            style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '8px 14px', fontSize: 12 }}
          >
            {reportMut.isPending ? <Loader2 size={13} className="animate-spin" /> : <FileDown size={13} />}
            {reportMut.isPending ? 'Building…' : 'Download report'}
          </button>
          <LiveClock />
        </div>
      </div>

      {/* ── REVENUE & OCCUPANCY (financial) ─────────────────────── */}
      <section>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 10 }}>
          <span style={{ width: 4, height: 14, background: 'var(--cyan)', borderRadius: 2 }} />
          <h2 style={{ fontSize: 12, fontWeight: 700, letterSpacing: '.08em', textTransform: 'uppercase', color: 'var(--text2)', fontFamily: "'IBM Plex Mono', monospace" }}>
            Revenue &amp; Occupancy
          </h2>
        </div>
        <div className="grid grid-cols-2 lg:grid-cols-3 gap-3 stagger">
          {revenueCards.map(c => (
            <div key={c.label} className={`kpi-card ${c.color === 'rose' ? 'rose' : ''}`} style={{ padding: '14px 18px' }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 6 }}>
                <span style={{ fontSize: 18 }}>{c.icon}</span>
                <span className={`badge ${c.color === 'rose' ? 'badge-rose' : 'badge-cyan'}`} style={{ fontSize: 9, padding: '2px 7px' }}>{c.note}</span>
              </div>
              <p style={{ fontSize: 22, fontWeight: 700, lineHeight: 1.1, color: 'var(--text)', fontFamily: "'Space Grotesk', sans-serif", letterSpacing: '-.01em' }}>
                {c.value}
              </p>
              <p className="kpi-card-label" style={{ marginTop: 4, marginBottom: 0, fontSize: 10 }}>{c.label}</p>
            </div>
          ))}
        </div>
      </section>

      {/* ── ANALYTICS (6-month trends) ──────────────────────────── */}
      <AnalyticsSection />

      {/* ── STUDENTS & OPERATIONS ──────────────────────────────── */}
      <section>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 10 }}>
          <span style={{ width: 4, height: 14, background: 'var(--rose)', borderRadius: 2 }} />
          <h2 style={{ fontSize: 12, fontWeight: 700, letterSpacing: '.08em', textTransform: 'uppercase', color: 'var(--text2)', fontFamily: "'IBM Plex Mono', monospace" }}>
            Students &amp; Operations
          </h2>
        </div>
        <div className="grid grid-cols-2 lg:grid-cols-3 gap-3 stagger">
          {operationalCards.map(c => {
            // Cards with a `to` render as <Link> so they navigate; the rest
            // stay as plain divs. The link class strips the underline +
            // colour inheritance so the card looks identical either way.
            const inner = (
              <>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 6 }}>
                  <span style={{ fontSize: 18 }}>{c.icon}</span>
                  <span className={`badge ${c.color === 'rose' ? 'badge-rose' : 'badge-cyan'}`} style={{ fontSize: 9, padding: '2px 7px' }}>{c.note}</span>
                </div>
                <p style={{ fontSize: 22, fontWeight: 700, lineHeight: 1.1, color: 'var(--text)', fontFamily: "'Space Grotesk', sans-serif", letterSpacing: '-.01em' }}>
                  {c.value}
                </p>
                <p className="kpi-card-label" style={{ marginTop: 4, marginBottom: 0, fontSize: 10 }}>{c.label}</p>
              </>
            );
            return c.to ? (
              <Link key={c.label} to={c.to}
                className={`kpi-card hover-lift ${c.color === 'rose' ? 'rose' : ''}`}
                style={{ padding: '14px 18px', textDecoration: 'none', color: 'inherit', display: 'block' }}>
                {inner}
              </Link>
            ) : (
              <div key={c.label} className={`kpi-card ${c.color === 'rose' ? 'rose' : ''}`} style={{ padding: '14px 18px' }}>
                {inner}
              </div>
            );
          })}
        </div>
      </section>

      {/* Two-column: Pending Approvals + System Notifications */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5 stagger">

        {/* Pending Approvals */}
        <div className="card" style={{ padding: '20px 24px' }}>
          <div className="card-header">
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <CheckCircle2 size={14} style={{ color: 'var(--rose)' }} />
              <span className="card-title">Pending Chore Approvals</span>
            </div>
            <Link to="/admin/chores" style={{ fontFamily: "'IBM Plex Mono', monospace", fontSize: 11, color: 'var(--cyan)', textDecoration: 'none' }}>
              Manage chores →
            </Link>
          </div>
          {pendingChores.length === 0 ? (
            <div className="empty-state" style={{ padding: '24px 0' }}>
              <p>Nothing pending — all caught up 🎉</p>
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              {/* Chore proofs (urgent — 24h SLA) */}
              {pendingChores.slice(0, 6).map(ch => {
                const submittedBy = ch.logs?.[0]?.user?.name ?? 'Student';
                const submittedAt = ch.proofSubmittedAt ? new Date(ch.proofSubmittedAt) : null;
                const deadline    = ch.approvalDeadline ? new Date(ch.approvalDeadline) : null;
                const overdue     = deadline ? deadline.getTime() < Date.now() : false;
                return (
                  <div key={ch.id} className="hover-lift" style={{
                    display: 'flex', alignItems: 'center', gap: 12,
                    padding: '10px 12px', borderRadius: 10,
                    background: overdue ? 'rgba(239,68,68,.06)' : 'rgba(232,25,122,.05)',
                    border: `1px solid ${overdue ? 'rgba(239,68,68,.30)' : 'rgba(232,25,122,.18)'}`,
                  }}>
                    {ch.proofUrl ? (
                      <button onClick={() => setProofPreview(ch.proofUrl!)} title="View proof" style={{
                        width: 38, height: 38, borderRadius: 8, padding: 0, border: '1px solid var(--border2)',
                        background: `url(${ch.proofUrl}) center/cover`, cursor: 'zoom-in', flexShrink: 0,
                      }}/>
                    ) : (
                      <span style={{ fontSize: 22 }}>{ch.icon}</span>
                    )}
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <p style={{ fontSize: 13, fontWeight: 600, color: 'var(--text)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                        {ch.icon} {ch.name}
                      </p>
                      <p style={{ fontFamily: "'IBM Plex Mono', monospace", fontSize: 10, color: 'var(--text3)', display: 'flex', alignItems: 'center', gap: 6 }}>
                        <Clock size={10} />
                        {submittedBy} · {submittedAt ? formatDistanceToNow(submittedAt, { addSuffix: true }) : 'just now'}
                        {overdue && <span style={{ color: '#f87171', fontWeight: 600 }}> · OVERDUE</span>}
                      </p>
                    </div>
                    <div style={{ display: 'flex', gap: 6, flexShrink: 0 }}>
                      {ch.proofUrl && (
                        <button
                          onClick={() => setProofPreview(ch.proofUrl!)}
                          title="View photo"
                          style={{
                            background: 'rgba(255,255,255,.04)', border: '1px solid var(--border2)',
                            color: 'var(--text3)', borderRadius: 6, padding: '5px 8px',
                            display: 'inline-flex', alignItems: 'center', cursor: 'pointer',
                          }}
                        >
                          <ImageIcon size={14} />
                        </button>
                      )}
                      <button
                        onClick={() => approveChoreMut.mutate(ch.id)}
                        disabled={approveChoreMut.isPending}
                        title="Approve · credit student"
                        style={{
                          background: 'rgba(74,222,128,.12)', border: '1px solid rgba(74,222,128,.3)',
                          color: '#4ade80', borderRadius: 6, padding: '5px 8px',
                          display: 'inline-flex', alignItems: 'center', cursor: 'pointer',
                        }}
                      >
                        <CheckCircle2 size={14} />
                      </button>
                      <button
                        onClick={() => rejectChoreMut.mutate(ch.id)}
                        disabled={rejectChoreMut.isPending}
                        title="Reject · ask student to redo"
                        style={{
                          background: 'rgba(232,25,122,.10)', border: '1px solid rgba(232,25,122,.3)',
                          color: 'var(--rose)', borderRadius: 6, padding: '5px 8px',
                          display: 'inline-flex', alignItems: 'center', cursor: 'pointer',
                        }}
                      >
                        <XCircle size={14} />
                      </button>
                    </div>
                  </div>
                );
              })}

              {pendingChores.length > 6 && (
                <p style={{ fontFamily: "'IBM Plex Mono', monospace", fontSize: 11, color: 'var(--text3)', textAlign: 'center', padding: 6 }}>
                  +{pendingChores.length - 6} more queued
                </p>
              )}
            </div>
          )}
        </div>

        {/* System Notifications */}
        <div className="card" style={{ padding: '20px 24px' }}>
          <div className="card-header">
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <Bell size={14} style={{ color: 'var(--cyan)' }} />
              <span className="card-title">System Notifications</span>
            </div>
            <Link to="/admin/news" style={{ fontFamily: "'IBM Plex Mono', monospace", fontSize: 11, color: 'var(--cyan)', textDecoration: 'none' }}>
              Compose →
            </Link>
          </div>
          {recentNews.length === 0 ? (
            <div className="empty-state" style={{ padding: '24px 0' }}>
              <p>No notifications yet</p>
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column' }}>
              {recentNews.map(n => (
                <div key={n.id} style={{
                  padding: '10px 0', borderBottom: '1px solid var(--border)',
                  display: 'flex', alignItems: 'flex-start', gap: 10,
                }}>
                  {n.pinned && <Pin size={12} style={{ color: 'var(--rose)', marginTop: 4, flexShrink: 0 }} />}
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 2 }}>
                      <span style={{
                        fontFamily: "'IBM Plex Mono', monospace", fontSize: 9,
                        padding: '2px 7px', borderRadius: 20,
                        background: n.tagColor + '20', color: n.tagColor,
                        textTransform: 'uppercase', letterSpacing: '.04em',
                      }}>
                        {n.tag}
                      </span>
                      <span style={{ fontFamily: "'IBM Plex Mono', monospace", fontSize: 10, color: 'var(--text3)' }}>
                        {n.date}
                      </span>
                    </div>
                    <p style={{ fontSize: 13, fontWeight: 500, color: 'var(--text)', lineHeight: 1.4 }}>
                      {n.title}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Quick actions */}
      <div className="card" style={{ padding: '20px 24px' }}>
        <p className="micro-label" style={{ marginBottom: 14 }}>Quick Actions</p>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          {[
            // Point at the new Residence hub directly — the old standalone
            // /admin/occupancy and /admin/allocations URLs still 302 to here
            // but the redirect adds a flicker. Land users where the page now is.
            { label: 'View Occupancy',  to: '/admin/residence?tab=rooms', icon: '🏠' },
            { label: 'Add Allocation',  to: '/admin/residence?tab=rooms', icon: '➕' },
            { label: 'Urgent Tickets',  to: '/admin/maintenance',         icon: '🔴' },
            { label: 'Manage Accounts', to: '/admin/accounts',            icon: '👤' },
          ].map(a => (
            <Link key={a.label} to={a.to} style={{
              display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 8,
              padding: 14, borderRadius: 10, background: 'var(--hover)',
              border: '1px solid var(--border)', textDecoration: 'none', textAlign: 'center',
              transition: 'all .18s',
            }}
            onMouseEnter={e => {
              (e.currentTarget as HTMLAnchorElement).style.borderColor = 'rgba(0,204,204,.3)';
              (e.currentTarget as HTMLAnchorElement).style.background = 'rgba(0,204,204,.06)';
            }}
            onMouseLeave={e => {
              (e.currentTarget as HTMLAnchorElement).style.borderColor = 'var(--border)';
              (e.currentTarget as HTMLAnchorElement).style.background = 'var(--hover)';
            }}>
              <span style={{ fontSize: 22 }}>{a.icon}</span>
              <span style={{ fontSize: 12, color: 'var(--text2)', fontWeight: 500 }}>{a.label}</span>
            </Link>
          ))}
        </div>
      </div>

      {/* Occupancy progress bar */}
      <div className="card" style={{ padding: '20px 24px' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 14 }}>
          <p className="micro-label" style={{ margin: 0 }}>Bed-slot Occupancy</p>
          <span style={{ fontFamily: "'IBM Plex Mono', monospace", fontSize: 11, color: 'var(--text3)' }}>
            {stats.rooms.filledSlots}/{stats.rooms.totalSlots} slots
          </span>
        </div>
        <div style={{ width: '100%', background: 'var(--bg3)', borderRadius: 6, height: 10, overflow: 'hidden' }}>
          <div style={{
            height: '100%', borderRadius: 6,
            background: 'linear-gradient(90deg, var(--cyan), rgba(0,204,204,.5))',
            width: `${stats.rooms.slotOccupancyRate ?? stats.occupancyRate}%`, transition: 'width .5s ease',
          }} />
        </div>
        <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 8 }}>
          {/* Stays in slot-units to match the headline (top-right) and every
              other occupancy metric on the page. Mixing slot/room counts in
              the same widget confuses the eye. */}
          <span style={{ fontFamily: "'IBM Plex Mono', monospace", fontSize: 10, color: 'var(--text3)' }}>{stats.rooms.filledSlots} slots filled</span>
          <span style={{ fontFamily: "'IBM Plex Mono', monospace", fontSize: 10, color: 'var(--text3)' }}>{stats.rooms.totalSlots - stats.rooms.filledSlots} slots open</span>
        </div>
      </div>

      {/* Proof image preview */}
      <Modal open={!!proofPreview} onClose={() => setProofPreview(null)} maxWidth={720}>
        {proofPreview && (
          <div style={{ position: 'relative' }}>
            <img src={proofPreview} alt="Proof of work" style={{ width: '100%', display: 'block', borderRadius: 8 }} />
            <button onClick={() => setProofPreview(null)} style={{
              position: 'absolute', top: 12, right: 12,
              background: 'rgba(0,0,0,.6)', border: 'none', color: '#fff',
              padding: '8px 14px', borderRadius: 8, cursor: 'pointer',
              fontSize: 12, fontFamily: "'IBM Plex Mono', monospace",
            }}>Close</button>
          </div>
        )}
      </Modal>
    </div>
  );
}

/** Live clock + date + weather — ticks every second so HH:MM:SS feels alive.
 *  Weather widget polls Open-Meteo every 15 minutes (handled internally). */
function LiveClock() {
  const [now, setNow] = useState(() => new Date());
  useEffect(() => {
    const id = setInterval(() => setNow(new Date()), 1000);
    return () => clearInterval(id);
  }, []);

  // Responsive: drop the weather row + shrink minWidth on narrow screens.
  // The wrapper sits inside a flex-wrap header — keeping minWidth low lets
  // it sit next to the title at desktop widths, and float to its own row
  // on phones without forcing horizontal overflow.
  return (
    <div className="rh-live-clock" style={{
      display: 'flex', flexDirection: 'column', alignItems: 'flex-end',
      padding: '8px 14px',
      borderRadius: 10,
      background: 'var(--bg3)',
      border: '1px solid var(--border)',
      lineHeight: 1.1,
      gap: 4,
      flexShrink: 0,
    }}>
      <style>{`
        .rh-live-clock                 { min-width: 200px; }
        @media (max-width: 640px) {
          .rh-live-clock               { min-width: 0; padding: 6px 10px; }
          .rh-live-clock .clock-date   { display: none; }
          .rh-live-clock .clock-weather{ display: none; }
          .rh-live-clock .clock-time   { font-size: 14px; }
        }
      `}</style>
      <span className="clock-time" style={{
        fontFamily: "'IBM Plex Mono', monospace",
        fontSize: 18, fontWeight: 700,
        color: 'var(--cyan)', letterSpacing: '.02em',
      }}>
        {now.toLocaleTimeString(undefined, { hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: false })}
      </span>
      <span className="clock-date" style={{
        fontFamily: "'IBM Plex Mono', monospace",
        fontSize: 10, color: 'var(--text3)', letterSpacing: '.05em',
        textTransform: 'uppercase',
      }}>
        {now.toLocaleDateString(undefined, { weekday: 'short', day: '2-digit', month: 'short', year: 'numeric' })}
      </span>
      <span className="clock-weather" style={{ paddingTop: 4, borderTop: '1px solid var(--border)', width: '100%', display: 'flex', justifyContent: 'flex-end' }}>
        <WeatherWidget />
      </span>
    </div>
  );
}
