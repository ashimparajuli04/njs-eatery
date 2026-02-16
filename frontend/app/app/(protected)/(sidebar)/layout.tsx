"use client";
import { ReactNode } from "react";
import { AppSidebar } from "@/components/app-sidebar";
import { PanelLeft } from "lucide-react";
import { useSidebar } from "@/components/ui/sidebar";

export default function SidebarLayout({ children }: { children: ReactNode }) {
  const { toggleSidebar } = useSidebar();
  
  return (
    <div className="flex min-h-screen w-full">
      {/* Sidebar */}
      <AppSidebar />
      
      {/* Main content */}
      <main className="w-full relative">
        {/* Floating Icon-Only Trigger - Mobile Only */}
        <button
          onClick={toggleSidebar}
          className="
            md:hidden
            fixed 
            top-2 
            left-3
            z-50
            text-stone-700
            hover:text-amber-600
            transition-all 
            duration-200
            hover:scale-110
            active:scale-95
            drop-shadow-lg
            hover:drop-shadow-2xl
          "
        >
          <PanelLeft className="h-6 w-6" />
        </button>
        
        {children}
      </main>
    </div>
  );
}