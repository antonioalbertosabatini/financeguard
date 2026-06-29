"use client";

import { useEffect } from "react";
import { useDataStore } from "@/lib/storage/data-store";
import { hasCloudSession, isCloudConfigured } from "@/lib/sync/cloud-sync";
import {
  refreshSessionHeartbeat,
  releaseSessionLock,
  SESSION_HEARTBEAT_INTERVAL_MS,
} from "@/lib/sync/session-lock";
import { resetSyncState } from "@/lib/sync/sync-state";
import {
  scheduleSync,
  syncNow,
} from "@/lib/sync/sync-orchestrator";

export function CloudSyncProvider({
  children,
}: {
  children: React.ReactNode;
}) {
  const { status, version } = useDataStore();

  useEffect(() => {
    if (status !== "unlocked") {
      resetSyncState();
      return;
    }

    if (!isCloudConfigured()) return;

    void hasCloudSession().then((signedIn) => {
      if (signedIn) void syncNow("unlock");
    });
  }, [status]);

  useEffect(() => {
    if (status !== "unlocked" || !isCloudConfigured()) return;
    scheduleSync("data-change", 3000);
  }, [version, status]);

  useEffect(() => {
    if (status !== "unlocked" || !isCloudConfigured()) return;

    const onOnline = () => void syncNow("online");
    const onVisible = () => {
      if (document.visibilityState === "visible") void syncNow("foreground");
    };

    window.addEventListener("online", onOnline);
    document.addEventListener("visibilitychange", onVisible);
    return () => {
      window.removeEventListener("online", onOnline);
      document.removeEventListener("visibilitychange", onVisible);
    };
  }, [status]);

  useEffect(() => {
    if (status !== "unlocked" || !isCloudConfigured()) return;

    const interval = setInterval(() => {
      void hasCloudSession().then((signedIn) => {
        if (signedIn) void refreshSessionHeartbeat().catch(() => {});
      });
    }, SESSION_HEARTBEAT_INTERVAL_MS);

    return () => clearInterval(interval);
  }, [status]);

  useEffect(() => {
    const release = () => {
      void releaseSessionLock();
    };
    window.addEventListener("beforeunload", release);
    window.addEventListener("pagehide", release);
    return () => {
      window.removeEventListener("beforeunload", release);
      window.removeEventListener("pagehide", release);
    };
  }, []);

  return children;
}
