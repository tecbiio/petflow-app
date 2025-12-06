import { ReactNode, createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";
import { api } from "../api/client";

type AuthStatus = "loading" | "authenticated" | "unauthenticated";
type User = { email: string; role: string; tenant: string; dbUrl?: string };

type AuthContextValue = {
  status: AuthStatus;
  user: User | null;
  login: (email: string, password: string, tenant?: string) => Promise<void>;
  logout: () => Promise<void>;
};

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [status, setStatus] = useState<AuthStatus>("loading");
  const [user, setUser] = useState<User | null>(null);

  useEffect(() => {
    api
      .session()
      .then((res) => {
        setUser(res.user);
        setStatus("authenticated");
      })
      .catch(() => {
        setUser(null);
        setStatus("unauthenticated");
      });
  }, []);

  const login = useCallback(async (email: string, password: string, tenant?: string) => {
    const res = await api.login(email, password, tenant);
    setUser(res.user);
    setStatus("authenticated");
  }, []);

  const logout = useCallback(async () => {
    try {
      await api.logout();
    } finally {
      setUser(null);
      setStatus("unauthenticated");
    }
  }, []);

  const value = useMemo(
    () => ({
      status,
      user,
      login,
      logout,
    }),
    [login, logout, status, user],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) {
    throw new Error("useAuth doit être utilisé dans un AuthProvider");
  }
  return ctx;
}
