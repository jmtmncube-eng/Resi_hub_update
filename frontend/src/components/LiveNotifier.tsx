import { useEffect, useRef } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import { toast } from 'sonner';
import {
  Bell, FileText, ClipboardList, AlertCircle,
  Wrench, Megaphone,
} from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { ROUTES }  from '../constants/routes';
import { getNews } from '../services/news.service';
import { getMyDocuments } from '../services/document.service';
import { getChores } from '../services/chore.service';
import { Chore } from '../types/domain.types';
import { formatPeriod } from '../utils/period';

/**
 * Background polling notifier — keeps logged-in users aware when admin
 * adds news, generates invoices, posts new chores, or rejects/approves
 * their proofs. Fires sonner toasts (with click-through navigation) only
 * for items that appear AFTER the user has been seen the page once, so
 * we don't blast them on first login.
 *
 * Mounted once globally inside DashboardLayout — it has no UI of its own.
 *
 * Polling interval is 45s on idle tabs (frequent enough to feel live,
 * low enough to be polite to the backend). React Query handles dedupe.
 */
export function LiveNotifier() {
  const { user } = useAuth();
  const nav = useNavigate();
  const qc  = useQueryClient();

  // Track IDs we've already seen so we don't re-toast on every poll.
  // First poll seeds the set silently — subsequent polls compare deltas.
  const seenNewsRef     = useRef<Set<string> | null>(null);
  const seenInvoiceRef  = useRef<Set<string> | null>(null);
  const seenChoreRef    = useRef<Set<string> | null>(null);
  const choreStateRef   = useRef<Map<string, string>>(new Map());

  const isStudent = user?.role === 'ACTIVE_STUDENT';

  // Pause polling when tab is hidden — a quiet tab shouldn't burn requests
  const enabled = !!user;

  // ── News (everyone except pending) ───────────────────────────
  const { data: news } = useQuery({
    queryKey: ['live-news'],
    queryFn:  () => getNews(),
    enabled,
    refetchInterval: 45_000,
    refetchOnWindowFocus: true,
  });

  useEffect(() => {
    if (!news) return;
    const ids = new Set(news.map(n => n.id));
    if (seenNewsRef.current === null) {
      seenNewsRef.current = ids;
      return;
    }
    const fresh = news.filter(n => !seenNewsRef.current!.has(n.id));
    seenNewsRef.current = ids;

    for (const n of fresh) {
      toast(
        <ToastBody
          icon={<Megaphone size={15} style={{ color: 'var(--rose)' }} />}
          title={n.title}
          subtitle={n.body.length > 80 ? n.body.slice(0, 80) + '…' : n.body}
          tag="New announcement"
          action={() => { nav(ROUTES.UPDATES); qc.invalidateQueries({ queryKey: ['news'] }); }}
        />,
        { duration: 6000 },
      );
    }
  }, [news, nav, qc]);

  // ── Documents (students) — new invoices & contract status changes ─
  const { data: docs } = useQuery({
    queryKey: ['live-documents'],
    queryFn:  getMyDocuments,
    enabled:  enabled && isStudent,
    refetchInterval: 45_000,
    refetchOnWindowFocus: true,
  });

  useEffect(() => {
    if (!docs) return;
    const ids = new Set(docs.map(d => d.id));
    if (seenInvoiceRef.current === null) {
      seenInvoiceRef.current = ids;
      return;
    }
    const fresh = docs.filter(d => !seenInvoiceRef.current!.has(d.id));
    seenInvoiceRef.current = ids;

    for (const d of fresh) {
      const isInvoice  = d.type === 'INVOICE';
      const isContract = d.type === 'CONTRACT';
      toast(
        <ToastBody
          icon={isInvoice ? <FileText size={15} style={{ color: 'var(--rose)' }} />
                          : <ClipboardList size={15} style={{ color: 'var(--cyan)' }} />}
          title={isInvoice ? `New invoice — ${formatPeriod(d.period)}`
                : isContract ? 'New lease contract to sign'
                : `New ${d.type.toLowerCase()}`}
          subtitle={isInvoice ? `R${Number(d.amount ?? 0).toLocaleString()} due — tap to pay`
                  : isContract ? 'Open and sign your agreement'
                  : 'Tap to view'}
          tag={isInvoice ? 'Payment due' : isContract ? 'Action needed' : 'New document'}
          action={() => {
            nav(ROUTES.DOCUMENTS);
            qc.invalidateQueries({ queryKey: ['documents'] });
          }}
        />,
        { duration: 7000 },
      );
    }
  }, [docs, nav, qc]);

  // ── Chores — new chores AND state transitions on the user's claims ─
  const { data: chores } = useQuery<Chore[]>({
    queryKey: ['live-chores'],
    queryFn:  () => getChores(),
    enabled:  enabled && isStudent,
    refetchInterval: 45_000,
    refetchOnWindowFocus: true,
  });

  useEffect(() => {
    if (!chores || !user) return;
    const ids = new Set(chores.map(c => c.id));
    const stateMap = new Map(chores.map(c => [c.id, c.proofStatus ?? 'IDLE'] as [string, string]));

    // Seed silently on first poll
    if (seenChoreRef.current === null) {
      seenChoreRef.current = ids;
      choreStateRef.current = stateMap;
      return;
    }

    // New chores added by admin → toast them ALL users (chores are shared)
    const fresh = chores.filter(c => !seenChoreRef.current!.has(c.id));
    for (const c of fresh) {
      toast(
        <ToastBody
          icon={<Wrench size={15} style={{ color: 'var(--cyan)' }} />}
          title={`New chore: ${c.name}`}
          subtitle={`${c.frequency} · claim it for +5 🪙`}
          tag="Chore board"
          action={() => { nav(ROUTES.HOUSEMATES); qc.invalidateQueries({ queryKey: ['chores'] }); }}
        />,
        { duration: 6000 },
      );
    }

    // State transitions on chores I'm involved in (claimed/done by me)
    for (const c of chores) {
      const prev = choreStateRef.current.get(c.id);
      const next = c.proofStatus ?? 'IDLE';
      if (prev && prev !== next && c.claimedById === user.id) {
        if (next === 'APPROVED') {
          toast.success(
            <ToastBody
              icon={<Bell size={15} style={{ color: '#4ade80' }} />}
              title={`"${c.name}" approved!`}
              subtitle="+20 🪙 added to your wallet"
              tag="Chore reward"
              action={() => { nav(ROUTES.WALLET); }}
            />,
            { duration: 6000 },
          );
        } else if (next === 'REJECTED') {
          toast.error(
            <ToastBody
              icon={<AlertCircle size={15} style={{ color: '#f87171' }} />}
              title={`"${c.name}" proof rejected`}
              subtitle={c.adminNote ?? 'Resubmit a clearer photo'}
              tag="Action needed"
              action={() => { nav(ROUTES.HOUSEMATES); qc.invalidateQueries({ queryKey: ['chores'] }); }}
            />,
            { duration: 8000 },
          );
        }
      }
    }

    seenChoreRef.current = ids;
    choreStateRef.current = stateMap;
  }, [chores, user, nav, qc]);

  return null;
}

