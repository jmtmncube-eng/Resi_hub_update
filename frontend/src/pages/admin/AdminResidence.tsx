import { useMemo } from 'react';
import { useSearchParams } from 'react-router-dom';
import { Building2, SquareStack, LayoutGrid, Activity, Camera } from 'lucide-react';
import { usePageTitle } from '../../hooks/usePageTitle';

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
                display: 'flex', alignItems: 'center', gap: 8,
                padding: '8px 14px',
                borderRadius: 8,
                border: 'none',
                background: isActive ? 'var(--bg2)' : 'transparent',
                boxShadow: isActive ? '0 1px 0 var(--shadow), inset 0 0 0 1px var(--border2)' : 'none',
                color: isActive ? 'var(--text)' : 'var(--text2)',
                fontSize: 13,
                fontWeight: isActive ? 600 : 500,
                fontFamily: "'Space Grotesk', sans-serif",
                cursor: 'pointer',
                position: 'relative',
              }}
            >
              <Icon size={14} style={{ color: isActive ? 'var(--cyan)' : 'currentColor' }} />
              {t.label}
              {isComingSoon && (
                <span style={{
                  fontSize: 8, fontWeight: 700,
                  padding: '1px 5px', borderRadius: 4,
                  background: 'rgba(232,25,122,.14)',
                  color: 'var(--rose)',
                  fontFamily: "'IBM Plex Mono', monospace",
                  textTransform: 'uppercase', letterSpacing: '.05em',
                  marginLeft: 2,
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
