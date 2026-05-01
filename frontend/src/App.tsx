import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { Toaster } from 'sonner';
import { AuthProvider }      from './contexts/AuthContext';
import { ThemeProvider }     from './contexts/ThemeContext';
import { ResidenceProvider } from './contexts/ResidenceContext';
import { ProtectedRoute }   from './components/layout/ProtectedRoute';
import { DashboardLayout }  from './components/layout/DashboardLayout';
import { ErrorBoundary }    from './components/ErrorBoundary';
import { ROUTES }           from './constants/routes';
import type { Role }        from './types/auth.types';

// ── Auth ───────────────────────────────────────────────────────
import Login    from './pages/auth/Login';
import Register from './pages/auth/Register';
import NotFound from './pages/NotFound';

// ── Active Student ─────────────────────────────────────────────
import Dashboard   from './pages/student/Dashboard';
import Maintenance from './pages/student/Maintenance';
import Updates     from './pages/student/Updates';
import Visitors    from './pages/student/Visitors';
import Housemates  from './pages/student/Housemates';
import Wallet      from './pages/student/Wallet';
import Profile     from './pages/student/Profile';
import Documents   from './pages/student/Documents';

// ── Pending Student ────────────────────────────────────────────
import ApplicationStatus from './pages/student/ApplicationStatus';
import BrowseRooms       from './pages/student/BrowseRooms';

// ── Admin ───────────────────────────────────────────────────────
import AdminOverview    from './pages/admin/AdminOverview';
import AdminResidence   from './pages/admin/AdminResidence';
import AdminMaintenance from './pages/admin/AdminMaintenance';
import AdminNews        from './pages/admin/AdminNews';
import AdminVisitors    from './pages/admin/AdminVisitors';
import AdminRewards     from './pages/admin/AdminRewards';
import AdminAccounts    from './pages/admin/AdminAccounts';
import AdminPayments    from './pages/admin/AdminPayments';

/** Wraps a page component with DashboardLayout + ErrorBoundary */
function Page({ roles, children }: { roles: Role[]; children: React.ReactNode }) {
  return (
    <ProtectedRoute allowedRoles={roles}>
      <DashboardLayout>
        <ErrorBoundary>{children}</ErrorBoundary>
      </DashboardLayout>
    </ProtectedRoute>
  );
}

const ACTIVE:  Role[] = ['ACTIVE_STUDENT'];
const PENDING: Role[] = ['PENDING_STUDENT'];
const BOTH:    Role[] = ['ACTIVE_STUDENT', 'PENDING_STUDENT'];
const ADMIN:   Role[] = ['ADMIN'];

function App() {
  return (
    <ThemeProvider>
    <AuthProvider>
    <ResidenceProvider>
      <BrowserRouter>
        <Toaster richColors position="bottom-right" theme="dark" />
        <Routes>

          {/* ── Public ─────────────────────────────────────── */}
          <Route path={ROUTES.LOGIN}    element={<Login />} />
          <Route path={ROUTES.REGISTER} element={<Register />} />

          {/* ── Active Student ─────────────────────────────── */}
          <Route path={ROUTES.DASHBOARD}   element={<Page roles={ACTIVE}><Dashboard /></Page>} />
          <Route path={ROUTES.MAINTENANCE} element={<Page roles={ACTIVE}><Maintenance /></Page>} />
          <Route path={ROUTES.VISITORS}    element={<Page roles={ACTIVE}><Visitors /></Page>} />
          <Route path={ROUTES.HOUSEMATES}  element={<Page roles={ACTIVE}><Housemates /></Page>} />
          <Route path={ROUTES.WALLET}      element={<Page roles={ACTIVE}><Wallet /></Page>} />
          <Route path={ROUTES.DOCUMENTS}   element={<Page roles={ACTIVE}><Documents /></Page>} />

          {/* ── Active + Pending ───────────────────────────── */}
          <Route path={ROUTES.UPDATES}  element={<Page roles={BOTH}><Updates /></Page>} />
          <Route path={ROUTES.PROFILE}  element={<Page roles={BOTH}><Profile /></Page>} />

          {/* ── Pending Student ────────────────────────────── */}
          <Route path={ROUTES.APPLICATION} element={<Page roles={PENDING}><ApplicationStatus /></Page>} />
          <Route path={ROUTES.ROOMS}       element={<Page roles={PENDING}><BrowseRooms /></Page>} />

          {/* ── Admin ──────────────────────────────────────── */}
          <Route path={ROUTES.ADMIN}             element={<Page roles={ADMIN}><AdminOverview /></Page>} />
          <Route path={ROUTES.ADMIN_RESIDENCE}   element={<Page roles={ADMIN}><AdminResidence /></Page>} />
          {/* Legacy admin URLs → redirect into the consolidated Residence hub */}
          <Route path={ROUTES.ADMIN_OCCUPANCY}   element={<Navigate to={`${ROUTES.ADMIN_RESIDENCE}?tab=rooms`} replace />} />
          <Route path={ROUTES.ADMIN_ALLOCATIONS} element={<Navigate to={`${ROUTES.ADMIN_RESIDENCE}?tab=allocations`} replace />} />
          <Route path={ROUTES.ADMIN_SETTINGS}    element={<Navigate to={`${ROUTES.ADMIN_RESIDENCE}?tab=info`} replace />} />
          <Route path={ROUTES.ADMIN_MAINTENANCE} element={<Page roles={ADMIN}><AdminMaintenance /></Page>} />
          <Route path={ROUTES.ADMIN_NEWS}        element={<Page roles={ADMIN}><AdminNews /></Page>} />
          <Route path={ROUTES.ADMIN_VISITORS}    element={<Page roles={ADMIN}><AdminVisitors /></Page>} />
          <Route path={ROUTES.ADMIN_REWARDS}     element={<Page roles={ADMIN}><AdminRewards /></Page>} />
          <Route path={ROUTES.ADMIN_ACCOUNTS}    element={<Page roles={ADMIN}><AdminAccounts /></Page>} />
          <Route path={ROUTES.ADMIN_PAYMENTS}    element={<Page roles={ADMIN}><AdminPayments /></Page>} />

          {/* ── Default ────────────────────────────────────── */}
          <Route path="/"  element={<Navigate to={ROUTES.LOGIN} replace />} />
          <Route path="*"  element={<NotFound />} />

        </Routes>
      </BrowserRouter>
    </ResidenceProvider>
    </AuthProvider>
    </ThemeProvider>
  );
}

export default App;