/** Compact toast body — icon + title + subtitle + tap-to-go. Closes on click. */
function ToastBody({
  icon, title, subtitle, tag, action,
}: {
  icon: React.ReactNode; title: string; subtitle?: string; tag?: string;
  action?: () => void;
}) {
  return (
    <button
      onClick={action}
      style={{
        display: 'flex', alignItems: 'flex-start', gap: 10,
        padding: 0, background: 'transparent', border: 'none',
        cursor: action ? 'pointer' : 'default', textAlign: 'left', width: '100%',
      }}
    >
      <span style={{
        width: 30, height: 30, borderRadius: 8, flexShrink: 0,
        background: 'var(--bg3)', display: 'flex', alignItems: 'center', justifyContent: 'center',
      }}>{icon}</span>
      <span style={{ display: 'flex', flexDirection: 'column', gap: 2, minWidth: 0 }}>
        {tag && (
          <span style={{
            fontSize: 9, fontWeight: 600, letterSpacing: '.06em', textTransform: 'uppercase',
            color: 'var(--text3)', fontFamily: "'IBM Plex Mono', monospace",
          }}>{tag}</span>
        )}
        <span style={{ fontSize: 13, fontWeight: 600, color: 'var(--text)', lineHeight: 1.3 }}>{title}</span>
        {subtitle && (
          <span style={{ fontSize: 12, color: 'var(--text2)', lineHeight: 1.45 }}>{subtitle}</span>
        )}
      </span>
    </button>
  );
}
