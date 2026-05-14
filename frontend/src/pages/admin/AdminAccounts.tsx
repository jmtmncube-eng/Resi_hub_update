import { useMemo, useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { AxiosError } from 'axios';
import { Users, Loader2, Check, Pencil, X, Sparkles, ShieldCheck, UserX, UserCheck, AlertTriangle, FileSearch, Eye } from 'lucide-react';
import { toast } from 'sonner';
import { getAccounts, updateAccount, approveAccount, setAccountActive, AdminAccount } from '../../services/admin.service';
import { listSubmittedApplications } from '../../services/application.service';
import { useAuth } from '../../contexts/AuthContext';
import { usePageTitle } from '../../hooks/usePageTitle';
import { Modal } from '../../components/Modal';
import { useConfirm } from '../../components/useConfirm';
import ApplicationReviewModal from '../../components/ApplicationReviewModal';
import AccountOverviewDrawer from '../../components/AccountOverviewDrawer';
import { UserX as UserXIcon } from 'lucide-react';

// ─────────────────────────────────────────────────────────────────
// Constants & helpers
// ─────────────────────────────────────────────────────────────────

const ROLE_BADGE: Record<string, string> = {
  ADMIN:           'badge-rose',
  MANAGER:         'badge-rose',
  MAINTENANCE:     'badge-rose',
  ACTIVE_STUDENT:  'badge-cyan',
  PENDING_STUDENT: 'badge-gray',
};

const roleLabel: Record<string, string> = {
  ADMIN:           'Admin',
  MANAGER:         'Manager',
  MAINTENANCE:     'Maintenance',
  ACTIVE_STUDENT:  'Active',
  PENDING_STUDENT: 'Pending',
};

/** Owner + delegated staff. */
const STAFF_ROLES = ['ADMIN', 'MANAGER', 'MAINTENANCE'];

type RoleFilter = 'all' | 'pending' | 'active' | 'staff';

const FILTERS: { value: RoleFilter; label: string }[] = [
  { value: 'all',     label: 'All' },
  { value: 'pending', label: 'Pending' },
  { value: 'active',  label: 'Active' },
  { value: 'staff',   label: 'Staff' },
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
  const { user: me } = useAuth();
  const confirm = useConfirm();

  const [search, setSearch]     = useState('');
  const [filter, setFilter]     = useState<RoleFilter>('all');
  const [editing, setEditing]   = useState<AdminAccount | null>(null);
  const [promoting, setPromoting] = useState<AdminAccount | null>(null);
  const [reviewing, setReviewing] = useState<AdminAccount | null>(null);
  const [viewingId, setViewingId] = useState<string | null>(null);

  // Pre-fetch submitted apps so we know which pending students have docs ready
  const { data: submittedApps = [] } = useQuery({
    queryKey: ['admin-applications'],
    queryFn:  listSubmittedApplications,
  });
  const submittedIds = useMemo(
    () => new Set(submittedApps.filter(a => a.applicationStatus === 'SUBMITTED').map(a => a.id)),
    [submittedApps],
  );

  const { data: accounts = [], isLoading, isError } = useQuery<AdminAccount[]>({
    queryKey: ['admin-accounts', search],
    queryFn:  () => getAccounts(search || undefined),
  });

  const filtered = useMemo(() => {
    if (filter === 'all') return accounts;
    if (filter === 'pending') return accounts.filter(a => a.role === 'PENDING_STUDENT');
    if (filter === 'active')  return accounts.filter(a => a.role === 'ACTIVE_STUDENT');
    return accounts.filter(a => STAFF_ROLES.includes(a.role));
  }, [accounts, filter]);

  const totals = {
    all:     accounts.length,
    active:  accounts.filter(a => a.role === 'ACTIVE_STUDENT').length,
    pending: accounts.filter(a => a.role === 'PENDING_STUDENT').length,
    staff:   accounts.filter(a => STAFF_ROLES.includes(a.role)).length,
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

  const activeMut = useMutation({
    mutationFn: ({ id, isActive }: { id: string; isActive: boolean }) => setAccountActive(id, isActive),
    onSuccess: (data) => {
      qc.invalidateQueries({ queryKey: ['admin-accounts'] });
      toast.success(data.isActive ? `${data.name} reactivated` : `${data.name} deactivated`);
    },
    onError: (err) => toast.error(extractError(err, 'Failed to change account state')),
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
          {totals.all} total · {totals.active} active · {totals.pending} pending · {totals.staff} staff
        </p>
      </div>

      {/* KPI strip */}
      <div className="stagger" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(180px, 1fr))', gap: 12 }}>
        <KpiPill label="Pending review" value={totals.pending} accent="rose"  hint={totals.pending > 0 ? 'tap to filter' : 'all clear'}
                 onClick={() => setFilter('pending')} active={filter === 'pending'} />
        <KpiPill label="Active students" value={totals.active}  accent="cyan"  onClick={() => setFilter('active')}  active={filter === 'active'} />
        <KpiPill label="Staff"           value={totals.staff}   accent="rose"  onClick={() => setFilter('staff')}   active={filter === 'staff'} />
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
                  <th>State</th>
                  <th>Programme</th>
                  <th>Room</th>
                  <th>Credits</th>
                  <th>Joined</th>
                  <th style={{ textAlign: 'right' }}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map(a => {
                  const isDeactivated = a.isActive === false;
                  return (
                  <tr key={a.id} className="hover-lift" style={{ opacity: isDeactivated ? 0.55 : 1 }}>
                    <td>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                        {a.avatarUrl ? (
                          <img src={a.avatarUrl} alt="" style={{ width: 32, height: 32, borderRadius: '50%', objectFit: 'cover', filter: isDeactivated ? 'grayscale(1)' : 'none' }} />
                        ) : (
                          <div className={`avatar ${a.role === 'ADMIN' ? 'avatar-rose' : 'avatar-cyan'}`}
                               style={{ width: 32, height: 32, fontSize: 11, fontWeight: 700, filter: isDeactivated ? 'grayscale(1)' : 'none' }}>
                            {a.name.charAt(0).toUpperCase()}
                          </div>
                        )}
                        <div style={{ minWidth: 0 }}>
                          <p style={{ fontWeight: 500, color: 'var(--text)', textDecoration: isDeactivated ? 'line-through' : 'none' }}>{a.name}</p>
                          <p style={{ fontFamily: "'IBM Plex Mono', monospace", fontSize: 10, color: 'var(--text3)', marginTop: 2 }}>{a.email}</p>
                        </div>
                      </div>
                    </td>
                    <td>
                      <span className={`badge ${ROLE_BADGE[a.role] ?? 'badge-gray'}`}>
                        {roleLabel[a.role] ?? a.role}
                      </span>
                    </td>
                    <td>
                      {isDeactivated ? (
                        <span style={{
                          display: 'inline-flex', alignItems: 'center', gap: 4,
                          fontSize: 10, padding: '3px 9px', borderRadius: 999,
                          background: 'rgba(232,25,122,.12)', color: 'var(--rose)',
                          border: '1px solid rgba(232,25,122,.3)',
                          fontFamily: "'IBM Plex Mono', monospace", textTransform: 'uppercase', letterSpacing: '.05em',
                        }}>
                          <span style={{ width: 5, height: 5, borderRadius: '50%', background: 'var(--rose)' }} />
                          Disabled
                        </span>
                      ) : (
                        <span style={{
                          display: 'inline-flex', alignItems: 'center', gap: 4,
                          fontSize: 10, padding: '3px 9px', borderRadius: 999,
                          background: 'rgba(74,222,128,.10)', color: '#4ade80',
                          border: '1px solid rgba(74,222,128,.25)',
                          fontFamily: "'IBM Plex Mono', monospace", textTransform: 'uppercase', letterSpacing: '.05em',
                        }}>
                          <span style={{ width: 5, height: 5, borderRadius: '50%', background: '#4ade80' }} />
                          Active
                        </span>
                      )}
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
                          submittedIds.has(a.id) ? (
                            <button
                              onClick={() => setReviewing(a)}
                              className="press-soft"
                              title="Review submitted application docs"
                              style={{
                                display: 'flex', alignItems: 'center', gap: 5,
                                padding: '5px 11px', borderRadius: 7,
                                fontSize: 12, fontWeight: 600,
                                background: 'rgba(0,204,204,.12)',
                                color: 'var(--cyan)',
                                border: '1px solid rgba(0,204,204,.3)',
                                cursor: 'pointer',
                              }}
                            >
                              <FileSearch size={11} /> Review
                            </button>
                          ) : (
                            <button
                              onClick={() => approveMut.mutate(a.id)}
                              disabled={approveMut.isPending && approveMut.variables === a.id}
                              className="press-soft"
                              title="No application submitted — approve directly (legacy bypass)"
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
                          )
                        )}
                        {a.role === 'ACTIVE_STUDENT' && (
                          <button
                            onClick={() => setPromoting(a)}
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
                          onClick={() => setViewingId(a.id)}
                          className="btn-ghost press-soft"
                          title="Open overview"
                          style={{ display: 'flex', alignItems: 'center', gap: 5, padding: '5px 11px', fontSize: 12 }}
                        >
                          <Eye size={11} /> View
                        </button>
                        <button
                          onClick={() => setEditing(a)}
                          className="btn-ghost press-soft"
                          style={{ display: 'flex', alignItems: 'center', gap: 5, padding: '5px 11px', fontSize: 12 }}
                        >
                          <Pencil size={11} /> Edit
                        </button>
                        {/* Self-protection: don't let the current admin disable their own account */}
                        {a.id !== me?.id && (
                          isDeactivated ? (
                            <button
                              onClick={() => activeMut.mutate({ id: a.id, isActive: true })}
                              disabled={activeMut.isPending && activeMut.variables?.id === a.id}
                              className="press-soft"
                              title="Reactivate account — student can log in again"
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
                              {activeMut.isPending && activeMut.variables?.id === a.id
                                ? <Loader2 size={11} className="animate-spin" />
                                : <UserCheck size={11} />} Activate
                            </button>
                          ) : (
                            <button
                              onClick={async () => {
                                const ok = await confirm({
                                  title: `Deactivate ${a.name}?`,
                                  message: `They won't be able to sign in until you reactivate them. Their data, allocation, and history are preserved.`,
                                  confirmLabel: 'Deactivate',
                                  tone: 'rose',
                                  icon: UserXIcon,
                                });
                                if (ok) activeMut.mutate({ id: a.id, isActive: false });
                              }}
                              disabled={activeMut.isPending && activeMut.variables?.id === a.id}
                              className="press-soft"
                              title="Block this account from signing in"
                              style={{
                                display: 'flex', alignItems: 'center', gap: 5,
                                padding: '5px 11px', borderRadius: 7,
                                fontSize: 12, fontWeight: 500,
                                background: 'rgba(232,25,122,.08)',
                                color: 'var(--rose)',
                                border: '1px solid rgba(232,25,122,.25)',
                                cursor: 'pointer',
                              }}
                            >
                              {activeMut.isPending && activeMut.variables?.id === a.id
                                ? <Loader2 size={11} className="animate-spin" />
                                : <UserX size={11} />} Deactivate
                            </button>
                          )
                        )}
                      </div>
                    </td>
                  </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {editing && <EditAccountModal account={editing} onClose={() => setEditing(null)} />}

      {reviewing && <ApplicationReviewModal applicantId={reviewing.id} onClose={() => setReviewing(null)} />}

      <AccountOverviewDrawer accountId={viewingId} onClose={() => setViewingId(null)} />

      {/* Promote-to-admin confirmation — replaces the native browser confirm */}
      <PromoteModal
        account={promoting}
        onClose={() => setPromoting(null)}
        onConfirm={() => {
          if (promoting) promoteMut.mutate({ id: promoting.id, role: 'ADMIN' });
          setPromoting(null);
        }}
        loading={promoteMut.isPending}
      />
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

// Strict-enough validators. Phone normalises before checking length.
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;

/** Strip everything that isn't a digit or leading '+', then count digits.
 *  Lenient — empty is OK, 9–15 digits accepted (SA mobile minus leading 0
 *  works at 9; full international up to 15). Hard error only on
 *  obviously-broken input so admins can save existing records that
 *  pre-date the validator. */
function validatePhone(raw: string): string | null {
  const trimmed = raw.trim();
  if (!trimmed) return null;                              // optional field
  const digits = trimmed.replace(/[^\d]/g, '');
  if (digits.length < 9)  return 'Phone is too short';
  if (digits.length > 15) return 'Phone is too long';
  return null;
}

function validateEmail(raw: string): string | null {
  const v = raw.trim();
  if (!v) return 'Email is required';
  if (!EMAIL_RE.test(v)) return 'Enter a valid email address';
  return null;
}

function EditAccountModal({ account, onClose }: { account: AdminAccount; onClose: () => void }) {
  const qc = useQueryClient();
  const { user } = useAuth();
  // Only the owner can assign roles — a manager editing an account sees
  // the role as read-only (the backend enforces this too).
  const canChangeRole = user?.role === 'ADMIN';
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

  // Live validation — errors only show once the user has typed something
  const emailError = validateEmail(form.email);
  const phoneError = validatePhone(form.phone);
  const nameError  = form.name.trim().length < 2 ? 'Name is too short' : null;
  const hasErrors  = !!emailError || !!phoneError || !!nameError;

  const saveMut = useMutation({
    mutationFn: () => updateAccount(account.id, {
      name:       form.name.trim(),
      email:      form.email.trim() || undefined,
      role:       form.role,
      phone:      form.phone.trim(),
      university: form.university.trim(),
      program:    form.program.trim(),
      // Coerce empty / 0 / negative to null so backend (min 1) doesn't reject
      year:       form.year && Number(form.year) >= 1 ? Number(form.year) : null,
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
    // Use the body-portalled <Modal> wrapper so the card always anchors to
    // the viewport — never drifts with the underlying scrollable column.
    <Modal open={true} onClose={onClose} maxWidth={560}>
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
          <ModalField label="Name" error={nameError}>
            <input
              value={form.name} onChange={update('name')}
              className="input-base"
              style={nameError ? { borderColor: '#f87171' } : undefined}
            />
          </ModalField>
          <ModalField label="Email" error={emailError}>
            <input
              value={form.email} onChange={update('email')} type="email"
              autoComplete="email"
              className="input-base"
              style={emailError ? { borderColor: '#f87171' } : undefined}
            />
          </ModalField>
          <ModalField label="Role">
            {canChangeRole ? (
              <select value={form.role} onChange={update('role')} className="input-base">
                <optgroup label="Students">
                  <option value="PENDING_STUDENT">Pending student</option>
                  <option value="ACTIVE_STUDENT">Active student</option>
                </optgroup>
                <optgroup label="Staff">
                  <option value="MAINTENANCE">Maintenance staff</option>
                  <option value="MANAGER">Manager</option>
                  <option value="ADMIN">Admin (owner)</option>
                </optgroup>
              </select>
            ) : (
              <input value={roleLabel[form.role] ?? form.role} disabled className="input-base"
                     title="Only an admin can change roles" />
            )}
          </ModalField>
          <ModalField label="Phone" error={phoneError} hint="10 digits — e.g. 0712345678">
            <input
              value={form.phone}
              onChange={e => {
                // Allow only digits, spaces, +, () and dashes — typical phone chars
                const cleaned = e.target.value.replace(/[^\d+\s()-]/g, '');
                setForm(f => ({ ...f, phone: cleaned }));
              }}
              placeholder="0712345678"
              inputMode="tel"
              autoComplete="tel"
              maxLength={20}
              className="input-base"
              style={phoneError ? { borderColor: '#f87171' } : undefined}
            />
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

        <div style={{
          display: 'flex', gap: 10, marginTop: 22,
          justifyContent: 'center',                     // centred actions, not flex-stretched
        }}>
          <button
            onClick={() => saveMut.mutate()}
            disabled={saveMut.isPending || hasErrors}
            className="btn-primary press-soft"
            style={{
              minWidth: 160, padding: '10px 22px', fontSize: 13,
              display: 'inline-flex', alignItems: 'center', justifyContent: 'center', gap: 6,
            }}
          >
            {saveMut.isPending ? <Loader2 size={13} className="animate-spin" /> : null}
            {saveMut.isPending ? 'Saving…' : 'Save changes'}
          </button>
          <button
            onClick={onClose}
            className="btn-ghost press-soft"
            style={{ minWidth: 120, padding: '10px 22px', fontSize: 13, justifyContent: 'center' }}
          >
            Cancel
          </button>
        </div>
    </Modal>
  );
}

function ModalField({ label, children, error, hint }: {
  label: string; children: React.ReactNode;
  error?: string | null; hint?: string;
}) {
  return (
    <div>
      <label className="field-label">{label}</label>
      {children}
      {error ? (
        <p style={{
          marginTop: 4, fontSize: 11, color: '#f87171',
          fontFamily: "'IBM Plex Mono', monospace",
        }}>
          {error}
        </p>
      ) : hint ? (
        <p style={{
          marginTop: 4, fontSize: 10, color: 'var(--text3)',
          fontFamily: "'IBM Plex Mono', monospace",
        }}>
          {hint}
        </p>
      ) : null}
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────
// Promote-to-admin modal — replaces the dated native confirm() dialog
// ─────────────────────────────────────────────────────────────────

function PromoteModal({
  account, onClose, onConfirm, loading,
}: {
  account: AdminAccount | null;
  onClose: () => void;
  onConfirm: () => void;
  loading: boolean;
}) {
  return (
    <Modal open={!!account} onClose={onClose} maxWidth={440}>
      {account && (
        <>
          {/* Header — rose accent for "destructive / privilege-elevating" tone */}
          <div style={{ display: 'flex', alignItems: 'flex-start', gap: 14, marginBottom: 16 }}>
            <div style={{
              width: 44, height: 44, borderRadius: 11, flexShrink: 0,
              background: 'rgba(232,25,122,.14)',
              border: '1px solid rgba(232,25,122,.32)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
            }}>
              <ShieldCheck size={20} style={{ color: 'var(--rose)' }} />
            </div>
            <div style={{ flex: 1, minWidth: 0 }}>
              <p style={{ fontSize: 17, fontWeight: 700, color: 'var(--text)' }}>
                Promote to administrator?
              </p>
              <p style={{ fontSize: 12, color: 'var(--text3)', marginTop: 4, lineHeight: 1.5 }}>
                Admins have full residence-management privileges.
              </p>
            </div>
            <button
              onClick={onClose}
              aria-label="Cancel"
              className="btn-ghost"
              style={{ padding: 6, borderRadius: 8, flexShrink: 0 }}
            >
              <X size={14} />
            </button>
          </div>

          {/* Identity card — show who you're about to promote */}
          <div style={{
            display: 'flex', alignItems: 'center', gap: 12,
            padding: '12px 14px', borderRadius: 10,
            background: 'var(--bg3)', border: '1px solid var(--border)',
            marginBottom: 14,
          }}>
            {account.avatarUrl ? (
              <img src={account.avatarUrl} alt="" style={{
                width: 36, height: 36, borderRadius: '50%', objectFit: 'cover', flexShrink: 0,
              }} />
            ) : (
              <div className="avatar avatar-cyan" style={{
                width: 36, height: 36, fontSize: 13, fontWeight: 700, flexShrink: 0,
              }}>
                {account.name.charAt(0).toUpperCase()}
              </div>
            )}
            <div style={{ minWidth: 0, flex: 1 }}>
              <p style={{ fontSize: 14, fontWeight: 600, color: 'var(--text)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                {account.name}
              </p>
              <p style={{ fontFamily: "'IBM Plex Mono', monospace", fontSize: 11, color: 'var(--text3)', marginTop: 2, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                {account.email}
              </p>
            </div>
            {/* Role transition pill */}
            <div style={{ display: 'flex', alignItems: 'center', gap: 6, flexShrink: 0 }}>
              <span className="badge badge-cyan" style={{ fontSize: 9 }}>Active</span>
              <span style={{ color: 'var(--text4)', fontSize: 11 }}>→</span>
              <span className="badge badge-rose" style={{ fontSize: 9 }}>Admin</span>
            </div>
          </div>

          {/* What changes */}
          <div style={{
            padding: '12px 14px', borderRadius: 10,
            background: 'rgba(232,25,122,.05)',
            border: '1px solid rgba(232,25,122,.18)',
            marginBottom: 18,
          }}>
            <div style={{ display: 'flex', alignItems: 'flex-start', gap: 8 }}>
              <AlertTriangle size={13} style={{ color: 'var(--rose)', flexShrink: 0, marginTop: 2 }} />
              <div>
                <p style={{ fontSize: 12, fontWeight: 600, color: 'var(--text)' }}>
                  This unlocks:
                </p>
                <ul style={{
                  listStyle: 'none', padding: 0, margin: '6px 0 0',
                  fontSize: 12, color: 'var(--text2)', lineHeight: 1.7,
                }}>
                  <li>· Manage every residence, room and tenancy</li>
                  <li>· Approve or reject payments, chores and applicants</li>
                  <li>· Generate invoices, view financial health</li>
                  <li>· Activate or deactivate other accounts</li>
                </ul>
                <p style={{ fontSize: 11, color: 'var(--text3)', marginTop: 8, fontFamily: "'IBM Plex Mono', monospace" }}>
                  Their existing room allocation and resident data are preserved.
                </p>
              </div>
            </div>
          </div>

          {/* Centred actions */}
          <div style={{ display: 'flex', gap: 10, justifyContent: 'center' }}>
            <button
              onClick={onConfirm}
              disabled={loading}
              className="press-soft"
              style={{
                minWidth: 180, padding: '10px 22px',
                borderRadius: 8, border: 'none',
                background: 'var(--rose)', color: '#fff',
                fontSize: 13, fontWeight: 600,
                fontFamily: "'Space Grotesk', sans-serif",
                cursor: loading ? 'not-allowed' : 'pointer',
                opacity: loading ? .7 : 1,
                display: 'inline-flex', alignItems: 'center', justifyContent: 'center', gap: 6,
              }}
            >
              {loading
                ? <><Loader2 size={13} className="animate-spin" /> Promoting…</>
                : <><ShieldCheck size={13} /> Yes, promote</>}
            </button>
            <button
              onClick={onClose}
              className="btn-ghost press-soft"
              style={{ minWidth: 120, padding: '10px 22px', fontSize: 13, justifyContent: 'center' }}
            >
              Cancel
            </button>
          </div>
        </>
      )}
    </Modal>
  );
}
