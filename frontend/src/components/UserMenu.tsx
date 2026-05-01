import { useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  User as UserIcon, LogOut, Sun, Moon, Wallet as WalletIcon,
  Settings, ChevronDown,
} from 'lucide-react';
import { useAuth }  from '../contexts/AuthContext';
import { useTheme } from '../contexts/ThemeContext';
import { ROUTES }   from '../constants/routes';

/**
 * Compact user menu — the avatar + chevron acts as a button. Click it to
 * open a popover with quick actions (profile, theme toggle, sign out) and
 * a credits readout. Lives in the page-content column so it shows on both
 * desktop and mobile, and replaces the previously-dead "three-line" affordance.
 */
export function UserMenu() {
  const { user, logout } = useAuth();
  const { theme, toggleTheme } = useTheme();
  const nav = useNavigate();
  const [open, setOpen] = useState(false);
  const popRef = useRef<HTMLDivElement>(null);

  // Close on outside click / escape
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
  const isAdmin = user.role === 'ADMIN';
  const isStudent = user.role === 'ACTIVE_STUDENT';

  async function handleSignOut() {
    setOpen(false);
    await logout();
    nav(ROUTES.LOGIN);
  }

  return (
    <div ref={popRef} style={{ position: 'relative' }}>
      <button
        onClick={() => setOpen(o => !o)}
        aria-haspopup="menu"
        aria-expanded={open}
        className="press-soft"
        style={{
          display: 'flex', alignItems: 'center', gap: 8,
          padding: '6px 10px 6px 6px',
          borderRadius: 999,
          background: open ? 'var(--hover)' : 'var(--bg2)',
          border: '1px solid var(--border)',
          cursor: 'pointer',
          transition: 'background .18s',
        }}
      >
        <div className={`avatar ${isAdmin ? 'avatar-rose' : 'avatar-cyan'}`}
             style={{ width: 28, height: 28, fontSize: 11, fontWeight: 700, flexShrink: 0, overflow: 'hidden' }}>
          {user.avatarUrl
            ? <img src={user.avatarUrl} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
            : user.name?.slice(0, 2).toUpperCase() || 'RH'}
        </div>
        <span style={{
          fontSize: 13, fontWeight: 600, color: 'var(--text)',
          maxWidth: 120, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
        }}>
          {user.name?.split(' ')[0] ?? user.email}
        </span>
        <ChevronDown size={13} style={{ color: 'var(--text3)', transition: 'transform .18s', transform: open ? 'rotate(180deg)' : 'none' }} />
      </button>

      {open && (
        <div
          role="menu"
          className="appear"
          style={{
            position: 'absolute', top: 'calc(100% + 8px)', right: 0,
            minWidth: 240,
            background: 'var(--bg2)',
            border: '1px solid var(--border2)',
            borderRadius: 12,
            boxShadow: '0 18px 50px -18px rgba(0,0,0,.45), 0 0 0 1px rgba(255,255,255,.03) inset',
            overflow: 'hidden',
            zIndex: 1000,
          }}
        >
          {/* Identity card */}
          <div style={{ padding: '14px 14px 12px', borderBottom: '1px solid var(--border)' }}>
            <p style={{ fontSize: 14, fontWeight: 700, color: 'var(--text)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
              {user.name}
            </p>
            <p style={{ fontFamily: "'IBM Plex Mono', monospace", fontSize: 11, color: 'var(--text3)', marginTop: 2, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
              {user.email}
            </p>
            <span style={{
              display: 'inline-block', marginTop: 8,
              padding: '2px 9px', borderRadius: 999,
              fontFamily: "'IBM Plex Mono', monospace", fontSize: 10, fontWeight: 600,
              border: `1px solid ${isAdmin ? 'rgba(232,25,122,.3)' : 'rgba(0,204,204,.3)'}`,
              background:  isAdmin ? 'rgba(232,25,122,.08)' : 'rgba(0,204,204,.08)',
              color:       isAdmin ? 'var(--rose)'         : 'var(--cyan)',
              textTransform: 'uppercase', letterSpacing: '.05em',
            }}>
              {isAdmin ? 'Admin' : isStudent ? 'Resident' : 'Applicant'}
            </span>
          </div>

          {/* Wallet credits — students only */}
          {isStudent && user.wallet && (
            <button
              onClick={() => { setOpen(false); nav(ROUTES.WALLET); }}
              className="press-soft"
              style={{
                width: '100%',
                display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 10,
                padding: '12px 14px',
                background: 'linear-gradient(90deg, rgba(0,204,204,.08), transparent)',
                border: 'none', borderBottom: '1px solid var(--border)',
                cursor: 'pointer', textAlign: 'left',
              }}
            >
              <span style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                <WalletIcon size={14} style={{ color: 'var(--cyan)' }} />
                <span style={{ fontSize: 13, fontWeight: 500, color: 'var(--text2)' }}>Wallet</span>
              </span>
              <span style={{
                fontFamily: "'IBM Plex Mono', monospace", fontSize: 14, fontWeight: 700,
                color: 'var(--cyan)',
              }}>
                {user.wallet.credits ?? 0} 🪙
              </span>
            </button>
          )}

          {/* Quick links */}
          <MenuItem
            icon={<UserIcon size={14} />}
            label="My profile"
            onClick={() => { setOpen(false); nav(ROUTES.PROFILE); }}
          />
          {isAdmin && (
            <MenuItem
              icon={<Settings size={14} />}
              label="Residence settings"
              onClick={() => { setOpen(false); nav(ROUTES.ADMIN_RESIDENCE + '?tab=info'); }}
            />
          )}

          {/* Theme toggle */}
          <MenuItem
            icon={theme === 'dark' ? <Sun size={14} /> : <Moon size={14} />}
            label={theme === 'dark' ? 'Switch to light mode' : 'Switch to dark mode'}
            onClick={toggleTheme}
            keepOpen
          />

          {/* Sign out */}
          <MenuItem
            icon={<LogOut size={14} />}
            label="Sign out"
            onClick={handleSignOut}
            tone="rose"
          />
        </div>
      )}
    </div>
  );
}

function MenuItem({
  icon, label, onClick, keepOpen, tone = 'default',
}: {
  icon: React.ReactNode;
  label: string;
  onClick: () => void;
  keepOpen?: boolean;
  tone?: 'default' | 'rose';
}) {
  // keepOpen suppressed for theme toggle — letting the click bubble preserves
  // the popover so the user sees the theme actually flip.
  void keepOpen;
  return (
    <button
      onClick={onClick}
      className="press-soft"
      style={{
        width: '100%',
        display: 'flex', alignItems: 'center', gap: 10,
        padding: '11px 14px',
        background: 'transparent',
        border: 'none',
        borderTop: '1px solid var(--border)',
        cursor: 'pointer', textAlign: 'left',
        color: tone === 'rose' ? 'var(--rose)' : 'var(--text)',
        fontSize: 13,
        fontWeight: 500,
        fontFamily: "'Space Grotesk', sans-serif",
        transition: 'background .15s',
      }}
      onMouseEnter={e => (e.currentTarget.style.background = 'var(--hover)')}
      onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}
    >
      <span style={{ display: 'flex', color: tone === 'rose' ? 'var(--rose)' : 'var(--text3)' }}>{icon}</span>
      {label}
    </button>
  );
}
