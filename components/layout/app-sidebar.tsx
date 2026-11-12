"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { motion } from "motion/react";
import { PanelLeftClose, PanelLeftOpen } from "lucide-react";
import { useYearHref } from "@/hooks/use-year-href";
import { AppLogo } from "@/components/layout/app-logo";
import { SyncStatus } from "@/components/layout/sync-status";
import { Button } from "@/components/ui/button";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { useSidebar } from "@/providers/sidebar-provider";
import { isActivePath, type TranslatedNavItem } from "@/components/layout/nav-config";
import { useNavConfig } from "@/hooks/use-nav-config";
import { useI18n } from "@/providers/i18n-provider";
import { transitions } from "@/lib/motion";
import { cn } from "@/lib/utils";

/** Widths shared with the content offset in AppShellLayout. */
export const SIDEBAR_WIDTH_CLASS = {
  expanded: "w-64",
  collapsed: "w-[4.75rem]",
} as const;

function NavLink({
  item,
  href,
  active,
  collapsed,
}: {
  item: TranslatedNavItem;
  href: string;
  active: boolean;
  collapsed: boolean;
}) {
  const Icon = item.icon;
  const link = (
    <Link
      href={href}
      aria-current={active ? "page" : undefined}
      className={cn(
        "relative flex h-10 items-center gap-3 rounded-xl px-3 text-sm outline-none transition-colors focus-visible:ring-2 focus-visible:ring-sidebar-ring",
        collapsed && "justify-center px-0",
        active
          ? "font-semibold text-sidebar-accent-foreground"
          : "font-medium text-sidebar-foreground/75 hover:bg-surface-2 hover:text-sidebar-foreground"
      )}
    >
      {active && (
        <motion.span
          layoutId="sidebar-active"
          transition={transitions.indicator}
          className="absolute inset-0 rounded-xl bg-sidebar-accent"
          aria-hidden="true"
        />
      )}
      <Icon className="relative size-[1.125rem] shrink-0" aria-hidden="true" />
      <span className={cn("relative truncate", collapsed && "sr-only")}>
        {item.label}
      </span>
    </Link>
  );

  if (!collapsed) return link;
  return (
    <Tooltip>
      <TooltipTrigger asChild>{link}</TooltipTrigger>
      <TooltipContent side="right">{item.label}</TooltipContent>
    </Tooltip>
  );
}

export function AppSidebar() {
  const pathname = usePathname();
  const { mode, toggleCollapsed } = useSidebar();
  const { navGroups } = useNavConfig();
  const { t } = useI18n();
  const withYear = useYearHref();
  const collapsed = mode === "collapsed";
  const hidden = mode === "hidden";

  return (
    <aside
      aria-label={t("nav.mainNavigation")}
      aria-hidden={hidden || undefined}
      inert={hidden || undefined}
      className={cn(
        "fixed inset-y-0 left-0 z-30 hidden h-dvh shrink-0 flex-col border-r border-sidebar-border bg-sidebar pt-safe transition-[width,translate] duration-300 ease-fluid md:flex",
        collapsed ? SIDEBAR_WIDTH_CLASS.collapsed : SIDEBAR_WIDTH_CLASS.expanded,
        hidden ? "-translate-x-full" : "translate-x-0"
      )}
    >
      <div
        className={cn(
          "flex h-16 shrink-0 items-center gap-2 px-4",
          collapsed ? "justify-center px-0" : "justify-between"
        )}
      >
        <div className="flex min-w-0 items-center gap-2.5">
          <AppLogo className="size-9 rounded-[0.7rem]" />
          {!collapsed && (
            <div className="min-w-0">
              <p className="truncate text-[0.9375rem] font-semibold tracking-tight text-sidebar-foreground">
                FinanceGuard
              </p>
              <p className="truncate text-xs text-muted-foreground">{t("nav.tagline")}</p>
            </div>
          )}
        </div>
        {!collapsed && (
          <Button
            variant="ghost"
            size="icon-sm"
            onClick={toggleCollapsed}
            aria-label={t("nav.collapseSidebar")}
            title={t("nav.collapseSidebar")}
            className="text-muted-foreground"
          >
            <PanelLeftClose />
          </Button>
        )}
      </div>

      {collapsed && (
        <div className="flex justify-center pb-1">
          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                variant="ghost"
                size="icon"
                onClick={toggleCollapsed}
                aria-label={t("nav.expandSidebar")}
                className="text-muted-foreground"
              >
                <PanelLeftOpen />
              </Button>
            </TooltipTrigger>
            <TooltipContent side="right">{t("nav.expandSidebar")}</TooltipContent>
          </Tooltip>
        </div>
      )}

      <nav className="flex flex-1 flex-col gap-4 overflow-y-auto px-3 py-2">
        {navGroups.map((group, index) => (
          <div key={group.label} className="space-y-0.5">
            {collapsed ? (
              index > 0 && <div className="mx-2 mb-2 h-px bg-sidebar-border" aria-hidden="true" />
            ) : (
              <p className="px-3 pb-1 text-eyebrow text-muted-foreground">{group.label}</p>
            )}
            {group.items.map((item) => (
              <NavLink
                key={item.href}
                item={item}
                href={withYear(item.href)}
                active={isActivePath(pathname, item.href)}
                collapsed={collapsed}
              />
            ))}
          </div>
        ))}
      </nav>

      <div className={cn("shrink-0 p-3 pb-[calc(0.75rem+env(safe-area-inset-bottom,0px))]", collapsed && "flex justify-center")}>
        <SyncStatus compact={collapsed} />
      </div>
    </aside>
  );
}
