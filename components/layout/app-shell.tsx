"use client";

import { AppShellLayout } from "@/components/layout/app-shell-layout";
import { Toaster } from "@/components/ui/sonner";
import { AmountVisibilityProvider } from "@/providers/amount-visibility-provider";
import { CloudSyncProvider } from "@/providers/cloud-sync-provider";
import { SidebarProvider } from "@/providers/sidebar-provider";
import { YearProvider } from "@/providers/year-provider";
import { getAvailableYears } from "@/lib/actions/transactions";
import { useAsyncData } from "@/lib/storage/use-async-data";
import { currentYear } from "@/lib/utils/dates";

export function AppShell({ children }: { children: React.ReactNode }) {
  const { data } = useAsyncData(() => getAvailableYears(), []);
  const availableYears = data ?? [currentYear()];

  return (
    <YearProvider availableYears={availableYears}>
      <AmountVisibilityProvider>
        <SidebarProvider>
          <CloudSyncProvider>
            <AppShellLayout>{children}</AppShellLayout>
          </CloudSyncProvider>
        </SidebarProvider>
        <Toaster richColors closeButton />
      </AmountVisibilityProvider>
    </YearProvider>
  );
}
