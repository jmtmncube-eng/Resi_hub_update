import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import { Role } from '../../types/auth.types';
import { ROUTES } from '../../constants/routes';

interface Props {
  children:      React.ReactNode;
  allowedRoles?: Role[];
}

export function ProtectedRoute({ children, allowedRoles }: Props) {
  const { user, isLoading } = useAuth();
  const location = useLocation();

  if (isLoading) {
    return (
      <div className="min-h-screen bg-rh-bg flex items-center justify-center">
        <div className="flex flex-col items-center gap-3">
          <div className="w-8 h-8 border-2 border-rh-cyan border-t-transparent rounded-full animate-spin" />
          <p className="text-white/40 text-sm font-mono">Loading...</p>
        </div>
      </div>
    );
  }

  if (!user) {
    return <Navigate to={ROUTES.LOGIN} state={{ from: location }} replace />;
  }

  if (allowedRoles && !allowedRoles.includes(user.role)) {
    // Redirect to the user's appropriate home based on their actual role
    const home = {
      ACTIVE_STUDENT:  ROUTES.DASHBOARD,
      PENDING_STUDENT: ROUTES.APPLICATION,
      ADMIN:           ROUTES.ADMIN,
    }[user.role];
    return <Navigate to={home} replace />;
  }

  return <>{children}</>;
}
