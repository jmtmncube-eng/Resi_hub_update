import { useEffect } from 'react';
import { createPortal } from 'react-dom';

/**
 * Body-portalled modal wrapper.
 *
 * The DashboardLayout's main column has a one-time `appear` animation that
 * uses `transform`, and any element with a non-`none` transform anchors
 * fixed-position descendants to itself instead of the viewport. That's why
 * an inline modal-overlay rendered inside <main> can end up clipped to the
 * right portion of the screen with the sidebar visible underneath.
 *
 * Rendering through a portal directly to document.body sidesteps the issue
 * entirely — the overlay always covers the whole viewport.
 *
 * Use it as a drop-in replacement for the inline `<div className="modal-overlay">`
 * pattern. ESC key closes; click outside the card closes.
 */

export function Modal({
  open, onClose, children, maxWidth = 480, closeOnBackdrop = true,
}: {
  open: boolean;
  onClose: () => void;
  children: React.ReactNode;
  maxWidth?: number;
  closeOnBackdrop?: boolean;
}) {
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); };
    window.addEventListener('keydown', onKey);
    // Lock background scroll while open
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      window.removeEventListener('keydown', onKey);
      document.body.style.overflow = prev;
    };
  }, [open, onClose]);

  if (!open) return null;

  return createPortal(
    <div
      className="modal-overlay"
      onClick={closeOnBackdrop ? onClose : undefined}
      role="dialog"
      aria-modal="true"
    >
      <div className="modal-card appear" onClick={e => e.stopPropagation()} style={{ maxWidth }}>
        {children}
      </div>
    </div>,
    document.body,
  );
}
