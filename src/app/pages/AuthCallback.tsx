// Place at:  src/app/pages/AuthCallback.tsx
// Add route: { path: "/auth/callback", Component: AuthCallback }
// This handles the redirect from Google OAuth.

import { useEffect } from "react";
import { useNavigate, useSearchParams } from "react-router";
import { useAuth } from "../auth/AuthContext";
import { authAPI } from "../services/api";
import { buildSessionFromToken } from "../auth/authService";

export function AuthCallback() {
  const [params] = useSearchParams();
  const navigate = useNavigate();
  const { setSession } = useAuth();

  useEffect(() => {
    // FIX #1: Backend sends ?code=…&status=… — NOT ?token=…
    const code   = params.get("code");
    const status = params.get("status"); // "dashboard" | "onboarding"
    const error  = params.get("error");

    if (error || !code) {
      navigate("/login?error=google_failed", { replace: true });
      return;
    }

    // FIX #2: Exchange the one-time code for a real JWT via the backend endpoint.
    //         Previously the code value was incorrectly used directly as a Bearer token.
    (authAPI.exchangeCode(code) as any)
      .then(async (exchangeRes: any) => {
        const token = exchangeRes.data?.token;
        if (!token) throw new Error("No token in exchange response");

        // FIX #3: Use the real JWT expiry from the token instead of a hardcoded 30-day value.
        const session = await buildSessionFromToken(token);
        setSession(session, false);

        navigate(status === "dashboard" ? "/dashboard" : "/onboarding", { replace: true });
      })
      .catch(() => {
        navigate("/login?error=session_failed", { replace: true });
      });
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  return (
    <div className="min-h-screen bg-[#F7F9FB] flex items-center justify-center">
      <div className="flex flex-col items-center gap-4">
        <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-[#1A5F3D] to-[#3FAF7D] flex items-center justify-center">
          <span className="text-white font-bold text-xl">SF</span>
        </div>
        <p className="text-sm text-gray-500">Completing sign-in…</p>
        <div className="flex gap-1.5">
          {[0, 1, 2].map(i => (
            <div
              key={i}
              className="w-2 h-2 rounded-full bg-[#1A5F3D] animate-bounce"
              style={{ animationDelay: `${i * 0.15}s` }}
            />
          ))}
        </div>
      </div>
    </div>
  );
}
