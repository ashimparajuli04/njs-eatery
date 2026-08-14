"use client";

import { ReactNode } from "react";
import { AuthProvider, useAuth } from "@/providers/auth-provider";
import { SidebarProvider } from "@/components/ui/sidebar";
import { LoadingView } from "@/components/loading";
import { ErrorState } from "@/components/error-state";

function ProtectedGate({ children }: { children: ReactNode }) {
  const { user, loading, status, retry } = useAuth();

  if (loading) {
    return <LoadingView label="NJ's Café & Restaurant" />;
  }
  if (status === "error") {
    return (
      <ErrorState
        title="Cannot reach the server"
        message="The app couldn't connect to the backend. Check your connection and try again."
        onRetry={retry}
      />
    );
  }
  if (!user) return null; // redirect is already handled inside AuthProvider

  return <>{children}</>;
}

export default function ProtectedLayout({ children }: { children: ReactNode }) {
  return (
    <AuthProvider>
      <ProtectedGate>
        <SidebarProvider>{children}</SidebarProvider>
      </ProtectedGate>
    </AuthProvider>
  );
}
