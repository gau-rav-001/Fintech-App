// Place at:  src/app/pages/AuthCallback.tsx
// Add route: { path: "/auth/callback", Component: AuthCallback }
// This handles the redirect from Google OAuth.

import { useEffect } from "react";
import { useNavigate, useSearchParams } from "react-router";
import { useAuth } from "../auth/AuthContext";
import { tokenStore, authAPI } from "../services/api";

export function AuthCallback() {
  const [params] = useSearchParams();
  const navigate = useNavigate();
  const { setSession } = useAuth();

  useEffect(() => {
    const token  = params.get("token");
    const status = params.get("status"); // "dashboard" | "onboarding"
    const error  = params.get("error");

    if (error || !token) {
      navigate("/login?error=google_failed", { replace: true });
      return;
    }

    tokenStore.set(token, true);

    (authAPI.me() as any).then((res: any) => {
      const user = res.data?.user;
      if (!user) throw new Error("No user");

      setSession(
        {
          user: { ...user, id: user.id },
          token: {
            accessToken: token,
            expiresAt:   Date.now() + 30 * 24 * 60 * 60 * 1000,
            role:        "user",
          },
        },
        true
      );

      navigate(status === "dashboard" ? "/dashboard" : "/onboarding", { replace: true });
    }).catch(() => {
      tokenStore.clear();
      navigate("/login?error=session_failed", { replace: true });
    });
  }, []);

  return (
    <div className="min-h-screen bg-[#F7F9FB] flex items-center justify-center">
      <div className="flex flex-col items-center gap-4">
        <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-[#1A5F3D] to-[#3FAF7D] flex items-center justify-center">
          <span className="text-white font-bold text-xl">SF</span>
        </div>
        <p className="text-sm text-gray-500">Completing sign-in…</p>
        <div className="flex gap-1.5">
          {[0,1,2].map(i => (
            <div key={i}
              className="w-2 h-2 rounded-full bg-[#1A5F3D] animate-bounce"
              style={{ animationDelay: `${i * 0.15}s` }}
            />
          ))}
        </div>
      </div>
    </div>
  );
}
