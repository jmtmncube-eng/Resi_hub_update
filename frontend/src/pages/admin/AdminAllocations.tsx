import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  getAllocations, createAllocation, updateAllocation,
  getAccounts, getOccupancy,
  AdminAllocation,
} from '../../services/admin.service';

const statusColor: Record<string, string> = {
  ACTIVE:   'text-green-400 border-green-500/30 bg-green-500/8',
  RESERVED: 'text-yellow-400 border-yellow-500/30 bg-yellow-500/8',
  ENDED:    'text-red-400 border-red-500/30 bg-red-500/8',
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
    <div className="text-rh-rose text-sm p-6">Failed to load allocations. Is the backend running?</div>
  );

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-white">Allocations</h1>
          <p className="text-white/40 text-sm mt-1">{allocations.length} total allocations</p>
        </div>
        <button
          onClick={() => setShowModal(true)}
          className="px-4 py-2 rounded-lg bg-rh-cyan text-rh-dark text-sm font-semibold hover:bg-rh-cyan/90 transition-colors"
        >
          + New Allocation
        </button>
      </div>

      {/* Search */}
      <input
        type="text"
        placeholder="Search by student name or room..."
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
                  <th className="text-left p-4">Student</th>
                  <th className="text-left p-4">Room</th>
                  <th className="text-left p-4">Rent</th>
                  <th className="text-left p-4">Status</th>
                  <th className="text-left p-4">Move-in</th>
                  <th className="text-left p-4"></th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/4">
                {allocations.map(a => (
                  <tr key={a.id}>
                    {editId === a.id ? (
                      <>
                        <td className="p-4 text-white/70">{a.user.name}</td>
                        <td className="p-4 text-white/70">{a.room.block}-{a.room.number}</td>
                        <td className="p-4">
                          <input
                            type="number"
                            value={editForm.rent}
                            onChange={e => setEditForm(f => ({ ...f, rent: e.target.value }))}
                            placeholder={String(a.rent)}
                            className="input-base w-28"
                          />
                        </td>
                        <td className="p-4">
                          <select
                            value={editForm.status}
                            onChange={e => setEditForm(f => ({ ...f, status: e.target.value }))}
                            className="input-base w-36"
                          >
                            <option value="">Keep ({a.status})</option>
                            <option value="ACTIVE">ACTIVE</option>
                            <option value="RESERVED">RESERVED</option>
                            <option value="ENDED">ENDED</option>
                          </select>
                        </td>
                        <td className="p-4" />
                        <td className="p-4">
                          <div className="flex gap-2">
                            <button
                              onClick={() => updateMut.mutate(a.id)}
                              disabled={updateMut.isPending}
                              className="text-xs px-3 py-1 rounded bg-rh-cyan text-rh-dark font-semibold hover:bg-rh-cyan/80"
                            >Save</button>
                            <button
                              onClick={() => setEditId(null)}
                              className="text-xs px-3 py-1 rounded bg-white/8 text-white/60 hover:bg-white/12"
                            >Cancel</button>
                          </div>
                        </td>
                      </>
                    ) : (
                      <>
                        <td className="p-4">
                          <p className="text-white font-medium">{a.user.name}</p>
                          <p className="text-white/40 text-xs">{a.user.email}</p>
                        </td>
                        <td className="p-4">
                          <p className="text-white font-mono">Blk {a.room.block} – {a.room.number}</p>
                          <p className="text-white/40 text-xs">{a.room.type}</p>
                        </td>
                        <td className="p-4 text-white font-mono">R{Number(a.rent).toLocaleString()}</td>
                        <td className="p-4">
                          <span className={`text-xs font-mono px-2 py-0.5 rounded-full border ${statusColor[a.status] ?? 'border-white/10 text-white/40'}`}>
                            {a.status}
                          </span>
                        </td>
                        <td className="p-4 text-white/40 text-xs">
                          {a.moveIn ? new Date(a.moveIn).toLocaleDateString() : '—'}
                        </td>
                        <td className="p-4">
                          <button
                            onClick={() => {
                              setEditId(a.id);
                              setEditForm({ rent: String(a.rent), status: a.status });
                            }}
                            className="text-xs px-3 py-1 rounded bg-white/8 text-white/60 hover:bg-white/12"
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
            <p className="text-center py-10 text-white/30">No allocations found</p>
          )}
        </div>
      )}

      {/* Create Modal */}
      {showModal && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-rh-bg2 border border-white/10 rounded-2xl p-6 w-full max-w-md space-y-4">
            <h2 className="text-lg font-bold text-white">New Allocation</h2>

            <div className="space-y-3">
              <div>
                <label className="text-white/50 text-xs mb-1 block">Student</label>
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
                <label className="text-white/50 text-xs mb-1 block">Room (vacant only)</label>
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
                <label className="text-white/50 text-xs mb-1 block">Monthly Rent (R)</label>
                <input
                  type="number"
                  value={form.rent}
                  onChange={e => setForm(f => ({ ...f, rent: e.target.value }))}
                  placeholder="5000"
                  className="input-base"
                />
              </div>

              <div>
                <label className="text-white/50 text-xs mb-1 block">Status</label>
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
              <p className="text-rh-rose text-xs">{(createMut.error as Error).message}</p>
            )}

            <div className="flex gap-3 pt-2">
              <button
                onClick={() => createMut.mutate()}
                disabled={createMut.isPending || !form.userId || !form.roomId || !form.rent}
                className="flex-1 py-2.5 rounded-lg bg-rh-cyan text-rh-dark font-semibold text-sm disabled:opacity-50"
              >
                {createMut.isPending ? 'Creating…' : 'Create'}
              </button>
              <button
                onClick={() => setShowModal(false)}
                className="flex-1 py-2.5 rounded-lg bg-white/8 text-white/70 text-sm hover:bg-white/12"
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
