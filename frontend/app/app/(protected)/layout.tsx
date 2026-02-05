"use client";

import { ReactNode } from "react";
import { AuthProvider, useAuth } from "@/providers/auth-provider";
import { SidebarProvider } from "@/components/ui/sidebar";

function ProtectedGate({ children }: { children: ReactNode }) {
  const { user, loading } = useAuth();

  if (loading) return <div className="h-screen flex items-center justify-center">Loading...</div>;
  if (!user) return null; // redirect is already handled inside AuthProvider

  return <>{children}</>;
}

export default function ProtectedLayout({ children }: { children: ReactNode }) {
  return (
    <AuthProvider>
      <ProtectedGate>
        <SidebarProvider>
          {children}
        </SidebarProvider>
      </ProtectedGate>
    </AuthProvider>
  );
}
