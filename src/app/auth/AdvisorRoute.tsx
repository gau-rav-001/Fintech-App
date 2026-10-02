// src/app/auth/AdvisorRoute.tsx
// ── Isolated Advisor Route Guards ─────────────────────────────────────────────
// Strictly evaluates AdvisorAuthContext (sf_advisor_token).
// Completely independent of User and Admin sessions.

import { type ReactNode } from "react";
import { Navigate, Outlet, useLocation } from "react-router";
import { useAdvisorAuth } from "./AdvisorAuthContext";

// ── Shared Loading Screen (Emerald Design System) ────────────────────────────
function AdvisorLoadingScreen() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-[#F7F9FB]">
      <div className="flex flex-col items-center gap-4">
        <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-[#1A5F3D] to-[#3FAF7D] flex items-center justify-center shadow-md">
          <span className="text-white font-bold text-lg tracking-wider">ADV</span>
        </div>
        <div className="flex gap-1.5">
          {[0, 1, 2].map((i) => (
            <div
              key={i}
              className="w-2 h-2 rounded-full bg-[#1A5F3D] animate-bounce"
              style={{ animationDelay: `${i * 0.15}s` }}
            />
          ))}
        </div>
        <p className="text-xs text-slate-500 font-medium tracking-wide">
          Verifying Advisor Session...
        </p>
      </div>
    </div>
  );
}

// ── Advisor Protected Route ──────────────────────────────────────────────────
// Allows access only if a valid, approved advisor session is active
export function AdvisorRoute({
  children,
  redirectTo = "/login?role=advisor",
}: {
  children?: ReactNode;
  redirectTo?: string;
}) {
  const { isAdvisorAuthenticated, isLoading } = useAdvisorAuth();
  const location = useLocation();

  if (isLoading) {
    return <AdvisorLoadingScreen />;
  }

  if (!isAdvisorAuthenticated) {
    return <Navigate to={redirectTo} state={{ from: location.pathname }} replace />;
  }

  return children ? <>{children}</> : <Outlet />;
}

// ── Advisor Guest Route ──────────────────────────────────────────────────────
// Redirects already-authenticated advisors away from login/registration pages
export function AdvisorGuestRoute({
  children,
  redirectTo = "/advisor/portal",
}: {
  children?: ReactNode;
  redirectTo?: string;
}) {
  const { isAdvisorAuthenticated, isLoading } = useAdvisorAuth();

  if (isLoading) {
    return null;
  }

  if (isAdvisorAuthenticated) {
    return <Navigate to={redirectTo} replace />;
  }

  return children ? <>{children}</> : <Outlet />;
}
