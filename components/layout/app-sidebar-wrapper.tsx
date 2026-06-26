"use client";

import { Suspense } from "react";
import { AppSidebar } from "@/components/layout/app-sidebar";

function SidebarFallback() {
  return (
    <aside className="fixed inset-y-0 left-0 z-30 hidden h-screen w-64 shrink-0 translate-x-0 flex-col border-r border-sidebar-border bg-sidebar transition-transform duration-300 ease-in-out md:flex" />
  );
}

export function AppSidebarWrapper() {
  return (
    <Suspense fallback={<SidebarFallback />}>
      <AppSidebar />
    </Suspense>
  );
}
