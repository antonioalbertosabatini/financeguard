"use client";

import Link from "next/link";
import { usePathname, useSearchParams } from "next/navigation";
import { useState } from "react";
import { MoreHorizontal, Plus } from "lucide-react";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { isActivePath, type TranslatedNavItem } from "@/components/layout/nav-config";
import { useNavConfig } from "@/hooks/use-nav-config";
import { useI18n } from "@/providers/i18n-provider";
import { cn } from "@/lib/utils";

type NavTabItem = TranslatedNavItem;

function NavTab({
  item,
  active,
  query,
}: {
  item: NavTabItem;
  active: boolean;
  query: string;
}) {
  const Icon = item.icon;
  return (
    <Link
      href={`${item.href}${query}`}
      aria-current={active ? "page" : undefined}
      className={cn(
        "flex h-full flex-1 flex-col items-center justify-center gap-0.5 rounded-xl text-[0.65rem] font-medium transition-colors",
        active ? "text-primary" : "text-muted-foreground"
      )}
    >
      <span
        className={cn(
          "flex h-7 items-center justify-center rounded-full px-3 transition-colors",
          active && "bg-primary/10"
        )}
      >
        <Icon className="size-5" />
      </span>
      <span className="truncate">{item.label}</span>
    </Link>
  );
}

export function BottomNav() {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [moreOpen, setMoreOpen] = useState(false);
  const { bottomNavLeft, bottomNavRight, moreNavItems } = useNavConfig();
  const { t } = useI18n();
  const yearParam = searchParams.get("year");
  const query = yearParam ? `?year=${yearParam}` : "";

  const moreActive = moreNavItems.some((item) =>
    isActivePath(pathname, item.href)
  );

  return (
    <>
      <nav className="fixed inset-x-0 bottom-0 z-40 border-t border-border/70 bg-background/90 pb-safe backdrop-blur-lg md:hidden">
        <div className="relative mx-auto flex h-[4.5rem] max-w-md items-stretch px-2">
          {bottomNavLeft.map((item) => (
            <NavTab
              key={item.href}
              item={item}
              active={isActivePath(pathname, item.href)}
              query={query}
            />
          ))}

          <div className="flex w-16 shrink-0 items-start justify-center">
            <Link
              href={`/add${query}`}
              aria-label={t("nav.addTransaction")}
              className="-mt-5 flex size-14 items-center justify-center rounded-full bg-primary text-primary-foreground shadow-[0_8px_24px_-6px_oklch(0.54_0.205_285/0.6)] ring-4 ring-background transition-transform active:scale-95"
            >
              <Plus className="size-6" />
            </Link>
          </div>

          {bottomNavRight.map((item) => (
            <NavTab
              key={item.href}
              item={item}
              active={isActivePath(pathname, item.href)}
              query={query}
            />
          ))}

          <button
            type="button"
            onClick={() => setMoreOpen(true)}
            aria-haspopup="dialog"
            className={cn(
              "flex h-full flex-1 flex-col items-center justify-center gap-0.5 rounded-xl text-[0.65rem] font-medium transition-colors",
              moreActive ? "text-primary" : "text-muted-foreground"
            )}
          >
            <span
              className={cn(
                "flex h-7 items-center justify-center rounded-full px-3 transition-colors",
                moreActive && "bg-primary/10"
              )}
            >
              <MoreHorizontal className="size-5" />
            </span>
            <span>{t("nav.more")}</span>
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
                  href={`${item.href}${query}`}
                  onClick={() => setMoreOpen(false)}
                  className={cn(
                    "flex flex-col gap-2 rounded-2xl border p-4 transition-colors",
                    active
                      ? "border-primary/40 bg-primary/5 text-primary"
                      : "border-border bg-card text-foreground hover:bg-muted"
                  )}
                >
                  <span
                    className={cn(
                      "flex size-10 items-center justify-center rounded-xl",
                      active
                        ? "bg-primary/15 text-primary"
                        : "bg-muted text-muted-foreground"
                    )}
                  >
                    <Icon className="size-5" />
                  </span>
                  <span className="text-sm font-medium">{item.label}</span>
                </Link>
              );
            })}
          </div>
        </SheetContent>
      </Sheet>
    </>
  );
}
