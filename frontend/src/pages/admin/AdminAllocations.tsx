import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Loader2 } from 'lucide-react';
import {
  getAllocations, createAllocation, updateAllocation,
  getAccounts, getOccupancy,
  AdminAllocation,
} from '../../services/admin.service';

const STATUS_BADGE: Record<string, string> = {
  ACTIVE:   'badge-cyan',
  RESERVED: 'badge-gray',
  ENDED:    'badge-rose',
};

export default function AdminAllocations() {
  const qc = useQueryClient();
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
    queryKey: ['admin-occupancy-rooms'],
    queryFn: () => getOccupancy(),
  });

  const vacantRooms = (occupancyData?.rooms ?? []).filter(r => r.status === 'VACANT');

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
    },
  });

  const updateMut = useMutation({
    mutationFn: (id: string) => updateAllocation(id, {
      ...(editForm.rent   && { rent: parseFloat(editForm.rent) }),
      ...(editForm.status && { status: editForm.status as 'ACTIVE' | 'RESERVED' | 'ENDED' }),
    }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['admin-allocations'] });
      setEditId(null);
    },
  });

  if (isError) return (
    <p style={{ color: 'var(--rose)', fontSize: 13, padding: 24 }}>Failed to load allocations. Is the backend running?</p>
  );

  return (
    <div className="space-y-6 appear">

      {/* Header */}
      <div style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'flex-start', justifyContent: 'space-between', gap: 12 }}>
        <div>
          <h1 className="page-title">Allocations</h1>
          <p className="page-sub">{allocations.length} total allocations</p>
        </div>
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
                          <button
                            onClick={() => {
                              setEditId(a.id);
                              setEditForm({ rent: String(a.rent), status: a.status });
                            }}
                            className="btn-ghost"
                            style={{ padding: '5px 12px', fontSize: 12 }}
                          >
                            Edit
                          </button>
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
      {showModal && (
        <div className="modal-overlay" onClick={() => setShowModal(false)}>
          <div className="modal-card" onClick={e => e.stopPropagation()} style={{ maxWidth: 440 }}>
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
          </div>
        </div>
      )}
    </div>
  );
}
