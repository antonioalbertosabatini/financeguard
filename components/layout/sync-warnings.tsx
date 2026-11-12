"use client";

import { useState } from "react";
import { AlertTriangle, X } from "lucide-react";
import { useI18n } from "@/providers/i18n-provider";

export function SyncWarnings({ warnings }: { warnings: string[] }) {
  const { t } = useI18n();
  const [dismissed, setDismissed] = useState<Set<number>>(new Set());

  const visible = warnings
    .map((message, index) => ({ message, index }))
    .filter(({ message, index }) => message.trim() !== "" && !dismissed.has(index));

  if (visible.length === 0) return null;

  return (
    <div className="mb-6 space-y-3">
      {visible.map(({ message, index }) => (
        <div
          key={index}
          role="alert"
          className="flex items-start gap-3 rounded-xl bg-warning-soft p-4 text-sm text-warning"
        >
          <AlertTriangle className="mt-0.5 size-4 shrink-0" aria-hidden="true" />
          <p className="flex-1 leading-relaxed">{message}</p>
          <button
            type="button"
            aria-label={t("common.dismissWarning")}
            onClick={() =>
              setDismissed((prev) => new Set(prev).add(index))
            }
            className="rounded-md p-1 text-warning/70 transition-colors hover:bg-warning/15 hover:text-warning"
          >
            <X className="size-4" />
          </button>
        </div>
      ))}
    </div>
  );
}
