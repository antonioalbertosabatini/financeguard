"use client";

import { Suspense, type ReactNode } from "react";
import { AmountVisibilityToggle } from "@/components/layout/amount-visibility-toggle";
import { AddTransactionButton } from "@/components/layout/add-transaction-button";
import { AppSidebarWrapper } from "@/components/layout/app-sidebar-wrapper";
import { SidebarToggle } from "@/components/layout/sidebar-toggle";
import { SyncWarnings } from "@/components/layout/sync-warnings";
import { YearSelector } from "@/components/layout/year-selector";
import { Button } from "@/components/ui/button";
import { useSidebar } from "@/hooks/use-sidebar";
import { cn } from "@/lib/utils";
import { Plus } from "lucide-react";
import Link from "next/link";

function AddTransactionButtonFallback() {
  return (
    <Button size="sm" className="rounded-xl" asChild>
      <Link href="/add">
        <Plus className="size-4" />
        <span className="hidden sm:inline">Nuova transazione</span>
      </Link>
    </Button>
  );
}

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
        <header className="sticky top-0 z-20 flex h-14 items-center justify-between gap-4 border-b border-border/60 bg-background/85 px-4 backdrop-blur-md sm:px-6">
          <div className="flex items-center gap-2">
            <SidebarToggle />
            <Suspense fallback={<AddTransactionButtonFallback />}>
              <AddTransactionButton />
            </Suspense>
          </div>
          <div className="flex items-center gap-3">
            <AmountVisibilityToggle />
            <span className="text-xs text-muted-foreground">Anno</span>
            <YearSelector />
          </div>
        </header>
        <main className="mx-auto w-full max-w-7xl flex-1 p-6 md:p-8">
          <SyncWarnings warnings={syncWarnings} />
          {children}
        </main>
      </div>
    </div>
  );
}
