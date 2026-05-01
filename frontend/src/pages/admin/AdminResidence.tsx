import { useMemo } from 'react';
import { useSearchParams } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { Building2, SquareStack, LayoutGrid, Activity, Camera, Pencil } from 'lucide-react';
import { usePageTitle } from '../../hooks/usePageTitle';
import { getSettings } from '../../services/admin.service';

import AdminAllocations   from './AdminAllocations';
import AdminSettings      from './AdminSettings';
import ResidenceHealth    from './ResidenceHealth';
import ResidenceTelemetry from './ResidenceTelemetry';

/**
 * Residence hub — single console for everything property-related:
 *   • Health metrics  — live business-health KPIs
 *   • Rooms           — set up, view occupancy grid, click-add tenants
 *   • Allocations     — table of every tenancy, edit/remove
 *   • Info            — residence name, address, contact info
 *   • Telemetry       — placeholder for camera & sensor feeds
 *
 * Tabs are URL-driven so admins can deep-link / back-button.
 */

type Tab = 'health' | 'rooms' | 'allocations' | 'info' | 'telemetry';

const TABS: { value: Tab; label: string; icon: typeof Building2; sub: string }[] = [
  { value: 'health',      label: 'Health',      icon: Activity,    sub: 'Business-health metrics at a glance' },
  { value: 'rooms',       label: 'Rooms',       icon: LayoutGrid,  sub: 'Setup, occupancy grid, add or remove tenants' },
  { value: 'allocations', label: 'Allocations', icon: SquareStack, sub: 'Every tenancy in one table' },
  { value: 'info',        label: 'Info',        icon: Building2,   sub: 'Residence name, address & contact details' },
  { value: 'telemetry',   label: 'Telemetry',   icon: Camera,      sub: 'Camera & sensor feeds (coming soon)' },
];

export default function AdminResidence() {
  usePageTitle('Residence · Admin');
  const [params, setParams] = useSearchParams();
  const tab = (params.get('tab') as Tab) || 'health';
  const { data: settings } = useQuery({ queryKey: ['settings'], queryFn: getSettings });

  const setTab = (next: Tab) => {
    const p = new URLSearchParams(params);
    p.set('tab', next);
    setParams(p, { replace: true });
  };

  const active = useMemo(() => TABS.find(t => t.value === tab) ?? TABS[0], [tab]);
  const residenceName = settings?.name?.trim() || 'Your residence';

  return (
    <div className="space-y-5 appear">
      {/* Header — residence name front-and-centre, with a quick-edit hop */}
      <div style={{ display: 'flex', alignItems: 'flex-end', justifyContent: 'space-between', gap: 16, flexWrap: 'wrap' }}>
        <div>
          <p className="micro-label" style={{ marginBottom: 6, color: 'var(--cyan)' }}>RESIDENCE</p>
          <h1 className="page-title" style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            {residenceName}
            <button
              onClick={() => setTab('info')}
              className="press-soft"
              title="Edit residence name & details"
              aria-label="Edit residence info"
              style={{
                width: 30, height: 30, borderRadius: 8,
                border: '1px solid var(--border2)',
                background: 'var(--bg3)',
                color: 'var(--text2)',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                cursor: 'pointer',
              }}
            >
              <Pencil size={13} />
            </button>
          </h1>
          <p className="page-sub">{active.sub}</p>
        </div>
      </div>

      {/* Tab strip — underlined for high visibility, scrolls horizontally
          on narrow screens so the active tab is never hidden. */}
      <div
        role="tablist"
        aria-label="Residence sections"
        style={{
          display: 'flex',
          gap: 4,
          borderBottom: '1px solid var(--border2)',
          overflowX: 'auto',
          flexWrap: 'nowrap',
          maxWidth: '100%',
        }}
      >
        {TABS.map(t => {
          const Icon = t.icon;
          const isActive = tab === t.value;
          const isComingSoon = t.value === 'telemetry';
          return (
            <button
              key={t.value}
              role="tab"
              aria-selected={isActive}
              onClick={() => setTab(t.value)}
              className="press-soft"
              style={{
                display: 'inline-flex', alignItems: 'center', gap: 8,
                padding: '12px 18px',
                marginBottom: -1,                          // overlap parent border
                background: 'transparent',
                border: 'none',
                borderBottom: `3px solid ${isActive ? 'var(--cyan)' : 'transparent'}`,
                color: isActive ? 'var(--text)' : 'var(--text2)',
                fontSize: 14,
                fontWeight: isActive ? 700 : 500,
                fontFamily: "'Space Grotesk', sans-serif",
                cursor: 'pointer',
                whiteSpace: 'nowrap',
                transition: 'border-color .18s, color .18s',
                flexShrink: 0,
              }}
            >
              <Icon size={15} style={{ color: isActive ? 'var(--cyan)' : 'currentColor' }} />
              {t.label}
              {isComingSoon && (
                <span style={{
                  fontSize: 9, fontWeight: 700,
                  padding: '2px 6px', borderRadius: 4,
                  background: 'rgba(232,25,122,.14)',
                  color: 'var(--rose)',
                  fontFamily: "'IBM Plex Mono', monospace",
                  textTransform: 'uppercase', letterSpacing: '.05em',
                  marginLeft: 4,
                }}>SOON</span>
              )}
            </button>
          );
        })}
      </div>

      {/* Tab body — keyed so the inner page resets cleanly when switching */}
      <div key={tab} className="appear">
        {tab === 'health'      && <ResidenceHealth />}
        {tab === 'rooms'       && <AdminSettings initialTab="rooms" hideHeader />}
        {tab === 'allocations' && <AdminAllocations hideHeader />}
        {tab === 'info'        && <AdminSettings initialTab="info"  hideHeader />}
        {tab === 'telemetry'   && <ResidenceTelemetry />}
      </div>
    </div>
  );
}
