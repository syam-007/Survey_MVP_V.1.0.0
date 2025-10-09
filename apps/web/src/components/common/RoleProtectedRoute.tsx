import React from 'react';
import { Navigate } from 'react-router-dom';
import { useAppSelector } from '../../stores/hooks';
import type { UserRole } from '../../types/auth.types';

interface RoleProtectedRouteProps {
  children: React.ReactNode;
  requiredRole?: UserRole;
  allowedRoles?: UserRole[];
}

/**
 * RoleProtectedRoute component - ALL authenticated users have full access.
 *
 * No role restrictions applied - any authenticated user can access any route.
 *
 * Usage:
 *   <RoleProtectedRoute>
 *     <AnyPage />
 *   </RoleProtectedRoute>
 */
export const RoleProtectedRoute: React.FC<RoleProtectedRouteProps> = ({
  children,
}) => {
  const { isAuthenticated } = useAppSelector((state) => state.auth);

  // Only check if user is authenticated - no role checking
  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }

  // All authenticated users have full access
  return <>{children}</>;
};
