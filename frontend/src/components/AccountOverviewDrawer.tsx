import { useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import {
  X, Loader2, Home, Wallet, Wrench, Users as UsersIcon,
  FileText, CalendarDays, BadgeCheck, AlertCircle, Phone, Mail,
} from 'lucide-react';
import { getAccountOverview, AccountOverview } from '../services/admin.service';

const ROLE_BADGE: Record<string, string> = {
  ADMIN:           'badge-rose',
  ACTIVE_STUDENT:  'badge-cyan',
  PENDING_STUDENT: 'badge-gray',
};

interface Props {
  accountId: string | null;
  onClose:   () => void;
}

const fmtR  = (n: string | number | null | undefined) =>
  n == null ? '—' : `R${Number(n).toLocaleString('en-ZA', { maximumFractionDigits: 0 })}`;

const APPLICATION_TONE: Record<AccountOverview['applicationStatus'], { color: string; bg: string; label: string }> = {
  DRAFT:     { color: 'var(--text3)', bg: 'rgba(255,255,255,.04)', label: 'Not started' },
  SUBMITTED: { color: '#f59e0b',      bg: 'rgba(245,158,11,.12)',  label: 'Awaiting review' },
  APPROVED:  { color: '#4ade80',      bg: 'rgba(74,222,128,.12)',  label: 'Approved' },
  REJECTED:  { color: 'var(--rose)',  bg: 'rgba(232,25,122,.12)',  label: 'Rejected' },
};

export default function AccountOverviewDrawer({ accountId, onClose }: Props) {
  // Lock body scroll while drawer is open
  useEffect(() => {
    if (!accountId) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => { document.body.style.overflow = prev; };
  }, [accountId]);

  const { data, isLoading, isError } = useQuery({
    queryKey: ['account-overview', accountId],
    queryFn:  () => getAccountOverview(accountId!),
    enabled:  !!accountId,
  });

  if (!accountId) return null;

  return (
    <div
      onClick={onClose}
      style={{
        position: 'fixed', inset: 0, zIndex: 8500,
        background: 'rgba(0,0,0,.55)', backdropFilter: 'blur(2px)',
      }}
    >
      <aside
        onClick={e => e.stopPropagation()}
        className="appear"
        style={{
          position: 'absolute', top: 0, right: 0, bottom: 0,
          width: 'min(560px, 100vw)',
          background: 'var(--bg2)',
          borderLeft: '1px solid var(--border2)',
          boxShadow: '-12px 0 24px rgba(0,0,0,.35)',
          overflowY: 'auto',
          padding: '22px 24px',
        }}
      >
        {/* Header */}
        <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 18 }}>
          <div>
            <p className="micro-label" style={{ color: 'var(--cyan)' }}>Account overview</p>
            <p style={{ fontSize: 18, fontWeight: 700, color: 'var(--text)', marginTop: 2 }}>
              {isLoading ? 'Loading…' : data?.name ?? 'Unknown'}
            </p>
          </div>
          <button onClick={onClose} className="btn-ghost" style={{ padding: 6, borderRadius: 8 }}>
            <X size={14} />
          </button>
        </div>

        {isLoading && (
          <div style={{ padding: '40px 0', display: 'flex', justifyContent: 'center' }}>
            <Loader2 size={22} className="animate-spin" style={{ color: 'var(--cyan)' }} />
          </div>
        )}
        {isError && (
          <div className="card-sm" style={{ padding: 16, color: 'var(--rose)', fontSize: 13 }}>
            Failed to load — try again.
          </div>
        )}

        {data && <DrawerBody data={data} />}
      </aside>
    </div>
  );
}

