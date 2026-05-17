import { HelpCircle } from 'lucide-react';

/**
 * Small `?` icon that surfaces a tooltip on hover/focus. Use it to
 * explain a non-obvious affordance once — globally — rather than
 * repeating an inline hint on every UI element. Keyboard-focusable
 * (tabIndex=0) so screen-reader and keyboard users still get the
 * context.
 *
 * Example:
 *   <h1>Accounts <HelpHint label="Click any tile to filter the list" /></h1>
 */
export function HelpHint({ label }: { label: string }) {
  return (
    <span
      tabIndex={0}
      role="img"
      aria-label={label}
      title={label}
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        color: 'var(--text3)',
        cursor: 'help',
        marginLeft: 6,
        verticalAlign: 'middle',
        outline: 'none',
      }}
      onFocus={(e) => { e.currentTarget.style.color = 'var(--cyan)'; }}
      onBlur={(e) => { e.currentTarget.style.color = 'var(--text3)'; }}
      onMouseEnter={(e) => { e.currentTarget.style.color = 'var(--cyan)'; }}
      onMouseLeave={(e) => { e.currentTarget.style.color = 'var(--text3)'; }}
    >
      <HelpCircle size={14} />
    </span>
  );
}
