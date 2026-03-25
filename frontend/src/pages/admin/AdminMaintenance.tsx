import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { getTickets, updateTicket } from '../../services/maintenance.service';
import type { MaintenanceTicket } from '../../types';

const statusColor: Record<string, string> = {
  OPEN:        'text-red-400 border-red-500/30 bg-red-500/8',
  IN_PROGRESS: 'text-yellow-400 border-yellow-500/30 bg-yellow-500/8',
  RESOLVED:    'text-green-400 border-green-500/30 bg-green-500/8',
  CLOSED:      'text-white/30 border-white/10 bg-white/4',
};

const priorityColor: Record<string, string> = {
  EMERGENCY: 'text-red-400',
  HIGH:      'text-orange-400',
  NORMAL:    'text-white/60',
  LOW:       'text-white/30',
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
    <div className="text-rh-rose text-sm p-6">Failed to load tickets. Is the backend running?</div>
  );

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-white">Maintenance</h1>
        <p className="text-white/40 text-sm mt-1">{tickets.length} tickets</p>
      </div>

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-3">
        <input
          type="text"
          placeholder="Search tickets…"
          value={search}
          onChange={e => setSearch(e.target.value)}
          className="input-base max-w-xs"
        />
        <select value={statusFilter} onChange={e => setStatusFilter(e.target.value)} className="input-base max-w-[160px]">
          {STATUSES.map(s => <option key={s} value={s}>{s}</option>)}
        </select>
        <select value={priorityFilter} onChange={e => setPriorityFilter(e.target.value)} className="input-base max-w-[160px]">
          {PRIORITIES.map(p => <option key={p} value={p}>{p}</option>)}
        </select>
      </div>

      {/* Tickets */}
      {isLoading ? (
        <div className="flex items-center justify-center h-40">
          <div className="w-7 h-7 border-2 border-rh-cyan border-t-transparent rounded-full animate-spin" />
        </div>
      ) : (
        <div className="space-y-3">
          {tickets.map(t => (
            <div key={t.id} className="bg-white/4 border border-white/8 rounded-xl p-4">
              {editId === t.id ? (
                <div className="space-y-3">
                  <div className="flex items-center gap-3">
                    <span className="text-white font-semibold">{t.category}</span>
                    <span className="text-white/40 text-xs">{t.location}</span>
                  </div>
                  <p className="text-white/60 text-sm">{t.description}</p>
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                    <div>
                      <label className="text-white/40 text-xs mb-1 block">Status</label>
                      <select value={editForm.status} onChange={e => setEditForm(f => ({ ...f, status: e.target.value }))} className="input-base">
                        <option value="">Keep current ({t.status})</option>
                        {['OPEN','IN_PROGRESS','RESOLVED','CLOSED'].map(s => <option key={s} value={s}>{s}</option>)}
                      </select>
                    </div>
                    <div>
                      <label className="text-white/40 text-xs mb-1 block">Priority</label>
                      <select value={editForm.priority} onChange={e => setEditForm(f => ({ ...f, priority: e.target.value }))} className="input-base">
                        <option value="">Keep current ({t.priority})</option>
                        {['EMERGENCY','HIGH','NORMAL','LOW'].map(p => <option key={p} value={p}>{p}</option>)}
                      </select>
                    </div>
                    <div>
                      <label className="text-white/40 text-xs mb-1 block">Admin Note</label>
                      <input
                        type="text"
                        value={editForm.adminNote}
                        onChange={e => setEditForm(f => ({ ...f, adminNote: e.target.value }))}
                        placeholder="Optional note…"
                        className="input-base"
                      />
                    </div>
                  </div>
                  <div className="flex gap-2">
                    <button
                      onClick={() => updateMut.mutate(t.id)}
                      disabled={updateMut.isPending}
                      className="text-xs px-3 py-1.5 rounded bg-rh-cyan text-rh-dark font-semibold"
                    >
                      {updateMut.isPending ? 'Saving…' : 'Save'}
                    </button>
                    <button onClick={() => setEditId(null)} className="text-xs px-3 py-1.5 rounded bg-white/8 text-white/60">Cancel</button>
                  </div>
                </div>
              ) : (
                <div className="flex items-start justify-between gap-4">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-3 flex-wrap">
                      <span className="text-white font-semibold">{t.category}</span>
                      <span className={`text-xs font-mono px-2 py-0.5 rounded-full border ${statusColor[t.status]}`}>
                        {t.status.replace('_', ' ')}
                      </span>
                      <span className={`text-xs font-mono font-semibold ${priorityColor[t.priority]}`}>
                        {t.priority}
                      </span>
                    </div>
                    <p className="text-white/50 text-sm mt-1 truncate">{t.description}</p>
                    <div className="flex gap-4 mt-2 text-xs text-white/30">
                      <span>📍 {t.location}</span>
                      <span>🕐 {new Date(t.createdAt).toLocaleDateString()}</span>
                    </div>
                    {t.adminNote && (
                      <p className="text-rh-cyan/70 text-xs mt-2 italic">Note: {t.adminNote}</p>
                    )}
                  </div>
                  <button
                    onClick={() => {
                      setEditId(t.id);
                      setEditForm({ status: '', priority: '', adminNote: t.adminNote ?? '' });
                    }}
                    className="shrink-0 text-xs px-3 py-1.5 rounded bg-white/8 text-white/60 hover:bg-white/12"
                  >
                    Update
                  </button>
                </div>
              )}
            </div>
          ))}
          {tickets.length === 0 && (
            <p className="text-center py-12 text-white/30">No tickets match your filters</p>
          )}
        </div>
      )}
    </div>
  );
}
