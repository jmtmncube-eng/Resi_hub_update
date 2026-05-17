import { useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { getTicketSLA } from '../../lib/ticketSLA';
import { Wrench, ChevronDown, ChevronUp, History } from 'lucide-react';
import { toast } from 'sonner';
import { formatDistanceToNow } from 'date-fns';
import { getTickets, updateTicket } from '../../services/maintenance.service';
import type { MaintenanceTicket } from '../../types';
import { usePageTitle } from '../../hooks/usePageTitle';
import { Modal } from '../../components/Modal';
import { ExportCsvButton } from '../../components/ExportCsvButton';
import { TicketSLAChip } from '../../components/TicketSLAChip';

const STATUS_BADGE: Record<string, string> = {
  OPEN:        'badge-rose',
  IN_PROGRESS: 'badge-gray',
  RESOLVED:    'badge-cyan',
  CLOSED:      'badge-gray',
};

// Industry-standard ITSM ticket status palette (matches ServiceNow,
// Freshdesk, Jira Service Management conventions): rose = needs attention,
// amber = active work, green = success, gray = archived. Each card gets
// a 4px left border + a 6%-tinted background in the corresponding hue
// so admins can scan the queue by colour without reading every chip.
const STATUS_ACCENT: Record<string, { border: string; tint: string }> = {
  OPEN:        { border: '#E8197A', tint: 'rgba(232,25,122,.06)' },
  IN_PROGRESS: { border: '#f59e0b', tint: 'rgba(245,158,11,.06)' },
  RESOLVED:    { border: '#22c55e', tint: 'rgba(34,197,94,.06)'  },
  CLOSED:      { border: '#6b7280', tint: 'rgba(107,114,128,.04)' },
};

const PRIORITY_COLOR: Record<string, string> = {
  EMERGENCY: 'var(--rose)',
  HIGH:      '#fb923c',
  NORMAL:    'var(--text2)',
  LOW:       'var(--text4)',
};

const PRIORITIES = ['ALL', 'EMERGENCY', 'HIGH', 'NORMAL', 'LOW'];

/** Status tabs — "All" leads as the anchor (mirrors the Accounts page's
 *  tab order); "Open" groups the two active states so admins still get
 *  triage-what-needs-work-vs-done in one click. The default tab is
 *  still OPEN_GROUP, so the action-first view loads on arrival. */
const TABS = [
  { key: 'ALL',        label: 'All',         statuses: [] },
  { key: 'OPEN_GROUP', label: 'Open',        statuses: ['OPEN', 'IN_PROGRESS'] },
  { key: 'RESOLVED',   label: 'Resolved',    statuses: ['RESOLVED'] },
  { key: 'CLOSED',     label: 'Closed',      statuses: ['CLOSED'] },
] as const;
type TabKey = typeof TABS[number]['key'];

export default function AdminMaintenance() {
  usePageTitle('Maintenance · Admin');
  const qc = useQueryClient();
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  // Deep-link from the Admin Overview "SLA breach" widget lands here
  // with `?filter=overdue` — scope the table to overdue tickets only.
  const slaFilter = searchParams.get('filter');
  const [tab, setTab]                       = useState<TabKey>(slaFilter === 'overdue' ? 'OPEN_GROUP' : 'OPEN_GROUP');
  const [priorityFilter, setPriorityFilter] = useState('ALL');
  const [search, setSearch]                 = useState('');
  const [editId, setEditId]                 = useState<string | null>(null);
  const [editForm, setEditForm]             = useState({ status: '', priority: '', adminNote: '' });
  const [photoPreview, setPhotoPreview]     = useState<string | null>(null);
  // Which ticket cards have their audit-trail timeline expanded.
  // Set (not boolean) so multiple cards can be open at once.
  const [expandedUpdates, setExpandedUpdates] = useState<Set<string>>(new Set());
  const toggleUpdates = (id: string) => setExpandedUpdates(prev => {
    const next = new Set(prev);
    next.has(id) ? next.delete(id) : next.add(id);
    return next;
  });

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
  let tickets = activeTab.statuses.length === 0
    ? allTickets
    : allTickets.filter(t => activeTab.statuses.includes(t.status as never));
  // SLA URL filter — applied AFTER the status tab so the user can still
  // toggle tabs but stay scoped to overdue tickets until they clear it.
  if (slaFilter === 'overdue') {
    tickets = tickets.filter(t => getTicketSLA(t)?.tone === 'overdue');
  }
  function clearSLAFilter() {
    searchParams.delete('filter');
    setSearchParams(searchParams, { replace: true });
  }
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
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 12, flexWrap: 'wrap' }}>
        <div>
          <h1 className="page-title">Maintenance</h1>
          <p className="page-sub">{allTickets.length} tickets total · {countFor(['OPEN', 'IN_PROGRESS'])} need attention</p>
        </div>
        {/* Pass current page state. `tab` is one of the status keys
            (OPEN_GROUP collapses OPEN + IN_PROGRESS, ALL = no filter);
            priority + free-text search are forwarded as-is. */}
        <ExportCsvButton
          type="tickets"
          filters={{
            q:        search || undefined,
            status:   tab === 'ALL' ? undefined : tab,
            priority: priorityFilter !== 'ALL' ? priorityFilter : undefined,
          }}
        />
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

      {/* SLA filter banner — only renders when the user landed here via
          the Overview's "SLA breach" widget. Click the × to clear and
          see all tickets again. */}
      {slaFilter === 'overdue' && (
        <div style={{
          display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap',
          padding: '10px 14px', borderRadius: 8,
          background: 'rgba(239,68,68,.08)', border: '1px solid rgba(239,68,68,.3)',
        }}>
          <span style={{ fontSize: 12, color: '#ef4444', fontWeight: 600 }}>
            Showing only tickets past their SLA budget
          </span>
          <span style={{ flex: 1 }} />
          <button onClick={clearSLAFilter} className="btn-ghost press-soft" style={{ padding: '4px 10px', fontSize: 11 }}>
            Clear filter ×
          </button>
        </div>
      )}

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
          {tickets.map(t => {
            const accent = STATUS_ACCENT[t.status] ?? STATUS_ACCENT.CLOSED;
            const isEmergency = t.priority === 'EMERGENCY' && (t.status === 'OPEN' || t.status === 'IN_PROGRESS');
            const inlineEdit  = editId === t.id;
            return (
            <div
              key={t.id}
              onClick={() => { if (!inlineEdit) navigate(`/admin/maintenance/${t.id}`); }}
              role={inlineEdit ? undefined : 'link'}
              tabIndex={inlineEdit ? undefined : 0}
              onKeyDown={e => {
                if (inlineEdit) return;
                if (e.key === 'Enter' || e.key === ' ') {
                  e.preventDefault();
                  navigate(`/admin/maintenance/${t.id}`);
                }
              }}
              className="card-sm"
              style={{
                padding: '16px 18px',
                borderLeft: `4px solid ${accent.border}`,
                background: accent.tint,
                position: 'relative',
                cursor: inlineEdit ? 'default' : 'pointer',
              }}
            >
              {/* Emergency overlay — pulsing red dot top-right. Only on
                  unresolved emergencies, so a closed-out emergency doesn't
                  keep flashing in the archive view. */}
              {isEmergency && (
                <span
                  title="EMERGENCY priority"
                  aria-label="Emergency"
                  style={{
                    position: 'absolute', top: 12, right: 12,
                    width: 10, height: 10, borderRadius: '50%',
                    background: '#ef4444',
                    boxShadow: '0 0 0 0 rgba(239,68,68,.6)',
                    animation: 'rh-pulse 1.6s ease-in-out infinite',
                  }}
                />
              )}
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
                      <TicketSLAChip ticket={t} compact />
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
                            onClick={e => { e.stopPropagation(); setPhotoPreview(url); }}
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
                    onClick={e => {
                      e.stopPropagation();
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

              {/* Audit trail — expandable timeline of every update made
                  to this ticket (status / priority / note changes), with
                  who did it and when. Hidden by default; the "N updates"
                  chip in the bottom-right toggles it. Only shows when
                  there's history to show (a freshly-created ticket has
                  no updates yet). */}
              {t.updates && t.updates.length > 0 && editId !== t.id && (
                <div style={{
                  marginTop: 12,
                  paddingTop: 10,
                  borderTop: '1px dashed var(--border)',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: 8,
                }}>
                  <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
                    <button
                      onClick={e => { e.stopPropagation(); toggleUpdates(t.id); }}
                      aria-expanded={expandedUpdates.has(t.id)}
                      aria-controls={`updates-${t.id}`}
                      className="btn-ghost press-soft"
                      style={{
                        display: 'flex', alignItems: 'center', gap: 6,
                        padding: '4px 10px', fontSize: 11,
                        color: 'var(--text3)',
                        fontFamily: "'IBM Plex Mono', monospace",
                      }}
                    >
                      <History size={11} />
                      {t.updates.length} update{t.updates.length === 1 ? '' : 's'}
                      {expandedUpdates.has(t.id) ? <ChevronUp size={11} /> : <ChevronDown size={11} />}
                    </button>
                  </div>

                  {expandedUpdates.has(t.id) && (
                    <div id={`updates-${t.id}`} style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                      {t.updates.map(u => (
                        <div key={u.id} style={{
                          display: 'flex', flexDirection: 'column', gap: 2,
                          padding: '8px 10px', borderRadius: 8,
                          background: 'var(--bg3)', border: '1px solid var(--border)',
                        }}>
                          <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between', gap: 8, flexWrap: 'wrap' }}>
                            <span style={{ fontSize: 12, fontWeight: 600, color: 'var(--text)' }}>
                              {u.summary}
                            </span>
                            <span style={{ fontSize: 10, color: 'var(--text4)', fontFamily: "'IBM Plex Mono', monospace" }}>
                              {formatDistanceToNow(new Date(u.createdAt), { addSuffix: true })}
                            </span>
                          </div>
                          <span style={{ fontSize: 11, color: 'var(--text3)' }}>
                            by {u.actorName}
                          </span>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}
            </div>
            );
          })}
        </div>
      )}

      {/* Pulsing keyframes for the emergency dot. Inline so we don't
          add a global CSS rule for a single component. */}
      <style>{`
        @keyframes rh-pulse {
          0%, 100% { box-shadow: 0 0 0 0 rgba(239,68,68,.55); }
          50%      { box-shadow: 0 0 0 6px rgba(239,68,68,0);  }
        }
      `}</style>

      {/* Full-size photo viewer */}
      <Modal open={!!photoPreview} onClose={() => setPhotoPreview(null)} maxWidth={680}>
        {photoPreview && (
          <img src={photoPreview} alt="Attachment" style={{ width: '100%', borderRadius: 8, display: 'block' }} />
        )}
      </Modal>
    </div>
  );
}
