import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  getAdminVouchers, createVoucher, updateVoucher, deleteVoucher,
  awardCredits, getAccounts,
  AdminVoucher, AdminAccount,
} from '../../services/admin.service';

const BLANK_V = { name: '', description: '', cost: '', stock: '', icon: '🎁' };
const BLANK_A = { userId: '', amount: '', note: '' };

export default function AdminRewards() {
  const qc = useQueryClient();
  const [tab, setTab]             = useState<'vouchers' | 'credits'>('vouchers');
  const [showVForm, setShowVForm] = useState(false);
  const [vForm, setVForm]         = useState(BLANK_V);
  const [editVId, setEditVId]     = useState<string | null>(null);
  const [editVForm, setEditVForm] = useState<{
    name?: string; description?: string; cost?: string; stock?: string; icon?: string; isActive?: boolean;
  }>({});
  const [aForm, setAForm]         = useState(BLANK_A);

  const { data: vouchers = [] } = useQuery<AdminVoucher[]>({
    queryKey: ['admin-vouchers'],
    queryFn: getAdminVouchers,
  });

  const { data: accounts = [] } = useQuery<AdminAccount[]>({
    queryKey: ['admin-accounts'],
    queryFn: () => getAccounts(),
  });

  const createV = useMutation({
    mutationFn: () => createVoucher({
      name: vForm.name, description: vForm.description,
      cost: parseInt(vForm.cost), stock: parseInt(vForm.stock), icon: vForm.icon,
    }),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['admin-vouchers'] }); setShowVForm(false); setVForm(BLANK_V); },
  });

  const updateV = useMutation({
    mutationFn: (id: string) => updateVoucher(id, {
      ...(editVForm.name        && { name:        editVForm.name }),
      ...(editVForm.description && { description: editVForm.description }),
      ...(editVForm.cost        && { cost:         parseInt(editVForm.cost) }),
      ...(editVForm.stock       && { stock:        parseInt(editVForm.stock) }),
      ...(editVForm.isActive    !== undefined && { isActive: editVForm.isActive }),
    }),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['admin-vouchers'] }); setEditVId(null); },
  });

  const deleteV = useMutation({
    mutationFn: (id: string) => deleteVoucher(id),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['admin-vouchers'] }),
  });

  const awardC = useMutation({
    mutationFn: () => awardCredits({
      userId: aForm.userId,
      amount: parseInt(aForm.amount),
      note: aForm.note,
    }),
    onSuccess: () => { setAForm(BLANK_A); },
  });

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-white">Rewards Manager</h1>
        <p className="text-white/40 text-sm mt-1">Manage voucher shop & award credits</p>
      </div>

      {/* Tab toggle */}
      <div className="flex gap-1 bg-white/4 border border-white/8 rounded-xl p-1 w-fit">
        {(['vouchers', 'credits'] as const).map(t => (
          <button
            key={t}
            onClick={() => setTab(t)}
            className={`px-4 py-1.5 rounded-lg text-sm capitalize transition-colors ${
              tab === t ? 'bg-rh-cyan text-rh-dark font-semibold' : 'text-white/50 hover:text-white'
            }`}
          >
            {t === 'vouchers' ? '🎁 Vouchers' : '⚡ Award Credits'}
          </button>
        ))}
      </div>

      {tab === 'vouchers' && (
        <div className="space-y-4">
          <div className="flex justify-end">
            <button
              onClick={() => setShowVForm(true)}
              className="px-4 py-2 rounded-lg bg-rh-cyan text-rh-dark text-sm font-semibold hover:bg-rh-cyan/90"
            >
              + Add Voucher
            </button>
          </div>

          {/* Create voucher form */}
          {showVForm && (
            <div className="bg-white/4 border border-rh-cyan/30 rounded-xl p-5 space-y-4">
              <h2 className="text-white font-semibold">New Voucher</h2>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="text-white/40 text-xs mb-1 block">Name</label>
                  <input type="text" value={vForm.name} onChange={e => setVForm(f => ({ ...f, name: e.target.value }))} placeholder="Coffee voucher…" className="input-base" />
                </div>
                <div>
                  <label className="text-white/40 text-xs mb-1 block">Icon</label>
                  <input type="text" value={vForm.icon} onChange={e => setVForm(f => ({ ...f, icon: e.target.value }))} placeholder="🎁" className="input-base" />
                </div>
                <div className="sm:col-span-2">
                  <label className="text-white/40 text-xs mb-1 block">Description</label>
                  <input type="text" value={vForm.description} onChange={e => setVForm(f => ({ ...f, description: e.target.value }))} placeholder="Short description…" className="input-base" />
                </div>
                <div>
                  <label className="text-white/40 text-xs mb-1 block">Cost (credits)</label>
                  <input type="number" value={vForm.cost} onChange={e => setVForm(f => ({ ...f, cost: e.target.value }))} placeholder="50" className="input-base" />
                </div>
                <div>
                  <label className="text-white/40 text-xs mb-1 block">Stock</label>
                  <input type="number" value={vForm.stock} onChange={e => setVForm(f => ({ ...f, stock: e.target.value }))} placeholder="20" className="input-base" />
                </div>
              </div>
              <div className="flex gap-3">
                <button
                  onClick={() => createV.mutate()}
                  disabled={createV.isPending || !vForm.name || !vForm.cost || !vForm.stock}
                  className="px-4 py-2 rounded-lg bg-rh-cyan text-rh-dark text-sm font-semibold disabled:opacity-50"
                >
                  {createV.isPending ? 'Creating…' : 'Create'}
                </button>
                <button onClick={() => setShowVForm(false)} className="px-4 py-2 rounded-lg bg-white/8 text-white/60 text-sm">Cancel</button>
              </div>
            </div>
          )}

          {/* Voucher cards */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {vouchers.map(v => (
              <div key={v.id} className={`bg-white/4 border rounded-xl p-4 ${v.isActive ? 'border-white/8' : 'border-white/4 opacity-50'}`}>
                {editVId === v.id ? (
                  <div className="space-y-3">
                    <input type="text" value={editVForm.name ?? v.name} onChange={e => setEditVForm(f => ({ ...f, name: e.target.value }))} className="input-base text-sm" />
                    <input type="text" value={editVForm.description ?? v.description} onChange={e => setEditVForm(f => ({ ...f, description: e.target.value }))} className="input-base text-sm" />
                    <div className="grid grid-cols-2 gap-2">
                      <input type="number" value={editVForm.cost ?? String(v.cost)} onChange={e => setEditVForm(f => ({ ...f, cost: e.target.value }))} placeholder="Cost" className="input-base text-sm" />
                      <input type="number" value={editVForm.stock ?? String(v.stock)} onChange={e => setEditVForm(f => ({ ...f, stock: e.target.value }))} placeholder="Stock" className="input-base text-sm" />
                    </div>
                    <label className="flex items-center gap-2 cursor-pointer">
                      <input type="checkbox" checked={editVForm.isActive ?? v.isActive} onChange={e => setEditVForm(f => ({ ...f, isActive: e.target.checked }))} className="accent-rh-cyan" />
                      <span className="text-white/60 text-sm">Active</span>
                    </label>
                    <div className="flex gap-2">
                      <button onClick={() => updateV.mutate(v.id)} disabled={updateV.isPending} className="text-xs px-3 py-1.5 rounded bg-rh-cyan text-rh-dark font-semibold">Save</button>
                      <button onClick={() => setEditVId(null)} className="text-xs px-3 py-1.5 rounded bg-white/8 text-white/60">Cancel</button>
                    </div>
                  </div>
                ) : (
                  <>
                    <div className="flex items-start justify-between mb-2">
                      <span className="text-2xl">{v.icon}</span>
                      <div className="flex gap-1">
                        <button onClick={() => { setEditVId(v.id); setEditVForm({}); }} className="text-xs px-2 py-1 rounded bg-white/8 text-white/50 hover:bg-white/12">Edit</button>
                        <button
                          onClick={() => { if (confirm(`Delete "${v.name}"?`)) deleteV.mutate(v.id); }}
                          className="text-xs px-2 py-1 rounded bg-white/8 text-rh-rose/70 hover:bg-rh-rose/10"
                        >🗑</button>
                      </div>
                    </div>
                    <p className="text-white font-semibold text-sm">{v.name}</p>
                    <p className="text-white/40 text-xs mt-0.5">{v.description}</p>
                    <div className="flex items-center justify-between mt-3 text-xs">
                      <span className="text-rh-cyan font-mono font-bold">{v.cost} credits</span>
                      <span className="text-white/40">{v.stock} left</span>
                    </div>
                  </>
                )}
              </div>
            ))}
          </div>
          {vouchers.length === 0 && (
            <p className="text-center py-10 text-white/30">No vouchers yet</p>
          )}
        </div>
      )}

      {tab === 'credits' && (
        <div className="max-w-md space-y-4">
          <div className="bg-white/4 border border-white/8 rounded-xl p-5 space-y-4">
            <h2 className="text-white font-semibold">Award / Deduct Credits</h2>
            <p className="text-white/40 text-xs">Use a negative amount to deduct credits.</p>

            <div>
              <label className="text-white/40 text-xs mb-1 block">Student</label>
              <select value={aForm.userId} onChange={e => setAForm(f => ({ ...f, userId: e.target.value }))} className="input-base">
                <option value="">Select student…</option>
                {accounts.filter(a => a.role !== 'ADMIN').map(a => (
                  <option key={a.id} value={a.id}>{a.name} — {a.wallet?.credits ?? 0} credits</option>
                ))}
              </select>
            </div>

            <div>
              <label className="text-white/40 text-xs mb-1 block">Amount (credits)</label>
              <input
                type="number"
                value={aForm.amount}
                onChange={e => setAForm(f => ({ ...f, amount: e.target.value }))}
                placeholder="+25 or -10"
                className="input-base"
              />
            </div>

            <div>
              <label className="text-white/40 text-xs mb-1 block">Reason / Note</label>
              <input
                type="text"
                value={aForm.note}
                onChange={e => setAForm(f => ({ ...f, note: e.target.value }))}
                placeholder="Bonus for event participation…"
                className="input-base"
              />
            </div>

            {awardC.isSuccess && (
              <p className="text-green-400 text-xs">Credits awarded successfully!</p>
            )}
            {awardC.isError && (
              <p className="text-rh-rose text-xs">{(awardC.error as Error).message}</p>
            )}

            <button
              onClick={() => awardC.mutate()}
              disabled={awardC.isPending || !aForm.userId || !aForm.amount || !aForm.note}
              className="w-full py-2.5 rounded-lg bg-rh-cyan text-rh-dark font-semibold text-sm disabled:opacity-50"
            >
              {awardC.isPending ? 'Awarding…' : 'Award Credits'}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
