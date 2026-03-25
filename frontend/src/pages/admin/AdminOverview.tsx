import { Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { getAdminStats, AdminStats } from '../../services/admin.service';

const statCard = (
  label: string,
  value: string | number,
  sub: string,
  color: string,
  icon: string,
) => (
  <div key={label} className="bg-white/4 border border-white/8 rounded-xl p-5">
    <div className="flex items-center justify-between mb-3">
      <span className="text-xl">{icon}</span>
      <span className={`text-xs font-mono px-2 py-0.5 rounded-full border ${color}`}>{sub}</span>
    </div>
    <p className="text-2xl font-bold text-white">{value}</p>
    <p className="text-white/50 text-xs mt-1">{label}</p>
  </div>
);

export default function AdminOverview() {
  const { data: stats, isLoading, isError } = useQuery<AdminStats>({
    queryKey: ['admin-stats'],
    queryFn: getAdminStats,
    refetchInterval: 30_000,
  });

  if (isError) return (
    <div className="text-rh-rose text-sm p-6">Failed to load stats. Is the backend running?</div>
  );

  if (isLoading || !stats) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="w-8 h-8 border-2 border-rh-cyan border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  const cards = [
    {
      label: 'Active Students',
      value: stats.students.total,
      sub: `${stats.students.pending} pending`,
      color: 'border-rh-cyan/30 text-rh-cyan',
      icon: '🎓',
    },
    {
      label: 'Occupancy Rate',
      value: `${stats.occupancyRate}%`,
      sub: `${stats.rooms.vacant} vacant`,
      color: 'border-green-500/30 text-green-400',
      icon: '🏠',
    },
    {
      label: 'Open Tickets',
      value: stats.maintenance.open,
      sub: `${stats.maintenance.urgent} urgent`,
      color: stats.maintenance.urgent > 0 ? 'border-rh-rose/30 text-rh-rose' : 'border-white/20 text-white/40',
      icon: '🔧',
    },
    {
      label: "Today's Visitors",
      value: stats.visitors.today,
      sub: `${stats.visitors.total} total`,
      color: 'border-yellow-500/30 text-yellow-400',
      icon: '🪪',
    },
    {
      label: 'Monthly Revenue',
      value: `R${stats.monthlyRevenue.toLocaleString()}`,
      sub: `${stats.rooms.occupied} rooms`,
      color: 'border-purple-500/30 text-purple-400',
      icon: '💰',
    },
    {
      label: 'Active Vouchers',
      value: stats.vouchers.active,
      sub: 'in reward shop',
      color: 'border-orange-500/30 text-orange-400',
      icon: '🎁',
    },
  ];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-white">Admin Overview</h1>
        <p className="text-white/40 text-sm mt-1">Real-time residence statistics</p>
      </div>

      {/* Stat grid */}
      <div className="grid grid-cols-2 lg:grid-cols-3 gap-4">
        {cards.map(c => statCard(c.label, c.value, c.sub, c.color, c.icon))}
      </div>

      {/* Quick links */}
      <div className="bg-white/4 border border-white/8 rounded-xl p-5">
        <h2 className="text-sm font-semibold text-white/60 uppercase tracking-wider mb-4">Quick Actions</h2>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          {[
            { label: 'View Occupancy',   to: '/admin/occupancy',   icon: '🏠' },
            { label: 'Add Allocation',   to: '/admin/allocations', icon: '➕' },
            { label: 'Urgent Tickets',   to: '/admin/maintenance', icon: '🔴' },
            { label: 'Manage Accounts',  to: '/admin/accounts',    icon: '👤' },
          ].map(a => (
            <Link
              key={a.label}
              to={a.to}
              className="flex flex-col items-center gap-2 p-3 rounded-lg bg-white/4 hover:bg-rh-cyan/10 border border-white/8 hover:border-rh-cyan/30 transition-colors text-center"
            >
              <span className="text-xl">{a.icon}</span>
              <span className="text-xs text-white/70">{a.label}</span>
            </Link>
          ))}
        </div>
      </div>

      {/* Rooms summary bar */}
      <div className="bg-white/4 border border-white/8 rounded-xl p-5">
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-sm font-semibold text-white/60 uppercase tracking-wider">Room Occupancy</h2>
          <span className="text-white/40 text-xs font-mono">{stats.rooms.occupied}/{stats.rooms.total}</span>
        </div>
        <div className="w-full bg-white/8 rounded-full h-3">
          <div
            className="h-3 rounded-full bg-gradient-to-r from-rh-cyan to-rh-cyan/60 transition-all duration-500"
            style={{ width: `${stats.occupancyRate}%` }}
          />
        </div>
        <div className="flex justify-between mt-2 text-xs text-white/40">
          <span>{stats.rooms.occupied} occupied</span>
          <span>{stats.rooms.vacant} vacant</span>
        </div>
      </div>
    </div>
  );
}
