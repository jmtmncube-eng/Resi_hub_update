import { useMemo, useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { AxiosError } from 'axios';
import { Users, Loader2, Check, Pencil, X, Sparkles, ShieldCheck } from 'lucide-react';
import { toast } from 'sonner';
import { getAccounts, updateAccount, approveAccount, AdminAccount } from '../../services/admin.service';
import { usePageTitle } from '../../hooks/usePageTitle';

// ─────────────────────────────────────────────────────────────────
// Constants & helpers
// ─────────────────────────────────────────────────────────────────

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

type RoleFilter = 'all' | 'pending' | 'active' | 'admin';

const FILTERS: { value: RoleFilter; label: string }[] = [
  { value: 'all',     label: 'All' },
  { value: 'pending', label: 'Pending' },
  { value: 'active',  label: 'Active' },
  { value: 'admin',   label: 'Admins' },
];

function extractError(err: unknown, fallback: string): string {
  if (err instanceof AxiosError) {
    const data = err.response?.data as { error?: string } | undefined;
    return data?.error ?? err.message ?? fallback;
  }
  return fallback;
}

// ─────────────────────────────────────────────────────────────────
// Component
// ─────────────────────────────────────────────────────────────────

export default function AdminAccounts() {
  usePageTitle('Accounts · Admin');
  const qc = useQueryClient();

  const [search, setSearch]     = useState('');
  const [filter, setFilter]     = useState<RoleFilter>('all');
  const [editing, setEditing]   = useState<AdminAccount | null>(null);

  const { data: accounts = [], isLoading, isError } = useQuery<AdminAccount[]>({
    queryKey: ['admin-accounts', search],
    queryFn:  () => getAccounts(search || undefined),
  });

  const filtered = useMemo(() => {
    if (filter === 'all') return accounts;
    if (filter === 'pending') return accounts.filter(a => a.role === 'PENDING_STUDENT');
    if (filter === 'active')  return accounts.filter(a => a.role === 'ACTIVE_STUDENT');
    return accounts.filter(a => a.role === 'ADMIN');
  }, [accounts, filter]);

  const totals = {
    all:     accounts.length,
    active:  accounts.filter(a => a.role === 'ACTIVE_STUDENT').length,
    pending: accounts.filter(a => a.role === 'PENDING_STUDENT').length,
    admin:   accounts.filter(a => a.role === 'ADMIN').length,
  };

  // ── Mutations ──────────────────────────────────────────────────
  const approveMut = useMutation({
    mutationFn: (id: string) => approveAccount(id),
    onSuccess: (data) => {
      qc.invalidateQueries({ queryKey: ['admin-accounts'] });
      toast.success(`${data.name} approved as Active student`);
    },
    onError: (err) => toast.error(extractError(err, 'Failed to approve account')),
  });

  const promoteMut = useMutation({
    mutationFn: ({ id, role }: { id: string; role: string }) => updateAccount(id, { role }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['admin-accounts'] });
      toast.success('Role updated');
    },
    onError: (err) => toast.error(extractError(err, 'Failed to change role')),
  });

  if (isError) return (
    <p style={{ color: 'var(--rose)', fontSize: 13, padding: 24 }}>
      Failed to load accounts. Is the backend running?
    </p>
  );

  return (
    <div className="space-y-5 appear">
      {/* Header */}
      <div>
        <h1 className="page-title">Accounts</h1>
        <p className="page-sub">
          {totals.all} total · {totals.active} active · {totals.pending} pending · {totals.admin} admins
        </p>
      </div>

      {/* KPI strip */}
      <div className="stagger" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(180px, 1fr))', gap: 12 }}>
        <KpiPill label="Pending review" value={totals.pending} accent="rose"  hint={totals.pending > 0 ? 'tap to filter' : 'all clear'}
                 onClick={() => setFilter('pending')} active={filter === 'pending'} />
        <KpiPill label="Active students" value={totals.active}  accent="cyan"  onClick={() => setFilter('active')}  active={filter === 'active'} />
        <KpiPill label="Admins"          value={totals.admin}   accent="rose"  onClick={() => setFilter('admin')}   active={filter === 'admin'} />
        <KpiPill label="Total accounts"  value={totals.all}     accent="text"  onClick={() => setFilter('all')}     active={filter === 'all'} />
      </div>

      {/* Search + filter */}
      <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap', alignItems: 'center' }}>
        <input
          type="text"
          placeholder="Search by name or email…"
          value={search}
          onChange={e => setSearch(e.target.value)}
          className="input-base"
          style={{ maxWidth: 320, flex: '1 1 240px' }}
        />
        <div style={{ display: 'inline-flex', gap: 4, padding: 4, background: 'var(--bg3)', borderRadius: 10, border: '1px solid var(--border)' }}>
          {FILTERS.map(f => (
            <button
              key={f.value}
              onClick={() => setFilter(f.value)}
              className="press-soft"
              style={{
                padding: '6px 14px',
                borderRadius: 7,
                border: 'none',
                fontSize: 12,
                fontFamily: "'IBM Plex Mono', monospace",
                fontWeight: filter === f.value ? 600 : 400,
                background: filter === f.value ? 'var(--bg2)' : 'transparent',
                color:      filter === f.value ? 'var(--text)' : 'var(--text3)',
                cursor: 'pointer',
              }}
            >
              {f.label}
            </button>
          ))}
        </div>
      </div>

      {/* Table */}
      {isLoading ? (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          {[...Array(6)].map((_, i) => <div key={i} className="skeleton" style={{ height: 56, borderRadius: 8 }} />)}
        </div>
      ) : filtered.length === 0 ? (
        <div className="card empty-state">
          <Users size={28} style={{ color: 'var(--text4)', margin: '0 auto 12px' }} />
          <p style={{ fontWeight: 600, color: 'var(--text2)' }}>No accounts in this view</p>
        </div>
      ) : (
        <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
          <div style={{ overflowX: 'auto' }}>
            <table className="rh-table">
              <thead>
                <tr>
                  <th>User</th>
                  <th>Role</th>
                  <th>Programme</th>
                  <th>Room</th>
                  <th>Credits</th>
                  <th>Joined</th>
                  <th style={{ textAlign: 'right' }}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map(a => (
                  <tr key={a.id} className="hover-lift">
                    <td>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                        {a.avatarUrl ? (
                          <img src={a.avatarUrl} alt="" style={{ width: 32, height: 32, borderRadius: '50%', objectFit: 'cover' }} />
                        ) : (
                          <div className={`avatar ${a.role === 'ADMIN' ? 'avatar-rose' : 'avatar-cyan'}`}
                               style={{ width: 32, height: 32, fontSize: 11, fontWeight: 700 }}>
                            {a.name.charAt(0).toUpperCase()}
                          </div>
                        )}
                        <div style={{ minWidth: 0 }}>
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
                    <td style={{ fontSize: 12, color: 'var(--text2)' }}>
                      {a.program
                        ? <>
                            <p>{a.program}</p>
                            {(a.year || a.university) && (
                              <p style={{ fontFamily: "'IBM Plex Mono', monospace", fontSize: 10, color: 'var(--text3)', marginTop: 2 }}>
                                {a.university ?? ''}{a.year ? ` · Y${a.year}` : ''}
                              </p>
                            )}
                          </>
                        : <span style={{ color: 'var(--text4)' }}>—</span>
                      }
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
                      <div style={{ display: 'flex', gap: 6, justifyContent: 'flex-end', flexWrap: 'wrap' }}>
                        {a.role === 'PENDING_STUDENT' && (
                          <button
                            onClick={() => approveMut.mutate(a.id)}
                            disabled={approveMut.isPending && approveMut.variables === a.id}
                            className="press-soft"
                            title="Approve as Active student"
                            style={{
                              display: 'flex', alignItems: 'center', gap: 5,
                              padding: '5px 11px', borderRadius: 7,
                              fontSize: 12, fontWeight: 600,
                              background: 'rgba(74,222,128,.12)',
                              color: '#4ade80',
                              border: '1px solid rgba(74,222,128,.3)',
                              cursor: 'pointer',
                            }}
                          >
                            {approveMut.isPending && approveMut.variables === a.id
                              ? <Loader2 size={11} className="animate-spin" />
                              : <Check size={11} />} Approve
                          </button>
                        )}
                        {a.role === 'ACTIVE_STUDENT' && (
                          <button
                            onClick={() => {
                              if (confirm(`Promote ${a.name} to ADMIN?`)) {
                                promoteMut.mutate({ id: a.id, role: 'ADMIN' });
                              }
                            }}
                            className="btn-ghost press-soft"
                            title="Promote to admin"
                            style={{
                              display: 'flex', alignItems: 'center', gap: 5,
                              padding: '5px 11px', fontSize: 12,
                            }}
                          >
                            <ShieldCheck size={11} /> Promote
                          </button>
                        )}
                        <button
                          onClick={() => setEditing(a)}
                          className="btn-ghost press-soft"
                          style={{ display: 'flex', alignItems: 'center', gap: 5, padding: '5px 11px', fontSize: 12 }}
                        >
                          <Pencil size={11} /> Edit
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {editing && <EditAccountModal account={editing} onClose={() => setEditing(null)} />}
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────
// Sub-components
// ─────────────────────────────────────────────────────────────────

function KpiPill({
  label, value, accent, hint, onClick, active,
}: {
  label: string; value: number; accent: 'cyan' | 'rose' | 'text';
  hint?: string; onClick?: () => void; active?: boolean;
}) {
  const color = accent === 'cyan' ? 'var(--cyan)' : accent === 'rose' ? 'var(--rose)' : 'var(--text)';
  return (
    <button
      onClick={onClick}
      className="card-sm hover-lift press-soft"
      style={{
        padding: '14px 16px',
        textAlign: 'left',
        border: `1px solid ${active ? color : 'var(--border)'}`,
        background: active ? `linear-gradient(135deg, ${color}11, var(--bg2))` : 'var(--bg2)',
        cursor: 'pointer',
      }}
    >
      <p className="micro-label" style={{ marginBottom: 6 }}>{label}</p>
      <p style={{ fontSize: 22, fontWeight: 700, color, fontFamily: "'Space Grotesk', sans-serif", lineHeight: 1 }}>
        {value}
      </p>
      {hint && <p style={{ fontSize: 10, color: 'var(--text3)', marginTop: 4, fontFamily: "'IBM Plex Mono', monospace" }}>{hint}</p>}
    </button>
  );
}

// ─────────────────────────────────────────────────────────────────
// Edit modal — full fields
// ─────────────────────────────────────────────────────────────────

interface EditFormState {
  name: string; email: string; role: string; phone: string;
  university: string; program: string; year: string; bio: string;
}

function EditAccountModal({ account, onClose }: { account: AdminAccount; onClose: () => void }) {
  const qc = useQueryClient();
  const [form, setForm] = useState<EditFormState>({
    name:       account.name,
    email:      account.email,
    role:       account.role,
    phone:      account.phone ?? '',
    university: account.university ?? '',
    program:    account.program ?? '',
    year:       account.year != null ? String(account.year) : '',
    bio:        account.bio ?? '',
  });

  const update = (key: keyof EditFormState) => (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) =>
    setForm(f => ({ ...f, [key]: e.target.value }));

  const saveMut = useMutation({
    mutationFn: () => updateAccount(account.id, {
      name:       form.name.trim(),
      email:      form.email.trim() || undefined,
      role:       form.role,
      phone:      form.phone.trim(),
      university: form.university.trim(),
      program:    form.program.trim(),
      year:       form.year ? Number(form.year) : null,
      bio:        form.bio.trim(),
    }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['admin-accounts'] });
      toast.success('Account updated');
      onClose();
    },
    onError: (err) => toast.error(extractError(err, 'Failed to update account')),
  });

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-card appear" onClick={e => e.stopPropagation()} style={{ maxWidth: 560 }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 18 }}>
          <div>
            <p style={{ fontSize: 16, fontWeight: 700, color: 'var(--text)' }}>Edit account</p>
            <p style={{ fontSize: 11, color: 'var(--text3)', fontFamily: "'IBM Plex Mono', monospace", marginTop: 2 }}>{account.email}</p>
          </div>
          <button onClick={onClose} className="btn-ghost" style={{ padding: 6, borderRadius: 8 }} aria-label="Close">
            <X size={14} />
          </button>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 12 }}>
          <ModalField label="Name">
            <input value={form.name} onChange={update('name')} className="input-base" />
          </ModalField>
          <ModalField label="Email">
            <input value={form.email} onChange={update('email')} type="email" className="input-base" />
          </ModalField>
          <ModalField label="Role">
            <select value={form.role} onChange={update('role')} className="input-base">
              <option value="PENDING_STUDENT">Pending student</option>
              <option value="ACTIVE_STUDENT">Active student</option>
              <option value="ADMIN">Admin</option>
            </select>
          </ModalField>
          <ModalField label="Phone">
            <input value={form.phone} onChange={update('phone')} placeholder="+27 ..." className="input-base" />
          </ModalField>
          <ModalField label="University">
            <input value={form.university} onChange={update('university')} className="input-base" />
          </ModalField>
          <ModalField label="Programme / Degree">
            <input value={form.program} onChange={update('program')} className="input-base" />
          </ModalField>
          <ModalField label="Year">
            <input value={form.year} onChange={update('year')} type="number" min={1} max={10} className="input-base" />
          </ModalField>
          <ModalField label="Credits">
            <input value={String(account.wallet?.credits ?? 0)} disabled className="input-base"
                   style={{ opacity: 0.6, fontFamily: "'IBM Plex Mono', monospace" }} />
          </ModalField>
          <div style={{ gridColumn: '1 / -1' }}>
            <ModalField label="Bio">
              <textarea value={form.bio} onChange={update('bio')} rows={2} className="input-base" maxLength={500} />
            </ModalField>
          </div>
        </div>

        {form.role !== account.role && (
          <div style={{
            marginTop: 14, padding: '10px 14px',
            background: 'rgba(232,25,122,.06)',
            border: '1px solid rgba(232,25,122,.2)',
            borderRadius: 8,
            display: 'flex', alignItems: 'center', gap: 8,
            fontSize: 12, color: 'var(--text2)',
          }}>
            <Sparkles size={13} style={{ color: 'var(--rose)' }} />
            Role change: <b style={{ color: 'var(--text)' }}>{roleLabel[account.role]}</b> → <b style={{ color: 'var(--text)' }}>{roleLabel[form.role]}</b>
          </div>
        )}

        <div style={{ display: 'flex', gap: 10, marginTop: 20 }}>
          <button
            onClick={() => saveMut.mutate()}
            disabled={saveMut.isPending || !form.name.trim()}
            className="btn-primary"
            style={{ flex: 1, padding: '10px 0', fontSize: 13 }}
          >
            {saveMut.isPending ? <Loader2 size={13} className="animate-spin" /> : 'Save changes'}
          </button>
          <button onClick={onClose} className="btn-ghost" style={{ flex: 1, padding: '10px 0', fontSize: 13 }}>
            Cancel
          </button>
        </div>
      </div>
    </div>
  );
}

function ModalField({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <label className="field-label">{label}</label>
      {children}
    </div>
  );
}
