import { useQuery } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import { Wrench, QrCode, Newspaper, ClipboardList, AlertCircle, Bell, Pin } from 'lucide-react';
import { getDashboard } from '../../services/dashboard.service';
import { useAuth } from '../../contexts/AuthContext';
import { ROUTES } from '../../constants/routes';
import { usePageTitle } from '../../hooks/usePageTitle';
import { format } from 'date-fns';

const STATUS_COLOR: Record<string, string> = {
  OPEN:        'bg-yellow-500/15 text-yellow-400',
  IN_PROGRESS: 'bg-blue-500/15 text-blue-400',
  RESOLVED:    'bg-green-500/15 text-green-400',
  CLOSED:      'bg-white/10 text-white/40',
};

const PRIORITY_DOT: Record<string, string> = {
  LOW:       'bg-white/30',
  NORMAL:    'bg-rh-cyan',
  HIGH:      'bg-orange-400',
  EMERGENCY: 'bg-red-500',
};

export default function Dashboard() {
  usePageTitle('Dashboard');
  const { user } = useAuth();
  const { data, isLoading, isError } = useQuery({
    queryKey: ['dashboard'],
    queryFn:  getDashboard,
  });

  if (isLoading) return <PageSkeleton />;
  if (isError || !data) return <ErrorState />;

  const { allocation, wallet, openTickets, upcomingVisitors, pinnedNews, activeChores } = data;

  return (
    <div className="space-y-6 appear">

      {/* Welcome banner */}
      <div style={{ background: 'var(--bg2)', border: '1px solid var(--border)', borderRadius: 12, padding: '20px 24px', display: 'flex', alignItems: 'center', gap: 16 }}>
        <div className="avatar avatar-cyan" style={{ width: 48, height: 48, fontSize: 16, fontWeight: 700 }}>
          {user?.name?.slice(0,2).toUpperCase()}
        </div>
        <div>
          <h1 style={{ fontSize: 20, fontWeight: 700, letterSpacing: '-.02em', color: 'var(--text)', marginBottom: 2 }}>
            Good {getGreeting()}, {user?.name?.split(' ')[0]} 👋
          </h1>
          <p style={{ fontFamily: "'IBM Plex Mono', monospace", fontSize: 12, color: 'var(--text3)' }}>
            {allocation ? `Room ${allocation.room.number} · ${allocation.room.block}` : 'No active room'}
          </p>
        </div>
      </div>

      {/* Notifications banner — unread pinned only */}
      {(() => {
        const unreadPinned = pinnedNews.filter((n: any) => !n.read);
        if (unreadPinned.length === 0) return null;
        return (
        <Link to={ROUTES.UPDATES} style={{ display: 'block', textDecoration: 'none' }}>
          <div className="glass-card" style={{
            padding: '14px 18px',
            display: 'flex', alignItems: 'center', gap: 14,
            position: 'relative', overflow: 'hidden',
          }}>
            <div style={{
              position: 'absolute', top: 0, left: 0, bottom: 0, width: 3,
              background: 'linear-gradient(180deg, var(--cyan), var(--rose))',
            }}/>
            <div style={{
              width: 38, height: 38, borderRadius: 10, flexShrink: 0,
              background: 'rgba(0,204,204,.10)', border: '1px solid rgba(0,204,204,.25)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              color: 'var(--cyan)', position: 'relative',
            }}>
              <Bell size={16} />
              <span style={{
                position: 'absolute', top: -4, right: -4,
                background: 'var(--rose)', color: '#fff',
                fontSize: 9, fontWeight: 700,
                width: 16, height: 16, borderRadius: '50%',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                fontFamily: "'IBM Plex Mono', monospace",
                animation: 'pulseDot 1.6s ease-in-out infinite',
              }}>{unreadPinned.length}</span>
            </div>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 2 }}>
                <Pin size={10} style={{ color: 'var(--rose)' }} />
                <span className="micro-label" style={{ margin: 0, color: 'var(--rose)' }}>
                  {unreadPinned.length === 1 ? 'New pinned notice' : `${unreadPinned.length} new pinned notices`}
                </span>
              </div>
              <p style={{ fontSize: 14, fontWeight: 600, color: 'var(--text)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                {unreadPinned[0].title}
              </p>
            </div>
            <span style={{ fontFamily: "'IBM Plex Mono', monospace", fontSize: 11, color: 'var(--cyan)', flexShrink: 0 }}>
              View all →
            </span>
          </div>
        </Link>
        );
      })()}

      {/* KPI stat row */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 stagger">
        <StatCard
          label="Monthly Rent"
          value={allocation ? `R${Number(allocation.rent).toLocaleString()}` : '—'}
          note={allocation?.status === 'ACTIVE' ? 'Active lease' : 'No allocation'}
          color="cyan"
        />
        <StatCard
          label="Balance Due"
          value={allocation ? `R${Number(allocation.balance).toLocaleString()}` : '—'}
          note={Number(allocation?.balance ?? 0) > 0 ? 'Outstanding' : 'All clear'}
          color={Number(allocation?.balance ?? 0) > 0 ? 'rose' : 'cyan'}
        />
        <StatCard
          label="Credits"
          value={`${wallet?.credits ?? 0} 🪙`}
          note="Redeemable rewards"
          color="cyan"
        />
        <StatCard
          label="Open Tickets"
          value={String(openTickets.length)}
          note={openTickets.length === 0 ? 'All resolved' : 'In progress'}
          color={openTickets.length > 0 ? 'rose' : 'cyan'}
        />
      </div>

      {/* Main grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5 stagger">

        {/* Maintenance tickets */}
        <Section
          title="Maintenance"
          icon={<Wrench size={14} />}
          linkTo={ROUTES.MAINTENANCE}
          linkLabel="View all"
          empty={openTickets.length === 0}
          emptyMsg="No open tickets 🎉"
        >
          {openTickets.map(t => (
            <div key={t.id} style={{ display: 'flex', alignItems: 'flex-start', gap: 10, padding: '10px 0', borderBottom: '1px solid var(--border)' }} className="last:border-0">
              <span className={`mt-1.5 w-2 h-2 rounded-full flex-shrink-0 ${PRIORITY_DOT[t.priority]}`} />
              <div style={{ flex: 1, minWidth: 0 }}>
                <p style={{ fontSize: 13, fontWeight: 600, color: 'var(--text)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{t.category}</p>
                <p style={{ fontFamily: "'IBM Plex Mono', monospace", fontSize: 11, color: 'var(--text3)', marginTop: 1 }}>{t.location}</p>
              </div>
              <span className={`badge ${STATUS_COLOR[t.status]}`} style={{ flexShrink: 0, fontSize: 10, padding: '2px 8px', borderRadius: 20, border: 'none' }}>
                {t.status.replace('_', ' ')}
              </span>
            </div>
          ))}
        </Section>

        {/* Pinned news */}
        <Section
          title="Pinned Notices"
          icon={<Newspaper size={14} />}
          linkTo={ROUTES.UPDATES}
          linkLabel="View all"
          empty={pinnedNews.length === 0}
          emptyMsg="No pinned notices"
        >
          {pinnedNews.map(n => (
            <div key={n.id} style={{ padding: '10px 0', borderBottom: '1px solid var(--border)' }} className="last:border-0">
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
                <span style={{ fontFamily: "'IBM Plex Mono', monospace", fontSize: 10, padding: '2px 8px', borderRadius: 20, background: n.tagColor + '20', color: n.tagColor, textTransform: 'uppercase', letterSpacing: '.04em' }}>
                  {n.tag}
                </span>
                <span style={{ fontFamily: "'IBM Plex Mono', monospace", fontSize: 10, color: 'var(--text3)' }}>{n.date}</span>
              </div>
              <p style={{ fontSize: 13, fontWeight: 500, color: 'var(--text)', lineHeight: 1.5 }}>{n.title}</p>
            </div>
          ))}
        </Section>

        {/* Upcoming visitors */}
        <Section
          title="Upcoming Visitors"
          icon={<QrCode size={14} />}
          linkTo={ROUTES.VISITORS}
          linkLabel="Manage"
          empty={upcomingVisitors.length === 0}
          emptyMsg="No upcoming visitors"
        >
          {upcomingVisitors.map(v => (
            <div key={v.id} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '10px 0', borderBottom: '1px solid var(--border)' }} className="last:border-0">
              <div className="avatar avatar-rose" style={{ width: 32, height: 32, fontSize: 11, fontWeight: 700 }}>
                {v.visitorName.slice(0,2).toUpperCase()}
              </div>
              <div style={{ flex: 1, minWidth: 0 }}>
                <p style={{ fontSize: 13, fontWeight: 500, color: 'var(--text)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{v.visitorName}</p>
                <p style={{ fontFamily: "'IBM Plex Mono', monospace", fontSize: 10, color: 'var(--text3)' }}>
                  {format(new Date(v.date), 'dd MMM')} · {v.timeFrom}–{v.timeTo}
                </p>
              </div>
              <span className={`badge ${v.status === 'ACTIVE' ? 'badge-cyan' : 'badge-gray'}`} style={{ flexShrink: 0 }}>
                {v.status}
              </span>
            </div>
          ))}
        </Section>

        {/* Active chores */}
        <Section
          title="Chore Board"
          icon={<ClipboardList size={14} />}
          linkTo={ROUTES.HOUSEMATES}
          linkLabel="View all"
          empty={activeChores.length === 0}
          emptyMsg="All chores done! 🏆"
        >
          {activeChores.map(c => (
            <div key={c.id} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '10px 0', borderBottom: '1px solid var(--border)' }} className="last:border-0">
              <span style={{ fontSize: 18, flexShrink: 0 }}>{c.icon}</span>
              <div style={{ flex: 1, minWidth: 0 }}>
                <p style={{ fontSize: 13, fontWeight: 500, color: 'var(--text)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{c.name}</p>
                <p style={{ fontFamily: "'IBM Plex Mono', monospace", fontSize: 10, color: 'var(--text3)', marginTop: 1 }}>{c.frequency}</p>
              </div>
              {c.claimedById
                ? <span className="badge badge-cyan" style={{ flexShrink: 0 }}>Claimed</span>
                : <span className="badge badge-gray" style={{ flexShrink: 0 }}>Open</span>
              }
            </div>
          ))}
        </Section>

      </div>
    </div>
  );
}

/* ── Sub-components ─────────────────────────────────────────────── */

function StatCard({ label, value, note, color }: {
  label: string; value: string; note: string; color: 'cyan' | 'rose';
}) {
  return (
    <div className={`kpi-card ${color === 'rose' ? 'rose' : ''}`}>
      <span className="kpi-card-label">{label}</span>
      <p className="kpi-card-value">{value}</p>
      <p className="kpi-card-note">{note}</p>
    </div>
  );
}

function Section({ title, icon, linkTo, linkLabel, empty, emptyMsg, children }: {
  title: string; icon: React.ReactNode; linkTo: string; linkLabel: string;
  empty: boolean; emptyMsg: string; children: React.ReactNode;
}) {
  return (
    <div style={{ background: 'var(--bg2)', border: '1px solid var(--border)', borderRadius: 12, padding: '18px 20px' }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, color: 'var(--text3)' }}>
          {icon}
          <span style={{ fontSize: 13, fontWeight: 600, color: 'var(--text)' }}>{title}</span>
        </div>
        <Link to={linkTo} style={{ fontFamily: "'IBM Plex Mono', monospace", fontSize: 11, color: 'var(--cyan)', textDecoration: 'none' }}>
          {linkLabel} →
        </Link>
      </div>
      {empty
        ? <p style={{ fontSize: 13, color: 'var(--text3)', textAlign: 'center', padding: '20px 0' }}>{emptyMsg}</p>
        : children
      }
    </div>
  );
}

function PageSkeleton() {
  return (
    <div className="space-y-6">
      <div className="skeleton h-20 rounded-xl" />
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        {[...Array(4)].map((_, i) => <div key={i} className="skeleton h-24 rounded-xl" />)}
      </div>
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
        {[...Array(4)].map((_, i) => <div key={i} className="skeleton h-48 rounded-xl" />)}
      </div>
    </div>
  );
}

function ErrorState() {
  return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '60vh' }}>
      <div style={{ textAlign: 'center' }}>
        <AlertCircle size={32} style={{ color: 'var(--rose)', margin: '0 auto 12px' }} />
        <p style={{ fontWeight: 600, color: 'var(--text)', marginBottom: 4 }}>Failed to load dashboard</p>
        <p style={{ fontSize: 13, color: 'var(--text3)' }}>Please refresh the page</p>
      </div>
    </div>
  );
}

function getGreeting() {
  const h = new Date().getHours();
  if (h < 12) return 'morning';
  if (h < 17) return 'afternoon';
  return 'evening';
}
