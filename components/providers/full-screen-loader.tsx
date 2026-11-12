"use client";

import { AppLogo } from "@/components/layout/app-logo";
import { useI18n } from "@/providers/i18n-provider";

/**
 * Boot screen shown while the encrypted store opens (before the app shell
 * exists). Page-level loading uses <PageSkeleton> instead.
 */
export function FullScreenLoader() {
  const { t } = useI18n();

  return (
    <div
      role="status"
      aria-label={t("common.loading")}
      className="flex min-h-dvh flex-1 flex-col items-center justify-center gap-5 bg-background"
    >
      <AppLogo className="size-14 animate-pulse rounded-2xl shadow-pop" />
      <div className="h-1 w-24 overflow-hidden rounded-full bg-surface-2">
        <div className="skeleton-shimmer h-full w-full rounded-full" />
      </div>
    </div>
  );
}
