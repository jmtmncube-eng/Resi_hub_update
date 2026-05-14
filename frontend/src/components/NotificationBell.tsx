import { useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useQuery, useQueryClient, useMutation } from '@tanstack/react-query';
import {
  Bell, FileText, ClipboardList, CheckCircle2, AlertCircle,
  Wrench, UserPlus, ShieldCheck, Megaphone, CheckCheck,
} from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import {
  getNotifications, getUnreadCount,
  markNotificationRead, markAllNotificationsRead,
  AppNotification, NotificationType,
} from '../services/notification.service';

/**
 * Notification bell — the persistent notification centre.
 *
 * Server-backed (unlike LiveNotifier, which only fires ephemeral toasts):
 * every event that emails a user also drops a durable Notification row,
 * so the dropdown is a real history with an unread badge that survives
 * logouts. The unread count polls every 45s; the full list loads when
 * the dropdown opens.
 */

const ICON: Record<NotificationType, { Icon: typeof Bell; color: string }> = {
  INVOICE:        { Icon: FileText,      color: 'var(--rose)' },
  CONTRACT:       { Icon: ClipboardList, color: 'var(--cyan)' },
  CHORE_APPROVED: { Icon: CheckCircle2,  color: '#4ade80' },
  CHORE_REJECTED: { Icon: AlertCircle,   color: '#f87171' },
  MAINTENANCE:    { Icon: Wrench,        color: 'var(--cyan)' },
  APPLICATION:    { Icon: UserPlus,      color: 'var(--rose)' },
  ACCOUNT:        { Icon: ShieldCheck,   color: 'var(--cyan)' },
  ANNOUNCEMENT:   { Icon: Megaphone,     color: 'var(--rose)' },
  GENERAL:        { Icon: Bell,          color: 'var(--text3)' },
};

