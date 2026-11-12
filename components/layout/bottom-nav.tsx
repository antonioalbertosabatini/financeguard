"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState, type ReactNode } from "react";
import { motion } from "motion/react";
import { Ellipsis, Plus } from "lucide-react";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { isActivePath, type TranslatedNavItem } from "@/components/layout/nav-config";
import { useNavConfig } from "@/hooks/use-nav-config";
import { useYearHref } from "@/hooks/use-year-href";
import { useI18n } from "@/providers/i18n-provider";
import { transitions } from "@/lib/motion";
import { haptic } from "@/lib/native/haptics";
import { cn } from "@/lib/utils";

const TAB_CLASS =
  "pressable flex h-full flex-1 flex-col items-center justify-center gap-[3px] rounded-2xl outline-none focus-visible:ring-2 focus-visible:ring-ring";

function TabIcon({ active, children }: { active: boolean; children: ReactNode }) {
  return (
    <span className="relative flex h-[1.875rem] w-12 items-center justify-center">
      {active && (
        <motion.span
          layoutId="bottom-nav-pill"
          transition={transitions.indicator}
          className="absolute inset-0 rounded-full bg-primary-soft"
          aria-hidden="true"
        />
      )}
      <span className="relative">{children}</span>
    </span>
  );
}

function NavTab({
  item,
  active,
  href,
}: {
  item: TranslatedNavItem;
  active: boolean;
  href: string;
}) {
  const Icon = item.icon;
  return (
    <Link
      href={href}
      onClick={() => haptic("select")}
      aria-current={active ? "page" : undefined}
      className={cn(TAB_CLASS, active ? "text-primary" : "text-muted-foreground")}
    >
      <TabIcon active={active}>
        <Icon className="size-[1.3rem]" strokeWidth={active ? 2.1 : 1.9} aria-hidden="true" />
      </TabIcon>
      <span
        className={cn(
          "max-w-full truncate px-0.5 text-[0.6875rem] leading-none",
          active ? "font-semibold" : "font-medium"
        )}
      >
        {item.label}
      </span>
    </Link>
  );
}

/**
 * Mobile navigation: floating, blurred bar with 4 destinations + the central
 * "new transaction" action. Secondary sections live in the "More" sheet.
 */
export function BottomNav() {
  const pathname = usePathname();
  const [moreOpen, setMoreOpen] = useState(false);
  const { bottomNavLeft, bottomNavRight, moreNavItems } = useNavConfig();
  const { t } = useI18n();
  const withYear = useYearHref();

  const moreActive = moreNavItems.some((item) => isActivePath(pathname, item.href));

  return (
    <>
      <nav
        aria-label={t("nav.mainNavigation")}
        className="fixed inset-x-3 bottom-[calc(0.75rem+env(safe-area-inset-bottom,0px))] z-40 mx-auto max-w-md md:hidden"
      >
        <div className="grid h-[4.25rem] grid-cols-5 items-center rounded-[1.625rem] border border-border bg-card/80 px-1 shadow-pop backdrop-blur-xl backdrop-saturate-150">
          {bottomNavLeft.map((item) => (
            <NavTab
              key={item.href}
              item={item}
              active={isActivePath(pathname, item.href)}
              href={withYear(item.href)}
            />
          ))}

          <div className="flex justify-center">
            <Link
              href={withYear("/add")}
              onClick={() => haptic("tap")}
              aria-label={t("nav.addTransaction")}
              className="pressable -mt-7 flex size-[3.375rem] items-center justify-center rounded-[1.25rem] bg-primary text-primary-foreground shadow-[0_10px_24px_-6px_color-mix(in_oklch,var(--primary)_60%,transparent)] ring-[5px] ring-background outline-none focus-visible:ring-ring"
            >
              <Plus className="size-6" strokeWidth={2.4} aria-hidden="true" />
            </Link>
          </div>

          {bottomNavRight.map((item) => (
            <NavTab
              key={item.href}
              item={item}
              active={isActivePath(pathname, item.href)}
              href={withYear(item.href)}
            />
          ))}

          <button
            type="button"
            onClick={() => {
              haptic("select");
              setMoreOpen(true);
            }}
            aria-haspopup="dialog"
            aria-expanded={moreOpen}
            className={cn(TAB_CLASS, moreActive ? "text-primary" : "text-muted-foreground")}
          >
            <TabIcon active={moreActive}>
              <Ellipsis className="size-[1.3rem]" strokeWidth={moreActive ? 2.1 : 1.9} aria-hidden="true" />
            </TabIcon>
            <span
              className={cn(
                "text-[0.6875rem] leading-none",
                moreActive ? "font-semibold" : "font-medium"
              )}
            >
              {t("nav.more")}
            </span>
          </button>
        </div>
      </nav>

      <Sheet open={moreOpen} onOpenChange={setMoreOpen}>
        <SheetContent>
          <SheetHeader>
            <SheetTitle>{t("nav.more")}</SheetTitle>
          </SheetHeader>
          <div className="grid grid-cols-2 gap-2.5">
            {moreNavItems.map((item) => {
              const Icon = item.icon;
              const active = isActivePath(pathname, item.href);
              return (
                <Link
                  key={item.href}
                  href={withYear(item.href)}
                  onClick={() => setMoreOpen(false)}
                  aria-current={active ? "page" : undefined}
                  className={cn(
                    "pressable flex flex-col items-start gap-2.5 rounded-2xl p-3.5 outline-none focus-visible:ring-2 focus-visible:ring-ring",
                    active ? "bg-primary-soft" : "bg-surface-2 hover:bg-accent"
                  )}
                >
                  <span
                    className={cn(
                      "flex size-9 items-center justify-center rounded-xl",
                      active
                        ? "bg-primary text-primary-foreground"
                        : "bg-primary-soft text-primary-soft-foreground"
                    )}
                  >
                    <Icon className="size-[1.125rem]" aria-hidden="true" />
                  </span>
                  <span className="min-w-0">
                    <span
                      className={cn(
                        "block truncate text-[0.9375rem] font-semibold",
                        active && "text-primary-soft-foreground"
                      )}
                    >
                      {item.label}
                    </span>
                    <span className="mt-0.5 block truncate text-xs text-muted-foreground">
                      {item.description}
                    </span>
                  </span>
                </Link>
              );
            })}
          </div>
        </SheetContent>
      </Sheet>
    </>
  );
}
