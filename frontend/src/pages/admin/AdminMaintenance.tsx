import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Wrench } from 'lucide-react';
import { getTickets, updateTicket } from '../../services/maintenance.service';
import type { MaintenanceTicket } from '../../types';

const STATUS_BADGE: Record<string, string> = {
  OPEN:        'badge-rose',
  IN_PROGRESS: 'badge-gray',
  RESOLVED:    'badge-cyan',
  CLOSED:      'badge-gray',
};

const PRIORITY_COLOR: Record<string, string> = {
  EMERGENCY: 'var(--rose)',
  HIGH:      '#fb923c',
  NORMAL:    'var(--text2)',
  LOW:       'var(--text4)',
};

const STATUSES   = ['ALL', 'OPEN', 'IN_PROGRESS', 'RESOLVED', 'CLOSED'];
const PRIORITIES = ['ALL', 'EMERGENCY', 'HIGH', 'NORMAL', 'LOW'];

export default function AdminMaintenance() {
  const qc = useQueryClient();
  const [statusFilter, setStatusFilter]     = useState('ALL');
  const [priorityFilter, setPriorityFilter] = useState('ALL');
  const [search, setSearch]                 = useState('');
  const [editId, setEditId]                 = useState<string | null>(null);
  const [editForm, setEditForm]             = useState({ status: '', priority: '', adminNote: '' });

  const { data: tickets = [], isLoading, isError } = useQuery<MaintenanceTicket[]>({
    queryKey: ['admin-tickets', statusFilter, priorityFilter, search],
    queryFn: () => getTickets({
      status:   statusFilter   !== 'ALL' ? statusFilter   : undefined,
      priority: priorityFilter !== 'ALL' ? priorityFilter : undefined,
      search:   search || undefined,
    }),
  });

  const updateMut = useMutation({
    mutationFn: (id: string) => updateTicket(id, {
      ...(editForm.status    && { status:    editForm.status as never }),
      ...(editForm.priority  && { priority:  editForm.priority as never }),
      ...(editForm.adminNote && { adminNote: editForm.adminNote }),
    }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['admin-tickets'] });
      setEditId(null);
    },
  });

  if (isError) return (
    <p style={{ color: 'var(--rose)', fontSize: 13, padding: 24 }}>Failed to load tickets. Is the backend running?</p>
  );

  return (
    <div className="space-y-6 appear">

      {/* Header */}
      <div>
        <h1 className="page-title">Maintenance</h1>
        <p className="page-sub">{tickets.length} tickets</p>
      </div>

      {/* Filters */}
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 10 }}>
        <input
          type="text"
          placeholder="Search tickets…"
          value={search}
          onChange={e => setSearch(e.target.value)}
          className="input-base"
          style={{ maxWidth: 240 }}
        />
        <select value={statusFilter} onChange={e => setStatusFilter(e.target.value)} className="input-base" style={{ maxWidth: 160 }}>
          {STATUSES.map(s => <option key={s} value={s}>{s}</option>)}
        </select>
        <select value={priorityFilter} onChange={e => setPriorityFilter(e.target.value)} className="input-base" style={{ maxWidth: 160 }}>
          {PRIORITIES.map(p => <option key={p} value={p}>{p}</option>)}
        </select>
      </div>

      {/* Tickets list */}
      {isLoading ? (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          {[...Array(4)].map((_, i) => <div key={i} className="skeleton" style={{ height: 96, borderRadius: 12 }} />)}
        </div>
      ) : tickets.length === 0 ? (
        <div className="card empty-state">
          <Wrench size={28} style={{ color: 'var(--text4)', margin: '0 auto 12px' }} />
          <p style={{ fontWeight: 600, color: 'var(--text2)' }}>No tickets match your filters</p>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          {tickets.map(t => (
            <div key={t.id} className="card-sm" style={{ padding: '16px 18px' }}>
              {editId === t.id ? (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
                    <span style={{ fontSize: 14, fontWeight: 600, color: 'var(--text)' }}>{t.category}</span>
                    <span style={{ fontSize: 12, color: 'var(--text3)' }}>{t.location}</span>
                  </div>
                  <p style={{ fontSize: 13, color: 'var(--text2)' }}>{t.description}</p>
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                    <div>
                      <label className="field-label">Status</label>
                      <select value={editForm.status} onChange={e => setEditForm(f => ({ ...f, status: e.target.value }))} className="input-base">
                        <option value="">Keep current ({t.status})</option>
                        {['OPEN','IN_PROGRESS','RESOLVED','CLOSED'].map(s => <option key={s} value={s}>{s}</option>)}
                      </select>
                    </div>
                    <div>
                      <label className="field-label">Priority</label>
                      <select value={editForm.priority} onChange={e => setEditForm(f => ({ ...f, priority: e.target.value }))} className="input-base">
                        <option value="">Keep current ({t.priority})</option>
                        {['EMERGENCY','HIGH','NORMAL','LOW'].map(p => <option key={p} value={p}>{p}</option>)}
                      </select>
                    </div>
                    <div>
                      <label className="field-label">Admin Note</label>
                      <input
                        type="text"
                        value={editForm.adminNote}
                        onChange={e => setEditForm(f => ({ ...f, adminNote: e.target.value }))}
                        placeholder="Optional note…"
                        className="input-base"
                      />
                    </div>
                  </div>
                  <div style={{ display: 'flex', gap: 8 }}>
                    <button
                      onClick={() => updateMut.mutate(t.id)}
                      disabled={updateMut.isPending}
                      className="btn-primary"
                      style={{ padding: '7px 16px', fontSize: 12 }}
                    >
                      {updateMut.isPending ? 'Saving…' : 'Save'}
                    </button>
                    <button onClick={() => setEditId(null)} className="btn-ghost" style={{ padding: '7px 14px', fontSize: 12 }}>Cancel</button>
                  </div>
                </div>
              ) : (
                <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 16 }}>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap', marginBottom: 6 }}>
                      <span style={{ fontSize: 14, fontWeight: 600, color: 'var(--text)' }}>{t.category}</span>
                      <span className={`badge ${STATUS_BADGE[t.status] ?? 'badge-gray'}`}>{t.status.replace('_', ' ')}</span>
                      <span style={{ fontFamily: "'IBM Plex Mono', monospace", fontSize: 10, fontWeight: 600, color: PRIORITY_COLOR[t.priority] ?? 'var(--text3)' }}>
                        {t.priority}
                      </span>
                    </div>
                    <p style={{ fontSize: 13, color: 'var(--text2)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{t.description}</p>
                    <div style={{ display: 'flex', gap: 16, marginTop: 8 }}>
                      <span style={{ fontFamily: "'IBM Plex Mono', monospace", fontSize: 10, color: 'var(--text3)' }}>📍 {t.location}</span>
                      <span style={{ fontFamily: "'IBM Plex Mono', monospace", fontSize: 10, color: 'var(--text3)' }}>🕐 {new Date(t.createdAt).toLocaleDateString()}</span>
                    </div>
                    {t.adminNote && (
                      <p style={{ fontFamily: "'IBM Plex Mono', monospace", fontSize: 11, color: 'var(--cyan)', marginTop: 8, fontStyle: 'italic' }}>Note: {t.adminNote}</p>
                    )}
                  </div>
                  <button
                    onClick={() => {
                      setEditId(t.id);
                      setEditForm({ status: '', priority: '', adminNote: t.adminNote ?? '' });
                    }}
                    className="btn-ghost"
                    style={{ padding: '6px 14px', fontSize: 12, flexShrink: 0 }}
                  >
                    Update
                  </button>
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
