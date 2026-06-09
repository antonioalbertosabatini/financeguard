import { AppSidebarWrapper } from "@/components/layout/app-sidebar-wrapper";
import { YearSelector } from "@/components/layout/year-selector";
import { Toaster } from "@/components/ui/sonner";
import { YearProviderWrapper } from "@/providers/year-provider-wrapper";
import { getAvailableYears } from "@/lib/actions/transactions";

export async function AppShell({ children }: { children: React.ReactNode }) {
  const availableYears = await getAvailableYears();

  return (
    <YearProviderWrapper availableYears={availableYears}>
      <div className="min-h-screen bg-background md:pl-64">
        <AppSidebarWrapper />
        <div className="flex min-h-screen flex-col">
          <header className="sticky top-0 z-20 flex h-16 items-center justify-between border-b border-border/60 bg-background/80 px-6 backdrop-blur-md">
            <div>
              <p className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
                Anno fiscale
              </p>
            </div>
            <YearSelector />
          </header>
          <main className="mx-auto w-full max-w-7xl flex-1 p-6 md:p-8">
            {children}
          </main>
        </div>
      </div>
      <Toaster richColors closeButton />
    </YearProviderWrapper>
  );
}
