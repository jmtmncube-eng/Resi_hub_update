import { NavLink, useNavigate } from 'react-router-dom';
import { useState } from 'react';
import {
  LayoutDashboard, Wrench, Newspaper, Users, QrCode,
  Wallet, User, FileText, LogOut, Menu, X,
  Building2, SquareStack, Ticket, Megaphone, ClipboardList, Gift, BookUser,
} from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';
import { ROUTES } from '../../constants/routes';

const studentNav = [
  { to: ROUTES.DASHBOARD,   label: 'Dashboard',   icon: LayoutDashboard },
  { to: ROUTES.MAINTENANCE, label: 'Maintenance',  icon: Wrench          },
  { to: ROUTES.UPDATES,     label: 'Updates',      icon: Newspaper       },
  { to: ROUTES.VISITORS,    label: 'Visitors',     icon: QrCode          },
  { to: ROUTES.HOUSEMATES,  label: 'Housemates',   icon: Users           },
  { to: ROUTES.WALLET,      label: 'Wallet',       icon: Wallet          },
  { to: ROUTES.DOCUMENTS,   label: 'Documents',    icon: FileText        },
  { to: ROUTES.PROFILE,     label: 'Profile',      icon: User            },
];

const pendingNav = [
  { to: ROUTES.APPLICATION, label: 'My Application', icon: ClipboardList },
  { to: ROUTES.ROOMS,       label: 'Browse Rooms',   icon: Building2     },
];

const adminNav = [
  { to: ROUTES.ADMIN,             label: 'Overview',    icon: LayoutDashboard },
  { to: ROUTES.ADMIN_OCCUPANCY,   label: 'Occupancy',   icon: Building2       },
  { to: ROUTES.ADMIN_ALLOCATIONS, label: 'Allocations', icon: SquareStack     },
  { to: ROUTES.ADMIN_MAINTENANCE, label: 'Tickets',     icon: Ticket          },
  { to: ROUTES.ADMIN_NEWS,        label: 'News',        icon: Megaphone       },
  { to: ROUTES.ADMIN_VISITORS,    label: 'Visitors',    icon: QrCode          },
  { to: ROUTES.ADMIN_REWARDS,     label: 'Rewards',     icon: Gift            },
  { to: ROUTES.ADMIN_ACCOUNTS,    label: 'Accounts',    icon: BookUser        },
];

export function DashboardLayout({ children }: { children: React.ReactNode }) {
  const { user, logout } = useAuth();
  const navigate         = useNavigate();
  const [sidebarOpen, setSidebarOpen] = useState(false);

  const navItems =
    user?.role === 'ADMIN'           ? adminNav    :
    user?.role === 'ACTIVE_STUDENT'  ? studentNav  : pendingNav;

  const roleLabel =
    user?.role === 'ADMIN'           ? 'Admin'   :
    user?.role === 'ACTIVE_STUDENT'  ? 'Resident': 'Applicant';

  const roleBgColor =
    user?.role === 'ADMIN'           ? 'bg-rh-rose/15 text-rh-rose'   :
    user?.role === 'ACTIVE_STUDENT'  ? 'bg-rh-cyan/15 text-rh-cyan'   :
                                       'bg-yellow-500/15 text-yellow-400';

  async function handleLogout() {
    await logout();
    navigate(ROUTES.LOGIN);
  }

  const Sidebar = () => (
    <aside className="w-60 h-full bg-rh-bg2 border-r border-white/7 flex flex-col">
      {/* Logo */}
      <div className="px-5 py-5 border-b border-white/7">
        <div className="flex items-center gap-2">
          <span className="text-2xl font-bold text-rh-cyan tracking-tight">ResiHub</span>
        </div>
        <div className={`mt-2 inline-flex items-center px-2 py-0.5 rounded text-xs font-mono font-medium ${roleBgColor}`}>
          {roleLabel}
        </div>
      </div>

      {/* Navigation */}
      <nav className="flex-1 px-3 py-4 overflow-y-auto">
        <ul className="space-y-0.5">
          {navItems.map(({ to, label, icon: Icon }) => (
            <li key={to}>
              <NavLink
                to={to}
                end={to === ROUTES.ADMIN}
                onClick={() => setSidebarOpen(false)}
                className={({ isActive }) =>
                  `flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors ${
                    isActive
                      ? 'bg-rh-cyan/10 text-rh-cyan'
                      : 'text-white/60 hover:text-white hover:bg-white/5'
                  }`
                }
              >
                <Icon size={16} />
                {label}
              </NavLink>
            </li>
          ))}
        </ul>
      </nav>

      {/* User footer */}
      <div className="px-3 py-4 border-t border-white/7">
        <div className="flex items-center gap-3 px-2 py-2 mb-1">
          <div className="w-8 h-8 rounded-full bg-rh-cyan/20 flex items-center justify-center text-rh-cyan text-xs font-bold flex-shrink-0">
            {user?.name?.slice(0, 2).toUpperCase() || 'RH'}
          </div>
          <div className="overflow-hidden">
            <p className="text-sm font-medium text-white truncate">{user?.name}</p>
            <p className="text-xs text-white/40 font-mono truncate">{user?.email}</p>
          </div>
        </div>
        <button
          onClick={handleLogout}
          className="flex items-center gap-3 px-3 py-2.5 w-full rounded-lg text-sm font-medium text-white/50 hover:text-white hover:bg-white/5 transition-colors"
        >
          <LogOut size={16} />
          Sign out
        </button>
      </div>
    </aside>
  );

  return (
    <div className="flex h-screen bg-rh-bg overflow-hidden">
      {/* Desktop sidebar */}
      <div className="hidden md:flex flex-shrink-0">
        <Sidebar />
      </div>

      {/* Mobile sidebar overlay */}
      {sidebarOpen && (
        <div className="md:hidden fixed inset-0 z-40 flex">
          <div className="fixed inset-0 bg-black/60" onClick={() => setSidebarOpen(false)} />
          <div className="relative z-50 flex flex-col w-60">
            <Sidebar />
          </div>
        </div>
      )}

      {/* Main content */}
      <div className="flex-1 flex flex-col overflow-hidden">
        {/* Mobile top bar */}
        <div className="md:hidden flex items-center justify-between px-4 py-3 border-b border-white/7 bg-rh-bg2">
          <span className="text-lg font-bold text-rh-cyan">ResiHub</span>
          <button
            onClick={() => setSidebarOpen(!sidebarOpen)}
            className="text-white/60 hover:text-white"
          >
            {sidebarOpen ? <X size={22} /> : <Menu size={22} />}
          </button>
        </div>

        {/* Page content */}
        <main className="flex-1 overflow-y-auto p-4 md:p-6 lg:p-8">
          {children}
        </main>
      </div>
    </div>
  );
}
