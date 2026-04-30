import { useEffect } from 'react';
import { AlertTriangle, Loader2 } from 'lucide-react';

interface Props {
  open:         boolean;
  title:        string;
  message:      string;
  confirmLabel?: string;
  danger?:       boolean;
  loading?:      boolean;
  onConfirm:    () => void;
  onCancel:     () => void;
}

/**
 * Accessible confirmation modal — replaces the native browser confirm().
 * Supports Escape key dismissal and scroll-lock.
 */
export default function ConfirmModal({
  open, title, message,
  confirmLabel = 'Confirm', danger = false,
  loading = false,
  onConfirm, onCancel,
}: Props) {

  /* Escape key */
  useEffect(() => {
    if (!open) return;
    const handler = (e: KeyboardEvent) => { if (e.key === 'Escape') onCancel(); };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [open, onCancel]);

  /* Scroll lock */
  useEffect(() => {
    if (open) document.body.style.overflow = 'hidden';
    else      document.body.style.overflow = '';
    return () => { document.body.style.overflow = ''; };
  }, [open]);

  if (!open) return null;

  return (
    <div
      className="modal-overlay"
      onClick={onCancel}
      style={{ zIndex: 9999 }}
    >
      <div
        className="modal-card appear"
        onClick={e => e.stopPropagation()}
        style={{ maxWidth: 400, padding: '28px 28px 24px' }}
      >
        {/* Icon + Title */}
        <div style={{ display: 'flex', alignItems: 'flex-start', gap: 14, marginBottom: 14 }}>
          <div style={{
            width: 38, height: 38, borderRadius: 10, flexShrink: 0,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            background: danger ? 'rgba(232,25,122,.12)' : 'rgba(0,204,204,.12)',
          }}>
            <AlertTriangle
              size={18}
              color={danger ? 'var(--rose)' : 'var(--cyan)'}
            />
          </div>
          <div>
            <p style={{ fontSize: 16, fontWeight: 700, color: 'var(--text)', marginBottom: 4 }}>
              {title}
            </p>
            <p style={{ fontSize: 13, color: 'var(--text2)', lineHeight: 1.6 }}>
              {message}
            </p>
          </div>
        </div>

        {/* Actions */}
        <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end', marginTop: 20 }}>
          <button
            onClick={onCancel}
            disabled={loading}
            className="btn-ghost"
            style={{ padding: '9px 18px', fontSize: 13 }}
          >
            Cancel
          </button>
          <button
            onClick={onConfirm}
            disabled={loading}
            className={danger ? 'btn-rose' : 'btn-primary'}
            style={{ padding: '9px 18px', fontSize: 13, minWidth: 90 }}
          >
            {loading
              ? <><Loader2 size={13} className="animate-spin" /> Working…</>
              : confirmLabel}
          </button>
        </div>
      </div>
    </div>
  );
}
