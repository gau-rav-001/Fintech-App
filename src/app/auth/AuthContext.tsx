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
  setSession:  (session: AuthSession, remember: boolean) => void;
  setAdminSession: (session: AuthSession, remember: boolean) => void;
  logout:          () => void;
  adminLogout:     () => void;
  updateUser:      (patch: Partial<AuthUser>) => void;
}

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [session,       setSessionState]  = useState<AuthSession | null>(null);
  const [adminSession,  setAdminState]    = useState<AuthSession | null>(null);
  const [isLoading,     setIsLoading]     = useState(true);

  useEffect(() => {
    setSessionState(getStoredSession());
    setAdminState(getStoredAdminSession());
    setIsLoading(false);
  }, []);

  const setSession = useCallback((s: AuthSession, remember: boolean) => {
    storeSession(s, remember); setSessionState(s);
  }, []);

  const setAdminSession = useCallback((s: AuthSession, remember: boolean) => {
    storeAdminSession(s, remember); setAdminState(s);
  }, []);

  const logout = useCallback(() => { serviceLogout(); setSessionState(null); }, []);
  const adminLogout = useCallback(() => { serviceAdminLogout(); setAdminState(null); }, []);

  const updateUser = useCallback((patch: Partial<AuthUser>) => {
    setSessionState((prev) => {
      if (!prev) return prev;
      const updated = { ...prev, user: { ...prev.user, ...patch } };
      storeSession(updated, !!localStorage.getItem("sf_session"));
      return updated;
    });
  }, []);

  // Active session = admin takes priority when on admin routes
  const activeSession = adminSession ?? session;

  const value = useMemo<AuthContextValue>(() => ({
    user:            activeSession?.user ?? null,
    session:         activeSession,
    isAuthenticated: !!activeSession,
    isAdmin:         activeSession?.user.role === "admin",
    role:            activeSession?.user.role ?? null,
    isLoading,
    setSession,
    setAdminSession,
    logout,
    adminLogout,
    updateUser,
    // Expose both for components that need them
    _userSession:    session,
    _adminSession:   adminSession,
  } as AuthContextValue), [activeSession, session, adminSession, isLoading, setSession, setAdminSession, logout, adminLogout, updateUser]);

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used inside <AuthProvider>");
  return ctx;
}

// Convenience hooks
export function useUser() {
  const { user, isAuthenticated, isLoading } = useAuth();
  return { user, isAuthenticated, isLoading };
}
export function useAdminAuth() {
  const ctx = useAuth();
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const adminSession = (ctx as any)._adminSession as AuthSession | null;
  return {
    adminUser:      adminSession?.user ?? null,
    isAdminLoggedIn: !!adminSession,
    isLoading:       ctx.isLoading,
    setAdminSession: ctx.setAdminSession,
    adminLogout:     ctx.adminLogout,
  };
}