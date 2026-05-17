import { useEffect, useState } from 'react';
import { useParams, useNavigate, useLocation, Link } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import {
  ArrowLeft, Loader2, Mail, Phone, GraduationCap, Home, Wallet, Ticket, FileText,
  CheckCircle2, XCircle, Gift, AlertCircle, ExternalLink, Calendar, ShieldCheck, Send,
} from 'lucide-react';
import { getAccountOverview } from '../../services/admin.service';
import { decideDocument, remindCompliance, ApplicationDocType } from '../../services/application.service';
import { usePageTitle } from '../../hooks/usePageTitle';
import { ROUTES } from '../../constants/routes';

const ROLE_LABEL: Record<string, string> = {
  ADMIN:           'Admin (owner)',
  MANAGER:         'Manager',
  MAINTENANCE:     'Maintenance',
  ACTIVE_STUDENT:  'Active student',
  PENDING_STUDENT: 'Pending student',
};

const DOC_LABEL: Record<string, string> = {
  ID_DOC:             'ID document',
  PROOF_REGISTRATION: 'Proof of registration',
  PROOF_FUNDING:      'Proof of funding',
  SIGNATURE:          'Signature',
};

/**
 * Admin "account profile" — one page that aggregates everything the
 * admin needs to know about a single user: identity, residence + room,
 * lease, application + compliance docs (with inline approve/reject),
 * maintenance tickets, wallet history (chores earned + rewards redeemed)
 * and unpaid invoices. The accounts list links here.
 */
