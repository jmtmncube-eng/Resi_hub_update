import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Users, Loader2 } from 'lucide-react';
import { toast } from 'sonner';
import { getAccounts, updateAccount, AdminAccount } from '../../services/admin.service';
import { usePageTitle } from '../../hooks/usePageTitle';

const ROLE_BADGE: Record<string, string> = {
  ADMIN:           'badge-rose',
  ACTIVE_STUDENT:  'badge-cyan',
  PENDING_STUDENT: 'badge-gray',
};

const roleLabel: Record<string, string> = {
  ADMIN:           'Admin',
  ACTIVE_STUDENT:  'Active',
  PENDING_STUDENT: 'Pending',
};

export default function AdminAccounts() {
  usePageTitle('Accounts · Admin');
  const qc = useQueryClient();
  const [search, setSearch]     = useState('');
  const [editId, setEditId]     = useState<string | null>(null);
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
      toast.success('Account updated!');
    },
    onError: () => toast.error('Failed to update account.'),
  });

  const totals = {
    all:     accounts.length,
    active:  accounts.filter(a => a.role === 'ACTIVE_STUDENT').length,
    pending: accounts.filter(a => a.role === 'PENDING_STUDENT').length,
    admin:   accounts.filter(a => a.role === 'ADMIN').length,
  };

  if (isError) return (
    <p style={{ color: 'var(--rose)', fontSize: 13, padding: 24 }}>Failed to load accounts. Is the backend running?</p>
  );

  return (
    <div className="space-y-6 appear">

      {/* Header */}
      <div>
        <h1 className="page-title">Accounts</h1>
        <p className="page-sub">{totals.active} active · {totals.pending} pending · {totals.admin} admins</p>
      </div>

      {/* Search */}
      <input
        type="text"
        placeholder="Search by name or email…"
        value={search}
        onChange={e => setSearch(e.target.value)}
        className="input-base"
        style={{ maxWidth: 320 }}
      />

      {/* Table */}
      {isLoading ? (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          {[...Array(6)].map((_, i) => <div key={i} className="skeleton" style={{ height: 56, borderRadius: 8 }} />)}
        </div>
      ) : accounts.length === 0 ? (
        <div className="card empty-state">
          <Users size={28} style={{ color: 'var(--text4)', margin: '0 auto 12px' }} />
          <p style={{ fontWeight: 600, color: 'var(--text2)' }}>No accounts found</p>
        </div>
      ) : (
        <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
          <div style={{ overflowX: 'auto' }}>
            <table className="rh-table">
              <thead>
                <tr>
                  <th>User</th>
                  <th>Role</th>
                  <th>Room</th>
                  <th>Credits</th>
                  <th>Joined</th>
                  <th></th>
                </tr>
              </thead>
              <tbody>
                {accounts.map(a => (
                  <tr key={a.id}>
                    {editId === a.id ? (
                      <>
                        <td colSpan={3}>
                          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: 10 }}>
                            <div>
                              <label className="field-label">Name</label>
                              <input
                                type="text"
                                value={editForm.name}
                                onChange={e => setEditForm(f => ({ ...f, name: e.target.value }))}
                                placeholder={a.name}
                                className="input-base"
                              />
                            </div>
                            <div>
                              <label className="field-label">Role</label>
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
                              <label className="field-label">Phone</label>
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
                        <td />
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
                          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                            {a.avatarUrl ? (
                              <img src={a.avatarUrl} alt="" style={{ width: 32, height: 32, borderRadius: '50%', objectFit: 'cover' }} />
                            ) : (
                              <div className="avatar avatar-cyan" style={{ width: 32, height: 32, fontSize: 11, fontWeight: 700 }}>
                                {a.name.charAt(0).toUpperCase()}
                              </div>
                            )}
                            <div>
                              <p style={{ fontWeight: 500, color: 'var(--text)' }}>{a.name}</p>
                              <p style={{ fontFamily: "'IBM Plex Mono', monospace", fontSize: 10, color: 'var(--text3)', marginTop: 2 }}>{a.email}</p>
                            </div>
                          </div>
                        </td>
                        <td>
                          <span className={`badge ${ROLE_BADGE[a.role] ?? 'badge-gray'}`}>
                            {roleLabel[a.role] ?? a.role}
                          </span>
                        </td>
                        <td style={{ fontFamily: "'IBM Plex Mono', monospace", fontSize: 11, color: 'var(--text2)' }}>
                          {a.allocation?.room
                            ? `Blk ${a.allocation.room.block} – ${a.allocation.room.number}`
                            : <span style={{ color: 'var(--text4)' }}>No room</span>
                          }
                        </td>
                        <td style={{ fontFamily: "'IBM Plex Mono', monospace", fontSize: 13, color: 'var(--cyan)' }}>
                          {a.wallet?.credits ?? 0}
                        </td>
                        <td style={{ fontFamily: "'IBM Plex Mono', monospace", fontSize: 11, color: 'var(--text3)' }}>
                          {new Date(a.createdAt).toLocaleDateString()}
                        </td>
                        <td>
                          <button
                            onClick={() => {
                              setEditId(a.id);
                              setEditForm({ name: a.name, role: a.role, phone: a.phone ?? '' });
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
        </div>
      )}
    </div>
  );
}
