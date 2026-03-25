import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider } from './contexts/AuthContext';
import { ProtectedRoute } from './components/layout/ProtectedRoute';
import { DashboardLayout } from './components/layout/DashboardLayout';
import { ROUTES } from './constants/routes';

// ── Auth ───────────────────────────────────────────────────────
import Login from './pages/auth/Login';

// ── Active Student ─────────────────────────────────────────────
import Dashboard   from './pages/student/Dashboard';
import Maintenance from './pages/student/Maintenance';
import Updates     from './pages/student/Updates';
import Visitors    from './pages/student/Visitors';
import Housemates  from './pages/student/Housemates';
import Wallet      from './pages/student/Wallet';
import Profile     from './pages/student/Profile';
import Documents   from './pages/student/Documents';

// ── Admin ───────────────────────────────────────────────────────
import AdminOverview    from './pages/admin/AdminOverview';
import AdminOccupancy   from './pages/admin/AdminOccupancy';
import AdminAllocations from './pages/admin/AdminAllocations';
import AdminMaintenance from './pages/admin/AdminMaintenance';
import AdminNews        from './pages/admin/AdminNews';
import AdminVisitors    from './pages/admin/AdminVisitors';
import AdminRewards     from './pages/admin/AdminRewards';
import AdminAccounts    from './pages/admin/AdminAccounts';

// ── Placeholder — for pages not yet built ─────────────────────
function ComingSoon({ page }: { page: string }) {
  return (
    <div className="flex items-center justify-center min-h-[60vh]">
      <div className="text-center">
        <div className="text-4xl mb-4">🚧</div>
        <h2 className="text-xl font-semibold text-white mb-1">{page}</h2>
        <p className="text-white/40 font-mono text-sm">Coming in the next phase</p>
      </div>
    </div>
  );
}

function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <Routes>

          {/* ── Public ─────────────────────────────────────── */}
          <Route path={ROUTES.LOGIN} element={<Login />} />

          {/* ── Active Student ─────────────────────────────── */}
          <Route path={ROUTES.DASHBOARD} element={
            <ProtectedRoute allowedRoles={['ACTIVE_STUDENT']}>
              <DashboardLayout><Dashboard /></DashboardLayout>
            </ProtectedRoute>
          } />
          <Route path={ROUTES.MAINTENANCE} element={
            <ProtectedRoute allowedRoles={['ACTIVE_STUDENT']}>
              <DashboardLayout><Maintenance /></DashboardLayout>
            </ProtectedRoute>
          } />
          <Route path={ROUTES.UPDATES} element={
            <ProtectedRoute allowedRoles={['ACTIVE_STUDENT', 'PENDING_STUDENT']}>
              <DashboardLayout><Updates /></DashboardLayout>
            </ProtectedRoute>
          } />
          <Route path={ROUTES.VISITORS} element={
            <ProtectedRoute allowedRoles={['ACTIVE_STUDENT']}>
              <DashboardLayout><Visitors /></DashboardLayout>
            </ProtectedRoute>
          } />
          <Route path={ROUTES.HOUSEMATES} element={
            <ProtectedRoute allowedRoles={['ACTIVE_STUDENT']}>
              <DashboardLayout><Housemates /></DashboardLayout>
            </ProtectedRoute>
          } />
          <Route path={ROUTES.WALLET} element={
            <ProtectedRoute allowedRoles={['ACTIVE_STUDENT']}>
              <DashboardLayout><Wallet /></DashboardLayout>
            </ProtectedRoute>
          } />
          <Route path={ROUTES.PROFILE} element={
            <ProtectedRoute allowedRoles={['ACTIVE_STUDENT', 'PENDING_STUDENT']}>
              <DashboardLayout><Profile /></DashboardLayout>
            </ProtectedRoute>
          } />
          <Route path={ROUTES.DOCUMENTS} element={
            <ProtectedRoute allowedRoles={['ACTIVE_STUDENT']}>
              <DashboardLayout><Documents /></DashboardLayout>
            </ProtectedRoute>
          } />

          {/* ── Pending Student ────────────────────────────── */}
          <Route path={ROUTES.APPLICATION} element={
            <ProtectedRoute allowedRoles={['PENDING_STUDENT']}>
              <DashboardLayout><ComingSoon page="Application Status" /></DashboardLayout>
            </ProtectedRoute>
          } />
          <Route path={ROUTES.ROOMS} element={
            <ProtectedRoute allowedRoles={['PENDING_STUDENT']}>
              <DashboardLayout><ComingSoon page="Browse Rooms" /></DashboardLayout>
            </ProtectedRoute>
          } />

          {/* ── Admin ──────────────────────────────────────── */}
          <Route path={ROUTES.ADMIN} element={
            <ProtectedRoute allowedRoles={['ADMIN']}>
              <DashboardLayout><AdminOverview /></DashboardLayout>
            </ProtectedRoute>
          } />
          <Route path={ROUTES.ADMIN_OCCUPANCY} element={
            <ProtectedRoute allowedRoles={['ADMIN']}>
              <DashboardLayout><AdminOccupancy /></DashboardLayout>
            </ProtectedRoute>
          } />
          <Route path={ROUTES.ADMIN_ALLOCATIONS} element={
            <ProtectedRoute allowedRoles={['ADMIN']}>
              <DashboardLayout><AdminAllocations /></DashboardLayout>
            </ProtectedRoute>
          } />
          <Route path={ROUTES.ADMIN_MAINTENANCE} element={
            <ProtectedRoute allowedRoles={['ADMIN']}>
              <DashboardLayout><AdminMaintenance /></DashboardLayout>
            </ProtectedRoute>
          } />
          <Route path={ROUTES.ADMIN_NEWS} element={
            <ProtectedRoute allowedRoles={['ADMIN']}>
              <DashboardLayout><AdminNews /></DashboardLayout>
            </ProtectedRoute>
          } />
          <Route path={ROUTES.ADMIN_VISITORS} element={
            <ProtectedRoute allowedRoles={['ADMIN']}>
              <DashboardLayout><AdminVisitors /></DashboardLayout>
            </ProtectedRoute>
          } />
          <Route path={ROUTES.ADMIN_REWARDS} element={
            <ProtectedRoute allowedRoles={['ADMIN']}>
              <DashboardLayout><AdminRewards /></DashboardLayout>
            </ProtectedRoute>
          } />
          <Route path={ROUTES.ADMIN_ACCOUNTS} element={
            <ProtectedRoute allowedRoles={['ADMIN']}>
              <DashboardLayout><AdminAccounts /></DashboardLayout>
            </ProtectedRoute>
          } />

          {/* ── Default ────────────────────────────────────── */}
          <Route path="/"  element={<Navigate to={ROUTES.LOGIN} replace />} />
          <Route path="*"  element={<Navigate to={ROUTES.LOGIN} replace />} />

        </Routes>
      </BrowserRouter>
    </AuthProvider>
  );
}

export default App;
