import { NavLink, useNavigate } from 'react-router-dom';
import { useState } from 'react';
import {
  LayoutDashboard, Wrench, Newspaper, Users, QrCode,
  Wallet, User, FileText, LogOut, Menu, X,
  Building2, SquareStack, Ticket, Megaphone, ClipboardList, Gift, BookUser,
  Sun, Moon, CreditCard,
} from 'lucide-react';
import { useAuth }  from '../../contexts/AuthContext';
import { useTheme } from '../../contexts/ThemeContext';
import { ROUTES }   from '../../constants/routes';

const studentNav = [
  { to: ROUTES.DASHBOARD,   label: 'Dashboard',   icon: LayoutDashboard },
  { to: ROUTES.MAINTENANCE, label: 'Maintenance',  icon: Wrench          },
  { to: ROUTES.UPDATES,     label: 'Updates',      icon: Newspaper       },
  { to: ROUTES.VISITORS,    label: 'Visitors',     icon: QrCode          },
  { to: ROUTES.HOUSEMATES,  label: 'Housemates',   icon: Users           },
  { to: ROUTES.WALLET,      label: 'Wallet',       icon: Wallet          },
  { to: ROUTES.DOCUMENTS,   label: 'Documents & Invoices', icon: FileText  },
  { to: ROUTES.PROFILE,     label: 'Profile',      icon: User            },
];

const pendingNav = [
  { to: ROUTES.APPLICATION, label: 'My Application', icon: ClipboardList },
  { to: ROUTES.ROOMS,       label: 'Browse Rooms',   icon: Building2     },
];

const adminNav = [
  { to: ROUTES.ADMIN,             label: 'Overview',    icon: LayoutDashboard },
  { to: ROUTES.ADMIN_ALLOCATIONS, label: 'Allocations', icon: SquareStack     },
  { to: ROUTES.ADMIN_PAYMENTS,    label: 'Payments',    icon: CreditCard      },
  { to: ROUTES.ADMIN_MAINTENANCE, label: 'Tickets',     icon: Ticket          },
  { to: ROUTES.ADMIN_NEWS,        label: 'News',        icon: Megaphone       },
  { to: ROUTES.ADMIN_VISITORS,    label: 'Visitors',    icon: QrCode          },
  { to: ROUTES.ADMIN_REWARDS,     label: 'Rewards',     icon: Gift            },
  { to: ROUTES.ADMIN_ACCOUNTS,    label: 'Accounts',    icon: BookUser        },
  { to: ROUTES.ADMIN_SETTINGS,    label: 'Residence',   icon: Building2       },
];

export function DashboardLayout({ children }: { children: React.ReactNode }) {
  const { user, logout }        = useAuth();
  const { theme, toggleTheme }  = useTheme();
  const navigate                = useNavigate();
  const [sidebarOpen, setSidebarOpen] = useState(false);

  const navItems =
    user?.role === 'ADMIN'           ? adminNav    :
    user?.role === 'ACTIVE_STUDENT'  ? studentNav  : pendingNav;

  const roleLabel =
    user?.role === 'ADMIN'           ? 'Admin'   :
    user?.role === 'ACTIVE_STUDENT'  ? 'Resident': 'Applicant';

  const isAdmin = user?.role === 'ADMIN';

  async function handleLogout() {
    await logout();
    navigate(ROUTES.LOGIN);
  }

  const Sidebar = () => (
    <aside style={{ width: 232, height: '100%', background: 'var(--bg2)', borderRight: '1px solid var(--border)', display: 'flex', flexDirection: 'column' }}>

      {/* Logo + role badge */}
      <div style={{ padding: '20px 16px 16px', borderBottom: '1px solid var(--border)' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8 }}>
          <span style={{ fontSize: 22, fontWeight: 700, color: 'var(--cyan)', letterSpacing: '-.03em', fontFamily: "'Space Grotesk', sans-serif" }}>
            ResiHub
          </span>
          {/* 1px vertical divider */}
          <span style={{ width: 1, height: 18, background: 'var(--border2)', display: 'inline-block' }} />
          <span style={{
            fontFamily: "'IBM Plex Mono', monospace",
            fontSize: 10,
            letterSpacing: '.06em',
            textTransform: 'uppercase',
            color: isAdmin ? 'var(--rose)' : 'var(--cyan)',
          }}>
            {roleLabel}
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
          border: `1px solid ${isAdmin ? 'rgba(232,25,122,.3)' : 'rgba(0,204,204,.3)'}`,
          color: isAdmin ? 'var(--rose)' : 'var(--cyan)',
          background: isAdmin ? 'rgba(232,25,122,.08)' : 'rgba(0,204,204,.08)',
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
          <div className={`avatar ${isAdmin ? 'avatar-rose' : 'avatar-cyan'}`}
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
      </div>
    </aside>
  );

  return (
    <div style={{ display: 'flex', height: '100vh', background: 'var(--bg)', overflow: 'hidden' }}>
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

        {/* Mobile top bar — sticky header */}
        <div className="md:hidden" style={{
          height: 56,
          background: 'var(--bg2)',
          borderBottom: '1px solid var(--border)',
          padding: '0 16px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          position: 'sticky',
          top: 0,
          zIndex: 100,
          boxShadow: '0 1px 14px var(--shadow)',
        }}>
          <span style={{ fontSize: 18, fontWeight: 700, color: 'var(--cyan)', letterSpacing: '-.03em', fontFamily: "'Space Grotesk', sans-serif" }}>
            ResiHub
          </span>
          <button
            onClick={() => setSidebarOpen(!sidebarOpen)}
            style={{ background: 'none', border: 'none', color: 'var(--text2)', padding: 4 }}
          >
            {sidebarOpen ? <X size={22} /> : <Menu size={22} />}
          </button>
        </div>

        {/* Page content */}
        <main style={{ flex: 1, overflowY: 'auto', padding: '28px 28px', position: 'relative' }} className="appear">
          {/* Liquid-glass ambient blobs */}
          <div aria-hidden style={{ position: 'fixed', inset: 0, zIndex: 0, pointerEvents: 'none', overflow: 'hidden' }}>
            <div style={{
              position: 'absolute', top: '-15%', left: '10%',
              width: 520, height: 520, borderRadius: '50%',
              background: 'radial-gradient(circle, rgba(0,204,204,.055) 0%, transparent 70%)',
              animation: 'blob1 18s ease-in-out infinite',
            }} />
            <div style={{
              position: 'absolute', bottom: '-10%', right: '8%',
              width: 480, height: 480, borderRadius: '50%',
              background: 'radial-gradient(circle, rgba(232,25,122,.045) 0%, transparent 70%)',
              animation: 'blob2 22s ease-in-out infinite',
            }} />
            <div style={{
              position: 'absolute', top: '40%', left: '55%',
              width: 340, height: 340, borderRadius: '50%',
              background: 'radial-gradient(circle, rgba(0,204,204,.03) 0%, transparent 70%)',
              animation: 'blob3 26s ease-in-out infinite',
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
