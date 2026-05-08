import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Activity, Filter, ChevronLeft, ChevronRight, Search, User as UserIcon } from 'lucide-react';
import { listAuditLogs, listAuditActions } from '../../services/audit.service';
import { usePageTitle } from '../../hooks/usePageTitle';
import { format } from 'date-fns';

/**
 * Admin "Activity" log — every audited action across the system, with
 * filters for action type and free-text search. Paginated 30 per page.
 */
export default function AdminAudit() {
  usePageTitle('Activity log · Admin');

  const [page,   setPage]   = useState(1);
  const [action, setAction] = useState<string>('');
  const [search, setSearch] = useState('');

  const { data: page1, isLoading } = useQuery({
    queryKey: ['audit', { page, action, search }],
    queryFn:  () => listAuditLogs({ page, action: action || undefined, search: search || undefined, limit: 30 }),
  });

  const { data: actions = [] } = useQuery({
    queryKey: ['audit-actions'],
    queryFn:  listAuditActions,
  });

  const items = page1?.items ?? [];
  const pag   = page1?.pagination;

  return (
    <div className="space-y-5 appear">
      <div>
        <h1 className="page-title" style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <Activity size={22} style={{ color: 'var(--cyan)' }} />
          Activity log
        </h1>
        <p className="page-sub">
          {pag ? `${pag.total.toLocaleString()} total events` : 'Loading…'}
          {' · '}every audited action across the system
        </p>
      </div>

      {/* Filters */}
      <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
        <div style={{ position: 'relative', flex: '1 1 240px', maxWidth: 360 }}>
          <Search size={13} style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)', color: 'var(--text3)' }} />
          <input
            value={search}
            onChange={e => { setSearch(e.target.value); setPage(1); }}
            placeholder="Search action or entity…"
            className="input-base"
            style={{ paddingLeft: 32 }}
          />
        </div>
        <div style={{ display: 'inline-flex', gap: 4, padding: 4, background: 'var(--bg3)', borderRadius: 10, border: '1px solid var(--border)', alignItems: 'center', flexWrap: 'wrap' }}>
          <Filter size={11} style={{ color: 'var(--text3)', marginLeft: 8 }} />
          {[
            { value: '',                     label: 'All' },
            { value: 'LOGIN',                label: 'Logins' },
            { value: 'ACCOUNT_APPROVED',     label: 'Approvals' },
            { value: 'ACCOUNT_DEACTIVATED',  label: 'Deactivations' },
            { value: 'ACCOUNT_REACTIVATED',  label: 'Reactivations' },
            ...actions
              .filter(a => !['LOGIN', 'ACCOUNT_APPROVED', 'ACCOUNT_DEACTIVATED', 'ACCOUNT_REACTIVATED'].includes(a))
              .map(a => ({ value: a, label: prettyAction(a) })),
          ].map(f => (
            <button
              key={f.value || 'all'}
              onClick={() => { setAction(f.value); setPage(1); }}
              className="press-soft"
              style={{
                padding: '6px 12px', borderRadius: 7, border: 'none',
                fontSize: 11, fontFamily: "'IBM Plex Mono', monospace",
                fontWeight: action === f.value ? 600 : 400,
                background: action === f.value ? 'var(--bg2)' : 'transparent',
                color:      action === f.value ? 'var(--text)' : 'var(--text3)',
                cursor: 'pointer',
              }}
            >
              {f.label}
            </button>
          ))}
        </div>
      </div>

      {/* List */}
      {isLoading ? (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
          {[...Array(8)].map((_, i) => <div key={i} className="skeleton" style={{ height: 56, borderRadius: 8 }} />)}
        </div>
      ) : items.length === 0 ? (
        <div className="card empty-state">
          <Activity size={28} style={{ color: 'var(--text4)', margin: '0 auto 12px' }} />
          <p style={{ fontWeight: 600, color: 'var(--text2)' }}>No matching activity</p>
          <p>Try a different filter or clear the search.</p>
        </div>
      ) : (
        <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
          {items.map((entry, i) => (
            <div
              key={entry.id}
              style={{
                display: 'flex', alignItems: 'center', gap: 14,
                padding: '12px 18px',
                borderBottom: i === items.length - 1 ? 'none' : '1px solid var(--border)',
              }}
            >
              {/* Avatar */}
              {entry.user?.avatarUrl ? (
                <img src={entry.user.avatarUrl} alt="" style={{
                  width: 32, height: 32, borderRadius: '50%', objectFit: 'cover', flexShrink: 0,
                }} />
              ) : (
                <div className={`avatar ${entry.user?.role === 'ADMIN' ? 'avatar-rose' : 'avatar-cyan'}`}
                     style={{ width: 32, height: 32, fontSize: 11, fontWeight: 700, flexShrink: 0 }}>
                  {entry.user?.name?.charAt(0).toUpperCase() ?? <UserIcon size={13} />}
                </div>
              )}

              {/* Action description */}
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
                  <span style={{ fontSize: 13, fontWeight: 600, color: 'var(--text)' }}>
                    {entry.user?.name ?? 'System'}
                  </span>
                  <ActionPill action={entry.action} />
                  {entry.entity && (
                    <span style={{ fontSize: 11, color: 'var(--text3)', fontFamily: "'IBM Plex Mono', monospace" }}>
                      on {entry.entity}
                    </span>
                  )}
                </div>
                {entry.meta && Object.keys(entry.meta).length > 0 && (
                  <p style={{
                    fontSize: 11, color: 'var(--text3)',
                    fontFamily: "'IBM Plex Mono', monospace",
                    marginTop: 3,
                    whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis',
                  }}>
                    {Object.entries(entry.meta)
                      .filter(([, v]) => v != null && v !== '')
                      .slice(0, 4)
                      .map(([k, v]) => `${k}: ${typeof v === 'string' ? v : JSON.stringify(v)}`)
                      .join(' · ')}
                  </p>
                )}
              </div>

              {/* Timestamp + IP */}
              <div style={{ flexShrink: 0, textAlign: 'right' }}>
                <p style={{ fontSize: 11, color: 'var(--text2)', fontFamily: "'IBM Plex Mono', monospace" }}>
                  {format(new Date(entry.createdAt), 'dd MMM HH:mm:ss')}
                </p>
                {entry.ip && (
                  <p style={{ fontSize: 9, color: 'var(--text4)', fontFamily: "'IBM Plex Mono', monospace", marginTop: 2 }}>
                    {entry.ip}
                  </p>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Pagination */}
      {pag && pag.pageCount > 1 && (
        <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', gap: 12 }}>
          <button
            onClick={() => setPage(p => Math.max(1, p - 1))}
            disabled={page <= 1}
            className="btn-ghost press-soft"
            style={{ padding: '7px 14px', fontSize: 12, display: 'flex', alignItems: 'center', gap: 5 }}
          >
            <ChevronLeft size={12} /> Prev
          </button>
          <span style={{ fontFamily: "'IBM Plex Mono', monospace", fontSize: 12, color: 'var(--text3)' }}>
            Page {pag.page} of {pag.pageCount}
          </span>
          <button
            onClick={() => setPage(p => Math.min(pag.pageCount, p + 1))}
            disabled={page >= pag.pageCount}
            className="btn-ghost press-soft"
            style={{ padding: '7px 14px', fontSize: 12, display: 'flex', alignItems: 'center', gap: 5 }}
          >
            Next <ChevronRight size={12} />
          </button>
        </div>
      )}
    </div>
  );
}

function prettyAction(a: string): string {
  return a.toLowerCase().replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase());
}

function ActionPill({ action }: { action: string }) {
  // Tone tiers
  const isDanger  = /DEACTIVAT|REJECT|REMOV|FAIL|DELETE/i.test(action);
  const isSuccess = /APPROV|REACTIVAT|CREATE|LOGIN/i.test(action);
  const palette = isDanger ? { bg: 'rgba(232,25,122,.12)', color: 'var(--rose)' }
                : isSuccess ? { bg: 'rgba(74,222,128,.12)', color: '#4ade80' }
                : { bg: 'rgba(0,204,204,.10)', color: 'var(--cyan)' };
  return (
    <span style={{
      fontFamily: "'IBM Plex Mono', monospace",
      fontSize: 9, fontWeight: 700,
      padding: '2px 7px', borderRadius: 4,
      background: palette.bg, color: palette.color,
      textTransform: 'uppercase', letterSpacing: '.05em',
    }}>
      {action}
    </span>
  );
}
