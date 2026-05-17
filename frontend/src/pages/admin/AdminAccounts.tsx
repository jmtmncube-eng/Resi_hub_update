import { useEffect, useMemo, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { AxiosError } from 'axios';
import { useNavigate } from 'react-router-dom';
import { Users, Loader2, Check, Pencil, X, Sparkles, ShieldCheck, UserX, UserCheck, AlertTriangle, FileSearch, AlertCircle, MoreVertical, ChevronRight } from 'lucide-react';
import { toast } from 'sonner';
import { getAccounts, updateAccount, approveAccount, setAccountActive, AdminAccount } from '../../services/admin.service';
import { listSubmittedApplications } from '../../services/application.service';
import { useAuth } from '../../contexts/AuthContext';
import { usePageTitle } from '../../hooks/usePageTitle';
import { Modal } from '../../components/Modal';
import { useConfirm } from '../../components/useConfirm';
import ApplicationReviewModal from '../../components/ApplicationReviewModal';
import { ExportCsvButton } from '../../components/ExportCsvButton';
import { HelpHint } from '../../components/HelpHint';
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

// Role filter for the STUDENT table only — staff is its own collapsible
// block above the table, so a "Staff" pill here would be redundant.
// 'to-review' is the strict subset of pending students who have actually
// submitted their application (i.e. the actionable backlog) — clicking
// the "To review" KPI tile drops the list to just this set.
type RoleFilter = 'all' | 'pending' | 'to-review' | 'active' | 'staff';

const FILTERS: { value: RoleFilter; label: string }[] = [
  { value: 'all',     label: 'All' },
  { value: 'pending', label: 'Pending' },
  { value: 'active',  label: 'Active' },
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
  const navigate = useNavigate();
  const { user: me } = useAuth();
  const confirm = useConfirm();

  const [search, setSearch]     = useState('');
  const [filter, setFilter]     = useState<RoleFilter>('all');
  // Residence tab — null = "All residences"; '__none__' = Unassigned bucket
  // (applicants + students without an allocation). The student table renders
  // only what matches the active tab, so swapping tabs scopes the dataset
  // the same way Stripe / Linear do — search + role pills filter WITHIN
  // the active tab.
  const [residenceTab, setResidenceTab] = useState<string | null>(null);
  // Management section starts collapsed — admins don't need to see staff
  // every time they open the page; click the chevron to expand. Persisted
  // in localStorage so the choice survives navigation.
  const [showManagement, setShowManagement] = useState<boolean>(() => {
    try { return localStorage.getItem('admin-accounts-show-management') === '1'; }
    catch { return false; }
  });
  useEffect(() => {
    try { localStorage.setItem('admin-accounts-show-management', showManagement ? '1' : '0'); }
    catch { /* ignore */ }
  }, [showManagement]);
  const [editing, setEditing]   = useState<AdminAccount | null>(null);
  const [promoting, setPromoting] = useState<AdminAccount | null>(null);
  const [reviewing, setReviewing] = useState<AdminAccount | null>(null);

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

  // Split staff out — they live in their own collapsible block, never in
  // the residence tabs.
  const staff    = useMemo(() => accounts.filter(a => STAFF_ROLES.includes(a.role)), [accounts]);
  const students = useMemo(() => accounts.filter(a => !STAFF_ROLES.includes(a.role)), [accounts]);

  // Discover every residence represented in the student set — drives the
  // tab strip. We also count students per residence so the tab can show "N".
  const residences = useMemo(() => {
    const map = new Map<string, { name: string; count: number }>();
    let orphan = 0;
    for (const a of students) {
      const r = a.allocation?.room?.residence;
      if (r) {
        const prev = map.get(r.id);
        map.set(r.id, { name: r.name, count: (prev?.count ?? 0) + 1 });
      } else {
        orphan++;
      }
    }
    return {
      list:   Array.from(map.entries()).map(([id, v]) => ({ id, name: v.name, count: v.count })),
      orphan,
    };
  }, [students]);

  // Apply tab + role + search filters to the student list.
  const filteredStudents = useMemo(() => {
    let list = students;
    if (residenceTab === '__none__') {
      list = list.filter(a => !a.allocation?.room?.residence);
    } else if (residenceTab) {
      list = list.filter(a => a.allocation?.room?.residence?.id === residenceTab);
    }
    if (filter === 'pending')        list = list.filter(a => a.role === 'PENDING_STUDENT');
    else if (filter === 'to-review') list = list.filter(a => a.role === 'PENDING_STUDENT' && submittedIds.has(a.id));
    else if (filter === 'active')    list = list.filter(a => a.role === 'ACTIVE_STUDENT');
    return list;
  }, [students, residenceTab, filter, submittedIds]);

  const totals = {
    all:      accounts.length,
    active:   accounts.filter(a => a.role === 'ACTIVE_STUDENT').length,
    pending:  accounts.filter(a => a.role === 'PENDING_STUDENT').length,
    // Actionable subset of pending — applications that have been submitted
    // and now await your verdict. Matches the sidebar Accounts badge.
    toReview: accounts.filter(a => a.role === 'PENDING_STUDENT' && submittedIds.has(a.id)).length,
    staff:    accounts.filter(a => STAFF_ROLES.includes(a.role)).length,
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
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 12, flexWrap: 'wrap' }}>
        <div>
          <h1 className="page-title">Accounts</h1>
          {/* HelpHint sits next to the totals line — spatially closer to
              the KPI tile strip it explains than the page title was. */}
          <p className="page-sub">
            {totals.all} total · {totals.active} active · {totals.pending} pending · {totals.staff} staff
            <HelpHint label="Click any tile below to filter the list." />
          </p>
        </div>
        {/* Pass current page state so the CSV matches what's on screen.
            `filter` doubles as the role tab (all / pending / active /
            to-review); `search` is the free-text box. Residence comes
            from ResidenceContext inside the button. */}
        <ExportCsvButton
          type="accounts"
          filters={{
            q:    search || undefined,
            role: filter === 'all' ? undefined : filter,
          }}
        />
      </div>

      {/* KPI strip — every tile is a click-to-filter (the HelpHint
          next to the page title explains the affordance once globally,
          so individual tiles no longer carry an inline hint). The
          Pending tile keeps its "all clear" hint as a STATE signal
          (when there's nothing to review), which is different from
          the interaction hint we moved out. */}
      <div className="stagger" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(180px, 1fr))', gap: 12 }}>
        {/* Total first as the "you are here" anchor — establishes the
            population the other tiles slice through. */}
        <KpiPill label="Total accounts"  value={totals.all}     accent="text"  onClick={() => setFilter('all')}     active={filter === 'all'} />
        {/* Lead with the ACTIONABLE count (matches the sidebar badge);
            total pending follows as context. Mirrors the Revenue card's
            "Collected (30d) / of R{projected}" pattern. */}
        <KpiPill
          label="To review"
          value={totals.toReview}
          accent="rose"
          hint={totals.toReview === 0
            ? (totals.pending === 0 ? 'all clear' : `${totals.pending} pending, none submitted`)
            : `of ${totals.pending} pending`}
          onClick={() => setFilter('to-review')}
          active={filter === 'to-review'}
        />
        <KpiPill label="Active students" value={totals.active}  accent="cyan"  onClick={() => setFilter('active')}  active={filter === 'active'} />
        <KpiPill label="Staff"           value={totals.staff}   accent="rose"  hint={showManagement ? 'expanded' : 'click to expand'}
                 onClick={() => setShowManagement(v => !v)} active={showManagement} />
      </div>

      {/* MANAGEMENT — collapsible block above the student table.
          Staff don't belong in the residence tabs; they're admin/manager/
          maintenance roles that scope across every residence. Default
          collapsed (persisted in localStorage) so the page leads with
          the student list. Click the header (or the Staff KPI tile) to
          toggle. */}
      {staff.length > 0 && (
        <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
          <button
            onClick={() => setShowManagement(v => !v)}
            aria-expanded={showManagement}
            className="press-soft"
            style={{
              display: 'flex', alignItems: 'center', gap: 10, width: '100%',
              padding: '12px 18px', background: 'transparent', border: 'none',
              borderBottom: showManagement ? '1px solid var(--border)' : 'none',
              cursor: 'pointer', textAlign: 'left',
            }}
          >
            <ChevronRight size={14} style={{ color: 'var(--text2)', transform: showManagement ? 'rotate(90deg)' : 'none', transition: 'transform 120ms' }} />
            <span style={{ width: 4, height: 14, background: 'var(--rose)', borderRadius: 2 }} />
            <span style={{ fontSize: 12, fontWeight: 700, color: 'var(--text)', fontFamily: "'IBM Plex Mono', monospace", letterSpacing: '.08em', textTransform: 'uppercase' }}>
              Management
            </span>
            <span style={{ fontSize: 11, color: 'var(--text4)', fontFamily: "'IBM Plex Mono', monospace" }}>
              {staff.length} staff
            </span>
            <span style={{ flex: 1 }} />
            <span style={{ fontSize: 10, color: 'var(--text3)', fontFamily: "'IBM Plex Mono', monospace" }}>
              {showManagement ? 'Hide' : 'Show'}
            </span>
          </button>
          {showManagement && (
            <div>
              {staff.map(a => (
                <AccountRow key={a.id} a={a}
                  onOpen={() => navigate(`/admin/accounts/${a.id}`)}
                  onReview={() => setReviewing(a)}
                  onApprove={() => approveMut.mutate(a.id)}
                  onPromote={() => setPromoting(a)}
                  onEdit={() => setEditing(a)}
                  onToggleActive={async () => {
                    if (a.isActive === false) { activeMut.mutate({ id: a.id, isActive: true }); }
                    else {
                      const ok = await confirm({
                        title: `Deactivate ${a.name}?`,
                        message: `They won't be able to sign in until you reactivate them. Their data, allocation, and history are preserved.`,
                        confirmLabel: 'Deactivate', tone: 'rose', icon: UserXIcon,
                      });
                      if (ok) activeMut.mutate({ id: a.id, isActive: false });
                    }
                  }}
                  meId={me?.id}
                  submittedIds={submittedIds}
                  approveBusy={approveMut.isPending && approveMut.variables === a.id}
                  activeBusy={activeMut.isPending && activeMut.variables?.id === a.id}
                />
              ))}
            </div>
          )}
        </div>
      )}

      {/* RESIDENCE TABS — primary scope for the student table. Stripe /
          Linear / Notion style: tabs sit above search; search filters
          within the active tab. */}
      <div role="tablist" style={{
        display: 'flex', gap: 2, borderBottom: '1px solid var(--border)',
        overflowX: 'auto', flexWrap: 'nowrap',
      }}>
        <ResTab label="All"   count={students.length}                   active={residenceTab === null}        onClick={() => setResidenceTab(null)} />
        {residences.list.map(r => (
          <ResTab key={r.id} label={r.name} count={r.count}             active={residenceTab === r.id}        onClick={() => setResidenceTab(r.id)} />
        ))}
        {residences.orphan > 0 && (
          // "Awaiting allocation" = students with no room yet (applicants
          // pre-approval, plus the rare active student between rooms).
          // Clearer than the old "Unassigned" — names the state, not
          // its absence.
          <ResTab label="Awaiting allocation" count={residences.orphan}  active={residenceTab === '__none__'}  onClick={() => setResidenceTab('__none__')} />
        )}
      </div>

      {/* SEARCH + ROLE PILLS — search left (the standard primary action),
          role pills (within-tab refinement) right on the same row. */}
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
                padding: '6px 14px', borderRadius: 7, border: 'none', fontSize: 12,
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

      {/* STUDENT TABLE — single list scoped by the active tab. */}
      {isLoading ? (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          {[...Array(6)].map((_, i) => <div key={i} className="skeleton" style={{ height: 56, borderRadius: 8 }} />)}
        </div>
      ) : filteredStudents.length === 0 ? (
        <div className="card empty-state">
          <Users size={28} style={{ color: 'var(--text4)', margin: '0 auto 12px' }} />
          <p style={{ fontWeight: 600, color: 'var(--text2)' }}>No students in this view</p>
          <p style={{ fontSize: 12, color: 'var(--text3)', marginTop: 4 }}>
            Try a different residence tab or clear the search.
          </p>
        </div>
      ) : (
        <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
          {filteredStudents.map(a => (
            <AccountRow key={a.id} a={a}
              onOpen={() => navigate(`/admin/accounts/${a.id}`)}
              onReview={() => setReviewing(a)}
              onApprove={() => approveMut.mutate(a.id)}
              onPromote={() => setPromoting(a)}
              onEdit={() => setEditing(a)}
              onToggleActive={async () => {
                if (a.isActive === false) { activeMut.mutate({ id: a.id, isActive: true }); }
                else {
                  const ok = await confirm({
                    title: `Deactivate ${a.name}?`,
                    message: `They won't be able to sign in until you reactivate them. Their data, allocation, and history are preserved.`,
                    confirmLabel: 'Deactivate', tone: 'rose', icon: UserXIcon,
                  });
                  if (ok) activeMut.mutate({ id: a.id, isActive: false });
                }
              }}
              meId={me?.id}
              submittedIds={submittedIds}
              approveBusy={approveMut.isPending && approveMut.variables === a.id}
              activeBusy={activeMut.isPending && activeMut.variables?.id === a.id}
            />
          ))}
        </div>
      )}

      {editing && <EditAccountModal account={editing} onClose={() => setEditing(null)} />}

      {reviewing && <ApplicationReviewModal applicantId={reviewing.id} onClose={() => setReviewing(null)} />}

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

