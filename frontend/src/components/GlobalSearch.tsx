import { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { Search, Loader2, Users, DoorOpen, FileText, Wrench } from 'lucide-react';
import { globalSearch } from '../services/search.service';
import { useAuth } from '../contexts/AuthContext';
import { useResidence } from '../contexts/ResidenceContext';
import { ROUTES } from '../constants/routes';

/**
 * Admin global search — one box in the topbar that spans residents,
 * rooms, invoices and tickets. Management roles only (the query
 * endpoint is management-guarded). Debounced; results navigate to the
 * relevant admin list page.
 */
export function GlobalSearch() {
  const { user } = useAuth();
  const { selectedId: residenceId } = useResidence();
  const nav = useNavigate();
  const [raw, setRaw]       = useState('');
  const [query, setQuery]   = useState('');
  const [open, setOpen]     = useState(false);
  const boxRef = useRef<HTMLDivElement>(null);

  // Debounce the typed value before it becomes the query.
  useEffect(() => {
    const t = setTimeout(() => setQuery(raw.trim()), 250);
    return () => clearTimeout(t);
  }, [raw]);

  // Close on outside click / escape.
  useEffect(() => {
    if (!open) return;
    const onClick = (e: MouseEvent) => {
      if (boxRef.current && !boxRef.current.contains(e.target as Node)) setOpen(false);
    };
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') setOpen(false); };
    document.addEventListener('mousedown', onClick);
    window.addEventListener('keydown', onKey);
    return () => {
      document.removeEventListener('mousedown', onClick);
      window.removeEventListener('keydown', onKey);
    };
  }, [open]);

  const { data, isFetching } = useQuery({
    queryKey: ['global-search', query, residenceId],
    queryFn:  () => globalSearch(query, residenceId ?? undefined),
    enabled:  query.length >= 2,
  });

  // Management roles only.
  if (user?.role !== 'ADMIN' && user?.role !== 'MANAGER') return null;

  const total = data
    ? data.residents.length + data.rooms.length + data.invoices.length + data.tickets.length
    : 0;

  function go(path: string) {
    setOpen(false);
    setRaw('');
    nav(path);
  }

  return (
    <div ref={boxRef} style={{ position: 'relative', flex: 1, maxWidth: 360 }}>
      <div style={{ position: 'relative' }}>
        <Search size={14} style={{
          position: 'absolute', left: 10, top: '50%', transform: 'translateY(-50%)',
          color: 'var(--text3)', pointerEvents: 'none',
        }} />
        <input
          value={raw}
          onChange={e => { setRaw(e.target.value); setOpen(true); }}
          onFocus={() => setOpen(true)}
          placeholder="Search residents, rooms, invoices…"
          style={{
            width: '100%', padding: '8px 10px 8px 30px',
            borderRadius: 999, fontSize: 12,
            background: 'var(--bg2)', border: '1px solid var(--border)',
            color: 'var(--text)', outline: 'none',
          }}
        />
        {isFetching && (
          <Loader2 size={13} className="animate-spin" style={{
            position: 'absolute', right: 10, top: '50%', transform: 'translateY(-50%)',
            color: 'var(--text3)',
          }} />
        )}
      </div>

      {open && query.length >= 2 && (
        <div
          className="appear"
          style={{
            position: 'absolute', top: 'calc(100% + 8px)', left: 0, right: 0,
            background: 'var(--bg2)', border: '1px solid var(--border2)',
            borderRadius: 12, overflow: 'hidden', zIndex: 1000,
            boxShadow: '0 18px 50px -18px rgba(0,0,0,.45)',
            maxHeight: 420, overflowY: 'auto',
          }}
        >
          {!data || total === 0 ? (
            <p style={{ padding: 18, fontSize: 12, color: 'var(--text3)', textAlign: 'center' }}>
              {isFetching ? 'Searching…' : 'No matches.'}
            </p>
          ) : (
            <>
              <Group icon={<Users size={12} />} label="Residents & staff" items={data.residents}
                     render={r => `${r.name} · ${r.email}`}
                     onPick={() => go(ROUTES.ADMIN_ACCOUNTS)} />
              <Group icon={<DoorOpen size={12} />} label="Rooms" items={data.rooms}
                     render={r => `${r.block}-${r.number} · ${r.type.toLowerCase()} · ${r.status.toLowerCase()}`}
                     onPick={() => go(`${ROUTES.ADMIN_RESIDENCE}?tab=rooms`)} />
              <Group icon={<FileText size={12} />} label="Invoices" items={data.invoices}
                     render={i => `${i.userName} · ${i.period} · ${i.amount ?? '—'} · ${i.status}`}
                     onPick={() => go(ROUTES.ADMIN_PAYMENTS)} />
              <Group icon={<Wrench size={12} />} label="Tickets" items={data.tickets}
                     render={t => `${t.category} · ${t.location} · ${t.studentName} · ${t.status.toLowerCase()}`}
                     onPick={() => go(ROUTES.ADMIN_MAINTENANCE)} />
            </>
          )}
        </div>
      )}
    </div>
  );
}

function Group<T extends { id: string }>({ icon, label, items, render, onPick }: {
  icon: React.ReactNode;
  label: string;
  items: T[];
  render: (item: T) => string;
  onPick: () => void;
}) {
  if (items.length === 0) return null;
  return (
    <div>
      <div style={{
        display: 'flex', alignItems: 'center', gap: 6,
        padding: '8px 12px 4px',
        fontSize: 9, fontWeight: 700, letterSpacing: '.06em', textTransform: 'uppercase',
        color: 'var(--text3)', fontFamily: "'IBM Plex Mono', monospace",
      }}>
        {icon} {label}
      </div>
      {items.map(item => (
        <button
          key={item.id}
          onClick={onPick}
          className="press-soft"
          style={{
            width: '100%', textAlign: 'left',
            padding: '7px 12px', fontSize: 12, color: 'var(--text2)',
            background: 'transparent', border: 'none', cursor: 'pointer',
            whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis',
          }}
          onMouseEnter={e => (e.currentTarget.style.background = 'var(--hover)')}
          onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}
        >
          {render(item)}
        </button>
      ))}
    </div>
  );
}
