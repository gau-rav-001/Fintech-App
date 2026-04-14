// src/app/pages/AuthCallback.tsx
// Google OAuth lands here after the backend sets the HttpOnly cookie and redirects.
// We just call /auth/me (cookie is sent automatically) to get the user profile.

import { useEffect } from "react";
import { useNavigate, useSearchParams } from "react-router";
import { useAuth } from "../auth/AuthContext";
import { fetchUserAfterGoogleAuth } from "../auth/authService";

export function AuthCallback() {
  const [params]    = useSearchParams();
  const navigate    = useNavigate();
  const { setUser } = useAuth();

  useEffect(() => {
    const status = params.get("status"); // "dashboard" | "onboarding"
    const error  = params.get("error");

    if (error) {
      navigate("/login?error=google_failed", { replace: true });
      return;
    }

    // Cookie is already set by the backend — just fetch the user profile
    fetchUserAfterGoogleAuth()
      .then((user) => {
        if (!user) throw new Error("No user");
        setUser(user);
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
            <div key={i} className="w-2 h-2 rounded-full bg-[#1A5F3D] animate-bounce"
              style={{ animationDelay: `${i * 0.15}s` }} />
          ))}
        </div>
      </div>
    </div>
  );
}