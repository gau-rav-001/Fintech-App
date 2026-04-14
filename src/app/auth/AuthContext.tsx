// src/app/auth/AuthContext.tsx
// Fix #9: isAuthenticated is now split into isUserAuthenticated and isAdminAuthenticated.
//         A logged-in admin no longer makes isAuthenticated true for user-only guards.
// Fix #5: Sessions are restored by calling /auth/me (cookie-based), not from localStorage.

import {
  createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode,
} from "react";
import {
  type AuthUser,
  restoreSession, restoreAdminSession,
  logout as serviceLogout, adminLogout as serviceAdminLogout,
} from "./authService";

interface AuthContextValue {
  // User session
  user:                 AuthUser | null;
  isUserAuthenticated:  boolean;

  // Admin session
  adminUser:            AuthUser | null;
  isAdminAuthenticated: boolean;

  // Shared
  isLoading:            boolean;
  role:                 "user" | "admin" | null;

  // Actions
  setUser:      (user: AuthUser | null) => void;
  setAdminUser: (user: AuthUser | null) => void;
  logout:       () => Promise<void>;
  adminLogout:  () => Promise<void>;
  updateUser:   (patch: Partial<AuthUser>) => void;
}

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user,      setUserState]      = useState<AuthUser | null>(null);
  const [adminUser, setAdminUserState] = useState<AuthUser | null>(null);
  const [isLoading, setIsLoading]      = useState(true);

  // Fix #5: restore sessions by hitting /auth/me (relies on HttpOnly cookie)
  useEffect(() => {
    Promise.all([restoreSession(), restoreAdminSession()])
      .then(([u, a]) => {
        setUserState(u);
        setAdminUserState(a);
      })
      .catch(() => { /* network down — leave as null */ })
      .finally(() => setIsLoading(false));
  }, []);

  const setUser = useCallback((u: AuthUser | null) => setUserState(u), []);
  const setAdminUser = useCallback((u: AuthUser | null) => setAdminUserState(u), []);

  const logout = useCallback(async () => {
    try { await serviceLogout(); } catch {}
    setUserState(null);
  }, []);

  const adminLogout = useCallback(async () => {
    try { await serviceAdminLogout(); } catch {}
    setAdminUserState(null);
  }, []);

  const updateUser = useCallback((patch: Partial<AuthUser>) => {
    setUserState((prev) => prev ? { ...prev, ...patch } : prev);
  }, []);

  const value = useMemo<AuthContextValue>(() => ({
    user,
    isUserAuthenticated:  !!user,

    adminUser,
    isAdminAuthenticated: !!adminUser,

    // Fix #9: role derived from the correct session, not either
    role: user?.role ?? adminUser?.role ?? null,

    isLoading,
    setUser,
    setAdminUser,
    logout,
    adminLogout,
    updateUser,
  }), [user, adminUser, isLoading, setUser, setAdminUser, logout, adminLogout, updateUser]);

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used inside <AuthProvider>");
  return ctx;
}

// Convenience hooks
export function useUser() {
  const { user, isUserAuthenticated, isLoading } = useAuth();
  return { user, isAuthenticated: isUserAuthenticated, isLoading };
}

export function useAdminAuth() {
  const { adminUser, isAdminAuthenticated, isLoading, setAdminUser, adminLogout } = useAuth();
  return {
    adminUser,
    isAdminLoggedIn: isAdminAuthenticated,
    isLoading,
    setAdminUser,
    adminLogout,
  };
}