import { NavLink, useNavigate } from 'react-router-dom';
import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import {
  listDocsAwaitingReview, listSubmittedApplications,
  getApplicationStatus, getMyApplicationDocs,
} from '../../services/application.service';
import { getTickets } from '../../services/maintenance.service';
import { getAllInvoices, AdminInvoice } from '../../services/admin.service';
import { getChorePendingApprovals } from '../../services/chore.service';
import { getMyDocuments } from '../../services/document.service';
import { getNews } from '../../services/news.service';
import {
  LayoutDashboard, Wrench, Newspaper, Users, QrCode,
  Wallet, User, FileText, LogOut, Menu, X,
  Building2, Ticket, Megaphone, ClipboardList, Gift, BookUser,
  Sun, Moon, CreditCard, Activity, ListChecks, FileCheck,
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
  { to: ROUTES.ADMIN_COMPLIANCE,  label: 'Compliance', icon: FileCheck      },
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

  // Sidebar badge counters — keyed by route. Only fetch the queries the
  // current role's nav actually shows. React Query caches + refetches in
  // the background so badges stay fresh without manual polling, and
  // shares the cache with the pages that own the data (so a verdict
  // taken on the Compliance page ticks the badge down instantly via
  // the existing invalidateQueries calls).
  const isManagement   = user?.role === 'ADMIN' || user?.role === 'MANAGER';
  const seesTickets    = isManagement || user?.role === 'MAINTENANCE';
  const isActive       = user?.role === 'ACTIVE_STUDENT';
  const isPending      = user?.role === 'PENDING_STUDENT';
  const REFRESH_MS     = 60_000;
  const STALE_MS       = 30_000;

  // ── Admin / Manager queries ──────────────────────────────────

  // Compliance docs awaiting review.
  const { data: pendingDocs = [] } = useQuery({
    queryKey: ['admin-compliance-queue'],
    queryFn:  listDocsAwaitingReview,
    enabled:  isManagement,
    refetchInterval: REFRESH_MS, staleTime: STALE_MS,
  });

  // Pending applications awaiting verdict. Shares cache with AdminAccounts.
  const { data: applications = [] } = useQuery({
    queryKey: ['admin-applications'],
    queryFn:  listSubmittedApplications,
    enabled:  isManagement,
    refetchInterval: REFRESH_MS, staleTime: STALE_MS,
  });
  const pendingApplications = applications.filter(a => a.applicationStatus === 'SUBMITTED').length;

  // Invoices with student-submitted proof awaiting admin clearance.
  // Shares cache with AdminPayments.
  const { data: invoicesAll = [] as AdminInvoice[] } = useQuery({
    queryKey: ['admin-invoices'],
    queryFn:  getAllInvoices,
    enabled:  isManagement,
    refetchInterval: REFRESH_MS, staleTime: STALE_MS,
  });
  // Both SUBMITTED (needs first look) and ACKNOWLEDGED (needs bank
  // confirmation) require admin action — the badge counts the union,
  // matching the two clickable KPI tiles on the Payments page.
  const proofsAwaitingClear = invoicesAll.filter(
    i => i.proofStatus === 'SUBMITTED' || i.proofStatus === 'ACKNOWLEDGED',
  ).length;

  // Chore proofs awaiting admin approval. Shares cache with AdminChores.
  const { data: choreApprovals = [] } = useQuery({
    queryKey: ['admin-chore-approvals'],
    queryFn:  getChorePendingApprovals,
    enabled:  isManagement,
    refetchInterval: REFRESH_MS, staleTime: STALE_MS,
  });

  // ── Maintenance handyman query (also visible to admin/manager) ─

  // "Actionable" tickets = OPEN + IN_PROGRESS, matching the "Open" tab
  // on the maintenance page. Without IN_PROGRESS the sidebar would
  // under-count by however many tickets the admin has started work on
  // but not yet resolved — the sidebar would say "4" while the Open
  // tab says "7". Two queries (one per status) share their caches
  // with the Overview's SLA-breach calculation and the maintenance
  // page itself.
  const { data: openOnly       = [] } = useQuery({
    queryKey: ['admin-tickets', { status: 'OPEN' }],
    queryFn:  () => getTickets({ status: 'OPEN' }),
    enabled:  seesTickets,
    refetchInterval: REFRESH_MS, staleTime: STALE_MS,
  });
  const { data: inProgressOnly = [] } = useQuery({
    queryKey: ['admin-tickets', { status: 'IN_PROGRESS' }],
    queryFn:  () => getTickets({ status: 'IN_PROGRESS' }),
    enabled:  seesTickets,
    refetchInterval: REFRESH_MS, staleTime: STALE_MS,
  });
  const actionableTickets = openOnly.length + inProgressOnly.length;

  // ── Active student queries ───────────────────────────────────

  // Own compliance docs — count anything that needs action:
  //   • Missing (null slot — never uploaded)
  //   • Rejected (uploaded but admin asked for a re-upload)
  // Approved + Submitted (awaiting verdict) are NOT counted — the student
  // has nothing to do for those. This is also the value the admin's
  // "Send reminder" action targets, so the badge is in lockstep with the
  // reminder email/in-app notification.
  // Shares cache key with the Profile page's ComplianceDocsCard.
  const { data: myDocsByType } = useQuery({
    queryKey: ['my-application-docs'],
    queryFn:  getMyApplicationDocs,
    enabled:  isActive,
    refetchInterval: REFRESH_MS, staleTime: STALE_MS,
  });
  const myDocsNeedingAction = myDocsByType
    ? (Object.keys(myDocsByType) as Array<keyof typeof myDocsByType>).filter(t => {
        const d = myDocsByType[t];
        return !d || d.status === 'Rejected';
      }).length
    : 0;

  // Own invoices — count unpaid (status !== 'Paid').
  const { data: myDocuments = [] } = useQuery({
    queryKey: ['my-documents'],
    queryFn:  getMyDocuments,
    enabled:  isActive,
    refetchInterval: REFRESH_MS, staleTime: STALE_MS,
  });
  const myUnpaidInvoices = myDocuments.filter(d => d.type === 'INVOICE' && d.status !== 'Paid').length;

  // Unread news — server-side `read` flag per item (the NewsItem.read
  // field is computed against the user's read-receipts table). The
  // Updates page already calls markNewsRead / markAllNewsRead which
  // flips items to read, so this badge ticks down naturally when the
  // student opens a news item.
  const { data: news = [] } = useQuery({
    queryKey: ['news'],
    queryFn:  () => getNews(),
    enabled:  isActive,
    refetchInterval: REFRESH_MS, staleTime: STALE_MS,
  });
  const unreadNews = news.filter(n => !n.read).length;

  // ── Pending student query ────────────────────────────────────

  // Application status — show `1` only if REJECTED (so the applicant
  // notices the admin note and re-submits). Approved + Submitted +
  // Draft → no badge.
  const { data: myApp } = useQuery({
    queryKey: ['my-application-status'],
    queryFn:  getApplicationStatus,
    enabled:  isPending,
    refetchInterval: REFRESH_MS, staleTime: STALE_MS,
  });
  const applicationNeedsAttention = myApp?.applicationStatus === 'REJECTED' ? 1 : 0;

  const navBadges: Record<string, number> = {
    // Admin / manager
    [ROUTES.ADMIN_COMPLIANCE]:  pendingDocs.length,
    [ROUTES.ADMIN_ACCOUNTS]:    pendingApplications,
    [ROUTES.ADMIN_MAINTENANCE]: actionableTickets,
    [ROUTES.ADMIN_PAYMENTS]:    proofsAwaitingClear,
    [ROUTES.ADMIN_CHORES]:      choreApprovals.length,
    // Active student
    [ROUTES.PROFILE]:           myDocsNeedingAction,
    [ROUTES.DOCUMENTS]:         myUnpaidInvoices,
    [ROUTES.UPDATES]:           unreadNews,
    // Pending student
    [ROUTES.APPLICATION]:       applicationNeedsAttention,
  };

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
          {navItems.map(({ to, label, icon: Icon }) => {
            const badge = navBadges[to] ?? 0;
            return (
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
                  <span style={{ fontSize: 13, flex: 1 }}>{label}</span>
                  {/* Numeric badge for nav items with pending action.
                      Rose tone signals "needs attention"; capped at 99+
                      so the pill never blows the sidebar width. */}
                  {badge > 0 && (
                    <span style={{
                      display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
                      minWidth: 18, height: 18, padding: '0 6px',
                      borderRadius: 999, fontSize: 10, fontWeight: 700,
                      background: 'var(--rose)', color: '#fff',
                      fontFamily: "'IBM Plex Mono', monospace",
                      lineHeight: 1,
                    }}>
                      {badge > 99 ? '99+' : badge}
                    </span>
                  )}
                </NavLink>
              </li>
            );
          })}
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
          {/* Mobile-only hamburger — opens the sidebar (which carries the brand).
              Inline `display` would beat Tailwind's `md:hidden`, so we set the
              breakpoint via a scoped class + @media rule instead. */}
          <style>{`
            .rh-mobile-menu-btn { display: flex; }
            @media (min-width: 768px) { .rh-mobile-menu-btn { display: none; } }
          `}</style>
          <button
            onClick={() => setSidebarOpen(!sidebarOpen)}
            aria-label={sidebarOpen ? 'Close menu' : 'Open menu'}
            className="press-soft rh-mobile-menu-btn"
            style={{
              background: 'var(--bg3)', border: '1px solid var(--border)',
              borderRadius: 8, color: 'var(--text2)',
              padding: 8,
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
