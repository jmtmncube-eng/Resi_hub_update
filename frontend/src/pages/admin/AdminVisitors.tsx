import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { getAdminVisitors, AdminVisitorPass } from '../../services/admin.service';

const statusColor: Record<string, string> = {
  UPCOMING:  'text-yellow-400 border-yellow-500/30 bg-yellow-500/8',
  ACTIVE:    'text-rh-cyan border-rh-cyan/30 bg-rh-cyan/8',
  EXPIRED:   'text-red-400 border-red-500/30 bg-red-500/8',
  CANCELLED: 'text-white/30 border-white/10 bg-white/4',
};

export default function AdminVisitors() {
  const [search, setSearch] = useState('');

  const { data: passes = [], isLoading, isError } = useQuery<AdminVisitorPass[]>({
    queryKey: ['admin-visitors', search],
    queryFn: () => getAdminVisitors(search || undefined),
  });

  const today    = passes.filter(p => isToday(p.date));
  const upcoming = passes.filter(p => isFuture(p.date));
  const past     = passes.filter(p => isPast(p.date));

  if (isError) return (
    <div className="text-rh-rose text-sm p-6">Failed to load visitor passes. Is the backend running?</div>
  );

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-white">Visitor Log</h1>
        <p className="text-white/40 text-sm mt-1">
          {today.length} today · {upcoming.length} upcoming · {past.length} past
        </p>
      </div>

      {/* Search */}
      <input
        type="text"
        placeholder="Search by visitor or resident name…"
        value={search}
        onChange={e => setSearch(e.target.value)}
        className="input-base max-w-sm"
      />

      {/* Table */}
      {isLoading ? (
        <div className="flex items-center justify-center h-40">
          <div className="w-7 h-7 border-2 border-rh-cyan border-t-transparent rounded-full animate-spin" />
        </div>
      ) : (
        <div className="bg-white/4 border border-white/8 rounded-xl overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-white/8 text-white/40 text-xs uppercase tracking-wider">
                  <th className="text-left p-4">Visitor</th>
                  <th className="text-left p-4">Resident</th>
                  <th className="text-left p-4">Purpose</th>
                  <th className="text-left p-4">Visit Date</th>
                  <th className="text-left p-4">Check-in</th>
                  <th className="text-left p-4">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/4">
                {passes.map(p => (
                  <tr key={p.id} className="hover:bg-white/2 transition-colors">
                    <td className="p-4">
                      <p className="text-white font-medium">{p.visitorName}</p>
                      <p className="text-white/40 text-xs">{p.visitorPhone}</p>
                    </td>
                    <td className="p-4">
                      <p className="text-white/80">{p.host.name}</p>
                      <p className="text-white/30 text-xs">{p.host.email}</p>
                    </td>
                    <td className="p-4 text-white/60 max-w-[180px] truncate">{p.purpose}</td>
                    <td className="p-4 text-white/60 font-mono text-xs whitespace-nowrap">
                      {new Date(p.date).toLocaleDateString()}
                    </td>
                    <td className="p-4 text-white/40 font-mono text-xs whitespace-nowrap">
                      {p.checkedInAt ? new Date(p.checkedInAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : '—'}
                    </td>
                    <td className="p-4">
                      <span className={`text-xs font-mono px-2 py-0.5 rounded-full border ${statusColor[p.status] ?? 'border-white/10 text-white/40'}`}>
                        {p.status.replace('_', ' ')}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          {passes.length === 0 && (
            <p className="text-center py-10 text-white/30">No visitor passes found</p>
          )}
        </div>
      )}
    </div>
  );
}

function isToday(dateStr: string) {
  const d = new Date(dateStr);
  const now = new Date();
  return d.toDateString() === now.toDateString();
}
function isFuture(dateStr: string) {
  return new Date(dateStr) > new Date() && !isToday(dateStr);
}
function isPast(dateStr: string) {
  return new Date(dateStr) < new Date() && !isToday(dateStr);
}