// ── Residence tab — primary scope selector for the student table ───
function ResTab({ label, count, active, onClick }: { label: string; count: number; active: boolean; onClick: () => void }) {
  return (
    <button
      onClick={onClick}
      role="tab"
      aria-selected={active}
      className="press-soft"
      style={{
        display: 'inline-flex', alignItems: 'center', gap: 8,
        padding: '10px 16px', borderRadius: 0, border: 'none',
        background: 'transparent',
        color:      active ? 'var(--text)' : 'var(--text3)',
        fontSize: 13, fontWeight: active ? 600 : 500,
        cursor: 'pointer', whiteSpace: 'nowrap',
        // The active tab is identified by a thick cyan underline (classic
        // tab pattern) — sits right on top of the border-bottom of the
        // parent tablist so it reads as a continuous bar.
        borderBottom: active ? '2px solid var(--cyan)' : '2px solid transparent',
        marginBottom: -1,
      }}
    >
      {label}
      <span style={{
        fontSize: 10, padding: '2px 7px', borderRadius: 999,
        background: active ? 'rgba(0,204,204,.15)' : 'var(--bg3)',
        color:      active ? 'var(--cyan)' : 'var(--text3)',
        fontFamily: "'IBM Plex Mono', monospace", fontWeight: 600,
      }}>
        {count}
      </span>
    </button>
  );
}

