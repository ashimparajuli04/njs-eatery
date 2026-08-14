"use client";

import { createContext, useCallback, useContext, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import api from "@/lib/api";
import type { User } from "@/types/table";

type AuthStatus = "loading" | "authenticated" | "unauthenticated" | "error";

type AuthContextType = {
  user: User | null;
  loading: boolean;
  status: AuthStatus;
  retry: () => void;
};

const AuthContext = createContext<AuthContextType>({
  user: null,
  loading: true,
  status: "loading",
  retry: () => {},
});

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const [user, setUser] = useState<User | null>(null);
  const [status, setStatus] = useState<AuthStatus>(() => {
    if (typeof window === "undefined") return "loading";
    return localStorage.getItem("access_token") ? "loading" : "unauthenticated";
  });
  const [attempt, setAttempt] = useState(0);

  useEffect(() => {
    const token = localStorage.getItem("access_token");
    if (!token) return;

    let cancelled = false;
    api
      .get<User>("/users/me")
      .then((res) => {
        if (cancelled) return;
        setUser(res.data);
        setStatus("authenticated");
      })
      .catch((error) => {
        if (cancelled) return;
        if (error.response?.status === 401) {
          localStorage.removeItem("access_token");
          setUser(null);
          setStatus("unauthenticated");
        } else {
          // Network failure or 5xx: don't redirect — the protected gate shows a retry screen.
          setStatus("error");
        }
      });

    return () => {
      cancelled = true;
    };
  }, [attempt]);

  useEffect(() => {
    if (
      status === "unauthenticated" &&
      window.location.pathname !== "/login"
    ) {
      router.replace("/login");
    }
  }, [status, router]);

  const retry = useCallback(() => {
    setStatus("loading");
    setAttempt((a) => a + 1);
  }, []);

  return (
    <AuthContext.Provider value={{ user, loading: status === "loading", status, retry }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  return useContext(AuthContext);
}
