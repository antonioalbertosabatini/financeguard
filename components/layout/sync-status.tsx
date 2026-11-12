"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import {
  Cloud,
  CloudAlert,
  CloudOff,
  HardDrive,
  RefreshCw,
  type LucideIcon,
} from "lucide-react";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { hasCloudSession } from "@/lib/sync/cloud-sync";
import { isCloudConfigured } from "@/lib/sync/supabase-client";
import { useSyncState } from "@/lib/sync/use-sync-state";
import { useI18n } from "@/providers/i18n-provider";
import { cn } from "@/lib/utils";
import type { MessageKey } from "@/lib/i18n/types";

type Tone = "success" | "warning" | "danger" | "neutral";

interface ResolvedStatus {
  icon: LucideIcon;
  label: MessageKey;
  tone: Tone;
  spinning?: boolean;
}

const TONE: Record<Tone, string> = {
  success: "bg-success-soft text-success",
  warning: "bg-warning-soft text-warning",
  danger: "bg-danger-soft text-danger",
  neutral: "bg-surface-2 text-muted-foreground",
};

function useResolvedStatus(): { status: ResolvedStatus; lastSyncedAt: string | null } {
  const configured = isCloudConfigured();
  const sync = useSyncState();
  const [signedIn, setSignedIn] = useState<boolean | null>(null);

  useEffect(() => {
    if (!configured) return;
    let cancelled = false;
    hasCloudSession()
      .then((v) => !cancelled && setSignedIn(v))
      .catch(() => !cancelled && setSignedIn(false));
    return () => {
      cancelled = true;
    };
  }, [configured, sync.status, sync.lastSyncedAt]);

  let status: ResolvedStatus;
  if (!configured || signedIn !== true) {
    // No cloud session = the app works locally. Warnings about a missing
    // cloud connection are CloudSyncAlert's job (and user-configurable).
    status = { icon: HardDrive, label: "nav.status.local", tone: "neutral" };
  } else if (sync.status === "syncing") {
    status = { icon: RefreshCw, label: "nav.status.syncing", tone: "neutral", spinning: true };
  } else if (sync.status === "error" || sync.lastError) {
    status = { icon: CloudAlert, label: "nav.status.error", tone: "danger" };
  } else if (sync.status === "blocked") {
    status = { icon: CloudAlert, label: "nav.status.blocked", tone: "warning" };
  } else if (sync.status === "offline") {
    status = { icon: CloudOff, label: "nav.status.offline", tone: "warning" };
  } else {
    status = { icon: Cloud, label: "nav.status.synced", tone: "success" };
  }
  return { status, lastSyncedAt: configured && signedIn === true ? sync.lastSyncedAt : null };
}

/** Sync / storage status card shown at the bottom of the desktop sidebar. */
export function SyncStatus({ compact = false }: { compact?: boolean }) {
  const { t, locale } = useI18n();
  const { status, lastSyncedAt } = useResolvedStatus();
  const Icon = status.icon;

  const detail = lastSyncedAt
    ? t("nav.status.syncedAt", {
        time: new Date(lastSyncedAt).toLocaleTimeString(locale, {
          hour: "2-digit",
          minute: "2-digit",
        }),
      })
    : status.label === "nav.status.local"
      ? t("nav.status.localDetail")
      : t("nav.status.encrypted");

  const badge = (
    <span
      className={cn(
        "flex size-8 shrink-0 items-center justify-center rounded-lg",
        TONE[status.tone]
      )}
    >
      <Icon className={cn("size-4", status.spinning && "animate-spin")} aria-hidden="true" />
    </span>
  );

  const content = (
    <Link
      href="/profile"
      aria-label={compact ? `${t(status.label)} — ${detail}` : undefined}
      className={cn(
        "pressable flex items-center gap-2.5 rounded-xl border border-sidebar-border bg-card outline-none hover:bg-surface-2 focus-visible:ring-2 focus-visible:ring-ring",
        compact ? "justify-center p-1.5" : "p-2.5"
      )}
    >
      {badge}
      {!compact && (
        <span className="min-w-0">
          <span className="block truncate text-[0.8125rem] font-semibold">
            {t(status.label)}
          </span>
          <span className="block truncate text-xs text-muted-foreground">{detail}</span>
        </span>
      )}
    </Link>
  );

  if (!compact) return content;
  return (
    <Tooltip>
      <TooltipTrigger asChild>{content}</TooltipTrigger>
      <TooltipContent side="right">
        {t(status.label)} · {detail}
      </TooltipContent>
    </Tooltip>
  );
}
