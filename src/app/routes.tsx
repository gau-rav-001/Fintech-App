import { createBrowserRouter, Navigate, Outlet, useLocation } from "react-router";
import { useEffect } from "react";
import { Home }              from "./pages/Home";
import { Login }             from "./pages/Login";
import { Signup }            from "./pages/Signup";
import { Dashboard }         from "./pages/Dashboard";
import { Services }          from "./pages/Services";
import { SIPCalculator }     from "./pages/SIPCalculator";
import { LumpsumCalculator } from "./pages/LumpsumCalculator";
import { FinancialPlanner }  from "./pages/FinancialPlanner";
import { Webinars }          from "./pages/Webinars";
import { Insurance }         from "./pages/Insurance";
import { NotFound }          from "./pages/NotFound";
import { AdminLogin }        from "./pages/AdminLogin";
import { AdminPortal }       from "./pages/AdminPortal";
import { AdvisorLogin }       from "./pages/AdvisorLogin";
import { AdvisorRegister }    from "./pages/AdvisorRegister";
import { AdvisorInviteClaim } from "./pages/AdvisorInviteClaim";
import { AdvisorPortal }      from "./pages/AdvisorPortal";
import { Onboarding }        from "./pages/Onboarding";
import { Settings }          from "./pages/Settings";
import { AuthCallback } from "./pages/AuthCallback";
import { ResetPassword } from "./pages/ResetPassword";
import AIChat from "./pages/AIChat";
import {
  ProtectedRoute, OnboardingRoute, AdminRoute,
  GuestOnlyRoute, AdminGuestRoute,
} from "./auth/ProtectedRoute";
import { AdvisorRoute, AdvisorGuestRoute } from "./auth/AdvisorRoute";

// Import mockData to trigger auto-seed on app load
import "./data/mockData";

function ScrollToTop() {
  const { pathname } = useLocation();
  useEffect(() => { window.scrollTo(0, 0); }, [pathname]);
  return null;
}
function Layout() {
  return (<><ScrollToTop /><Outlet /></>);
}

export const router = createBrowserRouter([
  {
    element: <Layout />,
    children: [
      // ── Public ────────────────────────────────────────────────────────────
      { path: "/",          Component: Home },
      { path: "/services",  Component: Services },
      { path: "/webinars",  Component: Webinars },
      { path: "/insurance", Component: Insurance },
      { path: "/reset-password", Component: ResetPassword },
      { path: "/advisor/invite", Component: AdvisorInviteClaim },

      // ── User auth (guest only) ─────────────────────────────────────────────
      { path: "/login",  element: <GuestOnlyRoute><Login /></GuestOnlyRoute> },
      { path: "/signup", element: <GuestOnlyRoute><Signup /></GuestOnlyRoute> },

      // ── Admin auth (guest only) ────────────────────────────────────────────
      { path: "/admin/login",  element: <AdminGuestRoute><AdminLogin /></AdminGuestRoute> },

      // ── Advisor auth (guest only) ──────────────────────────────────────────
      { path: "/advisor/login",    element: <AdvisorGuestRoute><AdvisorLogin /></AdvisorGuestRoute> },
      { path: "/advisor/register", element: <AdvisorGuestRoute><AdvisorRegister /></AdvisorGuestRoute> },

      // ── Advisor portal (advisor role required) ────────────────────────────
      { path: "/advisor/portal",   element: <AdvisorRoute><AdvisorPortal /></AdvisorRoute> },
      { path: "/advisor",          element: <Navigate to="/advisor/portal" replace /> },

      // ── Admin portal (admin role required) ────────────────────────────────
      { path: "/admin/portal", element: <AdminRoute><AdminPortal /></AdminRoute> },

      // ── Legacy /admin redirect to portal ──────────────────────────────────
      { path: "/admin", element: <AdminRoute><AdminPortal /></AdminRoute> },

      // ── Onboarding (logged in, not yet onboarded) ──────────────────────────
      { path: "/onboarding", element: <OnboardingRoute><Onboarding /></OnboardingRoute> },
      
      // Add this route inside the children array
      { path: "/auth/callback", Component: AuthCallback },

      // ── Protected user routes (checks onboarding first) ───────────────────
      { path: "/dashboard",          element: <ProtectedRoute><Dashboard /></ProtectedRoute> },
      { path: "/calculator/sip",     element: <ProtectedRoute><SIPCalculator /></ProtectedRoute> },
      { path: "/calculator/lumpsum", element: <ProtectedRoute><LumpsumCalculator /></ProtectedRoute> },
      { path: "/planner",            element: <ProtectedRoute><FinancialPlanner /></ProtectedRoute> },
      { path: "/settings",           element: <ProtectedRoute><Settings /></ProtectedRoute> },
      
      // ── AI Wealth Assistant – single unified chat ─────────────────────────
      { path: "/ai/chat", element: <ProtectedRoute><AIChat /></ProtectedRoute> },
      // Legacy AI sub-routes redirect to unified chat
      { path: "/ai/*",   element: <ProtectedRoute><AIChat /></ProtectedRoute> },

      // ── 404 ──────────────────────────────────────────────────────────────
      { path: "*", Component: NotFound },
    ],
  },
]);