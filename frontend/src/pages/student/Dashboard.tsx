import { useQuery } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import { Wrench, QrCode, Newspaper, ClipboardList, Wallet, AlertCircle } from 'lucide-react';
import { getDashboard } from '../../services/dashboard.service';
import { useAuth } from '../../contexts/AuthContext';
import { ROUTES } from '../../constants/routes';
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
      <div className="bg-rh-bg2 border border-white/7 rounded-2xl px-6 py-5">
        <div className="flex items-center gap-4">
          <div className="w-12 h-12 rounded-full bg-rh-cyan/20 flex items-center justify-center text-rh-cyan font-bold text-lg flex-shrink-0">
            {user?.name?.slice(0,2).toUpperCase()}
          </div>
          <div>
            <h1 className="text-xl font-semibold text-white">
              Good {getGreeting()}, {user?.name?.split(' ')[0]} 👋
            </h1>
            <p className="text-white/45 text-sm mt-0.5">
              {allocation ? `Room ${allocation.room.number} · ${allocation.room.block}` : 'No active room'}
            </p>
          </div>
        </div>
      </div>

      {/* Stats row */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <StatCard
          label="Rent"
          value={allocation ? `R${Number(allocation.rent).toLocaleString()}` : '—'}
          sub={allocation?.status === 'ACTIVE' ? 'Active lease' : 'No allocation'}
          color="cyan"
          icon={<span className="text-xl">🏠</span>}
        />
        <StatCard
          label="Balance"
          value={allocation ? `R${Number(allocation.balance).toLocaleString()}` : '—'}
          sub={Number(allocation?.balance ?? 0) > 0 ? 'Outstanding' : 'All clear'}
          color={Number(allocation?.balance ?? 0) > 0 ? 'rose' : 'cyan'}
          icon={<span className="text-xl">💳</span>}
        />
        <StatCard
          label="Credits"
          value={`${wallet?.credits ?? 0} 🪙`}
          sub="Redeemable rewards"
          color="cyan"
          icon={<Wallet size={20} />}
        />
        <StatCard
          label="Open Tickets"
          value={String(openTickets.length)}
          sub={openTickets.length === 0 ? 'All resolved' : 'In progress'}
          color={openTickets.length > 0 ? 'rose' : 'cyan'}
          icon={<Wrench size={20} />}
        />
      </div>

      {/* Main grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
        {/* Maintenance tickets */}
        <Section
          title="Maintenance"
          icon={<Wrench size={15} />}
          linkTo={ROUTES.MAINTENANCE}
          linkLabel="View all"
          empty={openTickets.length === 0}
          emptyMsg="No open tickets 🎉"
        >
          {openTickets.map(t => (
            <div key={t.id} className="flex items-start gap-3 py-3 border-b border-white/5 last:border-0">
              <span className={`mt-1.5 w-2 h-2 rounded-full flex-shrink-0 ${PRIORITY_DOT[t.priority]}`} />
              <div className="flex-1 min-w-0">
                <p className="text-sm text-white font-medium truncate">{t.category}</p>
                <p className="text-xs text-white/40 truncate mt-0.5">{t.location}</p>
              </div>
              <span className={`text-[11px] font-mono px-2 py-0.5 rounded-full flex-shrink-0 ${STATUS_COLOR[t.status]}`}>
                {t.status.replace('_', ' ')}
              </span>
            </div>
          ))}
        </Section>

        {/* Pinned news */}
        <Section
          title="Pinned Notices"
          icon={<Newspaper size={15} />}
          linkTo={ROUTES.UPDATES}
          linkLabel="View all"
          empty={pinnedNews.length === 0}
          emptyMsg="No pinned notices"
        >
          {pinnedNews.map(n => (
            <div key={n.id} className="py-3 border-b border-white/5 last:border-0">
              <div className="flex items-center gap-2 mb-1">
                <span className="text-[11px] font-mono px-2 py-0.5 rounded-full" style={{ background: n.tagColor + '20', color: n.tagColor }}>
                  {n.tag}
                </span>
                <span className="text-[11px] text-white/30">{n.date}</span>
              </div>
              <p className="text-sm text-white font-medium leading-snug">{n.title}</p>
            </div>
          ))}
        </Section>

        {/* Upcoming visitors */}
        <Section
          title="Upcoming Visitors"
          icon={<QrCode size={15} />}
          linkTo={ROUTES.VISITORS}
          linkLabel="Manage"
          empty={upcomingVisitors.length === 0}
          emptyMsg="No upcoming visitors"
        >
          {upcomingVisitors.map(v => (
            <div key={v.id} className="flex items-center gap-3 py-3 border-b border-white/5 last:border-0">
              <div className="w-8 h-8 rounded-full bg-rh-rose/15 flex items-center justify-center text-rh-rose text-xs font-bold flex-shrink-0">
                {v.visitorName.slice(0,2).toUpperCase()}
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm text-white font-medium truncate">{v.visitorName}</p>
                <p className="text-xs text-white/40">
                  {format(new Date(v.date), 'dd MMM')} · {v.timeFrom}–{v.timeTo}
                </p>
              </div>
              <span className={`text-[11px] font-mono px-2 py-0.5 rounded-full ${
                v.status === 'ACTIVE' ? 'bg-green-500/15 text-green-400' : 'bg-rh-cyan/15 text-rh-cyan'
              }`}>
                {v.status}
              </span>
            </div>
          ))}
        </Section>

        {/* Active chores */}
        <Section
          title="Chore Board"
          icon={<ClipboardList size={15} />}
          linkTo={ROUTES.HOUSEMATES}
          linkLabel="View all"
          empty={activeChores.length === 0}
          emptyMsg="All chores done! 🏆"
        >
          {activeChores.map(c => (
            <div key={c.id} className="flex items-center gap-3 py-3 border-b border-white/5 last:border-0">
              <span className="text-lg flex-shrink-0">{c.icon}</span>
              <div className="flex-1 min-w-0">
                <p className="text-sm text-white font-medium truncate">{c.name}</p>
                <p className="text-xs text-white/40 truncate">{c.frequency}</p>
              </div>
              {c.claimedById
                ? <span className="text-[11px] font-mono px-2 py-0.5 rounded-full bg-rh-cyan/15 text-rh-cyan">Claimed</span>
                : <span className="text-[11px] font-mono px-2 py-0.5 rounded-full bg-white/5 text-white/40">Open</span>
              }
            </div>
          ))}
        </Section>
      </div>
    </div>
  );
}

