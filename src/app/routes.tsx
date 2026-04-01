import {
  createBrowserRouter,
  Outlet,
  useLocation,
} from "react-router";
import { useEffect } from "react";
import { Home } from "./pages/Home";
import { Login } from "./pages/Login";
import { Signup } from "./pages/Signup";
import { Dashboard } from "./pages/Dashboard";
import { Services } from "./pages/Services";
import { SIPCalculator } from "./pages/SIPCalculator";
import { LumpsumCalculator } from "./pages/LumpsumCalculator";
import { FinancialPlanner } from "./pages/FinancialPlanner";
import { Webinars } from "./pages/Webinars";
import { Admin } from "./pages/Admin";
import { Insurance } from "./pages/Insurance";
import { NotFound } from "./pages/NotFound";

function ScrollToTop() {
  const { pathname } = useLocation();

  useEffect(() => {
    window.scrollTo(0, 0);
  }, [pathname]);

  return null;
}

function Layout() {
  return (
    <>
      <ScrollToTop />
      <Outlet />
    </>
  );
}

export const router = createBrowserRouter([
  {
    element: <Layout />,
    children: [
      {
        path: "/",
        Component: Home,
      },
      {
        path: "/login",
        Component: Login,
      },
      {
        path: "/signup",
        Component: Signup,
      },
      {
        path: "/dashboard",
        Component: Dashboard,
      },
      {
        path: "/services",
        Component: Services,
      },
      {
        path: "/calculator/sip",
        Component: SIPCalculator,
      },
      {
        path: "/calculator/lumpsum",
        Component: LumpsumCalculator,
      },
      {
        path: "/planner",
        Component: FinancialPlanner,
      },
      {
        path: "/webinars",
        Component: Webinars,
      },
      {
        path: "/admin",
        Component: Admin,
      },
      {
        path: "/insurance",
        Component: Insurance,
      },
      {
        path: "*",
        Component: NotFound,
      },
    ],
  },
]);