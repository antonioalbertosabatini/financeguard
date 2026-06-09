"use client";

import Link from "next/link";
import { usePathname, useSearchParams } from "next/navigation";
import {
  LayoutDashboard,
  PlusCircle,
  ArrowLeftRight,
  Wallet,
  Tags,
  PiggyBank,
  BarChart3,
  Settings,
  Shield,
} from "lucide-react";
import { cn } from "@/lib/utils";

const navItems = [
  { href: "/", label: "Dashboard", icon: LayoutDashboard },
  { href: "/add", label: "Inserimento", icon: PlusCircle },
  { href: "/transactions", label: "Transazioni", icon: ArrowLeftRight },
  { href: "/accounts", label: "Conti", icon: Wallet },
  { href: "/categories", label: "Categorie", icon: Tags },
  { href: "/budget", label: "Budget", icon: PiggyBank },
  { href: "/reports", label: "Report", icon: BarChart3 },
  { href: "/settings", label: "Impostazioni", icon: Settings },
];

export function AppSidebar() {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const yearParam = searchParams.get("year");
  const query = yearParam ? `?year=${yearParam}` : "";

  return (
    <aside className="flex h-auto w-full shrink-0 flex-col border-b border-sidebar-border bg-sidebar md:fixed md:inset-y-0 md:left-0 md:z-30 md:h-screen md:w-64 md:border-b-0 md:border-r">
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
      <nav className="flex flex-1 flex-col gap-1 overflow-y-auto p-3">
        {navItems.map(({ href, label, icon: Icon }) => {
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
      </nav>
    </aside>
  );
}
