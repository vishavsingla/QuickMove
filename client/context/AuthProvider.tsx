"use client";

import {
  createContext,
  useContext,
  useEffect,
  useState,
  ReactNode,
} from "react";
import { api, tokenStore } from "@/lib/api";
import type { AuthResult, Role, User } from "@/lib/types";

interface AuthState {
  user: User | null;
  role: Role | null;
  driverId: string | null;
  loading: boolean;
  setSession: (result: AuthResult) => void;
  logout: () => void;
}

const AuthContext = createContext<AuthState | undefined>(undefined);

const DRIVER_KEY = "quickmove_driver_id";

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [role, setRole] = useState<Role | null>(null);
  const [driverId, setDriverId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const token = tokenStore.get();
    if (!token) {
      setLoading(false);
      return;
    }
    api
      .me()
      .then((res) => {
        setUser(res.user);
        setRole(res.role as Role);
        setDriverId(
          res.user?.driver?.id ?? localStorage.getItem(DRIVER_KEY) ?? null
        );
      })
      .catch(() => {
        tokenStore.clear();
      })
      .finally(() => setLoading(false));
  }, []);

  const setSession = (result: AuthResult) => {
    tokenStore.set(result.token);
    setUser(result.user);
    setRole(result.role);
    const dId = result.driverId ?? null;
    setDriverId(dId);
    if (dId) localStorage.setItem(DRIVER_KEY, dId);
  };

  const logout = () => {
    tokenStore.clear();
    localStorage.removeItem(DRIVER_KEY);
    setUser(null);
    setRole(null);
    setDriverId(null);
  };

  return (
    <AuthContext.Provider
      value={{ user, role, driverId, loading, setSession, logout }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within AuthProvider");
  return ctx;
}
