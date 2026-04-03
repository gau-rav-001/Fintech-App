import { createBrowserRouter, Outlet, useLocation } from "react-router";
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
import {
  ProtectedRoute, AdminRoute,
  GuestOnlyRoute, AdminGuestRoute,
} from "./auth/ProtectedRoute";

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

      // ── User auth (guest only) ─────────────────────────────────────────────
      { path: "/login",  element: <GuestOnlyRoute><Login /></GuestOnlyRoute> },
      { path: "/signup", element: <GuestOnlyRoute><Signup /></GuestOnlyRoute> },

      // ── Admin auth (guest only) ────────────────────────────────────────────
      { path: "/admin/login",  element: <AdminGuestRoute><AdminLogin /></AdminGuestRoute> },

      // ── Admin portal (admin role required) ────────────────────────────────
      { path: "/admin/portal", element: <AdminRoute><AdminPortal /></AdminRoute> },

      // ── Legacy /admin redirect to portal ──────────────────────────────────
      { path: "/admin", element: <AdminRoute><AdminPortal /></AdminRoute> },

      // ── Protected user routes ──────────────────────────────────────────────
      { path: "/dashboard",          element: <ProtectedRoute><Dashboard /></ProtectedRoute> },
      { path: "/calculator/sip",     element: <ProtectedRoute><SIPCalculator /></ProtectedRoute> },
      { path: "/calculator/lumpsum", element: <ProtectedRoute><LumpsumCalculator /></ProtectedRoute> },
      { path: "/planner",            element: <ProtectedRoute><FinancialPlanner /></ProtectedRoute> },

      // ── 404 ──────────────────────────────────────────────────────────────
      { path: "*", Component: NotFound },
    ],
  },
]);