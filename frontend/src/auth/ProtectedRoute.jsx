import { Navigate, Outlet, useLocation } from "react-router-dom";

import { useAuth } from "./AuthContext";

export default function ProtectedRoute({
  permission,
  permissions = [],
  requireAll = false,
}) {
  const {
    isAuthenticated,
    loading,
    hasPermission,
    hasAnyPermission,
    hasAllPermissions,
  } = useAuth();

  const location = useLocation();

  if (loading) {
    return (
      <div className="page-loading">
        Loading EduSphere...
      </div>
    );
  }

  if (!isAuthenticated) {
    return (
      <Navigate
        to="/login"
        replace
        state={{ from: location.pathname }}
      />
    );
  }

  if (permission && !hasPermission(permission)) {
    return <Navigate to="/dashboard" replace />;
  }

  if (permissions.length > 0) {
    const allowed = requireAll
      ? hasAllPermissions(permissions)
      : hasAnyPermission(permissions);

    if (!allowed) {
      return <Navigate to="/dashboard" replace />;
    }
  }

  return <Outlet />;
}