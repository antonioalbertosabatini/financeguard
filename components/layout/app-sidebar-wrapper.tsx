"use client";

import { Suspense } from "react";
import { AppSidebar } from "@/components/layout/app-sidebar";

function SidebarFallback() {
  return (
    <>
      <aside className="h-14 shrink-0 border-b border-sidebar-border bg-sidebar md:hidden" />
      <aside className="hidden w-64 shrink-0 border-r border-sidebar-border bg-sidebar md:fixed md:inset-y-0 md:left-0 md:block" />
    </>
  );
}

export function AppSidebarWrapper() {
  return (
    <Suspense fallback={<SidebarFallback />}>
      <AppSidebar />
    </Suspense>
  );
}
