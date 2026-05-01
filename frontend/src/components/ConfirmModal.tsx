import { Loader2, AlertTriangle, ShieldCheck, Trash2, X } from 'lucide-react';
import type { LucideIcon } from 'lucide-react';
import { Modal } from './Modal';

export type ConfirmTone = 'rose' | 'cyan' | 'warn';

export interface ConfirmModalProps {
  open:          boolean;
  title:         string;
  message?:      string;
  confirmLabel?: string;
  cancelLabel?:  string;
  /** Visual tone of the icon tile + primary button. Defaults to 'rose'
   *  for destructive/elevation actions. */
  tone?:         ConfirmTone;
  /** Lucide icon override; defaults vary per tone. */
  icon?:         LucideIcon;
  /** Optional rich content rendered between message and actions —
   *  identity cards, "this unlocks" panels, warnings, etc. */
  details?:      React.ReactNode;
  loading?:      boolean;
  onConfirm:     () => void;
  onCancel:      () => void;
  /** Back-compat: old `danger` boolean still maps to tone='rose'. */
  danger?:       boolean;
}

const TONE_PALETTE: Record<ConfirmTone, { color: string; bg: string; border: string }> = {
  rose: { color: 'var(--rose)', bg: 'rgba(232,25,122,.14)', border: 'rgba(232,25,122,.32)' },
  cyan: { color: 'var(--cyan)', bg: 'rgba(0,204,204,.14)',  border: 'rgba(0,204,204,.32)' },
  warn: { color: '#fb923c',     bg: 'rgba(251,146,60,.14)', border: 'rgba(251,146,60,.32)' },
};

const TONE_DEFAULT_ICON: Record<ConfirmTone, LucideIcon> = {
  rose: Trash2,
  cyan: ShieldCheck,
  warn: AlertTriangle,
};

/**
 * One source of truth for "are you sure?" dialogs across the system.
 *
 * Use this directly when you already have boolean state, or use the
 * imperative `useConfirm()` hook from `useConfirm.tsx` when you'd rather
 * `await confirm(...)` inline.
 *
 * Mounts via the body-portalled <Modal> so the card always anchors to
 * the viewport and the page can't scroll behind it.
 */
export default function ConfirmModal({
  open, title, message,
  confirmLabel = 'Confirm',
  cancelLabel  = 'Cancel',
  tone, icon, details, loading = false,
  onConfirm, onCancel, danger,
}: ConfirmModalProps) {
  // Resolve tone — back-compat with old `danger` prop
  const resolvedTone: ConfirmTone = tone ?? (danger ? 'rose' : 'cyan');
  const palette = TONE_PALETTE[resolvedTone];
  const Icon = icon ?? TONE_DEFAULT_ICON[resolvedTone];

  return (
    <Modal open={open} onClose={onCancel} maxWidth={460}>
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'flex-start', gap: 14, marginBottom: 16 }}>
        <div style={{
          width: 44, height: 44, borderRadius: 11, flexShrink: 0,
          background: palette.bg,
          border: `1px solid ${palette.border}`,
          display: 'flex', alignItems: 'center', justifyContent: 'center',
        }}>
          <Icon size={20} style={{ color: palette.color }} />
        </div>
        <div style={{ flex: 1, minWidth: 0 }}>
          <p style={{ fontSize: 17, fontWeight: 700, color: 'var(--text)' }}>
            {title}
          </p>
          {message && (
            <p style={{ fontSize: 13, color: 'var(--text2)', marginTop: 4, lineHeight: 1.55 }}>
              {message}
            </p>
          )}
        </div>
        <button
          onClick={onCancel}
          aria-label="Cancel"
          className="btn-ghost"
          disabled={loading}
          style={{ padding: 6, borderRadius: 8, flexShrink: 0 }}
        >
          <X size={14} />
        </button>
      </div>

      {/* Optional rich detail block (identity card, "this unlocks" list, etc.) */}
      {details && (
        <div style={{ marginBottom: 18 }}>
          {details}
        </div>
      )}

      {/* Centred actions — primary first to read confirm-then-cancel */}
      <div style={{ display: 'flex', gap: 10, justifyContent: 'center' }}>
        <button
          onClick={onConfirm}
          disabled={loading}
          className="press-soft"
          style={{
            minWidth: 160, padding: '10px 22px',
            borderRadius: 8, border: 'none',
            background: palette.color,
            color: resolvedTone === 'rose' ? '#fff' : '#0f0f12',
            fontSize: 13, fontWeight: 600,
            fontFamily: "'Space Grotesk', sans-serif",
            cursor: loading ? 'not-allowed' : 'pointer',
            opacity: loading ? .7 : 1,
            display: 'inline-flex', alignItems: 'center', justifyContent: 'center', gap: 6,
          }}
        >
          {loading
            ? <><Loader2 size={13} className="animate-spin" /> Working…</>
            : confirmLabel}
        </button>
        <button
          onClick={onCancel}
          disabled={loading}
          className="btn-ghost press-soft"
          style={{ minWidth: 120, padding: '10px 22px', fontSize: 13, justifyContent: 'center' }}
        >
          {cancelLabel}
        </button>
      </div>
    </Modal>
  );
}
