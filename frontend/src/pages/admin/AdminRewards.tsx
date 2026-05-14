import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Loader2 } from 'lucide-react';
import { toast } from 'sonner';
import {
  getAdminVouchers, createVoucher, updateVoucher, deleteVoucher,
  awardCredits, getAccounts,
  AdminVoucher, AdminAccount,
} from '../../services/admin.service';
import { usePageTitle } from '../../hooks/usePageTitle';
import ConfirmModal from '../../components/ConfirmModal';

const BLANK_V = { name: '', description: '', cost: '', stock: '', icon: '🎁' };
const BLANK_A = { userId: '', amount: '', note: '' };

/**
 * Rewards manager — credit-redeemable vouchers + manual credit awards.
 *
 * The old "task voucher" / claims system (upload proof → admin approves →
 * earn the voucher) was retired: chores already own the
 * do-task-earn-reward loop, so running two parallel systems just confused
 * students. Vouchers are now purely something you spend earned credits on.
 */
export default function AdminRewards() {
  usePageTitle('Rewards Manager');
  const qc = useQueryClient();

  const [tab, setTab]             = useState<'vouchers' | 'credits'>('vouchers');
  const [showVForm, setShowVForm] = useState(false);
  const [vForm, setVForm]         = useState(BLANK_V);
  const [editVId, setEditVId]     = useState<string | null>(null);
  const [editVForm, setEditVForm] = useState<{ name?: string; description?: string; cost?: string; stock?: string; isActive?: boolean }>({});
  const [aForm, setAForm]         = useState(BLANK_A);
  const [deleteTarget, setDeleteTarget] = useState<{ id: string; name: string } | null>(null);

  const { data: vouchers = [] } = useQuery<AdminVoucher[]>({
    queryKey: ['admin-vouchers'],
    queryFn:  getAdminVouchers,
  });

  const { data: accounts = [] } = useQuery<AdminAccount[]>({
    queryKey: ['admin-accounts'],
    queryFn:  () => getAccounts(),
  });

  // ── Voucher mutations ─────────────────────────────────────────
  const createV = useMutation({
    mutationFn: () => createVoucher({
      name: vForm.name, description: vForm.description,
      cost: parseInt(vForm.cost), stock: parseInt(vForm.stock), icon: vForm.icon,
    }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['admin-vouchers'] });
      setShowVForm(false);
      setVForm(BLANK_V);
      toast.success('Voucher created!');
    },
    onError: () => toast.error('Failed to create voucher.'),
  });

  const updateV = useMutation({
    mutationFn: (id: string) => updateVoucher(id, {
      ...(editVForm.name        !== undefined && { name:        editVForm.name }),
      ...(editVForm.description !== undefined && { description: editVForm.description }),
      ...(editVForm.cost        !== undefined && { cost:        parseInt(editVForm.cost) }),
      ...(editVForm.stock       !== undefined && { stock:       parseInt(editVForm.stock) }),
      ...(editVForm.isActive    !== undefined && { isActive:    editVForm.isActive }),
    }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['admin-vouchers'] });
      setEditVId(null);
      toast.success('Voucher updated!');
    },
    onError: () => toast.error('Failed to update voucher.'),
  });

  const deleteV = useMutation({
    mutationFn: (id: string) => deleteVoucher(id),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['admin-vouchers'] });
      setDeleteTarget(null);
      toast.success('Voucher deleted.');
    },
    onError: () => toast.error('Failed to delete voucher.'),
  });

  const awardC = useMutation({
    mutationFn: () => awardCredits({ userId: aForm.userId, amount: parseInt(aForm.amount), note: aForm.note }),
    onSuccess: () => { setAForm(BLANK_A); toast.success('Credits awarded!'); },
    onError:   () => toast.error('Failed to award credits.'),
  });

  return (
    <div className="space-y-6 appear">
      <div>
        <h1 className="page-title">Rewards Manager</h1>
        <p className="page-sub">Manage credit-redeemable vouchers and award credits</p>
      </div>

      {/* Tab switcher */}
      <div style={{ display: 'inline-flex', background: 'var(--bg3)', borderRadius: 10, padding: 4, gap: 2 }}>
        {([
          { key: 'vouchers', label: '🎁 Vouchers'      },
          { key: 'credits',  label: '⚡ Award Credits' },
        ] as const).map(({ key, label }) => (
          <button
            key={key}
            onClick={() => setTab(key)}
            style={{
              padding: '7px 16px', borderRadius: 7, fontSize: 13, border: 'none', cursor: 'pointer',
              fontWeight: tab === key ? 600 : 400,
              background: tab === key ? 'var(--bg2)' : 'transparent',
              color: tab === key ? 'var(--text)' : 'var(--text3)',
              fontFamily: "'Space Grotesk', sans-serif", transition: 'all .18s',
            }}
          >
            {label}
          </button>
        ))}
      </div>

      {/* Vouchers tab */}
      {tab === 'vouchers' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
            <button onClick={() => setShowVForm(true)} className="btn-primary" style={{ padding: '9px 18px', fontSize: 13 }}>+ Add Voucher</button>
          </div>

          {showVForm && (
            <div className="card" style={{ padding: '20px 24px', borderColor: 'rgba(0,204,204,.25)' }}>
              <p style={{ fontSize: 14, fontWeight: 600, color: 'var(--text)', marginBottom: 14 }}>New Voucher</p>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3" style={{ marginBottom: 14 }}>
                <div>
                  <label className="field-label">Name</label>
                  <input type="text" value={vForm.name} onChange={e => setVForm(f => ({ ...f, name: e.target.value }))} placeholder="Coffee voucher…" className="input-base" />
                </div>
                <div>
                  <label className="field-label">Icon</label>
                  <input type="text" value={vForm.icon} onChange={e => setVForm(f => ({ ...f, icon: e.target.value }))} placeholder="🎁" className="input-base" />
                </div>
                <div style={{ gridColumn: '1 / -1' }}>
                  <label className="field-label">Description</label>
                  <input type="text" value={vForm.description} onChange={e => setVForm(f => ({ ...f, description: e.target.value }))} placeholder="Short description…" className="input-base" />
                </div>
                <div>
                  <label className="field-label">Cost (credits)</label>
                  <input type="number" value={vForm.cost} onChange={e => setVForm(f => ({ ...f, cost: e.target.value }))} placeholder="50" className="input-base" />
                </div>
                <div>
                  <label className="field-label">Stock</label>
                  <input type="number" value={vForm.stock} onChange={e => setVForm(f => ({ ...f, stock: e.target.value }))} placeholder="20" className="input-base" />
                </div>
              </div>

              <div style={{ display: 'flex', gap: 10 }}>
                <button
                  onClick={() => createV.mutate()}
                  disabled={createV.isPending || !vForm.name || !vForm.cost || !vForm.stock}
                  className="btn-primary"
                  style={{ padding: '9px 20px', fontSize: 13 }}
                >
                  {createV.isPending ? 'Creating…' : 'Create'}
                </button>
                <button onClick={() => setShowVForm(false)} className="btn-ghost" style={{ padding: '9px 16px', fontSize: 13 }}>Cancel</button>
              </div>
            </div>
          )}

          {/* Voucher cards */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {vouchers.map(v => (
              <div key={v.id} className="card-sm" style={{ padding: 16, opacity: v.isActive ? 1 : 0.5 }}>
                {editVId === v.id ? (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                    <input type="text" value={editVForm.name ?? v.name} onChange={e => setEditVForm(f => ({ ...f, name: e.target.value }))} className="input-base" style={{ fontSize: 13 }} />
                    <input type="text" value={editVForm.description ?? v.description} onChange={e => setEditVForm(f => ({ ...f, description: e.target.value }))} className="input-base" style={{ fontSize: 13 }} />
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
                      <input type="number" value={editVForm.cost ?? String(v.cost)} onChange={e => setEditVForm(f => ({ ...f, cost: e.target.value }))} placeholder="Cost" className="input-base" style={{ fontSize: 12 }} />
                      <input type="number" value={editVForm.stock ?? String(v.stock)} onChange={e => setEditVForm(f => ({ ...f, stock: e.target.value }))} placeholder="Stock" className="input-base" style={{ fontSize: 12 }} />
                    </div>
                    <label style={{ display: 'flex', alignItems: 'center', gap: 8, cursor: 'pointer' }}>
                      <input type="checkbox" checked={editVForm.isActive ?? v.isActive} onChange={e => setEditVForm(f => ({ ...f, isActive: e.target.checked }))} style={{ accentColor: 'var(--cyan)' }} />
                      <span style={{ fontSize: 13, color: 'var(--text2)' }}>Active</span>
                    </label>
                    <div style={{ display: 'flex', gap: 6 }}>
                      <button onClick={() => updateV.mutate(v.id)} disabled={updateV.isPending} className="btn-primary" style={{ padding: '6px 14px', fontSize: 12 }}>Save</button>
                      <button onClick={() => setEditVId(null)} className="btn-ghost" style={{ padding: '6px 10px', fontSize: 12 }}>Cancel</button>
                    </div>
                  </div>
                ) : (
                  <>
                    <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 10 }}>
                      <span style={{ fontSize: 24 }}>{v.icon}</span>
                      <div style={{ display: 'flex', gap: 4 }}>
                        <button onClick={() => { setEditVId(v.id); setEditVForm({}); }} className="btn-ghost" style={{ padding: '4px 10px', fontSize: 11 }}>Edit</button>
                        <button onClick={() => setDeleteTarget({ id: v.id, name: v.name })} style={{ padding: '4px 10px', fontSize: 11, borderRadius: 6, cursor: 'pointer', background: 'rgba(232,25,122,.08)', border: '1px solid rgba(232,25,122,.2)', color: 'var(--rose)' }}>🗑</button>
                      </div>
                    </div>
                    <p style={{ fontSize: 14, fontWeight: 600, color: 'var(--text)' }}>{v.name}</p>
                    <p style={{ fontSize: 12, color: 'var(--text3)', marginTop: 4 }}>{v.description}</p>
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginTop: 12 }}>
                      <span style={{ fontFamily: "'IBM Plex Mono', monospace", fontSize: 13, fontWeight: 700, color: 'var(--cyan)' }}>{v.cost} credits</span>
                      <span style={{ fontFamily: "'IBM Plex Mono', monospace", fontSize: 11, color: 'var(--text3)' }}>{v.stock} left</span>
                    </div>
                  </>
                )}
              </div>
            ))}
          </div>
          {vouchers.length === 0 && (
            <p style={{ textAlign: 'center', padding: '40px 0', color: 'var(--text3)', fontSize: 13 }}>No vouchers yet</p>
          )}
        </div>
      )}

      {/* Credits tab */}
      {tab === 'credits' && (
        <div style={{ maxWidth: 440 }}>
          <div className="card" style={{ padding: '20px 24px' }}>
            <p style={{ fontSize: 14, fontWeight: 600, color: 'var(--text)', marginBottom: 4 }}>Award / Deduct Credits</p>
            <p style={{ fontFamily: "'IBM Plex Mono', monospace", fontSize: 11, color: 'var(--text3)', marginBottom: 20 }}>Use a negative amount to deduct credits.</p>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
              <div>
                <label className="field-label">Student</label>
                <select value={aForm.userId} onChange={e => setAForm(f => ({ ...f, userId: e.target.value }))} className="input-base">
                  <option value="">Select student…</option>
                  {accounts.filter(a => a.role !== 'ADMIN').map(a => (
                    <option key={a.id} value={a.id}>{a.name} — {a.wallet?.credits ?? 0} credits</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="field-label">Amount (credits)</label>
                <input type="number" value={aForm.amount} onChange={e => setAForm(f => ({ ...f, amount: e.target.value }))} placeholder="+25 or -10" className="input-base" />
              </div>
              <div>
                <label className="field-label">Reason / Note</label>
                <input type="text" value={aForm.note} onChange={e => setAForm(f => ({ ...f, note: e.target.value }))} placeholder="Bonus for event participation…" className="input-base" />
              </div>
            </div>
            <button onClick={() => awardC.mutate()} disabled={awardC.isPending || !aForm.userId || !aForm.amount || !aForm.note} className="btn-primary" style={{ width: '100%', padding: '11px 0', fontSize: 14, marginTop: 20, justifyContent: 'center' }}>
              {awardC.isPending ? <><Loader2 size={13} className="animate-spin" /> Awarding…</> : 'Award Credits'}
            </button>
          </div>
        </div>
      )}

      <ConfirmModal
        open={!!deleteTarget}
        title="Delete voucher"
        message={`Are you sure you want to delete "${deleteTarget?.name}"? This cannot be undone.`}
        confirmLabel="Delete"
        danger
        loading={deleteV.isPending}
        onConfirm={() => deleteTarget && deleteV.mutate(deleteTarget.id)}
        onCancel={() => setDeleteTarget(null)}
      />
    </div>
  );
}
