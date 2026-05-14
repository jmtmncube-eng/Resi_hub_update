import { NavLink, useNavigate } from 'react-router-dom';
import { useState } from 'react';
import {
  LayoutDashboard, Wrench, Newspaper, Users, QrCode,
  Wallet, User, FileText, LogOut, Menu, X,
  Building2, Ticket, Megaphone, ClipboardList, Gift, BookUser,
  Sun, Moon, CreditCard, Activity, ListChecks,
} from 'lucide-react';
import { useAuth }     from '../../contexts/AuthContext';
import { useTheme }    from '../../contexts/ThemeContext';
import { ROUTES }      from '../../constants/routes';
import { WelcomeTour } from '../WelcomeTour';
import { UserMenu }    from '../UserMenu';
import { Brand }       from '../Brand';   // kept — used in the sidebar header
import { LiveNotifier } from '../LiveNotifier';
import { NotificationBell } from '../NotificationBell';
import { GlobalSearch } from '../GlobalSearch';
import { IdleLogout }   from '../IdleLogout';

const studentNav = [
  { to: ROUTES.DASHBOARD,   label: 'Dashboard',   icon: LayoutDashboard },
  { to: ROUTES.MAINTENANCE, label: 'Maintenance',  icon: Wrench          },
  { to: ROUTES.UPDATES,     label: 'Updates',      icon: Newspaper       },
  { to: ROUTES.VISITORS,    label: 'Visitors',     icon: QrCode          },
  { to: ROUTES.HOUSEMATES,  label: 'Housemates',   icon: Users           },
  { to: ROUTES.WALLET,      label: 'Wallet',       icon: Wallet          },
  { to: ROUTES.DOCUMENTS,   label: 'Invoices',     icon: FileText        },
  { to: ROUTES.PROFILE,     label: 'Profile',      icon: User            },
];

const pendingNav = [
  { to: ROUTES.APPLICATION, label: 'My Application', icon: ClipboardList },
  { to: ROUTES.ROOMS,       label: 'Browse Rooms',   icon: Building2     },
];

const adminNav = [
  { to: ROUTES.ADMIN,             label: 'Overview',  icon: LayoutDashboard },
  { to: ROUTES.ADMIN_RESIDENCE,   label: 'Residence', icon: Building2       },
  { to: ROUTES.ADMIN_ACCOUNTS,    label: 'Accounts',  icon: BookUser        },
  { to: ROUTES.ADMIN_PAYMENTS,    label: 'Payments',  icon: CreditCard      },
  { to: ROUTES.ADMIN_MAINTENANCE, label: 'Tickets',   icon: Ticket          },
  { to: ROUTES.ADMIN_NEWS,        label: 'News',      icon: Megaphone       },
  { to: ROUTES.ADMIN_VISITORS,    label: 'Visitors',  icon: QrCode          },
  { to: ROUTES.ADMIN_REWARDS,     label: 'Rewards',   icon: Gift            },
  { to: ROUTES.ADMIN_CHORES,      label: 'Chores',    icon: ListChecks      },
  { to: ROUTES.ADMIN_AUDIT,       label: 'Activity',  icon: Activity        },
];

// Manager (deputy) — everything an admin has EXCEPT the audit log,
// which stays owner-only. Residence settings are also owner-only, but
// they live behind a tab inside the Residence hub, not a nav item.
const managerNav = adminNav.filter(item => item.to !== ROUTES.ADMIN_AUDIT);

// Maintenance (handyman) — a focused single-purpose nav: just Tickets.
const maintenanceNav = [
  { to: ROUTES.ADMIN_MAINTENANCE, label: 'Tickets', icon: Ticket },
];

