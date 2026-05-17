import { useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Clock, LogOut } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { ROUTES }  from '../constants/routes';
import { Modal }   from './Modal';

/**
 * Auto-signs the user out after 5 minutes of no activity, with a
 * 30-second warning modal at the 4:30 mark so they can stay signed in.
 * Mounted once inside DashboardLayout (so it only runs for authenticated
 * users).
 *
 * Activity = mousedown, mousemove, keydown, scroll, touchstart, click.
 */

const IDLE_MS    = 300_000;  // 5 min total inactivity
const WARN_MS    = 270_000;  // show warning at 4:30 (30s grace)

export function IdleLogout() {
  const { user, logout } = useAuth();
  const nav = useNavigate();
  const lastActivity = useRef(Date.now());
  const [showWarning, setShowWarning] = useState(false);
  const [secondsLeft, setSecondsLeft] = useState(IDLE_MS - WARN_MS);

  useEffect(() => {
    if (!user) return;
    const bump = () => {
      lastActivity.current = Date.now();
      // Hide warning if it was up
      if (showWarning) setShowWarning(false);
    };
    const events: (keyof DocumentEventMap)[] = [
      'mousedown', 'mousemove', 'keydown', 'scroll', 'touchstart', 'click',
    ];
    for (const e of events) document.addEventListener(e, bump, { passive: true });

    const tick = setInterval(async () => {
      const elapsed = Date.now() - lastActivity.current;
      if (elapsed >= IDLE_MS) {
        clearInterval(tick);
        await logout();
        nav(ROUTES.LOGIN, { replace: true });
        return;
      }
      if (elapsed >= WARN_MS) {
        setShowWarning(true);
        setSecondsLeft(Math.max(0, Math.ceil((IDLE_MS - elapsed) / 1000)));
      }
    }, 1000);

    return () => {
      for (const e of events) document.removeEventListener(e, bump);
      clearInterval(tick);
    };
  }, [user, logout, nav, showWarning]);

  // Reset state when route changes via auth flip
  useEffect(() => {
    if (!user) setShowWarning(false);
  }, [user]);

  return (
    <Modal
      open={!!user && showWarning}
      onClose={() => { lastActivity.current = Date.now(); setShowWarning(false); }}
      maxWidth={400}
      closeOnBackdrop={false}
    >
      <div style={{ display: 'flex', alignItems: 'flex-start', gap: 14, marginBottom: 16 }}>
        <div style={{
          width: 44, height: 44, borderRadius: 11, flexShrink: 0,
          background: 'rgba(232,25,122,.14)',
          border: '1px solid rgba(232,25,122,.3)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
        }}>
          <Clock size={20} style={{ color: 'var(--rose)' }} />
        </div>
        <div>
          <p style={{ fontSize: 16, fontWeight: 700, color: 'var(--text)' }}>
            Still there?
          </p>
          <p style={{ fontSize: 13, color: 'var(--text2)', marginTop: 4, lineHeight: 1.5 }}>
            You'll be signed out in <b style={{ color: 'var(--rose)', fontFamily: "'IBM Plex Mono', monospace" }}>{secondsLeft}s</b> for security.
          </p>
        </div>
      </div>

      <div style={{ display: 'flex', gap: 10 }}>
        <button
          onClick={() => { lastActivity.current = Date.now(); setShowWarning(false); }}
          className="btn-primary press-soft"
          style={{ flex: 1, padding: '10px 0', fontSize: 13 }}
        >
          I'm here
        </button>
        <button
          onClick={async () => { await logout(); nav(ROUTES.LOGIN, { replace: true }); }}
          className="btn-ghost press-soft"
          style={{ flex: 1, padding: '10px 0', fontSize: 13, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6 }}
        >
          <LogOut size={12} /> Sign out
        </button>
      </div>
    </Modal>
  );
}
