import { Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { getAdminStats, AdminStats } from '../../services/admin.service';
import { usePageTitle } from '../../hooks/usePageTitle';

export default function AdminOverview() {
  usePageTitle('Admin Overview');
  const { data: stats, isLoading, isError } = useQuery<AdminStats>({
    queryKey: ['admin-stats'],
    queryFn: getAdminStats,
    refetchInterval: 30_000,
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

  return (
    <div className="space-y-6 appear">

      {/* Header */}
      <div>
        <h1 className="page-title">Admin Overview</h1>
        <p className="page-sub">Real-time residence statistics</p>
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
