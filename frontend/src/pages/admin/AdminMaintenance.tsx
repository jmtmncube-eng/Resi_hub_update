import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Wrench } from 'lucide-react';
import { toast } from 'sonner';
import { getTickets, updateTicket } from '../../services/maintenance.service';
import type { MaintenanceTicket } from '../../types';
import { usePageTitle } from '../../hooks/usePageTitle';
import { Modal } from '../../components/Modal';

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

const PRIORITIES = ['ALL', 'EMERGENCY', 'HIGH', 'NORMAL', 'LOW'];

/** Status tabs — "Open" groups the two active states so admins triage
 *  what needs work vs what's done in one click. */
const TABS = [
  { key: 'OPEN_GROUP', label: 'Open',        statuses: ['OPEN', 'IN_PROGRESS'] },
  { key: 'RESOLVED',   label: 'Resolved',    statuses: ['RESOLVED'] },
  { key: 'CLOSED',     label: 'Closed',      statuses: ['CLOSED'] },
  { key: 'ALL',        label: 'All',         statuses: [] },
] as const;
type TabKey = typeof TABS[number]['key'];

export default function AdminMaintenance() {
  usePageTitle('Maintenance · Admin');
  const qc = useQueryClient();
  const [tab, setTab]                       = useState<TabKey>('OPEN_GROUP');
  const [priorityFilter, setPriorityFilter] = useState('ALL');
  const [search, setSearch]                 = useState('');
  const [editId, setEditId]                 = useState<string | null>(null);
  const [editForm, setEditForm]             = useState({ status: '', priority: '', adminNote: '' });
  const [photoPreview, setPhotoPreview]     = useState<string | null>(null);

  // Fetch ALL tickets (status filter applied client-side so the tab
  // counts stay live without four separate round-trips).
  const { data: allTickets = [], isLoading, isError } = useQuery<MaintenanceTicket[]>({
    queryKey: ['admin-tickets', priorityFilter, search],
    queryFn: () => getTickets({
      priority: priorityFilter !== 'ALL' ? priorityFilter : undefined,
      search:   search || undefined,
    }),
  });

  const activeTab = TABS.find(t => t.key === tab)!;
  const tickets = activeTab.statuses.length === 0
    ? allTickets
    : allTickets.filter(t => activeTab.statuses.includes(t.status as never));
  const countFor = (statuses: readonly string[]) =>
    statuses.length === 0 ? allTickets.length : allTickets.filter(t => statuses.includes(t.status)).length;

  const updateMut = useMutation({
    mutationFn: (id: string) => updateTicket(id, {
      ...(editForm.status    && { status:    editForm.status as never }),
      ...(editForm.priority  && { priority:  editForm.priority as never }),
      ...(editForm.adminNote && { adminNote: editForm.adminNote }),
    }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['admin-tickets'] });
      setEditId(null);
      toast.success('Ticket updated!');
    },
    onError: () => toast.error('Failed to update ticket.'),
  });

  if (isError) return (
    <p style={{ color: 'var(--rose)', fontSize: 13, padding: 24 }}>Failed to load tickets. Is the backend running?</p>
  );

  return (
    <div className="space-y-6 appear">

      {/* Header */}
      <div>
        <h1 className="page-title">Maintenance</h1>
        <p className="page-sub">{allTickets.length} tickets total · {countFor(['OPEN', 'IN_PROGRESS'])} need attention</p>
      </div>

      {/* Status tabs */}
      <div style={{ display: 'inline-flex', background: 'var(--bg3)', borderRadius: 10, padding: 4, gap: 2, flexWrap: 'wrap' }}>
        {TABS.map(t => (
          <button key={t.key} onClick={() => setTab(t.key)} style={{
            display: 'flex', alignItems: 'center', gap: 6,
            padding: '7px 14px', borderRadius: 7, fontSize: 13,
            fontWeight: tab === t.key ? 600 : 400,
            background: tab === t.key ? 'var(--bg2)' : 'transparent',
            color:      tab === t.key ? 'var(--text)' : 'var(--text3)',
            border: 'none', cursor: 'pointer', transition: 'all .18s',
            fontFamily: "'Space Grotesk', sans-serif",
          }}>
            {t.label}
            <span style={{
              fontFamily: "'IBM Plex Mono', monospace", fontSize: 10,
              padding: '1px 6px', borderRadius: 999,
              background: tab === t.key ? 'rgba(0,204,204,.15)' : 'var(--bg2)',
              color: tab === t.key ? 'var(--cyan)' : 'var(--text4)',
            }}>{countFor(t.statuses)}</span>
          </button>
        ))}
      </div>

      {/* Search + priority filter */}
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 10 }}>
        <input
          type="text"
          placeholder="Search tickets…"
          value={search}
          onChange={e => setSearch(e.target.value)}
          className="input-base"
          style={{ maxWidth: 240 }}
        />
        <select value={priorityFilter} onChange={e => setPriorityFilter(e.target.value)} className="input-base" style={{ maxWidth: 160 }}>
          {PRIORITIES.map(p => <option key={p} value={p}>{p === 'ALL' ? 'All priorities' : p}</option>)}
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
          <p style={{ fontWeight: 600, color: 'var(--text2)' }}>
            No {activeTab.label.toLowerCase()} tickets
          </p>
          <p style={{ fontSize: 12, color: 'var(--text3)' }}>
            {tab === 'OPEN_GROUP' ? 'Nothing needs attention right now.' : 'Nothing here yet.'}
          </p>
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
                    <p style={{ fontSize: 13, color: 'var(--text2)' }}>{t.description}</p>
                    <div style={{ display: 'flex', gap: 16, marginTop: 8 }}>
                      <span style={{ fontFamily: "'IBM Plex Mono', monospace", fontSize: 10, color: 'var(--text3)' }}>📍 {t.location}</span>
                      <span style={{ fontFamily: "'IBM Plex Mono', monospace", fontSize: 10, color: 'var(--text3)' }}>🕐 {new Date(t.createdAt).toLocaleDateString()}</span>
                    </div>
                    {/* Attached photos — click to open full-size */}
                    {t.mediaUrls && t.mediaUrls.length > 0 && (
                      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, marginTop: 10 }}>
                        {t.mediaUrls.map((url, i) => (
                          <button
                            key={i}
                            onClick={() => setPhotoPreview(url)}
                            title="Open photo"
                            style={{
                              width: 56, height: 56, borderRadius: 8, overflow: 'hidden',
                              border: '1px solid var(--border)', cursor: 'pointer', padding: 0,
                              background: 'var(--bg3)',
                            }}
                          >
                            <img src={url} alt={`Attachment ${i + 1}`} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                          </button>
                        ))}
                      </div>
                    )}
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

      {/* Full-size photo viewer */}
      <Modal open={!!photoPreview} onClose={() => setPhotoPreview(null)} maxWidth={680}>
        {photoPreview && (
          <img src={photoPreview} alt="Attachment" style={{ width: '100%', borderRadius: 8, display: 'block' }} />
        )}
      </Modal>
    </div>
  );
}