// ── Sub-components ───────────────────────────────────────────────

function StatCard({ label, value, sub, color, icon }: {
  label: string; value: string; sub: string; color: 'cyan'|'rose'; icon: React.ReactNode;
}) {
  return (
    <div className="bg-rh-bg2 border border-white/7 rounded-xl p-4">
      <div className={`w-8 h-8 rounded-lg mb-3 flex items-center justify-center ${
        color === 'cyan' ? 'bg-rh-cyan/15 text-rh-cyan' : 'bg-rh-rose/15 text-rh-rose'
      }`}>
        {icon}
      </div>
      <p className="text-xl font-bold text-white">{value}</p>
      <p className="text-xs text-white/40 mt-0.5">{label}</p>
      <p className="text-[11px] text-white/25 font-mono mt-1">{sub}</p>
    </div>
  );
}

function Section({ title, icon, linkTo, linkLabel, empty, emptyMsg, children }: {
  title: string; icon: React.ReactNode; linkTo: string; linkLabel: string;
  empty: boolean; emptyMsg: string; children: React.ReactNode;
}) {
  return (
    <div className="bg-rh-bg2 border border-white/7 rounded-2xl p-5">
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2 text-white/70">
          {icon}
          <span className="text-sm font-semibold text-white">{title}</span>
        </div>
        <Link to={linkTo} className="text-xs text-rh-cyan hover:text-rh-cyan/80 transition-colors">
          {linkLabel} →
        </Link>
      </div>
      {empty
        ? <p className="text-sm text-white/30 py-4 text-center">{emptyMsg}</p>
        : children
      }
    </div>
  );
}

function PageSkeleton() {
  return (
    <div className="space-y-6 animate-pulse">
      <div className="h-24 bg-rh-bg2 rounded-2xl" />
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        {[...Array(4)].map((_, i) => <div key={i} className="h-28 bg-rh-bg2 rounded-xl" />)}
      </div>
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
        {[...Array(4)].map((_, i) => <div key={i} className="h-48 bg-rh-bg2 rounded-2xl" />)}
      </div>
    </div>
  );
}

function ErrorState() {
  return (
    <div className="flex items-center justify-center min-h-[60vh]">
      <div className="text-center">
        <AlertCircle size={32} className="text-rh-rose mx-auto mb-3" />
        <p className="text-white font-medium">Failed to load dashboard</p>
        <p className="text-white/40 text-sm mt-1">Please refresh the page</p>
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
