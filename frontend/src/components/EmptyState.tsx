import type { LucideIcon } from 'lucide-react';

/**
 * Friendly empty-state placeholder — shown when a list or page has no
 * data yet, instead of a blank gap. Keep the copy reassuring and, where
 * useful, give the user the one action that fills the void.
 */
export function EmptyState({
  icon: Icon,
  title,
  message,
  action,
  compact = false,
}: {
  icon: LucideIcon;
  title: string;
  message?: string;
  action?: { label: string; onClick: () => void };
  /** Tighter padding for in-card placeholders. */
  compact?: boolean;
}) {
  return (
    <div
      role="status"
      style={{
        display: 'flex', flexDirection: 'column', alignItems: 'center',
        textAlign: 'center', gap: 8,
        padding: compact ? '24px 16px' : '48px 24px',
      }}
    >
      <div style={{
        width: 44, height: 44, borderRadius: 12,
        background: 'var(--bg3)', border: '1px solid var(--border)',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        marginBottom: 2,
      }}>
        <Icon size={20} style={{ color: 'var(--text3)' }} aria-hidden="true" />
      </div>
      <p style={{ fontSize: 14, fontWeight: 700, color: 'var(--text)' }}>{title}</p>
      {message && (
        <p style={{ fontSize: 12, color: 'var(--text3)', maxWidth: 320, lineHeight: 1.5 }}>
          {message}
        </p>
      )}
      {action && (
        <button
          onClick={action.onClick}
          className="btn-primary press-soft"
          style={{ marginTop: 6, padding: '8px 16px', fontSize: 12 }}
        >
          {action.label}
        </button>
      )}
    </div>
  );
}
