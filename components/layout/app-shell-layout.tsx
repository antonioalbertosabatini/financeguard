"use client";

import { Suspense, type ReactNode } from "react";
import { PanelLeft, Search } from "lucide-react";
import { AmountVisibilityToggle } from "@/components/layout/amount-visibility-toggle";
import { AppLogo } from "@/components/layout/app-logo";
import { AddTransactionButton } from "@/components/layout/add-transaction-button";
import { AppSidebarWrapper } from "@/components/layout/app-sidebar-wrapper";
import { BottomNav } from "@/components/layout/bottom-nav";
import { CloudSyncAlert } from "@/components/layout/cloud-sync-alert";
import { useCommandPalette } from "@/components/layout/command-palette";
import { SyncWarnings } from "@/components/layout/sync-warnings";
import { ThemeToggle } from "@/components/layout/theme-toggle";
import { YearSelector } from "@/components/layout/year-selector";
import { Button } from "@/components/ui/button";
import { Kbd } from "@/components/ui/kbd";
import { modKeyLabel } from "@/hooks/use-keyboard-shortcuts";
import { useScrolled } from "@/hooks/use-scrolled";
import { useI18n } from "@/providers/i18n-provider";
import { useSidebar } from "@/providers/sidebar-provider";
import { useSyncState } from "@/lib/sync/use-sync-state";
import { cn } from "@/lib/utils";

function SearchTrigger() {
  const { t } = useI18n();
  const { openPalette } = useCommandPalette();
  return (
    <button
      type="button"
      onClick={openPalette}
      className="pressable flex h-10 w-full max-w-sm items-center gap-2.5 rounded-xl border border-border bg-card px-3.5 text-sm text-muted-foreground outline-none hover:bg-surface-2 focus-visible:ring-2 focus-visible:ring-ring"
    >
      <Search className="size-4" aria-hidden="true" />
      <span className="flex-1 truncate text-left">{t("nav.search")}</span>
      <span className="hidden items-center gap-1 lg:flex" aria-hidden="true">
        <Kbd>{modKeyLabel()}</Kbd>
        <Kbd>K</Kbd>
      </span>
    </button>
  );
}

export function AppShellLayout({ children }: { children: ReactNode }) {
  const { t } = useI18n();
  const { mode, toggleHidden } = useSidebar();
  const { warnings: syncWarnings } = useSyncState();
  const scrolled = useScrolled();
  const sidebarLabel = mode === "hidden" ? t("nav.showSidebar") : t("nav.hideSidebar");

  return (
    <div
      className={cn(
        "flex min-h-dvh flex-col transition-[padding] duration-300 ease-fluid",
        mode === "expanded" && "md:pl-64",
        mode === "collapsed" && "md:pl-[4.75rem]"
      )}
    >
      <AppSidebarWrapper />
      <div className="flex min-h-dvh flex-1 flex-col">
        <header
          className={cn(
            "sticky top-0 z-20 border-b pt-safe transition-[background-color,border-color,backdrop-filter] duration-200",
            scrolled
              ? "border-border bg-background/80 backdrop-blur-xl backdrop-saturate-150"
              : "border-transparent bg-background"
          )}
        >
          <div className="mx-auto flex h-16 w-full max-w-7xl items-center gap-2 px-4 sm:px-6 md:px-8">
            {/* Mobile: brand. Desktop: sidebar toggle + search. */}
            <div className="flex min-w-0 items-center gap-2.5 md:hidden">
              <AppLogo className="size-8 rounded-[0.6rem]" />
              <span className="truncate text-base font-semibold tracking-tight">
                {t("common.appTitle")}
              </span>
            </div>
            <div className="hidden min-w-0 flex-1 items-center gap-2 md:flex">
              <Button
                type="button"
                variant="ghost"
                size="icon"
                onClick={toggleHidden}
                aria-label={sidebarLabel}
                aria-expanded={mode !== "hidden"}
                title={sidebarLabel}
                className="-ml-2 text-muted-foreground"
              >
                <PanelLeft className="size-[1.125rem]" />
              </Button>
              <SearchTrigger />
            </div>

            <div className="ml-auto flex shrink-0 items-center gap-1">
              <YearSelector />
              <AmountVisibilityToggle />
              <ThemeToggle />
              <div className="ml-1.5 hidden md:block">
                <Suspense fallback={null}>
                  <AddTransactionButton />
                </Suspense>
              </div>
            </div>
          </div>
        </header>

        <main className="mx-auto w-full max-w-7xl flex-1 px-4 pt-2 pb-bottom-nav sm:px-6 md:px-8 md:pt-4 md:pb-12">
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