export default function AdminAccountProfile() {
  const { userId = '' } = useParams<{ userId: string }>();
  const navigate = useNavigate();
  const location = useLocation();
  const qc = useQueryClient();

  const { data, isLoading, isError } = useQuery({
    queryKey: ['admin-account-overview', userId],
    queryFn:  () => getAccountOverview(userId),
    enabled:  !!userId,
  });

  // Hash-based deep-link: /admin/accounts/<id>#compliance auto-scrolls
  // the compliance section into view once the data has loaded. Used by
  // the Compliance queue page so clicking a row lands you on the right
  // section instead of the top.
  useEffect(() => {
    if (!data) return;
    const hash = location.hash.replace('#', '');
    if (!hash) return;
    // Give the layout one frame to paint the section before scrolling.
    requestAnimationFrame(() => {
      document.getElementById(hash)?.scrollIntoView({ behavior: 'smooth', block: 'start' });
    });
  }, [data, location.hash]);

  usePageTitle(data?.name ? `${data.name} · Admin` : 'Account · Admin');

  const [rejecting, setRejecting] = useState<{ docId: string; type: string; reason: string } | null>(null);

  const decide = useMutation({
    mutationFn: ({ docId, decision, note }: { docId: string; decision: 'APPROVED' | 'REJECTED'; note?: string }) =>
      decideDocument(docId, decision, note),
    onSuccess: (_data, vars) => {
      qc.invalidateQueries({ queryKey: ['admin-account-overview', userId] });
      qc.invalidateQueries({ queryKey: ['admin-accounts'] });
      qc.invalidateQueries({ queryKey: ['admin-compliance-queue'] });
      toast.success(vars.decision === 'APPROVED' ? 'Document approved' : 'Document rejected — student notified');
      setRejecting(null);
    },
    onError: () => toast.error('Could not save verdict'),
  });

  // Send-reminder for missing compliance docs. We track the type being
  // reminded so the spinner only shows on that one row.
  const [remindingType, setRemindingType] = useState<ApplicationDocType | null>(null);
  const remind = useMutation({
    mutationFn: (types: ApplicationDocType[]) => remindCompliance(userId, types),
    onMutate:   (types) => { setRemindingType(types[0] ?? null); },
    onSuccess:  () => toast.success('Reminder sent — they\'ve been emailed + notified in-app.'),
    onError:    (err: unknown) => {
      const m = err && typeof err === 'object' && 'response' in err
        ? (err as { response?: { data?: { error?: string } } }).response?.data?.error
        : null;
      toast.error(m || 'Could not send reminder');
    },
    onSettled:  () => setRemindingType(null),
  });

  if (isLoading) {
    return (
      <div style={{ padding: 48, textAlign: 'center' }}>
        <Loader2 size={24} className="animate-spin" style={{ color: 'var(--cyan)' }} />
      </div>
    );
  }
  if (isError || !data) {
    return (
      <div style={{ padding: 24 }}>
        <p style={{ color: 'var(--rose)' }}>Could not load this account.</p>
        <button onClick={() => navigate(ROUTES.ADMIN_ACCOUNTS)} className="btn-secondary" style={{ marginTop: 12 }}>
          Back to accounts
        </button>
      </div>
    );
  }

  // Defensive defaults — backend may be running an older bundle that
  // doesn't return some of the newer arrays yet (e.g. on first deploy
  // before restart) — guard everything we touch with `.length` / `.filter`.
  const documents       = data.documents       ?? [];
  const recentTickets   = data.recentTickets   ?? [];
  const walletTxns      = data.walletTxns      ?? [];
  const stats           = data.stats           ?? { openTickets: 0, totalTickets: 0, upcomingPasses: 0, totalPasses: 0, monthsUnpaid: 0, monthsPaid: 0, docsSubmitted: 0, docsApproved: 0, docsRejected: 0 };

  const isStudent       = data.role === 'ACTIVE_STUDENT' || data.role === 'PENDING_STUDENT';
  const isStaff         = data.role === 'ADMIN' || data.role === 'MANAGER' || data.role === 'MAINTENANCE';
  const allocation      = data.allocation;
  const room            = allocation?.room;
  const residenceName   = room?.residence?.name ?? '—';
  const complianceDocs  = documents.filter(d =>
    d.type === 'ID_DOC' || d.type === 'PROOF_REGISTRATION' || d.type === 'PROOF_FUNDING' || d.type === 'SIGNATURE',
  );
  const invoices        = documents.filter(d => d.type === 'INVOICE');
  const contracts       = documents.filter(d => d.type === 'CONTRACT');
  const unpaid          = invoices.filter(i => i.status !== 'Paid');
  const totalAttention  = (stats.docsSubmitted ?? 0) + stats.openTickets + stats.monthsUnpaid;

  return (
    <div className="space-y-5 appear">
      {/* Top: back link + name */}
      <div>
        <Link to={ROUTES.ADMIN_ACCOUNTS} style={{ display: 'inline-flex', alignItems: 'center', gap: 6, fontSize: 12, color: 'var(--text3)', textDecoration: 'none' }}>
          <ArrowLeft size={13} /> All accounts
        </Link>
      </div>

      {/* Identity card */}
      <div className="card" style={{ padding: '22px 24px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 18, flexWrap: 'wrap' }}>
          {data.avatarUrl ? (
            <img src={data.avatarUrl} alt="" style={{ width: 64, height: 64, borderRadius: '50%', objectFit: 'cover', flexShrink: 0 }} />
          ) : (
            <div className={`avatar ${isStaff ? 'avatar-rose' : 'avatar-cyan'}`} style={{ width: 64, height: 64, fontSize: 20, fontWeight: 700, flexShrink: 0 }}>
              {data.name.slice(0, 2).toUpperCase()}
            </div>
          )}
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
              <h1 className="page-title" style={{ margin: 0 }}>{data.name}</h1>
              {data.isActive === false && (
                <span className="badge badge-rose" style={{ fontSize: 10 }}>Disabled</span>
              )}
              {data.applicationStatus === 'REJECTED' && (
                <span className="badge badge-rose" style={{ fontSize: 10 }}>Application rejected</span>
              )}
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 14, flexWrap: 'wrap', marginTop: 6, fontSize: 12, color: 'var(--text3)' }}>
              <span style={{ display: 'inline-flex', alignItems: 'center', gap: 5 }}>
                <Mail size={12} /> {data.email}
              </span>
              {data.phone && (
                <span style={{ display: 'inline-flex', alignItems: 'center', gap: 5 }}>
                  <Phone size={12} /> {data.phone}
                </span>
              )}
              <span className={`badge ${isStaff ? 'badge-rose' : 'badge-cyan'}`} style={{ fontSize: 10 }}>
                {ROLE_LABEL[data.role] ?? data.role}
              </span>
              <span style={{ fontFamily: "'IBM Plex Mono', monospace", fontSize: 10, color: 'var(--text4)' }}>
                Joined {new Date(data.createdAt).toLocaleDateString()}
              </span>
            </div>
            {data.bio && (
              <p style={{ marginTop: 10, fontSize: 13, color: 'var(--text2)', lineHeight: 1.55, maxWidth: 720 }}>
                {data.bio}
              </p>
            )}
          </div>
        </div>
      </div>

      {/* Needs-attention strip — only renders if there's anything to act on */}
      {totalAttention > 0 && (
        <div className="card" style={{ padding: '14px 18px', background: 'rgba(232,25,122,.06)', border: '1px solid rgba(232,25,122,.25)' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
            <AlertCircle size={16} style={{ color: 'var(--rose)' }} />
            <span style={{ fontSize: 13, fontWeight: 600, color: 'var(--text)' }}>Needs attention</span>
            <span style={{ flex: 1 }} />
            {(stats.docsSubmitted ?? 0) > 0 && (
              <a href="#compliance" className="badge badge-rose" style={{ fontSize: 11, textDecoration: 'none' }}>
                {stats.docsSubmitted} doc{stats.docsSubmitted === 1 ? '' : 's'} to review
              </a>
            )}
            {stats.openTickets > 0 && (
              <a href="#tickets" className="badge badge-rose" style={{ fontSize: 11, textDecoration: 'none' }}>
                {stats.openTickets} open ticket{stats.openTickets === 1 ? '' : 's'}
              </a>
            )}
            {stats.monthsUnpaid > 0 && (
              <a href="#invoices" className="badge badge-rose" style={{ fontSize: 11, textDecoration: 'none' }}>
                {stats.monthsUnpaid} unpaid invoice{stats.monthsUnpaid === 1 ? '' : 's'}
              </a>
            )}
          </div>
        </div>
      )}

      {/* KPI strip */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <KpiCard icon={Wallet}   label="Wallet credits"  value={data.wallet?.credits ?? 0} tone="cyan" />
        <KpiCard icon={Ticket}   label="Open tickets"    value={stats.openTickets}    tone={stats.openTickets > 0 ? 'rose' : 'cyan'} sub={`of ${stats.totalTickets}`} />
        <KpiCard icon={FileText} label="Unpaid invoices" value={stats.monthsUnpaid}   tone={stats.monthsUnpaid > 0 ? 'rose' : 'cyan'} sub={`${stats.monthsPaid} paid`} />
        <KpiCard icon={ShieldCheck} label="Compliance docs" value={stats.docsApproved ?? 0} tone={(stats.docsSubmitted ?? 0) > 0 ? 'rose' : 'cyan'} sub={`${stats.docsSubmitted ?? 0} pending · ${stats.docsRejected ?? 0} rejected`} />
      </div>

      {/* Two-column body */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">

        {/* Residence + room + lease */}
        {isStudent && (
          <Section title="Residence & lease" icon={Home}>
            {allocation && room ? (
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 10, fontSize: 12 }}>
                <InfoRow label="Residence"   value={residenceName} />
                <InfoRow label="Room"        value={`Blk ${room.block} – ${room.number}`} />
                <InfoRow label="Room type"   value={room.type} />
                <InfoRow label="Rent"        value={`R${Number(allocation.rent).toLocaleString()}/mo`} />
                <InfoRow label="Status"      value={allocation.status} />
                <InfoRow label="Move-in"     value={allocation.moveIn ? new Date(allocation.moveIn).toLocaleDateString() : '—'} />
                <InfoRow label="Lease start" value={allocation.leaseStart ? new Date(allocation.leaseStart).toLocaleDateString() : '—'} />
                <InfoRow label="Lease end"   value={allocation.leaseEnd ? new Date(allocation.leaseEnd).toLocaleDateString() : '—'} />
                <InfoRow label="Deposit"     value={allocation.depositAmount ? `R${Number(allocation.depositAmount).toLocaleString()}${allocation.depositStatus ? ` · ${allocation.depositStatus}` : ''}` : '—'} />
                <InfoRow label="Move-out"    value={allocation.moveOutDate ? new Date(allocation.moveOutDate).toLocaleDateString() : '—'} />
              </div>
            ) : (
              <p style={{ fontSize: 13, color: 'var(--text3)' }}>No active allocation.</p>
            )}
          </Section>
        )}

        {/* Academic — student-only */}
        {isStudent && (data.university || data.program) && (
          <Section title="Academic" icon={GraduationCap}>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 10, fontSize: 12 }}>
              <InfoRow label="University" value={data.university ?? '—'} />
              <InfoRow label="Programme"  value={data.program ?? '—'} />
              <InfoRow label="Year"       value={data.year != null ? `Y${data.year}` : '—'} />
              <InfoRow label="SA ID"      value={data.idNumber ?? '—'} />
            </div>
          </Section>
        )}

        {/* Compliance docs — render ALL 4 expected doc types so missing
            ones are visible too, with a "Send reminder" action that
            emails + in-app-notifies the student about what to upload. */}
        {isStudent && (
          <Section title="Compliance documents" icon={FileText} anchor="compliance">
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              {(['ID_DOC', 'PROOF_REGISTRATION', 'PROOF_FUNDING', 'SIGNATURE'] as ApplicationDocType[]).map(type => {
                const d = complianceDocs.find(x => x.type === type);
                // Missing slot — render a placeholder with Send reminder action
                if (!d) {
                  return (
                    <div key={type} style={{
                      display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap',
                      padding: '10px 12px', borderRadius: 8,
                      background: 'rgba(232,25,122,.04)',
                      border: '1px dashed rgba(232,25,122,.3)',
                    }}>
                      <AlertCircle size={14} style={{ color: 'var(--rose)' }} />
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <p style={{ fontSize: 13, fontWeight: 500, color: 'var(--text2)' }}>
                          {DOC_LABEL[type]}
                        </p>
                        <p style={{ fontSize: 10, color: 'var(--text4)', fontFamily: "'IBM Plex Mono', monospace", marginTop: 2 }}>
                          Not uploaded yet
                        </p>
                      </div>
                      <span className="badge badge-rose" style={{ fontSize: 10 }}>Missing</span>
                      <button
                        onClick={() => remind.mutate([type])}
                        disabled={remind.isPending && remindingType === type}
                        className="btn-secondary"
                        style={{ padding: '4px 10px', fontSize: 11, display: 'inline-flex', alignItems: 'center', gap: 4 }}
                      >
                        {remind.isPending && remindingType === type
                          ? <Loader2 size={11} className="animate-spin" />
                          : <Send size={11} />}
                        Send reminder
                      </button>
                    </div>
                  );
                }
                // Present slot — original render
                const isSubmitted = d.status === 'Submitted';
                const isApproved  = d.status === 'Approved';
                const isRejected  = d.status === 'Rejected';
                return (
                  <div key={d.id} style={{
                    display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap',
                    padding: '10px 12px', borderRadius: 8,
                    background: 'var(--bg3)',
                    border: `1px solid ${isSubmitted ? 'rgba(0,204,204,.3)' : isRejected ? 'rgba(232,25,122,.3)' : 'var(--border)'}`,
                  }}>
                    <FileText size={14} style={{ color: 'var(--text3)' }} />
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <p style={{ fontSize: 13, fontWeight: 500, color: 'var(--text2)' }}>
                        {DOC_LABEL[d.type] ?? d.type}
                      </p>
                      <p style={{ fontSize: 10, color: 'var(--text4)', fontFamily: "'IBM Plex Mono', monospace", marginTop: 2 }}>
                        Uploaded {new Date(d.createdAt).toLocaleDateString()}
                        {d.reviewedAt && ` · reviewed ${new Date(d.reviewedAt).toLocaleDateString()}`}
                      </p>
                      {isRejected && d.reviewNote && (
                        <p style={{ fontSize: 11, color: 'var(--rose)', marginTop: 4 }}>
                          Reason: {d.reviewNote}
                        </p>
                      )}
                    </div>
                    <span className={`badge ${isApproved ? 'badge-cyan' : isRejected ? 'badge-rose' : 'badge-gray'}`} style={{ fontSize: 10 }}>
                      {d.status}
                    </span>
                    {d.fileUrl && (
                      <a href={d.fileUrl} target="_blank" rel="noopener noreferrer" className="btn-secondary"
                         style={{ padding: '4px 10px', fontSize: 11, display: 'inline-flex', alignItems: 'center', gap: 4 }}>
                        <ExternalLink size={11} /> Open
                      </a>
                    )}
                    {/* Rejected doc → admin can also re-nudge in case the
                        student missed the original email. */}
                    {isRejected && (
                      <button
                        onClick={() => remind.mutate([d.type as ApplicationDocType])}
                        disabled={remind.isPending && remindingType === d.type}
                        className="btn-secondary"
                        style={{ padding: '4px 10px', fontSize: 11, display: 'inline-flex', alignItems: 'center', gap: 4 }}
                      >
                        {remind.isPending && remindingType === d.type
                          ? <Loader2 size={11} className="animate-spin" />
                          : <Send size={11} />}
                        Remind
                      </button>
                    )}
                    {isSubmitted && (
                      <>
                        <button
                          onClick={() => decide.mutate({ docId: d.id, decision: 'APPROVED' })}
                          disabled={decide.isPending}
                          className="btn-primary"
                          style={{ padding: '4px 10px', fontSize: 11, display: 'inline-flex', alignItems: 'center', gap: 4 }}
                        >
                          <CheckCircle2 size={11} /> Approve
                        </button>
                        <button
                          onClick={() => setRejecting({ docId: d.id, type: d.type, reason: '' })}
                          disabled={decide.isPending}
                          className="btn-secondary"
                          style={{ padding: '4px 10px', fontSize: 11, color: 'var(--rose)', borderColor: 'rgba(232,25,122,.35)', display: 'inline-flex', alignItems: 'center', gap: 4 }}
                        >
                          <XCircle size={11} /> Reject
                        </button>
                      </>
                    )}
                  </div>
                );
              })}
            </div>
          </Section>
        )}

        {/* Recent tickets */}
        {isStudent && (
          <Section title="Recent maintenance tickets" icon={Ticket} anchor="tickets">
            {recentTickets.length === 0 ? (
              <p style={{ fontSize: 13, color: 'var(--text3)' }}>No tickets raised.</p>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                {recentTickets.map(t => (
                  <div key={t.id} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '8px 12px', borderRadius: 8, background: 'var(--bg3)', border: '1px solid var(--border)' }}>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <p style={{ fontSize: 13, fontWeight: 500, color: 'var(--text2)' }}>{t.category} · {t.location}</p>
                      <p style={{ fontSize: 10, color: 'var(--text4)', fontFamily: "'IBM Plex Mono', monospace", marginTop: 2 }}>
                        {new Date(t.createdAt).toLocaleDateString()}
                      </p>
                    </div>
                    <span className={`badge ${t.status === 'OPEN' || t.status === 'IN_PROGRESS' ? 'badge-rose' : 'badge-cyan'}`} style={{ fontSize: 10 }}>
                      {t.status}
                    </span>
                    {(t.priority === 'HIGH' || t.priority === 'URGENT') && (
                      <span className="badge badge-rose" style={{ fontSize: 10 }}>{t.priority}</span>
                    )}
                  </div>
                ))}
              </div>
            )}
          </Section>
        )}

        {/* Invoices + payments */}
        {isStudent && (
          <Section title="Invoices & payments" icon={Wallet} anchor="invoices">
            {invoices.length === 0 ? (
              <p style={{ fontSize: 13, color: 'var(--text3)' }}>No invoices yet.</p>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 6, fontSize: 12 }}>
                {invoices.slice(0, 8).map(inv => (
                  <div key={inv.id} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '6px 10px', borderRadius: 6, background: inv.status !== 'Paid' ? 'rgba(232,25,122,.05)' : 'var(--bg3)', border: '1px solid var(--border)' }}>
                    <Calendar size={12} style={{ color: 'var(--text4)' }} />
                    <span style={{ flex: 1, color: 'var(--text2)' }}>{inv.period}</span>
                    <span style={{ fontFamily: "'IBM Plex Mono', monospace", color: 'var(--text)' }}>R{Number(inv.amount?.replace(/[^0-9.]/g, '') ?? 0).toLocaleString()}</span>
                    <span className={`badge ${inv.status === 'Paid' ? 'badge-cyan' : 'badge-rose'}`} style={{ fontSize: 10 }}>{inv.status}</span>
                  </div>
                ))}
                {unpaid.length === 0 && invoices.length > 0 && (
                  <p style={{ fontSize: 11, color: '#4ade80', marginTop: 6 }}>
                    <CheckCircle2 size={11} style={{ display: 'inline', marginRight: 4, verticalAlign: 'middle' }} />
                    All clear — every invoice is paid.
                  </p>
                )}
              </div>
            )}
          </Section>
        )}

        {/* Contracts */}
        {isStudent && contracts.length > 0 && (
          <Section title="Contracts" icon={FileText}>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 6, fontSize: 12 }}>
              {contracts.map(c => (
                <div key={c.id} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '6px 10px', borderRadius: 6, background: 'var(--bg3)', border: '1px solid var(--border)' }}>
                  <FileText size={12} style={{ color: 'var(--text4)' }} />
                  <span style={{ flex: 1, color: 'var(--text2)' }}>{c.period}</span>
                  <span className="badge badge-cyan" style={{ fontSize: 10 }}>
                    {c.signedAt ? 'Signed' : c.status}
                  </span>
                </div>
              ))}
            </div>
          </Section>
        )}

        {/* Wallet history (chores + redemptions) */}
        {isStudent && (
          <Section title="Wallet activity (chores & rewards)" icon={Gift}>
            {walletTxns.length === 0 ? (
              <p style={{ fontSize: 13, color: 'var(--text3)' }}>No wallet activity yet.</p>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 6, fontSize: 12 }}>
                {walletTxns.map(tx => {
                  const sign = tx.type === 'EARN' || (tx.type === 'ADJUST' && tx.amount > 0) ? '+' : '−';
                  const color = sign === '+' ? '#4ade80' : 'var(--rose)';
                  return (
                    <div key={tx.id} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '6px 10px', borderRadius: 6, background: 'var(--bg3)', border: '1px solid var(--border)' }}>
                      <span style={{ flex: 1, color: 'var(--text2)' }}>
                        {tx.redemption ? `Redeemed: ${tx.redemption.voucher.name}` : tx.note}
                      </span>
                      <span style={{ fontFamily: "'IBM Plex Mono', monospace", color, fontWeight: 600 }}>
                        {sign}{Math.abs(tx.amount)} 🪙
                      </span>
                      <span style={{ fontFamily: "'IBM Plex Mono', monospace", fontSize: 10, color: 'var(--text4)' }}>
                        {new Date(tx.createdAt).toLocaleDateString()}
                      </span>
                    </div>
                  );
                })}
              </div>
            )}
          </Section>
        )}

        {/* Application status (pending students) */}
        {data.role === 'PENDING_STUDENT' && (
          <Section title="Application" icon={FileText}>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 10, fontSize: 12 }}>
              <InfoRow label="Status"        value={data.applicationStatus} />
              <InfoRow label="Submitted"     value={data.applicationSubmittedAt ? new Date(data.applicationSubmittedAt).toLocaleString() : '—'} />
              <InfoRow label="Approved"      value={data.applicationApprovedAt ? new Date(data.applicationApprovedAt).toLocaleString() : '—'} />
              <InfoRow label="Rejected"      value={data.applicationRejectedAt ? new Date(data.applicationRejectedAt).toLocaleString() : '—'} />
            </div>
            {data.applicationAdminNote && (
              <p style={{ marginTop: 10, fontSize: 12, color: 'var(--text3)' }}>Admin note: <em>{data.applicationAdminNote}</em></p>
            )}
          </Section>
        )}
      </div>

      {/* Reject doc modal */}
      {rejecting && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,.6)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 200, padding: 16 }} onClick={() => !decide.isPending && setRejecting(null)}>
          <div className="card" onClick={e => e.stopPropagation()} style={{ width: '100%', maxWidth: 460, padding: '22px 24px' }}>
            <h3 style={{ fontSize: 16, fontWeight: 700, color: 'var(--text)', marginBottom: 6 }}>
              Reject {DOC_LABEL[rejecting.type as ApplicationDocType] ?? rejecting.type}
            </h3>
            <p style={{ fontSize: 12, color: 'var(--text3)', marginBottom: 16 }}>
              {data.name} will be emailed + in-app-notified with this reason and asked to re-upload.
            </p>
            <label className="field-label">Reason</label>
            <textarea
              autoFocus rows={3}
              className="input-base"
              value={rejecting.reason}
              onChange={e => setRejecting({ ...rejecting, reason: e.target.value })}
              placeholder="e.g. Photo is blurry — please re-upload a sharper scan."
            />
            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 10, marginTop: 18 }}>
              <button className="btn-secondary" onClick={() => setRejecting(null)} disabled={decide.isPending} style={{ padding: '8px 16px', fontSize: 13 }}>
                Cancel
              </button>
              <button
                className="btn-primary"
                onClick={() => decide.mutate({ docId: rejecting.docId, decision: 'REJECTED', note: rejecting.reason.trim() })}
                disabled={decide.isPending || !rejecting.reason.trim()}
                style={{ padding: '8px 16px', fontSize: 13 }}
              >
                {decide.isPending ? <Loader2 size={13} className="animate-spin" /> : <XCircle size={13} />}
                Reject + notify
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// ─── Helpers ────────────────────────────────────────────────────────