function DrawerBody({ data }: { data: AccountOverview }) {
  const appTone = APPLICATION_TONE[data.applicationStatus];

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
      {/* Identity card */}
      <div className="card-sm" style={{ padding: '14px 16px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
          <div style={{
            width: 56, height: 56, borderRadius: '50%', flexShrink: 0,
            background: 'rgba(0,204,204,.18)',
            border: '1px solid rgba(0,204,204,.35)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            fontSize: 20, fontWeight: 700, color: 'var(--cyan)',
          }}>
            {data.name.split(' ').map(p => p[0]).slice(0, 2).join('').toUpperCase()}
          </div>
          <div style={{ flex: 1, minWidth: 0 }}>
            <p style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
              <span style={{ fontSize: 15, fontWeight: 700, color: 'var(--text)' }}>{data.name}</span>
              <span className={`badge ${ROLE_BADGE[data.role] ?? ''}`}>{data.role.replace('_', ' ').toLowerCase()}</span>
              {!data.isActive && (
                <span style={{
                  padding: '2px 8px', borderRadius: 999,
                  fontSize: 10, fontWeight: 600,
                  background: 'rgba(232,25,122,.12)', color: 'var(--rose)',
                  border: '1px solid rgba(232,25,122,.3)',
                  fontFamily: "'IBM Plex Mono', monospace", textTransform: 'uppercase',
                }}>Disabled</span>
              )}
            </p>
            <p style={{ fontFamily: "'IBM Plex Mono', monospace", fontSize: 11, color: 'var(--text3)', marginTop: 2, display: 'flex', flexWrap: 'wrap', gap: 10 }}>
              <span style={{ display: 'flex', alignItems: 'center', gap: 4 }}><Mail size={11} />{data.email}</span>
              {data.phone && <span style={{ display: 'flex', alignItems: 'center', gap: 4 }}><Phone size={11} />{data.phone}</span>}
            </p>
            <p style={{ fontSize: 11, color: 'var(--text3)', marginTop: 4 }}>
              {data.program && data.university
                ? `${data.program} · ${data.university}${data.year ? ` · Year ${data.year}` : ''}`
                : 'No academic info'}
            </p>
          </div>
        </div>
      </div>

      {/* KPI strip */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 8 }}>
        <Kpi label="Wallet"      value={`${data.wallet?.credits ?? 0}`} hint="credits"    color="var(--cyan)" />
        <Kpi label="Open tickets" value={`${data.stats.openTickets}`}    hint={`of ${data.stats.totalTickets}`} color={data.stats.openTickets > 0 ? '#f59e0b' : 'var(--text2)'} />
        <Kpi label="Visitors"    value={`${data.stats.upcomingPasses}`} hint={`upcoming · ${data.stats.totalPasses} all-time`} color="var(--text2)" />
      </div>

      {/* Where they stay */}
      <Section icon={Home} title="Where they stay">
        {data.allocation ? (
          <div className="card-sm" style={{ padding: '14px 16px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: 8 }}>
              <div>
                <p style={{ fontSize: 16, fontWeight: 700, color: 'var(--text)' }}>
                  Room {data.allocation.room.number}
                  <span style={{ fontFamily: "'IBM Plex Mono', monospace", fontSize: 11, color: 'var(--text3)', marginLeft: 8 }}>
                    Block {data.allocation.room.block} · {data.allocation.room.type}
                  </span>
                </p>
                {data.allocation.room.residence && (
                  <p style={{ fontSize: 12, color: 'var(--text3)', marginTop: 2 }}>
                    {data.allocation.room.residence.name}
                  </p>
                )}
              </div>
              <span style={{
                padding: '3px 10px', borderRadius: 999,
                fontSize: 10, fontWeight: 600,
                background: data.allocation.status === 'ACTIVE' ? 'rgba(74,222,128,.12)' : 'rgba(245,158,11,.12)',
                color:      data.allocation.status === 'ACTIVE' ? '#4ade80' : '#f59e0b',
                border: `1px solid ${data.allocation.status === 'ACTIVE' ? 'rgba(74,222,128,.3)' : 'rgba(245,158,11,.3)'}`,
                fontFamily: "'IBM Plex Mono', monospace", textTransform: 'uppercase',
              }}>{data.allocation.status}</span>
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 8, marginTop: 12 }}>
              <Mini label="Rent"      value={fmtR(data.allocation.rent)} hint="per month" />
              <Mini label="Balance"   value={fmtR(data.allocation.balance)} hint={Number(data.allocation.balance) > 0 ? 'outstanding' : 'all clear'} accent={Number(data.allocation.balance) > 0 ? 'rose' : 'green'} />
              <Mini label="Move-in"   value={data.allocation.moveIn ? new Date(data.allocation.moveIn).toLocaleDateString() : '—'} hint="" />
            </div>
          </div>
        ) : (
          <Empty>No room allocated yet.</Empty>
        )}
      </Section>

      {/* Application — only relevant for pending students */}
      {data.role === 'PENDING_STUDENT' && (
        <Section icon={BadgeCheck} title="Application">
          <div className="card-sm" style={{ padding: '12px 14px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <span style={{
                padding: '3px 10px', borderRadius: 999,
                fontSize: 10, fontWeight: 600,
                background: appTone.bg, color: appTone.color,
                border: `1px solid ${appTone.color}40`,
                fontFamily: "'IBM Plex Mono', monospace", textTransform: 'uppercase',
              }}>{appTone.label}</span>
              {data.idNumber && (
                <span style={{ fontFamily: "'IBM Plex Mono', monospace", fontSize: 11, color: 'var(--text3)' }}>
                  ID: {data.idNumber}
                </span>
              )}
            </div>
            {data.applicationSubmittedAt && (
              <p style={{ fontSize: 11, color: 'var(--text3)', marginTop: 8 }}>
                Submitted {new Date(data.applicationSubmittedAt).toLocaleDateString()}
              </p>
            )}
            {data.applicationAdminNote && (
              <p style={{ fontSize: 12, color: 'var(--text2)', marginTop: 6, lineHeight: 1.5 }}>
                <strong>Note:</strong> {data.applicationAdminNote}
              </p>
            )}
          </div>
        </Section>
      )}

      {/* Payments / invoices */}
      <Section
        icon={Wallet}
        title="Payments & invoices"
        hint={data.stats.monthsUnpaid > 0
          ? `${data.stats.monthsUnpaid} unpaid · ${data.stats.monthsPaid} paid`
          : `${data.stats.monthsPaid} paid · all clear`}>
        {data.documents.filter(d => d.type === 'INVOICE').length === 0 ? (
          <Empty>No invoices on file.</Empty>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
            {data.documents.filter(d => d.type === 'INVOICE').map(d => (
              <div key={d.id} style={{
                display: 'flex', alignItems: 'center', gap: 10,
                padding: '8px 10px', borderRadius: 8,
                background: d.status === 'Paid' ? 'rgba(74,222,128,.04)' : 'rgba(232,25,122,.04)',
                border: `1px solid ${d.status === 'Paid' ? 'rgba(74,222,128,.18)' : 'rgba(232,25,122,.16)'}`,
              }}>
                <FileText size={12} style={{ color: d.status === 'Paid' ? '#4ade80' : 'var(--rose)', flexShrink: 0 }} />
                <span style={{ flex: 1, fontSize: 12, color: 'var(--text)' }}>{d.period}</span>
                <span style={{ fontFamily: "'IBM Plex Mono', monospace", fontSize: 12, color: 'var(--text2)' }}>{d.amount ?? '—'}</span>
                <span style={{
                  fontFamily: "'IBM Plex Mono', monospace", fontSize: 10, fontWeight: 600,
                  color: d.status === 'Paid' ? '#4ade80' : 'var(--rose)',
                }}>
                  {d.status.toUpperCase()}
                </span>
              </div>
            ))}
          </div>
        )}
      </Section>

      {/* Contract */}
      <Section icon={FileText} title="Contract">
        {data.documents.filter(d => d.type === 'CONTRACT').length === 0 ? (
          <Empty>No contract on file.</Empty>
        ) : (
          data.documents.filter(d => d.type === 'CONTRACT').slice(0, 1).map(c => (
            <div key={c.id} className="card-sm" style={{ padding: '10px 12px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <span style={{ fontSize: 12, color: 'var(--text)' }}>{c.period}</span>
              <span style={{
                padding: '3px 10px', borderRadius: 999,
                fontSize: 10, fontWeight: 600,
                background: c.status === 'Signed' ? 'rgba(74,222,128,.12)' : 'rgba(245,158,11,.12)',
                color:      c.status === 'Signed' ? '#4ade80' : '#f59e0b',
                border: `1px solid ${c.status === 'Signed' ? 'rgba(74,222,128,.3)' : 'rgba(245,158,11,.3)'}`,
                fontFamily: "'IBM Plex Mono', monospace", textTransform: 'uppercase',
              }}>{c.status}</span>
            </div>
          ))
        )}
      </Section>

      {/* Activity counters */}
      <Section icon={Wrench} title="Activity">
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
          <Mini label="Tickets" value={`${data.stats.totalTickets}`} hint={data.stats.openTickets > 0 ? `${data.stats.openTickets} open` : 'none open'} accent={data.stats.openTickets > 0 ? 'amber' : 'green'} />
          <Mini label="Visitor passes" value={`${data.stats.totalPasses}`} hint={data.stats.upcomingPasses > 0 ? `${data.stats.upcomingPasses} upcoming` : 'none scheduled'} />
        </div>
      </Section>

      {/* Footer meta */}
      <div style={{ marginTop: 4, fontFamily: "'IBM Plex Mono', monospace", fontSize: 10, color: 'var(--text4)', textAlign: 'center' }}>
        Account created {new Date(data.createdAt).toLocaleDateString()}
        {data.onboardedAt && ` · onboarded ${new Date(data.onboardedAt).toLocaleDateString()}`}
      </div>
    </div>
  );
}

function Section({ icon: Icon, title, hint, children }: {
  icon: typeof Home; title: string; hint?: string; children: React.ReactNode;
}) {
  return (
    <div>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 }}>
        <span className="micro-label" style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
          <Icon size={11} /> {title}
        </span>
        {hint && (
          <span style={{ fontFamily: "'IBM Plex Mono', monospace", fontSize: 10, color: 'var(--text3)' }}>{hint}</span>
        )}
      </div>
      {children}
    </div>
  );
}

