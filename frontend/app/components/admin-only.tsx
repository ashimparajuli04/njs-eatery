"use client";

import { useAuth } from "@/providers/auth-provider";

export function AdminOnly({ children }: { children: React.ReactNode }) {
  const { user } = useAuth();

  if (user?.role !== "admin") return null;

  return <>{children}</>;
}
