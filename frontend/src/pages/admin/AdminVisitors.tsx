import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Users, LogIn, LogOut, Loader2, Trash2 } from 'lucide-react';
import { toast } from 'sonner';
import {
  getAdminVisitors, adminCheckInVisitor, adminCheckOutVisitor, adminDeleteVisitor,
  AdminVisitorPass,
} from '../../services/admin.service';
import { usePageTitle } from '../../hooks/usePageTitle';
import { useConfirm } from '../../components/useConfirm';

const STATUS_BADGE: Record<string, string> = {
  UPCOMING:  'badge-gray',
  ACTIVE:    'badge-cyan',
  EXPIRED:   'badge-rose',
  CANCELLED: 'badge-gray',
};

export default function AdminVisitors() {
  usePageTitle('Visitors · Admin');
  const [search, setSearch] = useState('');
  const qc = useQueryClient();
  const confirm = useConfirm();

  const { data: passes = [], isLoading, isError } = useQuery<AdminVisitorPass[]>({
    queryKey: ['admin-visitors', search],
    queryFn: () => getAdminVisitors(search || undefined),
  });

  const checkInMut = useMutation({
    mutationFn: (id: string) => adminCheckInVisitor(id),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['admin-visitors'] });
      toast.success('Visitor checked in');
    },
    onError: () => toast.error('Failed to check in'),
  });

  const checkOutMut = useMutation({
    mutationFn: (id: string) => adminCheckOutVisitor(id),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['admin-visitors'] });
      toast.success('Visitor checked out');
    },
    onError: (err) => {
      const msg = (err as { response?: { data?: { error?: string } } })?.response?.data?.error;
      toast.error(msg ?? 'Failed to check out');
    },
  });

  const deleteMut = useMutation({
    mutationFn: (id: string) => adminDeleteVisitor(id),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['admin-visitors'] });
      toast.success('Visitor pass removed');
    },
    onError: (err) => {
      const msg = (err as { response?: { data?: { error?: string } } })?.response?.data?.error;
      toast.error(msg ?? 'Failed to remove');
    },
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
                  <th style={{ textAlign: 'right' }}>Actions</th>
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
                    <td style={{ textAlign: 'right' }}>
                      <VisitorActions
                        pass={p}
                        onCheckIn={() => checkInMut.mutate(p.id)}
                        onCheckOut={async () => {
                          const ok = await confirm({
                            title: `Check out ${p.visitorName}?`,
                            message: `${p.host.name} forgot to check this visitor out. Marking them out manually keeps the gate log clean.`,
                            confirmLabel: 'Check out',
                            tone: 'rose',
                            icon: LogOut,
                          });
                          if (ok) checkOutMut.mutate(p.id);
                        }}
                        onDelete={async () => {
                          const ok = await confirm({
                            title: `Remove ${p.visitorName}'s pass?`,
                            message: `Permanently deletes this visitor pass for ${p.host.name}. Use this for spam, mistakes, or duplicates — checked-in visitors should be checked out first.`,
                            confirmLabel: 'Remove pass',
                            tone: 'rose',
                            icon: Trash2,
                          });
                          if (ok) deleteMut.mutate(p.id);
                        }}
                        loading={
                          (checkInMut.isPending  && checkInMut.variables  === p.id) ||
                          (checkOutMut.isPending && checkOutMut.variables === p.id) ||
                          (deleteMut.isPending   && deleteMut.variables   === p.id)
                        }
                      />
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

/** Per-row actions — primary action (check in/out) plus an always-on
 *  rose Remove button so admin can clean up spam, duplicates, or test
 *  records in any state. */
function VisitorActions({
  pass, onCheckIn, onCheckOut, onDelete, loading,
}: {
  pass: AdminVisitorPass;
  onCheckIn:  () => void;
  onCheckOut: () => void;
  onDelete:   () => void;
  loading:    boolean;
}) {
  const passDate        = new Date(pass.date);
  const isFutureOrToday = passDate.toDateString() === new Date().toDateString() || passDate > new Date();
  const showCheckOut    = pass.status === 'ACTIVE' && pass.checkedInAt;
  const showCheckIn     = pass.status === 'UPCOMING' && isFutureOrToday;

  return (
    <div style={{ display: 'inline-flex', gap: 6, justifyContent: 'flex-end' }}>
      {showCheckOut && (
        <button
          onClick={onCheckOut}
          disabled={loading}
          className="press-soft"
          title="Force-check-out — student forgot to do it"
          style={{
            display: 'inline-flex', alignItems: 'center', gap: 5,
            padding: '5px 11px', borderRadius: 7,
            fontSize: 12, fontWeight: 600,
            background: 'rgba(232,25,122,.08)',
            color: 'var(--rose)',
            border: '1px solid rgba(232,25,122,.25)',
            cursor: 'pointer',
          }}
        >
          {loading ? <Loader2 size={11} className="animate-spin" /> : <LogOut size={11} />}
          Check out
        </button>
      )}
      {showCheckIn && (
        <button
          onClick={onCheckIn}
          disabled={loading}
          className="press-soft"
          title="Check this visitor in"
          style={{
            display: 'inline-flex', alignItems: 'center', gap: 5,
            padding: '5px 11px', borderRadius: 7,
            fontSize: 12, fontWeight: 600,
            background: 'rgba(0,204,204,.08)',
            color: 'var(--cyan)',
            border: '1px solid rgba(0,204,204,.25)',
            cursor: 'pointer',
          }}
        >
          {loading ? <Loader2 size={11} className="animate-spin" /> : <LogIn size={11} />}
          Check in
        </button>
      )}
      <button
        onClick={onDelete}
        disabled={loading}
        className="press-soft"
        title="Remove this visitor pass"
        aria-label="Remove visitor pass"
        style={{
          display: 'inline-flex', alignItems: 'center',
          padding: '5px 8px', borderRadius: 7,
          background: 'transparent',
          color: 'var(--rose)',
          border: '1px solid rgba(232,25,122,.20)',
          cursor: 'pointer',
        }}
      >
        {loading ? <Loader2 size={11} className="animate-spin" /> : <Trash2 size={11} />}
      </button>
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