function Kpi({ label, value, hint, color }: { label: string; value: string; hint?: string; color: string }) {
  return (
    <div className="card-sm" style={{ padding: '10px 12px' }}>
      <p style={{ fontFamily: "'IBM Plex Mono', monospace", fontSize: 9, color: 'var(--text3)', letterSpacing: '.05em', textTransform: 'uppercase' }}>{label}</p>
      <p style={{ fontFamily: "'Space Grotesk', sans-serif", fontSize: 22, fontWeight: 700, color, lineHeight: 1, marginTop: 4 }}>{value}</p>
      {hint && <p style={{ fontSize: 10, color: 'var(--text3)', marginTop: 3, fontFamily: "'IBM Plex Mono', monospace" }}>{hint}</p>}
    </div>
  );
}

function Mini({ label, value, hint, accent }: { label: string; value: string; hint?: string; accent?: 'rose' | 'green' | 'amber' }) {
  const color =
    accent === 'rose'  ? 'var(--rose)' :
    accent === 'green' ? '#4ade80'     :
    accent === 'amber' ? '#f59e0b'     : 'var(--text)';
  return (
    <div style={{
      borderRadius: 8, padding: '8px 10px',
      background: 'var(--bg3)', border: '1px solid var(--border)',
    }}>
      <p style={{ fontFamily: "'IBM Plex Mono', monospace", fontSize: 9, color: 'var(--text3)' }}>{label}</p>
      <p style={{ fontFamily: "'Space Grotesk', sans-serif", fontSize: 15, fontWeight: 700, color, marginTop: 2 }}>{value}</p>
      {hint && <p style={{ fontSize: 10, color: 'var(--text4)', marginTop: 1 }}>{hint}</p>}
    </div>
  );
}

function Empty({ children }: { children: React.ReactNode }) {
  return (
    <div style={{
      borderRadius: 10, padding: '14px 16px',
      background: 'rgba(255,255,255,.02)', border: '1px dashed var(--border)',
      display: 'flex', alignItems: 'center', gap: 8,
      fontSize: 12, color: 'var(--text3)',
    }}>
      <AlertCircle size={12} style={{ color: 'var(--text4)' }} />
      {children}
    </div>
  );
}
