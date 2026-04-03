import { type ReactNode } from "react";
import { Navigate, useLocation } from "react-router";
import { useAuth, useAdminAuth } from "./AuthContext";

// ── Loading spinner ───────────────────────────────────────────────────────────
function LoadingScreen() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-[#F7F9FB]">
      <div className="flex flex-col items-center gap-4">
        <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-[#1A5F3D] to-[#3FAF7D] flex items-center justify-center">
          <span className="text-white font-bold text-xl">SF</span>
        </div>
        <div className="flex gap-1.5">
          {[0, 1, 2].map((i) => (
            <div key={i} className="w-2 h-2 rounded-full bg-[#1A5F3D] animate-bounce"
              style={{ animationDelay: `${i * 0.15}s` }} />
          ))}
        </div>
      </div>
    </div>
  );
}

// ── User protected route ──────────────────────────────────────────────────────
export function ProtectedRoute({ children, redirectTo = "/login" }: {
  children: ReactNode; redirectTo?: string;
}) {
  const { isAuthenticated, isAdmin, isLoading } = useAuth();
  const location = useLocation();
  if (isLoading) return <LoadingScreen />;
  // Allow admins to access user pages too
  if (!isAuthenticated) return <Navigate to={redirectTo} state={{ from: location.pathname }} replace />;
  return <>{children}</>;
}

// ── Admin-only route ──────────────────────────────────────────────────────────
export function AdminRoute({ children }: { children: ReactNode }) {
  const { isAdminLoggedIn, isLoading } = useAdminAuth();
  const location = useLocation();
  if (isLoading) return <LoadingScreen />;
  if (!isAdminLoggedIn) return <Navigate to="/admin/login" state={{ from: location.pathname }} replace />;
  return <>{children}</>;
}

// ── Prevent admin from seeing user auth pages ─────────────────────────────────
export function GuestOnlyRoute({ children }: { children: ReactNode }) {
  const { isAuthenticated, isLoading } = useAuth();
  if (isLoading) return null;
  if (isAuthenticated) return <Navigate to="/dashboard" replace />;
  return <>{children}</>;
}

// ── Prevent logged-in admin from seeing admin login ───────────────────────────
export function AdminGuestRoute({ children }: { children: ReactNode }) {
  const { isAdminLoggedIn, isLoading } = useAdminAuth();
  if (isLoading) return null;
  if (isAdminLoggedIn) return <Navigate to="/admin/portal" replace />;
  return <>{children}</>;
}