function Section({ title, icon: Icon, anchor, children }: { title: string; icon: React.ComponentType<{ size?: number | string; style?: React.CSSProperties }>; anchor?: string; children: React.ReactNode }) {
  return (
    <div id={anchor} className="card" style={{ padding: '18px 20px' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 14 }}>
        <Icon size={14} style={{ color: 'var(--cyan)' }} />
        <h2 style={{ fontSize: 13, fontWeight: 700, color: 'var(--text)', fontFamily: "'IBM Plex Mono', monospace", letterSpacing: '.04em', textTransform: 'uppercase' }}>
          {title}
        </h2>
      </div>
      {children}
    </div>
  );
}

function KpiCard({ icon: Icon, label, value, tone, sub }: { icon: React.ComponentType<{ size?: number | string; style?: React.CSSProperties }>; label: string; value: number; tone: 'cyan' | 'rose'; sub?: string }) {
  const color = tone === 'rose' ? 'var(--rose)' : 'var(--cyan)';
  return (
    <div className="card" style={{ padding: '14px 16px' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 6 }}>
        <Icon size={12} style={{ color }} />
        <p className="micro-label">{label}</p>
      </div>
      <p style={{ fontSize: 22, fontWeight: 700, color, fontFamily: "'Space Grotesk', sans-serif", lineHeight: 1 }}>{value}</p>
      {sub && <p style={{ fontSize: 10, color: 'var(--text3)', marginTop: 4, fontFamily: "'IBM Plex Mono', monospace" }}>{sub}</p>}
    </div>
  );
}

function InfoRow({ label, value }: { label: string; value: string | null | undefined }) {
  return (
    <div>
      <p style={{ fontSize: 10, color: 'var(--text4)', fontFamily: "'IBM Plex Mono', monospace", textTransform: 'uppercase', letterSpacing: '.05em' }}>
        {label}
      </p>
      <p style={{ fontSize: 13, color: 'var(--text2)', marginTop: 2 }}>{value ?? '—'}</p>
    </div>
  );
}
