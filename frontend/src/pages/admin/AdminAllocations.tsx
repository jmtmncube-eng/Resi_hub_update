import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Loader2 } from 'lucide-react';
import { toast } from 'sonner';
import {
  getAllocations, createAllocation, updateAllocation, removeAllocation,
  getAccounts, getOccupancy,
  AdminAllocation,
} from '../../services/admin.service';
import { usePageTitle } from '../../hooks/usePageTitle';
import { useResidence } from '../../contexts/ResidenceContext';
import { useConfirm } from '../../components/useConfirm';
import { Modal } from '../../components/Modal';
import { Trash2 } from 'lucide-react';

const STATUS_BADGE: Record<string, string> = {
  ACTIVE:   'badge-cyan',
  RESERVED: 'badge-gray',
  ENDED:    'badge-rose',
};

interface AdminAllocationsProps {
  /** When embedded under the Residence hub, suppress the local page title. */
  hideHeader?: boolean;
}

export default function AdminAllocations({ hideHeader = false }: AdminAllocationsProps = {}) {
  usePageTitle(hideHeader ? '' : 'Allocations · Admin');
  const qc = useQueryClient();
  const { selectedId: residenceId } = useResidence();
  const confirm = useConfirm();
  const [search, setSearch]       = useState('');
  const [showModal, setShowModal] = useState(false);
  const [editId, setEditId]       = useState<string | null>(null);
  const [form, setForm]           = useState({ userId: '', roomId: '', rent: '', status: 'ACTIVE' });
  const [editForm, setEditForm]   = useState({ rent: '', status: '' });

  const { data: allocations = [], isLoading, isError } = useQuery<AdminAllocation[]>({
    queryKey: ['admin-allocations', search],
    queryFn: () => getAllocations(search || undefined),
  });

  const { data: accountsData = [] } = useQuery({
    queryKey: ['admin-accounts-list'],
    queryFn: () => getAccounts(),
  });

  const { data: occupancyData } = useQuery({
    queryKey: ['admin-occupancy-rooms', residenceId],
    queryFn: () => getOccupancy(undefined, residenceId ?? undefined),
  });

  // Rooms that have at least one open slot. With multi-tenant rooms,
  // status alone isn't enough — we filter on `vacantSlots > 0` instead.
  const vacantRooms = (occupancyData?.rooms ?? []).filter(r => (r.vacantSlots ?? (r.status === 'VACANT' ? 1 : 0)) > 0);

  const createMut = useMutation({
    mutationFn: () => createAllocation({
      userId: form.userId,
      roomId: form.roomId,
      rent: parseFloat(form.rent),
      status: form.status as 'ACTIVE' | 'RESERVED',
    }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['admin-allocations'] });
      qc.invalidateQueries({ queryKey: ['admin-occupancy'] });
      setShowModal(false);
      setForm({ userId: '', roomId: '', rent: '', status: 'ACTIVE' });
      toast.success('Allocation created!');
    },
    onError: () => toast.error('Failed to create allocation.'),
  });

  const updateMut = useMutation({
    mutationFn: (id: string) => updateAllocation(id, {
      ...(editForm.rent   && { rent: parseFloat(editForm.rent) }),
      ...(editForm.status && { status: editForm.status as 'ACTIVE' | 'RESERVED' | 'ENDED' }),
    }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['admin-allocations'] });
      setEditId(null);
      toast.success('Allocation updated!');
    },
    onError: () => toast.error('Failed to update allocation.'),
  });

  const removeMut = useMutation({
    mutationFn: (id: string) => removeAllocation(id),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['admin-allocations'] });
      qc.invalidateQueries({ queryKey: ['admin-occupancy'] });
      qc.invalidateQueries({ queryKey: ['admin-occupancy-rooms'] });
      toast.success('Allocation removed');
    },
    onError: (err) => {
      const msg = (err as { response?: { data?: { error?: string } } })?.response?.data?.error;
      toast.error(msg ?? 'Failed to remove allocation');
    },
  });

  if (isError) return (
    <p style={{ color: 'var(--rose)', fontSize: 13, padding: 24 }}>Failed to load allocations. Is the backend running?</p>
  );

  return (
    <div className="space-y-6 appear">

      {/* Header — suppressed when embedded in Residence hub */}
      <div style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'flex-start', justifyContent: 'space-between', gap: 12 }}>
        {!hideHeader ? (
          <div>
            <h1 className="page-title">Allocations</h1>
            <p className="page-sub">{allocations.length} total allocations</p>
          </div>
        ) : (
          <p className="page-sub" style={{ margin: 0 }}>{allocations.length} total allocations</p>
        )}
        <button onClick={() => setShowModal(true)} className="btn-primary" style={{ padding: '9px 18px', fontSize: 13 }}>
          + New Allocation
        </button>
      </div>

      {/* Search */}
      <input
        type="text"
        placeholder="Search by student name or room..."
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
      ) : (
        <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
          <div style={{ overflowX: 'auto' }}>
            <table className="rh-table">
              <thead>
                <tr>
                  <th>Student</th>
                  <th>Room</th>
                  <th>Rent</th>
                  <th>Status</th>
                  <th>Move-in</th>
                  <th></th>
                </tr>
              </thead>
              <tbody>
                {allocations.map(a => (
                  <tr key={a.id}>
                    {editId === a.id ? (
                      <>
                        <td style={{ color: 'var(--text2)' }}>{a.user.name}</td>
                        <td style={{ fontFamily: "'IBM Plex Mono', monospace", color: 'var(--text2)' }}>{a.room.block}-{a.room.number}</td>
                        <td>
                          <input
                            type="number"
                            value={editForm.rent}
                            onChange={e => setEditForm(f => ({ ...f, rent: e.target.value }))}
                            placeholder={String(a.rent)}
                            className="input-base"
                            style={{ width: 110 }}
                          />
                        </td>
                        <td>
                          <select
                            value={editForm.status}
                            onChange={e => setEditForm(f => ({ ...f, status: e.target.value }))}
                            className="input-base"
                            style={{ width: 144 }}
                          >
                            <option value="">Keep ({a.status})</option>
                            <option value="ACTIVE">ACTIVE</option>
                            <option value="RESERVED">RESERVED</option>
                            <option value="ENDED">ENDED</option>
                          </select>
                        </td>
                        <td />
                        <td>
                          <div style={{ display: 'flex', gap: 6 }}>
                            <button
                              onClick={() => updateMut.mutate(a.id)}
                              disabled={updateMut.isPending}
                              className="btn-primary"
                              style={{ padding: '5px 12px', fontSize: 12 }}
                            >
                              {updateMut.isPending ? <Loader2 size={11} className="animate-spin" /> : 'Save'}
                            </button>
                            <button onClick={() => setEditId(null)} className="btn-ghost" style={{ padding: '5px 10px', fontSize: 12 }}>Cancel</button>
                          </div>
                        </td>
                      </>
                    ) : (
                      <>
                        <td>
                          <p style={{ fontWeight: 500, color: 'var(--text)' }}>{a.user.name}</p>
                          <p style={{ fontFamily: "'IBM Plex Mono', monospace", fontSize: 10, color: 'var(--text3)', marginTop: 2 }}>{a.user.email}</p>
                        </td>
                        <td>
                          <p style={{ fontFamily: "'IBM Plex Mono', monospace", color: 'var(--text)' }}>Blk {a.room.block} – {a.room.number}</p>
                          <p style={{ fontFamily: "'IBM Plex Mono', monospace", fontSize: 10, color: 'var(--text3)', marginTop: 2 }}>{a.room.type}</p>
                        </td>
                        <td style={{ fontFamily: "'IBM Plex Mono', monospace", color: 'var(--text)' }}>R{Number(a.rent).toLocaleString()}</td>
                        <td>
                          <span className={`badge ${STATUS_BADGE[a.status] ?? 'badge-gray'}`}>{a.status}</span>
                        </td>
                        <td style={{ fontFamily: "'IBM Plex Mono', monospace", fontSize: 11, color: 'var(--text3)' }}>
                          {a.moveIn ? new Date(a.moveIn).toLocaleDateString() : '—'}
                        </td>
                        <td>
                          <div style={{ display: 'flex', gap: 6, justifyContent: 'flex-end' }}>
                            <button
                              onClick={() => {
                                setEditId(a.id);
                                setEditForm({ rent: String(a.rent), status: a.status });
                              }}
                              className="btn-ghost press-soft"
                              style={{ padding: '5px 12px', fontSize: 12 }}
                            >
                              Edit
                            </button>
                            <button
                              onClick={async () => {
                                const ok = await confirm({
                                  title: `Remove ${a.user.name}?`,
                                  message: `This frees the slot in Block ${a.room.block} – ${a.room.number}. The student will need to be reallocated to use the residence again.`,
                                  confirmLabel: 'Remove',
                                  tone: 'rose',
                                  icon: Trash2,
                                });
                                if (ok) removeMut.mutate(a.id);
                              }}
                              disabled={removeMut.isPending && removeMut.variables === a.id}
                              className="press-soft"
                              title="Remove allocation — frees the slot"
                              style={{
                                display: 'flex', alignItems: 'center', gap: 5,
                                padding: '5px 11px', borderRadius: 7,
                                fontSize: 12,
                                background: 'rgba(232,25,122,.08)',
                                color: 'var(--rose)',
                                border: '1px solid rgba(232,25,122,.25)',
                                cursor: 'pointer',
                              }}
                            >
                              {removeMut.isPending && removeMut.variables === a.id
                                ? <Loader2 size={11} className="animate-spin" />
                                : <>Remove</>}
                            </button>
                          </div>
                        </td>
                      </>
                    )}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          {allocations.length === 0 && (
            <p style={{ textAlign: 'center', padding: '40px 0', color: 'var(--text3)', fontSize: 13 }}>No allocations found</p>
          )}
        </div>
      )}

      {/* Create Modal */}
      <Modal open={showModal} onClose={() => setShowModal(false)} maxWidth={440}>
        <p style={{ fontSize: 16, fontWeight: 700, color: 'var(--text)', marginBottom: 20 }}>New Allocation</p>

            <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
              <div>
                <label className="field-label">Student</label>
                <select
                  value={form.userId}
                  onChange={e => setForm(f => ({ ...f, userId: e.target.value }))}
                  className="input-base"
                >
                  <option value="">Select student…</option>
                  {accountsData
                    .filter((u: { role: string }) => u.role !== 'ADMIN')
                    .map((u: { id: string; name: string; email: string }) => (
                      <option key={u.id} value={u.id}>{u.name} ({u.email})</option>
                    ))}
                </select>
              </div>

              <div>
                <label className="field-label">Room (vacant only)</label>
                <select
                  value={form.roomId}
                  onChange={e => setForm(f => ({ ...f, roomId: e.target.value }))}
                  className="input-base"
                >
                  <option value="">Select room…</option>
                  {vacantRooms.map(r => (
                    <option key={r.id} value={r.id}>Blk {r.block} – {r.number} ({r.type})</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="field-label">Monthly Rent (R)</label>
                <input
                  type="number"
                  value={form.rent}
                  onChange={e => setForm(f => ({ ...f, rent: e.target.value }))}
                  placeholder="5000"
                  className="input-base"
                />
              </div>

              <div>
                <label className="field-label">Status</label>
                <select
                  value={form.status}
                  onChange={e => setForm(f => ({ ...f, status: e.target.value }))}
                  className="input-base"
                >
                  <option value="ACTIVE">ACTIVE</option>
                  <option value="RESERVED">RESERVED</option>
                </select>
              </div>
            </div>

            {createMut.isError && (
              <p style={{ fontFamily: "'IBM Plex Mono', monospace", fontSize: 11, color: 'var(--rose)', marginTop: 10 }}>{(createMut.error as Error).message}</p>
            )}

            <div style={{ display: 'flex', gap: 10, marginTop: 20 }}>
              <button
                onClick={() => createMut.mutate()}
                disabled={createMut.isPending || !form.userId || !form.roomId || !form.rent}
                className="btn-primary"
                style={{ flex: 1, padding: '10px 0', fontSize: 13 }}
              >
                {createMut.isPending ? 'Creating…' : 'Create'}
              </button>
              <button
                onClick={() => setShowModal(false)}
                className="btn-ghost"
                style={{ flex: 1, padding: '10px 0', fontSize: 13 }}
              >
                Cancel
              </button>
            </div>
      </Modal>
    </div>
  );
}