// ── Account row — clickable; highlights when something is pending ──
function AccountRow({
  a, onOpen, onReview, onApprove, onPromote, onEdit, onToggleActive,
  meId, submittedIds, approveBusy, activeBusy,
}: {
  a: AdminAccount;
  onOpen: () => void;
  onReview: () => void;
  onApprove: () => void;
  onPromote: () => void;
  onEdit: () => void;
  onToggleActive: () => void;
  meId?: string;
  submittedIds: Set<string>;
  approveBusy: boolean;
  activeBusy: boolean;
}) {
  const isDeactivated = a.isActive === false;
  const pendingTotal  = (a.pending?.docsToReview ?? 0) + (a.pending?.openTickets ?? 0) + (a.pending?.unpaidInvoices ?? 0);
  const hasPending    = pendingTotal > 0 || submittedIds.has(a.id);

  return (
    <div
      onClick={onOpen}
      style={{
        display: 'grid',
        // Fixed column tracks so every row uses an identical grid — no
        // row's content width can shift another row's columns.
        // avatar · identity (flex) · role+state · room+credits · pending · actions
        gridTemplateColumns: '36px minmax(0, 1.6fr) 150px minmax(140px, 1fr) 150px 200px',
        alignItems: 'center', gap: 14,
        padding: '12px 16px',
        borderBottom: '1px solid var(--border)',
        cursor: 'pointer',
        // The "unread news article" affordance — rows with anything
        // pending get a thin cyan left edge + faint tint to draw the eye.
        background: hasPending ? 'linear-gradient(90deg, rgba(0,204,204,.06), transparent 60%)' : 'transparent',
        borderLeft: hasPending ? '3px solid var(--cyan)' : '3px solid transparent',
        opacity: isDeactivated ? 0.55 : 1,
      }}
      className="hover-lift"
    >
      {/* Avatar */}
      {a.avatarUrl ? (
        <img src={a.avatarUrl} alt="" style={{ width: 36, height: 36, borderRadius: '50%', objectFit: 'cover', filter: isDeactivated ? 'grayscale(1)' : 'none' }} />
      ) : (
        <div className={`avatar ${STAFF_ROLES.includes(a.role) ? 'avatar-rose' : 'avatar-cyan'}`}
             style={{ width: 36, height: 36, fontSize: 12, fontWeight: 700, filter: isDeactivated ? 'grayscale(1)' : 'none' }}>
          {a.name.charAt(0).toUpperCase()}
        </div>
      )}

      {/* Identity */}
      <div style={{ minWidth: 0 }}>
        <p style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 13, fontWeight: 600, color: 'var(--text)', textDecoration: isDeactivated ? 'line-through' : 'none', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
          <span style={{ overflow: 'hidden', textOverflow: 'ellipsis' }}>{a.name}</span>
          {a.id === meId && (
            <span title="This is you" style={{
              fontSize: 9, fontWeight: 700, padding: '1px 6px', borderRadius: 999,
              background: 'rgba(0,204,204,.15)', color: 'var(--cyan)',
              border: '1px solid rgba(0,204,204,.35)',
              fontFamily: "'IBM Plex Mono', monospace", letterSpacing: '.04em',
            }}>
              YOU
            </span>
          )}
        </p>
        <p style={{ fontFamily: "'IBM Plex Mono', monospace", fontSize: 10, color: 'var(--text3)', marginTop: 2, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
          {a.email}
        </p>
      </div>

      {/* Role + state — single inline row, never stacked, so every row
          has the same height regardless of whether the user is disabled. */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 6, flexWrap: 'nowrap' }}>
        <span className={`badge ${ROLE_BADGE[a.role] ?? 'badge-gray'}`} style={{ width: 'fit-content', fontSize: 10 }}>
          {roleLabel[a.role] ?? a.role}
        </span>
        {isDeactivated && (
          <span className="badge badge-rose" style={{ width: 'fit-content', fontSize: 9 }}>Off</span>
        )}
      </div>

      {/* Room / credits */}
      <div style={{ minWidth: 0 }}>
        <p style={{ fontFamily: "'IBM Plex Mono', monospace", fontSize: 11, color: 'var(--text2)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
          {a.allocation?.room ? `Blk ${a.allocation.room.block} – ${a.allocation.room.number}` : <span style={{ color: 'var(--text4)' }}>No room</span>}
        </p>
        <p style={{ fontFamily: "'IBM Plex Mono', monospace", fontSize: 11, color: 'var(--cyan)', marginTop: 2 }}>
          {a.wallet?.credits ?? 0} 🪙
        </p>
      </div>

      {/* Pending badges — column is a fixed 150px track; content
          right-aligns so empty rows leave a clean gap rather than
          pushing other columns. */}
      <div style={{ display: 'flex', gap: 5, flexWrap: 'wrap', justifyContent: 'flex-end', alignItems: 'center', minWidth: 0 }}>
        {(a.pending?.docsToReview ?? 0) > 0 && (
          <span className="badge badge-rose" style={{ fontSize: 9, display: 'inline-flex', alignItems: 'center', gap: 3 }}>
            <AlertCircle size={9} /> {a.pending!.docsToReview} doc{a.pending!.docsToReview === 1 ? '' : 's'}
          </span>
        )}
        {(a.pending?.openTickets ?? 0) > 0 && (
          <span className="badge badge-rose" style={{ fontSize: 9 }}>{a.pending!.openTickets} ticket{a.pending!.openTickets === 1 ? '' : 's'}</span>
        )}
        {(a.pending?.unpaidInvoices ?? 0) > 0 && (
          <span className="badge badge-rose" style={{ fontSize: 9 }}>{a.pending!.unpaidInvoices} unpaid</span>
        )}
        {submittedIds.has(a.id) && (
          <span className="badge badge-cyan" style={{ fontSize: 9 }}>App ready</span>
        )}
      </div>

      {/* Quick actions — Activate/Deactivate stays visible inline. The
          self-row renders the SAME button, disabled with a tooltip
          ("You can't deactivate your own account") — the gold-standard
          pattern (GitHub / Stripe / AWS IAM): visible-but-disabled
          affordances teach the rule, missing ones create ambiguity.
          Column alignment is owned by the parent grid, not this cell. */}
      <div
        style={{ display: 'flex', gap: 6, alignItems: 'center', justifyContent: 'flex-end' }}
        onClick={e => e.stopPropagation()}
      >
        {(() => {
          const isSelf = a.id === meId;
          return (
            <button
              onClick={isSelf ? undefined : onToggleActive}
              disabled={isSelf || activeBusy}
              className="press-soft"
              title={isSelf
                ? "You can't deactivate your own account"
                : isDeactivated ? 'Reactivate — they can sign in again' : 'Block from signing in'}
              aria-disabled={isSelf}
              style={{
                display: 'inline-flex', alignItems: 'center', gap: 5,
                padding: '5px 11px', borderRadius: 999, fontSize: 11, fontWeight: 600,
                background: isDeactivated ? 'rgba(74,222,128,.12)' : 'rgba(232,25,122,.08)',
                color:      isDeactivated ? '#4ade80' : 'var(--rose)',
                border:     `1px solid ${isDeactivated ? 'rgba(74,222,128,.3)' : 'rgba(232,25,122,.25)'}`,
                cursor:     isSelf ? 'not-allowed' : 'pointer',
                opacity:    isSelf ? 0.4 : 1,
                whiteSpace: 'nowrap',
              }}
            >
              {activeBusy
                ? <Loader2 size={11} className="animate-spin" />
                : isDeactivated ? <UserCheck size={11} /> : <UserX size={11} />}
              {isDeactivated ? 'Activate' : 'Deactivate'}
            </button>
          );
        })()}
        <KebabMenu
          a={a}
          submittedIds={submittedIds}
          approveBusy={approveBusy}
          onOpen={onOpen}
          onReview={onReview}
          onApprove={onApprove}
          onPromote={onPromote}
          onEdit={onEdit}
        />
      </div>
    </div>
  );
}

// ── Per-row 3-dot menu ─────────────────────────────────────────────
function KebabMenu({
  a, submittedIds, approveBusy,
  onOpen, onReview, onApprove, onPromote, onEdit,
}: {
  a: AdminAccount;
  submittedIds: Set<string>;
  approveBusy: boolean;
  onOpen: () => void;
  onReview: () => void;
  onApprove: () => void;
  onPromote: () => void;
  onEdit: () => void;
}) {
  const [open, setOpen] = useState(false);
  const [pos, setPos]   = useState<{ top: number; right: number } | null>(null);
  const buttonRef = useRef<HTMLButtonElement>(null);
  const menuRef   = useRef<HTMLDivElement>(null);

  function toggle() {
    if (open) { setOpen(false); return; }
    const r = buttonRef.current?.getBoundingClientRect();
    if (!r) return;
    // Anchor under the trigger; portal will render at fixed coords so
    // sibling rows can't clip the menu via their stacking contexts.
    setPos({ top: r.bottom + 4, right: window.innerWidth - r.right });
    setOpen(true);
  }

  // Close on outside click or Escape.
  useEffect(() => {
    if (!open) return;
    function onDown(e: MouseEvent) {
      if (buttonRef.current?.contains(e.target as Node)) return;
      if (menuRef.current?.contains(e.target as Node))   return;
      setOpen(false);
    }
    function onEsc(e: KeyboardEvent) { if (e.key === 'Escape') setOpen(false); }
    document.addEventListener('mousedown', onDown);
    document.addEventListener('keydown',   onEsc);
    return () => {
      document.removeEventListener('mousedown', onDown);
      document.removeEventListener('keydown',   onEsc);
    };
  }, [open]);

  const items: Array<{ label: string; icon: React.ComponentType<{ size?: number | string }>; onClick: () => void; tone?: 'cyan' | 'rose' }> = [];
  items.push({ label: 'Open profile', icon: FileSearch, onClick: onOpen });
  if (a.role === 'PENDING_STUDENT') {
    if (submittedIds.has(a.id)) {
      items.push({ label: 'Review application', icon: FileSearch, onClick: onReview, tone: 'cyan' });
    } else {
      items.push({
        label:   approveBusy ? 'Approving…' : 'Approve directly',
        icon:    approveBusy ? Loader2 : Check,
        onClick: onApprove,
        tone:    'cyan',
      });
    }
  }
  if (a.role === 'ACTIVE_STUDENT') {
    items.push({ label: 'Promote to admin', icon: ShieldCheck, onClick: onPromote, tone: 'rose' });
  }
  items.push({ label: 'Edit details', icon: Pencil, onClick: onEdit });

  return (
    <>
      <button
        ref={buttonRef}
        onClick={toggle}
        aria-label="More actions"
        className="press-soft"
        style={{
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          width: 30, height: 28, borderRadius: 6,
          background: open ? 'var(--bg3)' : 'transparent',
          color: 'var(--text2)',
          border: '1px solid var(--border)',
          cursor: 'pointer',
        }}
      >
        <MoreVertical size={14} />
      </button>
      {open && pos && createPortal(
        <div
          ref={menuRef}
          style={{
            position: 'fixed', top: pos.top, right: pos.right, zIndex: 9999,
            minWidth: 180, padding: 4, borderRadius: 10,
            background: 'var(--bg2)', border: '1px solid var(--border)',
            boxShadow: '0 8px 24px rgba(0,0,0,.45)',
          }}
        >
          {items.map(it => (
            <button
              key={it.label}
              onClick={() => { setOpen(false); it.onClick(); }}
              className="press-soft"
              style={{
                display: 'flex', alignItems: 'center', gap: 8, width: '100%',
                padding: '8px 12px', borderRadius: 6, fontSize: 12,
                background: 'transparent', border: 'none',
                color: it.tone === 'rose' ? 'var(--rose)' : it.tone === 'cyan' ? 'var(--cyan)' : 'var(--text2)',
                cursor: 'pointer', textAlign: 'left',
              }}
              onMouseEnter={e => (e.currentTarget.style.background = 'var(--bg3)')}
              onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}
            >
              <it.icon size={13} /> {it.label}
            </button>
          ))}
        </div>,
        document.body,
      )}
    </>
  );
}

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
