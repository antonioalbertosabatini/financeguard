"use client";

import Link from "next/link";
import { usePathname, useSearchParams } from "next/navigation";
import {
  LayoutDashboard,
  ArrowLeftRight,
  Wallet,
  Tags,
  PiggyBank,
  BarChart3,
  Settings,
  Shield,
} from "lucide-react";
import { useSidebar } from "@/hooks/use-sidebar";
import { cn } from "@/lib/utils";

const navGroups = [
  {
    label: "Principale",
    items: [{ href: "/", label: "Dashboard", icon: LayoutDashboard }],
  },
  {
    label: "Gestione",
    items: [
      { href: "/transactions", label: "Transazioni", icon: ArrowLeftRight },
      { href: "/accounts", label: "Conti", icon: Wallet },
      { href: "/categories", label: "Categorie", icon: Tags },
      { href: "/budget", label: "Budget", icon: PiggyBank },
    ],
  },
  {
    label: "Analisi",
    items: [
      { href: "/reports", label: "Report", icon: BarChart3 },
      { href: "/settings", label: "Impostazioni", icon: Settings },
    ],
  },
];

export function AppSidebar() {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const { sidebarOpen } = useSidebar();
  const yearParam = searchParams.get("year");
  const query = yearParam ? `?year=${yearParam}` : "";

  return (
    <>
      {/* Mobile: compact icon strip */}
      <aside className="flex shrink-0 border-b border-sidebar-border bg-sidebar md:hidden">
        <div className="flex w-full items-center gap-2 overflow-x-auto px-3 py-2">
          {navGroups.flatMap((group) =>
            group.items.map(({ href, label, icon: Icon }) => {
              const active =
                href === "/" ? pathname === "/" : pathname.startsWith(href);
              return (
                <Link
                  key={href}
                  href={`${href}${query}`}
                  title={label}
                  className={cn(
                    "flex size-10 shrink-0 items-center justify-center rounded-xl transition-all",
                    active
                      ? "bg-sidebar-primary text-sidebar-primary-foreground shadow-sm"
                      : "text-sidebar-foreground/70 hover:bg-sidebar-accent hover:text-sidebar-accent-foreground"
                  )}
                >
                  <Icon className="size-4" />
                </Link>
              );
            })
          )}
        </div>
      </aside>

      {/* Desktop: collapsible sidebar */}
      <aside
        aria-hidden={!sidebarOpen}
        className={cn(
          "fixed inset-y-0 left-0 z-30 hidden h-screen w-64 shrink-0 flex-col border-r border-sidebar-border bg-sidebar transition-transform duration-300 ease-in-out md:flex",
          sidebarOpen ? "translate-x-0" : "-translate-x-full"
        )}
      >
        <div className="border-b border-sidebar-border px-5 py-6">
          <div className="flex items-center gap-3">
            <div className="flex size-10 items-center justify-center rounded-xl bg-gradient-to-br from-primary to-primary/70 text-primary-foreground shadow-sm">
              <Shield className="size-5" />
            </div>
            <div>
              <h1 className="text-base font-semibold tracking-tight text-sidebar-foreground">
                FinanceGuard
              </h1>
              <p className="text-xs text-muted-foreground">Finanze personali</p>
            </div>
          </div>
        </div>
        <nav className="flex flex-1 flex-col gap-4 overflow-y-auto p-3">
          {navGroups.map((group) => (
            <div key={group.label} className="space-y-1">
              <p className="px-3 text-[11px] font-medium uppercase tracking-widest text-muted-foreground">
                {group.label}
              </p>
              {group.items.map(({ href, label, icon: Icon }) => {
                const active =
                  href === "/" ? pathname === "/" : pathname.startsWith(href);
                return (
                  <Link
                    key={href}
                    href={`${href}${query}`}
                    className={cn(
                      "flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition-all",
                      active
                        ? "bg-sidebar-primary text-sidebar-primary-foreground shadow-sm"
                        : "text-sidebar-foreground/70 hover:bg-sidebar-accent hover:text-sidebar-accent-foreground"
                    )}
                  >
                    <Icon className="size-4 shrink-0" />
                    <span className="truncate">{label}</span>
                  </Link>
                );
              })}
            </div>
          ))}
        </nav>
      </aside>
    </>
  );
}
