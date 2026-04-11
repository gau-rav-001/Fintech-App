// src/app/auth/AuthContext.tsx
import {
  createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode,
} from "react";
import {
  type AuthUser, type AuthSession, type UserRole,
  getStoredSession, getStoredAdminSession,
  logout as serviceLogout, adminLogout as serviceAdminLogout,
  storeSession, storeAdminSession,
} from "./authService";

interface AuthContextValue {
  user:            AuthUser | null;
  session:         AuthSession | null;
  isAuthenticated: boolean;
  isAdmin:         boolean;
  role:            UserRole | null;
  isLoading:       boolean;
  setSession:      (session: AuthSession, remember: boolean) => void;
  setAdminSession: (session: AuthSession, remember: boolean) => void;
  logout:          () => void;
  adminLogout:     () => void;
  updateUser:      (patch: Partial<AuthUser>) => void;
  // Exposed for components that specifically need one or the other
  userSession:     AuthSession | null;
  adminSession:    AuthSession | null;
}

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [userSessionState,  setUserSessionState]  = useState<AuthSession | null>(null);
  const [adminSessionState, setAdminSessionState] = useState<AuthSession | null>(null);
  const [isLoading,         setIsLoading]         = useState(true);

  useEffect(() => {
    setUserSessionState(getStoredSession());
    setAdminSessionState(getStoredAdminSession());
    setIsLoading(false);
  }, []);

  const setSession = useCallback((s: AuthSession, remember: boolean) => {
    storeSession(s, remember);
    setUserSessionState(s);
  }, []);

  const setAdminSession = useCallback((s: AuthSession, remember: boolean) => {
    storeAdminSession(s, remember);
    setAdminSessionState(s);
  }, []);

  const logout = useCallback(async () => {
  await serviceLogout();
  setUserSessionState(null);
}, []);

  const adminLogout = useCallback(() => {
    serviceAdminLogout();
    setAdminSessionState(null);
  }, []);

  const updateUser = useCallback((patch: Partial<AuthUser>) => {
    setUserSessionState((prev) => {
      if (!prev) return prev;
      const updated = { ...prev, user: { ...prev.user, ...patch } };
      storeSession(updated, !!localStorage.getItem("sf_session"));
      return updated;
    });
  }, []);

  // ✅ FIX: admin session is ONLY used when the user explicitly logged in as admin.
  //         Regular user routes always use the user session — no bleed-over.
  //         Components that need admin context use `adminSession` directly.
  const value = useMemo<AuthContextValue>(() => ({
    // Default context always reflects the USER session
    user:            userSessionState?.user ?? null,
    session:         userSessionState,
    isAuthenticated: !!userSessionState || !!adminSessionState,
    isAdmin:         adminSessionState?.user?.role === "admin",
    role:            userSessionState?.user?.role ?? adminSessionState?.user?.role ?? null,
    isLoading,
    setSession,
    setAdminSession,
    logout,
    adminLogout,
    updateUser,
    // Explicit accessors — use these in admin-specific components
    userSession:  userSessionState,
    adminSession: adminSessionState,
  }), [
    userSessionState, adminSessionState, isLoading,
    setSession, setAdminSession, logout, adminLogout, updateUser,
  ]);

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used inside <AuthProvider>");
  return ctx;
}

// Convenience hook for regular user pages
export function useUser() {
  const { user, isAuthenticated, isLoading } = useAuth();
  return { user, isAuthenticated, isLoading };
}

// ✅ FIX: useAdminAuth now uses the typed `adminSession` field — no more `as any` cast
export function useAdminAuth() {
  const { adminSession, isLoading, setAdminSession, adminLogout } = useAuth();
  return {
    adminUser:       adminSession?.user ?? null,
    isAdminLoggedIn: !!adminSession,
    isLoading,
    setAdminSession,
    adminLogout,
  };
}