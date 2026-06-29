"use client";

import { AppShellLayout } from "@/components/layout/app-shell-layout";
import { Toaster } from "@/components/ui/sonner";
import { AmountVisibilityProvider } from "@/providers/amount-visibility-provider";
import { CloudSyncProvider } from "@/providers/cloud-sync-provider";
import { SidebarProvider } from "@/providers/sidebar-provider";
import { YearProviderWrapper } from "@/providers/year-provider-wrapper";
import { getAvailableYears } from "@/lib/actions/transactions";
import { useAsyncData } from "@/lib/storage/use-async-data";
import { useSyncState } from "@/lib/sync/use-sync-state";
import { currentYear } from "@/lib/utils/dates";

export function AppShell({ children }: { children: React.ReactNode }) {
  const { data } = useAsyncData(() => getAvailableYears(), []);
  const availableYears = data ?? [currentYear()];
  const { warnings } = useSyncState();

  return (
    <YearProviderWrapper availableYears={availableYears}>
      <AmountVisibilityProvider>
        <SidebarProvider>
          <CloudSyncProvider>
            <AppShellLayout syncWarnings={warnings}>{children}</AppShellLayout>
          </CloudSyncProvider>
        </SidebarProvider>
        <Toaster richColors closeButton />
      </AmountVisibilityProvider>
    </YearProviderWrapper>
  );
}