/** Compact relative time — "just now", "5m", "3h", "2d", or a date. */
function relativeTime(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime();
  const m = Math.floor(diff / 60_000);
  if (m < 1)  return 'just now';
  if (m < 60) return `${m}m`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h`;
  const d = Math.floor(h / 24);
  if (d < 7)  return `${d}d`;
  return new Date(iso).toLocaleDateString();
}

export function NotificationBell() {
  const { user } = useAuth();
  const nav = useNavigate();
  const qc = useQueryClient();
  const [open, setOpen] = useState(false);
  const popRef = useRef<HTMLDivElement>(null);

  // Unread count — polled while signed in. Cheap COUNT query.
  const { data: unread = 0 } = useQuery({
    queryKey: ['notifications-unread'],
    queryFn:  getUnreadCount,
    enabled:  !!user,
    refetchInterval: 45_000,
    refetchOnWindowFocus: true,
  });

  // Full list — only fetched while the dropdown is open.
  const { data: items = [], isLoading } = useQuery({
    queryKey: ['notifications'],
    queryFn:  getNotifications,
    enabled:  !!user && open,
  });

  const readOne = useMutation({
    mutationFn: markNotificationRead,
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['notifications'] });
      qc.invalidateQueries({ queryKey: ['notifications-unread'] });
    },
  });

  const readAll = useMutation({
    mutationFn: markAllNotificationsRead,
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['notifications'] });
      qc.invalidateQueries({ queryKey: ['notifications-unread'] });
    },
  });

  // Close on outside click / escape — same affordance as UserMenu.
  useEffect(() => {
    if (!open) return;
    const onClick = (e: MouseEvent) => {
      if (popRef.current && !popRef.current.contains(e.target as Node)) setOpen(false);
    };
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') setOpen(false); };
    document.addEventListener('mousedown', onClick);
    window.addEventListener('keydown', onKey);
    return () => {
      document.removeEventListener('mousedown', onClick);
      window.removeEventListener('keydown', onKey);
    };
  }, [open]);

  if (!user) return null;

  function handleClick(n: AppNotification) {
    if (!n.read) readOne.mutate(n.id);
    if (n.link) { setOpen(false); nav(n.link); }
  }

  const badge = unread > 99 ? '99+' : String(unread);

  return (
    <div ref={popRef} style={{ position: 'relative' }}>
      <button
        onClick={() => setOpen(o => !o)}
        aria-label={unread > 0 ? `Notifications (${unread} unread)` : 'Notifications'}
        aria-haspopup="menu"
        aria-expanded={open}
        className="press-soft"
        style={{
          position: 'relative',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          width: 38, height: 38, borderRadius: 999,
          background: open ? 'var(--hover)' : 'var(--bg2)',
          border: '1px solid var(--border)',
          color: 'var(--text2)', cursor: 'pointer',
          transition: 'background .18s',
        }}
      >
        <Bell size={17} />
        {unread > 0 && (
          <span style={{
            position: 'absolute', top: -3, right: -3,
            minWidth: 17, height: 17, padding: '0 4px',
            borderRadius: 999, background: 'var(--rose)', color: '#fff',
            fontSize: 9, fontWeight: 700, fontFamily: "'IBM Plex Mono', monospace",
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            border: '2px solid var(--bg2)',
          }}>
            {badge}
          </span>
        )}
      </button>

      {open && (
        <div
          role="menu"
          className="appear"
          style={{
            position: 'absolute', top: 'calc(100% + 8px)', right: 0,
            width: 340, maxWidth: 'calc(100vw - 32px)',
            background: 'var(--bg2)',
            border: '1px solid var(--border2)',
            borderRadius: 12,
            boxShadow: '0 18px 50px -18px rgba(0,0,0,.45), 0 0 0 1px rgba(255,255,255,.03) inset',
            overflow: 'hidden',
            zIndex: 1000,
          }}
        >
          {/* Header */}
          <div style={{
            display: 'flex', alignItems: 'center', justifyContent: 'space-between',
            padding: '12px 14px', borderBottom: '1px solid var(--border)',
          }}>
            <p style={{ fontSize: 14, fontWeight: 700, color: 'var(--text)' }}>
              Notifications
            </p>
            {unread > 0 && (
              <button
                onClick={() => readAll.mutate()}
                disabled={readAll.isPending}
                className="press-soft"
                style={{
                  display: 'flex', alignItems: 'center', gap: 5,
                  background: 'transparent', border: 'none', cursor: 'pointer',
                  fontSize: 11, fontWeight: 600, color: 'var(--cyan)',
                }}
              >
                <CheckCheck size={12} /> Mark all read
              </button>
            )}
          </div>

          {/* List */}
          <div style={{ maxHeight: 380, overflowY: 'auto' }}>
            {isLoading ? (
              <p style={{ padding: 24, textAlign: 'center', fontSize: 12, color: 'var(--text3)' }}>
                Loading…
              </p>
            ) : items.length === 0 ? (
              <div style={{ padding: '32px 20px', textAlign: 'center' }}>
                <Bell size={22} style={{ color: 'var(--text4)', marginBottom: 8 }} />
                <p style={{ fontSize: 12, color: 'var(--text3)' }}>You're all caught up.</p>
              </div>
            ) : (
              items.map(n => {
                const { Icon, color } = ICON[n.type] ?? ICON.GENERAL;
                return (
                  <button
                    key={n.id}
                    onClick={() => handleClick(n)}
                    className="press-soft"
                    style={{
                      width: '100%', display: 'flex', alignItems: 'flex-start', gap: 10,
                      padding: '12px 14px', textAlign: 'left',
                      background: n.read ? 'transparent' : 'rgba(0,204,204,.05)',
                      border: 'none', borderBottom: '1px solid var(--border)',
                      cursor: n.link ? 'pointer' : 'default',
                      transition: 'background .15s',
                    }}
                    onMouseEnter={e => (e.currentTarget.style.background = 'var(--hover)')}
                    onMouseLeave={e => (e.currentTarget.style.background =
                      n.read ? 'transparent' : 'rgba(0,204,204,.05)')}
                  >
                    <span style={{
                      width: 30, height: 30, borderRadius: 8, flexShrink: 0,
                      background: 'var(--bg3)',
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                    }}>
                      <Icon size={15} style={{ color }} />
                    </span>
                    <span style={{ flex: 1, minWidth: 0 }}>
                      <span style={{
                        display: 'flex', alignItems: 'baseline', justifyContent: 'space-between', gap: 8,
                      }}>
                        <span style={{
                          fontSize: 13, fontWeight: 600, color: 'var(--text)', lineHeight: 1.3,
                        }}>
                          {n.title}
                        </span>
                        <span style={{
                          fontSize: 10, color: 'var(--text4)', flexShrink: 0,
                          fontFamily: "'IBM Plex Mono', monospace",
                        }}>
                          {relativeTime(n.createdAt)}
                        </span>
                      </span>
                      {n.body && (
                        <span style={{
                          display: 'block', marginTop: 2,
                          fontSize: 12, color: 'var(--text2)', lineHeight: 1.45,
                        }}>
                          {n.body}
                        </span>
                      )}
                    </span>
                    {!n.read && (
                      <span style={{
                        width: 7, height: 7, borderRadius: 999, flexShrink: 0,
                        background: 'var(--rose)', marginTop: 6,
                      }} />
                    )}
                  </button>
                );
              })
            )}
          </div>
        </div>
      )}
    </div>
  );
}
