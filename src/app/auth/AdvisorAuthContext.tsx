// src/app/auth/AdvisorAuthContext.tsx
// ── Isolated Advisor Authentication Context ──────────────────────────────────
// Actor: ADVISOR (Session cookie: sf_advisor_token)
// Completely decoupled from User (sf_token) and Admin (sf_admin_token).

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import {
  advisorAuthAPI,
  type AdvisorProfile,
  type AdvisorRegistrationData,
} from "../services/api";

export interface AdvisorAuthContextValue {
  // Advisor session state
  advisor: AdvisorProfile | null;
  isAdvisorAuthenticated: boolean;
  isLoading: boolean;

  // Authentication actions
  loginWithCredentials: (
    email: string,
    password: string
  ) => Promise<{ email: string; requiresOTP: boolean }>;
  verifyLoginOTP: (
    email: string,
    otp: string
  ) => Promise<{ advisor: AdvisorProfile; isProfileComplete: boolean }>;
  registerAdvisor: (
    data: AdvisorRegistrationData
  ) => Promise<{
    advisorId: string;
    email: string;
    approvalStatus: string;
    isEmailVerified: boolean;
  }>;
  verifyRegistrationOTP: (
    email: string,
    otp: string
  ) => Promise<{
    advisorId: string;
    email: string;
    isEmailVerified: boolean;
    approvalStatus: string;
  }>;
  resendRegistrationOTP: (email: string) => Promise<Record<string, never>>;
  advisorLogout: () => Promise<void>;
  refreshAdvisorSession: () => Promise<AdvisorProfile | null>;
  setAdvisor: (advisor: AdvisorProfile | null) => void;
}

const AdvisorAuthContext = createContext<AdvisorAuthContextValue | null>(null);

export function AdvisorAuthProvider({ children }: { children: ReactNode }) {
  const [advisor, setAdvisorState] = useState<AdvisorProfile | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);

  // ── Session Restoration on Mount ──────────────────────────────────────────
  // Calls GET /api/advisor/auth/me (relies on HttpOnly sf_advisor_token cookie)
  useEffect(() => {
    let isMounted = true;

    async function restoreAdvisorSession() {
      try {
        const res = await advisorAuthAPI.me();
        if (isMounted && res?.data?.advisor) {
          setAdvisorState(res.data.advisor);
        } else if (isMounted) {
          setAdvisorState(null);
        }
      } catch {
        // Expected 401 when no advisor cookie is present or token is expired
        if (isMounted) {
          setAdvisorState(null);
        }
      } finally {
        if (isMounted) {
          setIsLoading(false);
        }
      }
    }

    restoreAdvisorSession();

    return () => {
      isMounted = false;
    };
  }, []);

  // ── Actions ───────────────────────────────────────────────────────────────

  const setAdvisor = useCallback((adv: AdvisorProfile | null) => {
    setAdvisorState(adv);
  }, []);

  // Step 1: Submit credentials -> Server issues 2FA OTP to advisor's email
  const loginWithCredentials = useCallback(
    async (email: string, password: string) => {
      const res = await advisorAuthAPI.login(email, password);
      // Non-authenticated state preserved: 2FA OTP verification is required
      return res.data;
    },
    []
  );

  // Step 2: Submit 2FA OTP -> Server sets sf_advisor_token cookie -> Hydrate profile
  const verifyLoginOTP = useCallback(
    async (email: string, otp: string) => {
      const res = await advisorAuthAPI.verifyLoginOTP(email, otp);
      if (res?.data?.advisor) {
        setAdvisorState(res.data.advisor);
      } else {
        // Fallback: verify session via /me
        const meRes = await advisorAuthAPI.me();
        if (meRes?.data?.advisor) {
          setAdvisorState(meRes.data.advisor);
        }
      }
      return res.data;
    },
    []
  );

  // Registration: Creates pending advisor account
  const registerAdvisor = useCallback(
    async (data: AdvisorRegistrationData) => {
      const res = await advisorAuthAPI.registerAdvisor(data);
      // Registration never creates an authenticated session
      return res.data;
    },
    []
  );

  // Registration OTP: Marks email verified (remains pending admin review)
  const verifyRegistrationOTP = useCallback(
    async (email: string, otp: string) => {
      const res = await advisorAuthAPI.verifyRegistrationOTP(email, otp);
      return res.data;
    },
    []
  );

  // Resend Registration OTP
  const resendRegistrationOTP = useCallback(async (email: string) => {
    const res = await advisorAuthAPI.resendRegistrationOTP(email);
    return res.data;
  }, []);

  // Logout: Revoke session on backend + immediately clear frontend state
  const advisorLogout = useCallback(async () => {
    try {
      await advisorAuthAPI.logout();
    } catch {
      // Regardless of server response, immediately clear client state
    } finally {
      setAdvisorState(null);
    }
  }, []);

  // Manual Session Refresh: Fetch live database-backed advisor profile
  const refreshAdvisorSession = useCallback(async () => {
    try {
      const res = await advisorAuthAPI.me();
      if (res?.data?.advisor) {
        setAdvisorState(res.data.advisor);
        return res.data.advisor;
      }
      setAdvisorState(null);
      return null;
    } catch {
      setAdvisorState(null);
      return null;
    }
  }, []);

  const value = useMemo<AdvisorAuthContextValue>(
    () => ({
      advisor,
      isAdvisorAuthenticated: !!advisor,
      isLoading,
      loginWithCredentials,
      verifyLoginOTP,
      registerAdvisor,
      verifyRegistrationOTP,
      resendRegistrationOTP,
      advisorLogout,
      refreshAdvisorSession,
      setAdvisor,
    }),
    [
      advisor,
      isLoading,
      loginWithCredentials,
      verifyLoginOTP,
      registerAdvisor,
      verifyRegistrationOTP,
      resendRegistrationOTP,
      advisorLogout,
      refreshAdvisorSession,
      setAdvisor,
    ]
  );

  return (
    <AdvisorAuthContext.Provider value={value}>
      {children}
    </AdvisorAuthContext.Provider>
  );
}

export function useAdvisorAuth(): AdvisorAuthContextValue {
  const ctx = useContext(AdvisorAuthContext);
  if (!ctx) {
    throw new Error("useAdvisorAuth must be used inside <AdvisorAuthProvider>");
  }
  return ctx;
}
