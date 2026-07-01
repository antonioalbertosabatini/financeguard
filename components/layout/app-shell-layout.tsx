"use client";

import { Suspense, type ReactNode } from "react";
import { AmountVisibilityToggle } from "@/components/layout/amount-visibility-toggle";
import { AppLogo } from "@/components/layout/app-logo";
import { AddTransactionButton } from "@/components/layout/add-transaction-button";
import { AppSidebarWrapper } from "@/components/layout/app-sidebar-wrapper";
import { BottomNav } from "@/components/layout/bottom-nav";
import { CloudSyncAlert } from "@/components/layout/cloud-sync-alert";
import { SidebarToggle } from "@/components/layout/sidebar-toggle";
import { SyncWarnings } from "@/components/layout/sync-warnings";
import { YearSelector } from "@/components/layout/year-selector";
import { useSidebar } from "@/hooks/use-sidebar";
import { cn } from "@/lib/utils";

export function AppShellLayout({
  children,
  syncWarnings = [],
}: {
  children: ReactNode;
  syncWarnings?: string[];
}) {
  const { sidebarOpen } = useSidebar();

  return (
    <div
      className={cn(
        "flex min-h-screen flex-col transition-[padding] duration-300 ease-in-out",
        sidebarOpen ? "md:pl-64" : "md:pl-0"
      )}
    >
      <AppSidebarWrapper />
      <div className="flex min-h-screen flex-1 flex-col bg-gradient-to-b from-background via-background to-muted/30">
        <header className="sticky top-0 z-20 flex h-14 items-center justify-between gap-3 border-b border-border/60 bg-background/85 px-4 pt-safe backdrop-blur-md sm:px-6">
          {/* Mobile: brand mark. Desktop: sidebar toggle + add button. */}
          <div className="flex items-center gap-2">
            <div className="flex items-center gap-2 md:hidden">
              <AppLogo className="size-8" />
              <span className="font-heading text-base font-semibold tracking-tight">
                FinanceGuard
              </span>
            </div>
            <div className="hidden items-center gap-2 md:flex">
              <SidebarToggle />
              <Suspense fallback={null}>
                <AddTransactionButton />
              </Suspense>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <AmountVisibilityToggle />
            <span className="hidden text-xs text-muted-foreground sm:inline">
              Anno
            </span>
            <YearSelector />
          </div>
        </header>

        <main className="mx-auto w-full max-w-7xl flex-1 p-4 pb-bottom-nav sm:p-6 md:p-8 md:pb-8">
          <CloudSyncAlert />
          <SyncWarnings warnings={syncWarnings} />
          {children}
        </main>
      </div>

      <Suspense fallback={null}>
        <BottomNav />
      </Suspense>
    </div>
  );
}
