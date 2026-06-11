import { AppShellLayout } from "@/components/layout/app-shell-layout";
import { Toaster } from "@/components/ui/sonner";
import { AmountVisibilityProvider } from "@/providers/amount-visibility-provider";
import { SidebarProvider } from "@/providers/sidebar-provider";
import { YearProviderWrapper } from "@/providers/year-provider-wrapper";
import { getAvailableYears } from "@/lib/actions/transactions";

export async function AppShell({ children }: { children: React.ReactNode }) {
  const availableYears = await getAvailableYears();

  return (
    <YearProviderWrapper availableYears={availableYears}>
      <AmountVisibilityProvider>
        <SidebarProvider>
          <AppShellLayout>{children}</AppShellLayout>
        </SidebarProvider>
        <Toaster richColors closeButton />
      </AmountVisibilityProvider>
    </YearProviderWrapper>
  );
}
