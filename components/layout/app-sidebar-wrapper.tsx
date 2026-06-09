"use client";

import { Suspense } from "react";
import { AppSidebar } from "@/components/layout/app-sidebar";

function SidebarFallback() {
  return (
    <aside className="hidden w-64 shrink-0 border-r border-sidebar-border bg-sidebar md:fixed md:inset-y-0 md:left-0 md:flex md:flex-col" />
  );
}

export function AppSidebarWrapper() {
  return (
    <Suspense fallback={<SidebarFallback />}>
      <AppSidebar />
    </Suspense>
  );
}
