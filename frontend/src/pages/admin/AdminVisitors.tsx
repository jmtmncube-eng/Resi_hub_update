import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Users } from 'lucide-react';
import { getAdminVisitors, AdminVisitorPass } from '../../services/admin.service';
import { usePageTitle } from '../../hooks/usePageTitle';

const STATUS_BADGE: Record<string, string> = {
  UPCOMING:  'badge-gray',
  ACTIVE:    'badge-cyan',
  EXPIRED:   'badge-rose',
  CANCELLED: 'badge-gray',
};

export default function AdminVisitors() {
  usePageTitle('Visitors · Admin');
  const [search, setSearch] = useState('');

  const { data: passes = [], isLoading, isError } = useQuery<AdminVisitorPass[]>({
    queryKey: ['admin-visitors', search],
    queryFn: () => getAdminVisitors(search || undefined),
  });

  const today    = passes.filter(p => isToday(p.date));
  const upcoming = passes.filter(p => isFuture(p.date));
  const past     = passes.filter(p => isPast(p.date));

  if (isError) return (
    <p style={{ color: 'var(--rose)', fontSize: 13, padding: 24 }}>Failed to load visitor passes. Is the backend running?</p>
  );

  return (
    <div className="space-y-6 appear">

      {/* Header */}
      <div style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'flex-start', justifyContent: 'space-between', gap: 12 }}>
        <div>
          <h1 className="page-title">Visitor Log</h1>
          <p className="page-sub">{today.length} today · {upcoming.length} upcoming · {past.length} past</p>
        </div>
      </div>

      {/* Search */}
      <input
        type="text"
        placeholder="Search by visitor or resident name…"
        value={search}
        onChange={e => setSearch(e.target.value)}
        className="input-base"
        style={{ maxWidth: 320 }}
      />

      {/* Table */}
      {isLoading ? (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          {[...Array(5)].map((_, i) => <div key={i} className="skeleton" style={{ height: 56, borderRadius: 8 }} />)}
        </div>
      ) : passes.length === 0 ? (
        <div className="card empty-state">
          <Users size={28} style={{ color: 'var(--text4)', margin: '0 auto 12px' }} />
          <p style={{ fontWeight: 600, color: 'var(--text2)' }}>No visitor passes found</p>
          <p>Passes will appear here once students create them</p>
        </div>
      ) : (
        <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
          <div style={{ overflowX: 'auto' }}>
            <table className="rh-table">
              <thead>
                <tr>
                  <th>Visitor</th>
                  <th>Resident</th>
                  <th>Purpose</th>
                  <th>Visit Date</th>
                  <th>Check-in</th>
                  <th>Status</th>
                </tr>
              </thead>
              <tbody>
                {passes.map(p => (
                  <tr key={p.id}>
                    <td>
                      <p style={{ fontWeight: 500, color: 'var(--text)' }}>{p.visitorName}</p>
                      <p style={{ fontFamily: "'IBM Plex Mono', monospace", fontSize: 10, color: 'var(--text3)', marginTop: 2 }}>{p.visitorPhone}</p>
                    </td>
                    <td>
                      <p style={{ color: 'var(--text2)' }}>{p.host.name}</p>
                      <p style={{ fontFamily: "'IBM Plex Mono', monospace", fontSize: 10, color: 'var(--text3)', marginTop: 2 }}>{p.host.email}</p>
                    </td>
                    <td style={{ color: 'var(--text2)', maxWidth: 180, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{p.purpose}</td>
                    <td style={{ fontFamily: "'IBM Plex Mono', monospace", fontSize: 11, color: 'var(--text2)', whiteSpace: 'nowrap' }}>
                      {new Date(p.date).toLocaleDateString()}
                    </td>
                    <td style={{ fontFamily: "'IBM Plex Mono', monospace", fontSize: 11, color: 'var(--text3)', whiteSpace: 'nowrap' }}>
                      {p.checkedInAt ? new Date(p.checkedInAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : '—'}
                    </td>
                    <td>
                      <span className={`badge ${STATUS_BADGE[p.status] ?? 'badge-gray'}`}>
                        {p.status.replace('_', ' ')}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
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
