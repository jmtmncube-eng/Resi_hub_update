import { Link } from 'react-router-dom';
import { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Bell, CheckCircle2, XCircle, Pin, Image as ImageIcon, Clock } from 'lucide-react';
import {
  getAdminStats, AdminStats,
  getVoucherClaims, approveVoucherClaim, rejectVoucherClaim,
} from '../../services/admin.service';
import {
  getChorePendingApprovals, approveChoreProof, rejectChoreProof,
} from '../../services/chore.service';
import { getNews } from '../../services/news.service';
import { usePageTitle } from '../../hooks/usePageTitle';
import { ResiMark } from '../../components/Brand';
import { Modal } from '../../components/Modal';
import { WeatherWidget } from '../../components/WeatherWidget';
import { useResidence } from '../../contexts/ResidenceContext';

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

  const { data: pendingClaims = [] } = useQuery({
    queryKey: ['admin-claims', 'PENDING'],
    queryFn: () => getVoucherClaims('PENDING'),
    refetchInterval: 30_000,
  });

  const { data: pendingChores = [] } = useQuery({
    queryKey: ['admin-chore-pending'],
    queryFn: getChorePendingApprovals,
    refetchInterval: 30_000,
  });

  const { data: news = [] } = useQuery({
    queryKey: ['news', 'admin-overview'],
    queryFn: () => getNews(),
  });

  const approveMut = useMutation({
    mutationFn: approveVoucherClaim,
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['admin-claims'] });
      qc.invalidateQueries({ queryKey: ['admin-stats'] });
      toast.success('Claim approved');
    },
    onError: (e) => toast.error(errMsg(e, 'Failed to approve')),
  });

  const rejectMut = useMutation({
    mutationFn: (id: string) => rejectVoucherClaim(id, 'Rejected from overview'),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['admin-claims'] });
      toast.success('Claim rejected');
    },
    onError: (e) => toast.error(errMsg(e, 'Failed to reject')),
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
  const revenueCards: Array<{ label: string; value: string | number; note: string; color: CardTone; icon: string }> = [
    { label: 'Monthly Revenue',  value: `R${stats.monthlyRevenue.toLocaleString()}`, note: `${stats.rooms.occupied} occupied`, color: 'cyan', icon: '💰' },
    { label: 'Occupancy Rate',   value: `${stats.occupancyRate}%`,         note: `${stats.rooms.vacant} vacant`,         color: 'cyan', icon: '🏠' },
    { label: 'Active Vouchers',  value: stats.vouchers.active,             note: 'in reward shop',                       color: 'cyan', icon: '🎁' },
  ];
  const operationalCards: Array<{ label: string; value: string | number; note: string; color: CardTone; icon: string }> = [
    { label: 'Active Students',  value: stats.students.total,              note: `${stats.students.pending} pending`,    color: 'cyan', icon: '🎓' },
    { label: "Today's Visitors", value: stats.visitors.today,              note: `${stats.visitors.total} total`,        color: 'cyan', icon: '🪪' },
    { label: 'Open Tickets',     value: stats.maintenance.open,            note: `${stats.maintenance.urgent} urgent`,   color: stats.maintenance.urgent > 0 ? 'rose' : 'cyan', icon: '🔧' },
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
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          {(pendingClaims.length + pendingChores.length) > 0 && (
            <span className="badge badge-fill-rose" style={{ fontSize: 11, padding: '6px 12px' }}>
              {pendingClaims.length + pendingChores.length} pending approval{(pendingClaims.length + pendingChores.length) === 1 ? '' : 's'}
            </span>
          )}
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

      {/* ── STUDENTS & OPERATIONS ──────────────────────────────── */}
      <section>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 10 }}>
          <span style={{ width: 4, height: 14, background: 'var(--rose)', borderRadius: 2 }} />
          <h2 style={{ fontSize: 12, fontWeight: 700, letterSpacing: '.08em', textTransform: 'uppercase', color: 'var(--text2)', fontFamily: "'IBM Plex Mono', monospace" }}>
            Students &amp; Operations
          </h2>
        </div>
        <div className="grid grid-cols-2 lg:grid-cols-3 gap-3 stagger">
          {operationalCards.map(c => (
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

      {/* Two-column: Pending Approvals + System Notifications */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5 stagger">

        {/* Pending Approvals */}
        <div className="card" style={{ padding: '20px 24px' }}>
          <div className="card-header">
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <CheckCircle2 size={14} style={{ color: 'var(--rose)' }} />
              <span className="card-title">Pending Approvals</span>
            </div>
            <Link to="/admin/rewards" style={{ fontFamily: "'IBM Plex Mono', monospace", fontSize: 11, color: 'var(--cyan)', textDecoration: 'none' }}>
              Manage rewards →
            </Link>
          </div>
          {(pendingClaims.length + pendingChores.length) === 0 ? (
            <div className="empty-state" style={{ padding: '24px 0' }}>
              <p>Nothing pending — all caught up 🎉</p>
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              {/* Chore proofs (urgent — 24h SLA) */}
              {pendingChores.slice(0, 3).map(ch => {
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

              {/* Voucher claims */}
              {pendingClaims.slice(0, 3).map(c => (
                <div key={c.id} className="hover-lift" style={{
                  display: 'flex', alignItems: 'center', gap: 12,
                  padding: '10px 12px', borderRadius: 10,
                  background: 'rgba(0,204,204,.04)',
                  border: '1px solid rgba(0,204,204,.18)',
                }}>
                  <span style={{ fontSize: 22 }}>{c.voucher.icon}</span>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <p style={{ fontSize: 13, fontWeight: 600, color: 'var(--text)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                      {c.voucher.name}
                    </p>
                    <p style={{ fontFamily: "'IBM Plex Mono', monospace", fontSize: 10, color: 'var(--text3)' }}>
                      {c.user.name} · {c.voucher.cost} 🪙
                    </p>
                  </div>
                  <div style={{ display: 'flex', gap: 6, flexShrink: 0 }}>
                    <button
                      onClick={() => approveMut.mutate(c.id)}
                      disabled={approveMut.isPending}
                      title="Approve"
                      style={{
                        background: 'rgba(0,204,204,.12)', border: '1px solid rgba(0,204,204,.3)',
                        color: 'var(--cyan)', borderRadius: 6, padding: '5px 8px',
                        display: 'inline-flex', alignItems: 'center', cursor: 'pointer',
                      }}
                    >
                      <CheckCircle2 size={14} />
                    </button>
                    <button
                      onClick={() => rejectMut.mutate(c.id)}
                      disabled={rejectMut.isPending}
                      title="Reject"
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
              ))}

              {(pendingChores.length + pendingClaims.length) > 6 && (
                <p style={{ fontFamily: "'IBM Plex Mono', monospace", fontSize: 11, color: 'var(--text3)', textAlign: 'center', padding: 6 }}>
                  +{(pendingChores.length + pendingClaims.length) - 6} more queued
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
            { label: 'View Occupancy',  to: '/admin/occupancy',   icon: '🏠' },
            { label: 'Add Allocation',  to: '/admin/allocations', icon: '➕' },
            { label: 'Urgent Tickets',  to: '/admin/maintenance', icon: '🔴' },
            { label: 'Manage Accounts', to: '/admin/accounts',    icon: '👤' },
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
          <p className="micro-label" style={{ margin: 0 }}>Room Occupancy</p>
          <span style={{ fontFamily: "'IBM Plex Mono', monospace", fontSize: 11, color: 'var(--text3)' }}>
            {stats.rooms.occupied}/{stats.rooms.total}
          </span>
        </div>
        <div style={{ width: '100%', background: 'var(--bg3)', borderRadius: 6, height: 10, overflow: 'hidden' }}>
          <div style={{
            height: '100%', borderRadius: 6,
            background: 'linear-gradient(90deg, var(--cyan), rgba(0,204,204,.5))',
            width: `${stats.occupancyRate}%`, transition: 'width .5s ease',
          }} />
        </div>
        <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 8 }}>
          <span style={{ fontFamily: "'IBM Plex Mono', monospace", fontSize: 10, color: 'var(--text3)' }}>{stats.rooms.occupied} occupied</span>
          <span style={{ fontFamily: "'IBM Plex Mono', monospace", fontSize: 10, color: 'var(--text3)' }}>{stats.rooms.vacant} vacant</span>
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

  return (
    <div style={{
      display: 'flex', flexDirection: 'column', alignItems: 'flex-end',
      padding: '8px 14px',
      borderRadius: 10,
      background: 'var(--bg3)',
      border: '1px solid var(--border)',
      lineHeight: 1.1,
      gap: 4,
      minWidth: 200,
    }}>
      {/* Big time — HH:MM:SS */}
      <span style={{
        fontFamily: "'IBM Plex Mono', monospace",
        fontSize: 18, fontWeight: 700,
        color: 'var(--cyan)', letterSpacing: '.02em',
      }}>
        {now.toLocaleTimeString(undefined, { hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: false })}
      </span>
      {/* Date */}
      <span style={{
        fontFamily: "'IBM Plex Mono', monospace",
        fontSize: 10, color: 'var(--text3)', letterSpacing: '.05em',
        textTransform: 'uppercase',
      }}>
        {now.toLocaleDateString(undefined, { weekday: 'short', day: '2-digit', month: 'short', year: 'numeric' })}
      </span>
      {/* Weather just below the date */}
      <span style={{ paddingTop: 4, borderTop: '1px solid var(--border)', width: '100%', display: 'flex', justifyContent: 'flex-end' }}>
        <WeatherWidget />
      </span>
    </div>
  );
}
