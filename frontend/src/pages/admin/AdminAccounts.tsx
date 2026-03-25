import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { getAccounts, updateAccount, AdminAccount } from '../../services/admin.service';

const roleColor: Record<string, string> = {
  ADMIN:           'text-rh-rose border-rh-rose/30 bg-rh-rose/8',
  ACTIVE_STUDENT:  'text-green-400 border-green-500/30 bg-green-500/8',
  PENDING_STUDENT: 'text-yellow-400 border-yellow-500/30 bg-yellow-500/8',
};

const roleLabel: Record<string, string> = {
  ADMIN:           'Admin',
  ACTIVE_STUDENT:  'Active',
  PENDING_STUDENT: 'Pending',
};

export default function AdminAccounts() {
  const qc = useQueryClient();
  const [search, setSearch]   = useState('');
  const [editId, setEditId]   = useState<string | null>(null);
  const [editForm, setEditForm] = useState({ name: '', role: '', phone: '' });

  const { data: accounts = [], isLoading, isError } = useQuery<AdminAccount[]>({
    queryKey: ['admin-accounts', search],
    queryFn: () => getAccounts(search || undefined),
  });

  const updateMut = useMutation({
    mutationFn: (id: string) => updateAccount(id, {
      ...(editForm.name  && { name:  editForm.name }),
      ...(editForm.role  && { role:  editForm.role }),
      ...(editForm.phone && { phone: editForm.phone }),
    }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['admin-accounts'] });
      setEditId(null);
    },
  });

  const totals = {
    all:     accounts.length,
    active:  accounts.filter(a => a.role === 'ACTIVE_STUDENT').length,
    pending: accounts.filter(a => a.role === 'PENDING_STUDENT').length,
    admin:   accounts.filter(a => a.role === 'ADMIN').length,
  };

  if (isError) return (
    <div className="text-rh-rose text-sm p-6">Failed to load accounts. Is the backend running?</div>
  );

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-white">Accounts</h1>
        <p className="text-white/40 text-sm mt-1">
          {totals.active} active · {totals.pending} pending · {totals.admin} admins
        </p>
      </div>

      {/* Search */}
      <input
        type="text"
        placeholder="Search by name or email…"
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
                  <th className="text-left p-4">User</th>
                  <th className="text-left p-4">Role</th>
                  <th className="text-left p-4">Room</th>
                  <th className="text-left p-4">Credits</th>
                  <th className="text-left p-4">Joined</th>
                  <th className="text-left p-4"></th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/4">
                {accounts.map(a => (
                  <tr key={a.id} className="hover:bg-white/2 transition-colors">
                    {editId === a.id ? (
                      <>
                        <td className="p-4" colSpan={3}>
                          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                            <div>
                              <label className="text-white/40 text-xs mb-1 block">Name</label>
                              <input
                                type="text"
                                value={editForm.name}
                                onChange={e => setEditForm(f => ({ ...f, name: e.target.value }))}
                                placeholder={a.name}
                                className="input-base"
                              />
                            </div>
                            <div>
                              <label className="text-white/40 text-xs mb-1 block">Role</label>
                              <select
                                value={editForm.role}
                                onChange={e => setEditForm(f => ({ ...f, role: e.target.value }))}
                                className="input-base"
                              >
                                <option value="">Keep ({a.role})</option>
                                <option value="ACTIVE_STUDENT">ACTIVE_STUDENT</option>
                                <option value="PENDING_STUDENT">PENDING_STUDENT</option>
                                <option value="ADMIN">ADMIN</option>
                              </select>
                            </div>
                            <div>
                              <label className="text-white/40 text-xs mb-1 block">Phone</label>
                              <input
                                type="text"
                                value={editForm.phone}
                                onChange={e => setEditForm(f => ({ ...f, phone: e.target.value }))}
                                placeholder={a.phone ?? 'No phone'}
                                className="input-base"
                              />
                            </div>
                          </div>
                        </td>
                        <td className="p-4" />
                        <td className="p-4" />
                        <td className="p-4">
                          <div className="flex gap-2">
                            <button
                              onClick={() => updateMut.mutate(a.id)}
                              disabled={updateMut.isPending}
                              className="text-xs px-3 py-1.5 rounded bg-rh-cyan text-rh-dark font-semibold"
                            >
                              {updateMut.isPending ? '…' : 'Save'}
                            </button>
                            <button
                              onClick={() => setEditId(null)}
                              className="text-xs px-3 py-1.5 rounded bg-white/8 text-white/60"
                            >
                              Cancel
                            </button>
                          </div>
                        </td>
                      </>
                    ) : (
                      <>
                        <td className="p-4">
                          <div className="flex items-center gap-3">
                            {a.avatarUrl ? (
                              <img src={a.avatarUrl} alt="" className="w-8 h-8 rounded-full object-cover" />
                            ) : (
                              <div className="w-8 h-8 rounded-full bg-white/10 flex items-center justify-center text-white/40 text-xs">
                                {a.name.charAt(0).toUpperCase()}
                              </div>
                            )}
                            <div>
                              <p className="text-white font-medium">{a.name}</p>
                              <p className="text-white/40 text-xs">{a.email}</p>
                            </div>
                          </div>
                        </td>
                        <td className="p-4">
                          <span className={`text-xs font-mono px-2 py-0.5 rounded-full border ${roleColor[a.role]}`}>
                            {roleLabel[a.role] ?? a.role}
                          </span>
                        </td>
                        <td className="p-4 text-white/60 text-xs font-mono">
                          {a.allocation?.room
                            ? `Blk ${a.allocation.room.block} – ${a.allocation.room.number}`
                            : <span className="text-white/25">No room</span>
                          }
                        </td>
                        <td className="p-4 text-rh-cyan font-mono text-sm">
                          {a.wallet?.credits ?? 0}
                        </td>
                        <td className="p-4 text-white/30 text-xs">
                          {new Date(a.createdAt).toLocaleDateString()}
                        </td>
                        <td className="p-4">
                          <button
                            onClick={() => {
                              setEditId(a.id);
                              setEditForm({ name: a.name, role: a.role, phone: a.phone ?? '' });
                            }}
                            className="text-xs px-3 py-1.5 rounded bg-white/8 text-white/60 hover:bg-white/12"
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
          {accounts.length === 0 && (
            <p className="text-center py-10 text-white/30">No accounts found</p>
          )}
        </div>
      )}
    </div>
  );
}
