import type { ReactNode } from "react";
import {
  Navigate,
  useLocation,
} from "react-router";
import { useAuth } from "../../context/AuthContext";
import type { UserRole } from "../../types/auth";

interface ProtectedRouteProps {
  allowedRoles: UserRole[];
  children: ReactNode;
}

function ProtectedRoute({
  allowedRoles,
  children,
}: ProtectedRouteProps) {
  const { user, isLoading } = useAuth();
  const location = useLocation();

  if (isLoading) {
    return (
      <div className="flex min-h-[40vh] items-center justify-center text-sm font-medium text-gray-500">
        Loading session...
      </div>
    );
  }

  if (!user) {
    return (
      <Navigate
        to="/login"
        replace
        state={{
          from: `${location.pathname}${location.search}`,
        }}
      />
    );
  }

  if (!allowedRoles.includes(user.role)) {
    return <Navigate to="/" replace />;
  }

  return children;
}

export default ProtectedRoute;