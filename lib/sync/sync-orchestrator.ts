/**
 * Orchestratore sync automatico: pull, merge client-side, push.
 */
import { decryptBundleWithKey } from "@/lib/storage/bundle";
import { IndexedDbAdapter } from "@/lib/storage/idb-adapter";
import {
  applySyncedDataset,
  getSyncContext,
  isUnlocked,
  persistNow,
} from "@/lib/storage/data-store";
import type { Dataset } from "@/lib/storage/dataset";
import {
  datasetsDiffer,
  mergeDatasets,
} from "@/lib/sync/merge-datasets";
import {
  acquireSessionLock,
  refreshSessionHeartbeat,
  SessionLockedError,
} from "@/lib/sync/session-lock";
import {
  addSyncWarning,
  clearSyncWarnings,
  patchSyncState,
} from "@/lib/sync/sync-state";
import {
  downloadRemoteBundle,
  getRemoteRevision,
  hasCloudSession,
  isCloudConfigured,
  uploadBundle,
} from "@/lib/sync/cloud-sync";

export interface SyncResult {
  ok: boolean;
  merged: boolean;
  pushed: boolean;
  error?: string;
}

let syncChain: Promise<SyncResult> = Promise.resolve({
  ok: true,
  merged: false,
  pushed: false,
});
let syncDebounceTimer: ReturnType<typeof setTimeout> | null = null;

function revisionOf(bundleText: string): number {
  try {
    const rev = (JSON.parse(bundleText) as { revision?: number }).revision;
    return typeof rev === "number" ? rev : 0;
  } catch {
    return 0;
  }
}

export async function syncNow(reason?: string): Promise<SyncResult> {
  void reason;
  syncChain = syncChain.then(() => runSync());
  return syncChain;
}

export function scheduleSync(reason: string, debounceMs = 3000): void {
  if (syncDebounceTimer) clearTimeout(syncDebounceTimer);
  syncDebounceTimer = setTimeout(() => {
    syncDebounceTimer = null;
    void syncNow(reason);
  }, debounceMs);
}

async function runSync(): Promise<SyncResult> {
  if (!isCloudConfigured()) {
    return { ok: true, merged: false, pushed: false };
  }

  if (!isUnlocked()) {
    return { ok: true, merged: false, pushed: false };
  }

  const hasSession = await hasCloudSession().catch(() => false);
  if (!hasSession) {
    patchSyncState({ status: "idle", isSessionOwner: false });
    return { ok: true, merged: false, pushed: false };
  }

  if (typeof navigator !== "undefined" && !navigator.onLine) {
    patchSyncState({ status: "offline" });
    return { ok: true, merged: false, pushed: false };
  }

  const ctx = getSyncContext();
  if (!ctx) {
    return { ok: true, merged: false, pushed: false };
  }

  patchSyncState({ status: "syncing", lastError: null });
  clearSyncWarnings();

  try {
    await acquireSessionLock();
    await refreshSessionHeartbeat();
    await persistNow();

    const adapter = new IndexedDbAdapter();
    const localText = await adapter.load();
    if (!localText) {
      patchSyncState({
        status: "idle",
        isSessionOwner: true,
        lastSyncedAt: new Date().toISOString(),
      });
      return { ok: true, merged: false, pushed: false };
    }

    const localRevision = revisionOf(localText);
    const remoteRevision = await getRemoteRevision();
    let merged = false;

    if (remoteRevision !== null) {
      const remoteText = await downloadRemoteBundle();
      if (remoteText) {
        const remoteOpened = await decryptBundleWithKey<Dataset>(
          remoteText,
          ctx.key
        );
        const mergedDataset = mergeDatasets(ctx.dataset, remoteOpened.dataset);

        if (datasetsDiffer(ctx.dataset, mergedDataset)) {
          const baseRevision = Math.max(localRevision, remoteOpened.revision);
          await applySyncedDataset(mergedDataset, baseRevision);
          merged = true;
        } else if (remoteOpened.revision > localRevision) {
          await applySyncedDataset(mergedDataset, remoteOpened.revision);
          merged = true;
        }
      }
    }

    const freshText = await adapter.load();
    if (!freshText) {
      throw new Error("Bundle locale non disponibile dopo il merge.");
    }

    const finalRevision = revisionOf(freshText);
    await uploadBundle(freshText, finalRevision);

    patchSyncState({
      status: "idle",
      lastSyncedAt: new Date().toISOString(),
      isSessionOwner: true,
      activeDeviceName: null,
    });

    return { ok: true, merged, pushed: true };
  } catch (err) {
    if (err instanceof SessionLockedError) {
      patchSyncState({
        status: "blocked",
        lastError: err.message,
        isSessionOwner: false,
        activeDeviceName: err.activeDeviceName,
      });
      addSyncWarning(err.message);
      return { ok: false, merged: false, pushed: false, error: err.message };
    }

    const message = err instanceof Error ? err.message : "Errore sync";
    patchSyncState({ status: "error", lastError: message });
    addSyncWarning(message);
    return { ok: false, merged: false, pushed: false, error: message };
  }
}
