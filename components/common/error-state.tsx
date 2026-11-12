"use client";

import { AlertTriangle, RotateCw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useI18n } from "@/providers/i18n-provider";
import { cn } from "@/lib/utils";

interface ErrorStateProps {
  /** Technical message (shown small, for bug reports). */
  message?: string | null;
  onRetry?: () => void;
  className?: string;
}

/** Shown when a page's data fails to load, instead of an endless spinner. */
export function ErrorState({ message, onRetry, className }: ErrorStateProps) {
  const { t } = useI18n();
  return (
    <div
      role="alert"
      className={cn(
        "mx-auto flex max-w-md flex-col items-center px-6 py-16 text-center",
        className
      )}
    >
      <span className="flex size-12 items-center justify-center rounded-2xl bg-danger-soft text-danger">
        <AlertTriangle className="size-6" aria-hidden="true" />
      </span>
      <h2 className="mt-4 text-section">{t("states.errorTitle")}</h2>
      <p className="mt-1 text-sm text-muted-foreground">
        {t("states.errorDescription")}
      </p>
      {message && (
        <p className="mt-3 max-w-full rounded-lg bg-surface-2 px-3 py-2 font-mono text-xs break-words text-muted-foreground">
          {message}
        </p>
      )}
      {onRetry && (
        <Button className="mt-5" onClick={onRetry}>
          <RotateCw />
          {t("states.retry")}
        </Button>
      )}
    </div>
  );
}
