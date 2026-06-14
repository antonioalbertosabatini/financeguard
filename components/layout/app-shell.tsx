import { AppShellLayout } from "@/components/layout/app-shell-layout";
import { Toaster } from "@/components/ui/sonner";
import { AmountVisibilityProvider } from "@/providers/amount-visibility-provider";
import { SidebarProvider } from "@/providers/sidebar-provider";
import { YearProviderWrapper } from "@/providers/year-provider-wrapper";
import { getAvailableYears } from "@/lib/actions/transactions";
import { getSyncStatus } from "@/lib/db/sync-guard";

export async function AppShell({ children }: { children: React.ReactNode }) {
  const [availableYears, syncStatus] = await Promise.all([
    getAvailableYears(),
    getSyncStatus(),
  ]);

  return (
    <YearProviderWrapper availableYears={availableYears}>
      <AmountVisibilityProvider>
        <SidebarProvider>
          <AppShellLayout syncWarnings={syncStatus.warnings}>
            {children}
          </AppShellLayout>
        </SidebarProvider>
        <Toaster richColors closeButton />
      </AmountVisibilityProvider>
    </YearProviderWrapper>
  );
}
