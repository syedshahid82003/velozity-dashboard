import { Navigate, Outlet } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import type { Role } from '../types';

interface Props {
  allowedRoles?: Role[];
}

/**
 * Wraps routes that require authentication and optional role checks.
 * Redirects unauthenticated users to /login.
 * Redirects authenticated users without the right role to /unauthorized.
 *
 * NOTE: Role enforcement at the API level (server-side) is the source of truth.
 * This component only handles navigation UX — it does NOT replace server-side guards.
 */
export default function ProtectedRoute({ allowedRoles }: Props) {
  const { user, isLoading } = useAuth();

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-indigo-600" />
      </div>
    );
  }

  if (!user) {
    return <Navigate to="/login" replace />;
  }

  if (allowedRoles && !allowedRoles.includes(user.role)) {
    return <Navigate to="/unauthorized" replace />;
  }

  return <Outlet />;
}
