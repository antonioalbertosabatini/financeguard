"use client";

import { Skeleton } from "@/components/ui/skeleton";
import { useI18n } from "@/providers/i18n-provider";
import { cn } from "@/lib/utils";

export type PageSkeletonVariant = "dashboard" | "list" | "cards" | "form";

function HeaderSkeleton() {
  return (
    <div className="space-y-2">
      <Skeleton className="h-3.5 w-28" />
      <Skeleton className="h-8 w-48" />
    </div>
  );
}

function RowSkeleton({ width = "60%" }: { width?: string }) {
  return (
    <div className="flex items-center gap-3 py-2.5">
      <Skeleton className="size-10 shrink-0 rounded-xl" />
      <div className="flex-1 space-y-2">
        <Skeleton className="h-3 rounded-md" style={{ width }} />
        <Skeleton className="h-2.5 w-1/3 rounded-md" />
      </div>
      <Skeleton className="h-3.5 w-16 rounded-md" />
    </div>
  );
}

function CardSkeleton({ className, rows = 3 }: { className?: string; rows?: number }) {
  const widths = ["68%", "52%", "60%", "45%", "64%"];
  return (
    <div className={cn("rounded-xl border border-border bg-card p-4", className)}>
      {Array.from({ length: rows }, (_, i) => (
        <RowSkeleton key={i} width={widths[i % widths.length]} />
      ))}
    </div>
  );
}

/**
 * Placeholder that mirrors the shape of the page being loaded, so the
 * layout doesn't jump when data arrives (replaces the full-screen spinner).
 */
export function PageSkeleton({ variant = "list" }: { variant?: PageSkeletonVariant }) {
  const { t } = useI18n();

  return (
    <div
      role="status"
      aria-live="polite"
      aria-label={t("common.loading")}
      className="space-y-5"
    >
      <HeaderSkeleton />
      {variant === "dashboard" && (
        <>
          <Skeleton className="h-40 rounded-2xl" />
          <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
            <Skeleton className="h-28 rounded-xl" />
            <Skeleton className="h-28 rounded-xl" />
            <Skeleton className="hidden h-28 rounded-xl lg:block" />
            <Skeleton className="hidden h-28 rounded-xl lg:block" />
          </div>
          <div className="grid gap-4 lg:grid-cols-2">
            <CardSkeleton rows={4} />
            <Skeleton className="h-64 rounded-xl" />
          </div>
        </>
      )}
      {variant === "list" && (
        <>
          <div className="flex gap-2">
            <Skeleton className="h-11 flex-1 rounded-lg" />
            <Skeleton className="size-11 rounded-lg" />
          </div>
          <Skeleton className="h-16 rounded-xl" />
          <CardSkeleton rows={3} />
          <CardSkeleton rows={2} />
        </>
      )}
      {variant === "cards" && (
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
          {Array.from({ length: 6 }, (_, i) => (
            <Skeleton key={i} className="h-36 rounded-xl" />
          ))}
        </div>
      )}
      {variant === "form" && (
        <div className="max-w-xl space-y-4 rounded-xl border border-border bg-card p-5">
          {Array.from({ length: 4 }, (_, i) => (
            <div key={i} className="space-y-2">
              <Skeleton className="h-3 w-24 rounded-md" />
              <Skeleton className="h-11 rounded-lg" />
            </div>
          ))}
          <Skeleton className="h-11 w-32 rounded-lg" />
        </div>
      )}
    </div>
  );
}
