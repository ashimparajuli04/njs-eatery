"use client";

import { ReactNode } from "react";
import { AppSidebar } from "@/components/app-sidebar";

export default function SidebarLayout({ children }: { children: ReactNode }) {
  return (
    <div className="flex min-h-screen">
      {/* Sidebar */}
      <AppSidebar />

      {/* Main content */}
      <main className="flex-1">{children}</main>
    </div>
  );
}
