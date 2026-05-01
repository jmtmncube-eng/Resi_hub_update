import { createContext, useCallback, useContext, useRef, useState } from 'react';
import ConfirmModal, { ConfirmTone } from './ConfirmModal';
import type { LucideIcon } from 'lucide-react';

/**
 * Imperative confirm dialog — replaces the ugly native `window.confirm()`
 * with our designed ConfirmModal, but keeps the inline call-site shape:
 *
 *   const confirm = useConfirm();
 *   if (await confirm({ title: 'Deactivate?', message: '…' })) {
 *     deactivate();
 *   }
 *
 * Mount <ConfirmProvider> once near the root (App.tsx) for the hook to work.
 */

export interface ConfirmOptions {
  title:         string;
  message?:      string;
  confirmLabel?: string;
  cancelLabel?:  string;
  tone?:         ConfirmTone;
  icon?:         LucideIcon;
  details?:      React.ReactNode;
}

type ConfirmFn = (opts: ConfirmOptions) => Promise<boolean>;

const ConfirmContext = createContext<ConfirmFn | null>(null);

export function ConfirmProvider({ children }: { children: React.ReactNode }) {
  const [open, setOpen]       = useState(false);
  const [opts, setOpts]       = useState<ConfirmOptions>({ title: '' });
  const resolverRef           = useRef<((v: boolean) => void) | null>(null);

  const confirm = useCallback<ConfirmFn>((nextOpts) => {
    setOpts(nextOpts);
    setOpen(true);
    return new Promise<boolean>((resolve) => {
      // If a previous prompt is somehow still pending, resolve it false
      if (resolverRef.current) resolverRef.current(false);
      resolverRef.current = resolve;
    });
  }, []);

  const settle = (value: boolean) => {
    setOpen(false);
    const resolver = resolverRef.current;
    resolverRef.current = null;
    if (resolver) resolver(value);
  };

  return (
    <ConfirmContext.Provider value={confirm}>
      {children}
      <ConfirmModal
        open={open}
        title={opts.title}
        message={opts.message}
        confirmLabel={opts.confirmLabel}
        cancelLabel={opts.cancelLabel}
        tone={opts.tone}
        icon={opts.icon}
        details={opts.details}
        onConfirm={() => settle(true)}
        onCancel={()  => settle(false)}
      />
    </ConfirmContext.Provider>
  );
}

export function useConfirm(): ConfirmFn {
  const ctx = useContext(ConfirmContext);
  if (!ctx) throw new Error('useConfirm must be used within <ConfirmProvider>');
  return ctx;
}
