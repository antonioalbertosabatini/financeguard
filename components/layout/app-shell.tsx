import { AmountVisibilityToggle } from "@/components/layout/amount-visibility-toggle";
import { AppSidebarWrapper } from "@/components/layout/app-sidebar-wrapper";
import { YearSelector } from "@/components/layout/year-selector";
import { Toaster } from "@/components/ui/sonner";
import { AmountVisibilityProvider } from "@/providers/amount-visibility-provider";
import { YearProviderWrapper } from "@/providers/year-provider-wrapper";
import { getAvailableYears } from "@/lib/actions/transactions";

export async function AppShell({ children }: { children: React.ReactNode }) {
  const availableYears = await getAvailableYears();

  return (
    <YearProviderWrapper availableYears={availableYears}>
      <AmountVisibilityProvider>
        <div className="flex min-h-screen flex-col md:pl-64">
          <AppSidebarWrapper />
          <div className="flex min-h-screen flex-1 flex-col bg-gradient-to-b from-background via-background to-muted/30">
            <header className="sticky top-0 z-20 flex h-14 items-center justify-end gap-4 border-b border-border/60 bg-background/85 px-6 backdrop-blur-md">
              <div className="flex items-center gap-3">
                <AmountVisibilityToggle />
                <span className="text-xs text-muted-foreground">Anno</span>
                <YearSelector />
              </div>
            </header>
            <main className="mx-auto w-full max-w-7xl flex-1 p-6 md:p-8">
              {children}
            </main>
          </div>
        </div>
        <Toaster richColors closeButton />
      </AmountVisibilityProvider>
    </YearProviderWrapper>
  );
}
