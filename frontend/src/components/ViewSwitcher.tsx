import { useState, useEffect } from 'react';
import { List, LayoutGrid } from 'lucide-react';

/* ------------------------------------------------------------------
 *  ViewSwitcher
 * ------------------------------------------------------------------
 *  A small segmented control for toggling between the detailed
 *  "list" view (default — verbose, includes recent-entry rows etc.)
 *  and a compact "cards" view (heading + key stats only, scannable
 *  at a glance, no entry lists).
 *
 *  The choice persists in `localStorage` keyed by `storageKey`, so a
 *  user's preference survives navigation, refresh, and re-login —
 *  but is scoped per surface (Operations vs Live monitoring can have
 *  independent preferences via different keys).
 * ------------------------------------------------------------------ */

export type ViewMode = 'list' | 'cards';

/** Hook — read/write the view mode from localStorage by a stable key. */
export function useViewMode(
  storageKey: string,
  defaultMode: ViewMode = 'list',
): [ViewMode, (mode: ViewMode) => void] {
  const [mode, setMode] = useState<ViewMode>(() => {
    if (typeof window === 'undefined') return defaultMode;
    const stored = window.localStorage.getItem(storageKey);
    return stored === 'cards' || stored === 'list' ? stored : defaultMode;
  });

  useEffect(() => {
    try { window.localStorage.setItem(storageKey, mode); } catch { /* quota/private mode */ }
  }, [storageKey, mode]);

  return [mode, setMode];
}

export function ViewSwitcher({ value, onChange, label = 'View' }: {
  value: ViewMode;
  onChange: (mode: ViewMode) => void;
  label?: string;
}) {
  const options: { mode: ViewMode; icon: typeof List; tip: string }[] = [
    { mode: 'list',  icon: List,       tip: 'Detailed list view' },
    { mode: 'cards', icon: LayoutGrid, tip: 'Compact card view'  },
  ];

  return (
    <div
      role="group"
      aria-label={label}
      style={{
        display: 'inline-flex', alignItems: 'center',
        background: 'var(--bg3)',
        border: '1px solid var(--border)',
        borderRadius: 8,
        padding: 3,
        gap: 2,
      }}
    >
      {options.map(({ mode, icon: Icon, tip }) => {
        const active = value === mode;
        return (
          <button
            key={mode}
            onClick={() => onChange(mode)}
            aria-pressed={active}
            title={tip}
            className="press-soft"
            style={{
              display: 'flex', alignItems: 'center', gap: 5,
              padding: '5px 10px',
              fontSize: 11, fontWeight: 600,
              borderRadius: 6,
              border: 'none', cursor: 'pointer',
              background: active ? 'var(--bg2)' : 'transparent',
              color:      active ? 'var(--cyan)' : 'var(--text3)',
              boxShadow:  active ? '0 1px 2px rgba(0,0,0,.25)' : 'none',
              transition: 'background .15s, color .15s',
            }}
          >
            <Icon size={12} />
            {mode === 'list' ? 'List' : 'Cards'}
          </button>
        );
      })}
    </div>
  );
}
