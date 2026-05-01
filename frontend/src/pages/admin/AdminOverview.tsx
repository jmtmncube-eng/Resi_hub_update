import { Link } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Bell, CheckCircle2, XCircle, Pin } from 'lucide-react';
import {
  getAdminStats, AdminStats,
  getVoucherClaims, approveVoucherClaim, rejectVoucherClaim,
} from '../../services/admin.service';
import { getNews } from '../../services/news.service';
import { usePageTitle } from '../../hooks/usePageTitle';
import { toast } from 'sonner';

export default function AdminOverview() {
  usePageTitle('Admin Overview');
  const qc = useQueryClient();

  const { data: stats, isLoading, isError } = useQuery<AdminStats>({
    queryKey: ['admin-stats'],
    queryFn: getAdminStats,
    refetchInterval: 30_000,
  });

  const { data: pendingClaims = [] } = useQuery({
    queryKey: ['admin-claims', 'PENDING'],
    queryFn: () => getVoucherClaims('PENDING'),
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
    onError: (e: any) => toast.error(e?.response?.data?.error || 'Failed to approve'),
  });

  const rejectMut = useMutation({
    mutationFn: (id: string) => rejectVoucherClaim(id, 'Rejected from overview'),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['admin-claims'] });
      toast.success('Claim rejected');
    },
    onError: (e: any) => toast.error(e?.response?.data?.error || 'Failed to reject'),
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

  const cards = [
    { label: 'Active Students',  value: stats.students.total,              note: `${stats.students.pending} pending`,  color: 'cyan', icon: '🎓' },
    { label: 'Occupancy Rate',   value: `${stats.occupancyRate}%`,         note: `${stats.rooms.vacant} vacant`,        color: 'cyan', icon: '🏠' },
    { label: 'Open Tickets',     value: stats.maintenance.open,            note: `${stats.maintenance.urgent} urgent`,  color: stats.maintenance.urgent > 0 ? 'rose' : 'cyan', icon: '🔧' },
    { label: "Today's Visitors", value: stats.visitors.today,              note: `${stats.visitors.total} total`,       color: 'cyan', icon: '🪪' },
    { label: 'Monthly Revenue',  value: `R${stats.monthlyRevenue.toLocaleString()}`, note: `${stats.rooms.occupied} rooms`, color: 'cyan', icon: '💰' },
    { label: 'Active Vouchers',  value: stats.vouchers.active,             note: 'in reward shop',                      color: 'cyan', icon: '🎁' },
  ] as const;

  const recentNews = news.slice(0, 5);

  return (
    <div className="space-y-6 appear">

      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'flex-end', justifyContent: 'space-between', gap: 16, flexWrap: 'wrap' }}>
        <div>
          <h1 className="page-title">Admin Overview</h1>
          <p className="page-sub">Real-time residence statistics</p>
        </div>
        {pendingClaims.length > 0 && (
          <span className="badge badge-fill-rose" style={{ fontSize: 11, padding: '6px 12px' }}>
            {pendingClaims.length} pending approval{pendingClaims.length === 1 ? '' : 's'}
          </span>
        )}
      </div>

      {/* KPI stat grid */}
      <div className="grid grid-cols-2 lg:grid-cols-3 gap-4">
        {cards.map(c => (
          <div key={c.label} className={`kpi-card ${c.color === 'rose' ? 'rose' : ''}`}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10 }}>
              <span style={{ fontSize: 22 }}>{c.icon}</span>
              <span className={`badge ${c.color === 'rose' ? 'badge-rose' : 'badge-cyan'}`}>{c.note}</span>
            </div>
            <p className="kpi-card-value">{c.value}</p>
            <p className="kpi-card-label" style={{ marginTop: 6, marginBottom: 0 }}>{c.label}</p>
          </div>
        ))}
      </div>

      {/* Two-column: Pending Approvals + System Notifications */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">

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
          {pendingClaims.length === 0 ? (
            <div className="empty-state" style={{ padding: '24px 0' }}>
              <p>No pending claims — all caught up 🎉</p>
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              {pendingClaims.slice(0, 4).map(c => (
                <div key={c.id} style={{
                  display: 'flex', alignItems: 'center', gap: 12,
                  padding: '10px 12px', borderRadius: 10,
                  background: 'rgba(232,25,122,.05)',
                  border: '1px solid rgba(232,25,122,.15)',
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
              {pendingClaims.length > 4 && (
                <Link to="/admin/rewards" style={{
                  fontFamily: "'IBM Plex Mono', monospace", fontSize: 11,
                  color: 'var(--text3)', textAlign: 'center', padding: 6, textDecoration: 'none',
                }}>
                  +{pendingClaims.length - 4} more →
                </Link>
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
    </div>
  );
}