export function DashboardLayout({ children }: { children: React.ReactNode }) {
  const { user, logout }        = useAuth();
  const { theme, toggleTheme }  = useTheme();
  const navigate                = useNavigate();
  const [sidebarOpen, setSidebarOpen] = useState(false);

  const navItems =
    user?.role === 'ADMIN'           ? adminNav        :
    user?.role === 'MANAGER'         ? managerNav      :
    user?.role === 'MAINTENANCE'     ? maintenanceNav  :
    user?.role === 'ACTIVE_STUDENT'  ? studentNav      : pendingNav;

  const roleLabel =
    user?.role === 'ADMIN'           ? 'Admin'       :
    user?.role === 'MANAGER'         ? 'Manager'     :
    user?.role === 'MAINTENANCE'     ? 'Maintenance' :
    user?.role === 'ACTIVE_STUDENT'  ? 'Resident'    : 'Applicant';

  // Owner + delegated staff share the "staff" accent (rose); students cyan.
  const isStaff =
    user?.role === 'ADMIN' || user?.role === 'MANAGER' || user?.role === 'MAINTENANCE';

  async function handleLogout() {
    await logout();
    navigate(ROUTES.LOGIN);
  }

  const Sidebar = () => (
    <aside style={{ width: 232, height: '100%', background: 'var(--bg2)', borderRight: '1px solid var(--border)', display: 'flex', flexDirection: 'column' }}>

      {/* Logo + role badge */}
      <div style={{ padding: '20px 16px 16px', borderBottom: '1px solid var(--border)' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 10, flexWrap: 'wrap' }}>
          <Brand size="md" />
          <span style={{
            fontFamily: "'IBM Plex Mono', monospace",
            fontSize: 10,
            fontWeight: 600,
            letterSpacing: '.06em',
            textTransform: 'uppercase',
            color: isStaff ? 'var(--rose)' : 'var(--cyan)',
          }}>
            · {roleLabel}
          </span>
        </div>
        {/* Role pill badge */}
        <span style={{
          display: 'inline-block',
          padding: '2px 10px',
          borderRadius: 20,
          fontFamily: "'IBM Plex Mono', monospace",
          fontSize: 10,
          textTransform: 'uppercase',
          letterSpacing: '.05em',
          border: `1px solid ${isStaff ? 'rgba(232,25,122,.3)' : 'rgba(0,204,204,.3)'}`,
          color: isStaff ? 'var(--rose)' : 'var(--cyan)',
          background: isStaff ? 'rgba(232,25,122,.08)' : 'rgba(0,204,204,.08)',
        }}>
          {user?.email}
        </span>
      </div>

      {/* Navigation */}
      <nav style={{ flex: 1, padding: '12px 8px', overflowY: 'auto' }}>
        <ul style={{ listStyle: 'none', display: 'flex', flexDirection: 'column', gap: 2 }}>
          {navItems.map(({ to, label, icon: Icon }) => (
            <li key={to}>
              <NavLink
                to={to}
                end={to === ROUTES.ADMIN}
                onClick={() => setSidebarOpen(false)}
                className={({ isActive }) =>
                  `nav-item${isActive ? ' active' : ''}`
                }
              >
                <Icon size={15} />
                <span style={{ fontSize: 13 }}>{label}</span>
              </NavLink>
            </li>
          ))}
        </ul>
      </nav>

      {/* User footer */}
      <div style={{ padding: '12px 8px', borderTop: '1px solid var(--border)' }}>
        {/* User info */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '8px 10px', marginBottom: 4 }}>
          <div className={`avatar ${isStaff ? 'avatar-rose' : 'avatar-cyan'}`}
               style={{ width: 32, height: 32, fontSize: 11, fontWeight: 700, flexShrink: 0, overflow: 'hidden' }}>
            {user?.avatarUrl
              ? <img src={user.avatarUrl} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
              : (user?.name?.slice(0, 2).toUpperCase() || 'RH')}
          </div>
          <div style={{ overflow: 'hidden', flex: 1 }}>
            <p style={{ fontSize: 13, fontWeight: 600, color: 'var(--text)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
              {user?.name}
            </p>
            <p style={{ fontFamily: "'IBM Plex Mono', monospace", fontSize: 10, color: 'var(--text3)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
              {user?.email}
            </p>
          </div>
        </div>

        {/* Theme toggle */}
        <button onClick={toggleTheme} className="btn-theme" style={{ width: '100%', marginBottom: 4, justifyContent: 'center' }}>
          {theme === 'dark' ? <Sun size={13} /> : <Moon size={13} />}
          {theme === 'dark' ? 'Light mode' : 'Dark mode'}
        </button>

        {/* Logout */}
        <button onClick={handleLogout} className="btn-logout" style={{ width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6 }}>
          <LogOut size={12} />
          Sign out
        </button>

        {/* Legal links + Athera signature — small, never the visual focus */}
        <div style={{
          marginTop: 10, textAlign: 'center',
          fontFamily: "'IBM Plex Mono', monospace",
          fontSize: 9, color: 'var(--text4)', letterSpacing: '.05em',
        }}>
          <div style={{ display: 'flex', justifyContent: 'center', gap: 10, marginBottom: 4 }}>
            <NavLink to={ROUTES.PRIVACY} style={{ color: 'var(--text3)', textDecoration: 'none' }}>
              Privacy
            </NavLink>
            <span style={{ color: 'var(--text4)' }}>·</span>
            <NavLink to={ROUTES.TERMS} style={{ color: 'var(--text3)', textDecoration: 'none' }}>
              Terms
            </NavLink>
          </div>
          Built by{' '}
          <span style={{ color: 'var(--text3)', fontWeight: 700, letterSpacing: '0' }}>Athera</span>
        </div>
      </div>
    </aside>
  );

  return (
    <div style={{ display: 'flex', height: '100vh', background: 'var(--bg)', overflow: 'hidden' }}>
      {/* Skip-to-content — first focusable element for keyboard users */}
      <a href="#main-content" className="skip-link">Skip to main content</a>
      {/* First-time welcome tour — renders only when user.onboardedAt is null */}
      <WelcomeTour />
      {/* Background polling notifier — toasts new news/invoices/chores */}
      <LiveNotifier />
      {/* Auto sign-out after 90s of inactivity (15s warning at 75s) */}
      <IdleLogout />
      {/* Desktop sidebar */}
      <div className="hidden md:flex flex-shrink-0">
        <Sidebar />
      </div>

      {/* Mobile sidebar overlay */}
      {sidebarOpen && (
        <div className="md:hidden" style={{ position: 'fixed', inset: 0, zIndex: 40, display: 'flex' }}>
          <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,.6)' }} onClick={() => setSidebarOpen(false)} />
          <div style={{ position: 'relative', zIndex: 50, display: 'flex', flexDirection: 'column', width: 232 }}>
            <Sidebar />
          </div>
        </div>
      )}

      {/* Main content */}
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>

        {/* Single top bar — works for desktop and mobile.
            Hamburger shows on mobile only; user menu always on the right.
            No brand here — the sidebar already carries the logo (always
            visible on desktop, opened via the hamburger on mobile), so a
            second copy in the topbar was redundant. */}
        <div style={{
          height: 56,
          background: 'var(--bg2)',
          borderBottom: '1px solid var(--border)',
          padding: '0 16px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          gap: 12,
          position: 'sticky',
          top: 0,
          zIndex: 100,
          boxShadow: '0 1px 14px var(--shadow)',
        }}>
          {/* Mobile-only hamburger — opens the sidebar (which carries the brand) */}
          <button
            onClick={() => setSidebarOpen(!sidebarOpen)}
            aria-label={sidebarOpen ? 'Close menu' : 'Open menu'}
            className="press-soft md:hidden"
            style={{
              background: 'var(--bg3)', border: '1px solid var(--border)',
              borderRadius: 8, color: 'var(--text2)',
              padding: 8, display: 'flex',
            }}
          >
            {sidebarOpen ? <X size={18} /> : <Menu size={18} />}
          </button>
          {/* Global search — renders only for management roles */}
          <GlobalSearch />
          {/* Flex spacer so the bell + UserMenu always pin to the right */}
          <div style={{ flex: 1 }} />
          <NotificationBell />
          <UserMenu />
        </div>

        {/* Page content */}
        <main id="main-content" style={{ flex: 1, overflowY: 'auto', padding: '28px 28px', position: 'relative' }} className="appear">
          {/* Liquid-glass ambient blobs */}
          <div aria-hidden style={{ position: 'fixed', inset: 0, zIndex: 0, pointerEvents: 'none', overflow: 'hidden' }}>
            <div style={{
              position: 'absolute', top: '-15%', left: '10%',
              width: 520, height: 520, borderRadius: '50%',
              background: 'radial-gradient(circle, rgba(0,204,204,.055) 0%, transparent 70%)',
              animation: 'blob1 38s ease-in-out infinite',
            }} />
            <div style={{
              position: 'absolute', bottom: '-10%', right: '8%',
              width: 480, height: 480, borderRadius: '50%',
              background: 'radial-gradient(circle, rgba(232,25,122,.045) 0%, transparent 70%)',
              animation: 'blob2 46s ease-in-out infinite',
            }} />
            <div style={{
              position: 'absolute', top: '40%', left: '55%',
              width: 340, height: 340, borderRadius: '50%',
              background: 'radial-gradient(circle, rgba(0,204,204,.03) 0%, transparent 70%)',
              animation: 'blob3 54s ease-in-out infinite',
            }} />
          </div>
          <div style={{ position: 'relative', zIndex: 1 }}>
            {children}
          </div>
        </main>
      </div>
    </div>
  );
}
