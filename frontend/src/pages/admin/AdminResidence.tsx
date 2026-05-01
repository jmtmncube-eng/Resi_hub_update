import { useMemo } from 'react';
import { useSearchParams } from 'react-router-dom';
import { Building2, SquareStack, LayoutGrid } from 'lucide-react';
import { usePageTitle } from '../../hooks/usePageTitle';

import AdminAllocations from './AdminAllocations';
import AdminSettings    from './AdminSettings';

/**
 * Residence hub — consolidates the previously-separate Allocations and
 * Residence (rooms + info) admin pages behind one nav entry.
 *
 * Tabs are URL-driven (?tab=allocations|rooms|info) so admins can deep-link
 * and back-button between sections without losing state.
 */

type Tab = 'allocations' | 'rooms' | 'info';

const TABS: { value: Tab; label: string; icon: typeof Building2; sub: string }[] = [
  { value: 'allocations', label: 'Allocations', icon: SquareStack, sub: 'Assign students to rooms' },
  { value: 'rooms',       label: 'Rooms',       icon: LayoutGrid,  sub: 'Setup & live occupancy' },
  { value: 'info',        label: 'Info',        icon: Building2,   sub: 'Residence details' },
];

export default function AdminResidence() {
  usePageTitle('Residence · Admin');
  const [params, setParams] = useSearchParams();
  const tab = (params.get('tab') as Tab) || 'allocations';

  const setTab = (next: Tab) => {
    const p = new URLSearchParams(params);
    p.set('tab', next);
    setParams(p, { replace: true });
  };

  const active = useMemo(() => TABS.find(t => t.value === tab) ?? TABS[0], [tab]);

  return (
    <div className="space-y-5 appear">
      {/* Header */}
      <div>
        <h1 className="page-title">Residence</h1>
        <p className="page-sub">{active.sub}</p>
      </div>

      {/* Tab strip — segmented control */}
      <div
        role="tablist"
        aria-label="Residence sections"
        style={{
          display: 'inline-flex',
          padding: 4,
          borderRadius: 12,
          background: 'var(--bg3)',
          border: '1px solid var(--border)',
          gap: 2,
          flexWrap: 'wrap',
        }}
      >
        {TABS.map(t => {
          const Icon = t.icon;
          const isActive = tab === t.value;
          return (
            <button
              key={t.value}
              role="tab"
              aria-selected={isActive}
              onClick={() => setTab(t.value)}
              className="press-soft"
              style={{
                display: 'flex', alignItems: 'center', gap: 8,
                padding: '8px 16px',
                borderRadius: 8,
                border: 'none',
                background: isActive ? 'var(--bg2)' : 'transparent',
                boxShadow: isActive ? '0 1px 0 var(--shadow), inset 0 0 0 1px var(--border2)' : 'none',
                color: isActive ? 'var(--text)' : 'var(--text2)',
                fontSize: 13,
                fontWeight: isActive ? 600 : 500,
                fontFamily: "'Space Grotesk', sans-serif",
                cursor: 'pointer',
              }}
            >
              <Icon size={14} style={{ color: isActive ? 'var(--cyan)' : 'currentColor' }} />
              {t.label}
            </button>
          );
        })}
      </div>

      {/* Tab body — keyed so the inner page resets cleanly when switching */}
      <div key={tab} className="appear">
        {tab === 'allocations' && <AdminAllocations />}
        {tab === 'rooms'       && <AdminSettings initialTab="rooms" hideHeader />}
        {tab === 'info'        && <AdminSettings initialTab="info"  hideHeader />}
      </div>
    </div>
  );
}
