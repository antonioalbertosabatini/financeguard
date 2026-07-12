/**
 * Orchestratore sync automatico: pull, merge client-side, push.
 */
import { AppError } from "@/lib/i18n/app-error";
import { openBundleText, revisionOf } from "@/lib/storage/bundle";
import { IndexedDbAdapter } from "@/lib/storage/idb-adapter";
import {
  adoptCloudVault,
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
import { formatSyncError } from "@/lib/sync/format-sync-error";
import { clearSyncWarnings, patchSyncState } from "@/lib/sync/sync-state";
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

  if (!ctx.password) {
    throw new AppError("errors.lockAndUnlockRequired");
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
        const remoteOpened = await openBundleText<Dataset>(
          remoteText,
          ctx.password
        );
        if (!remoteOpened) {
          throw new AppError("errors.decryptVaultFailed");
        }

        const mergedDataset = mergeDatasets(ctx.dataset, remoteOpened.dataset);
        const vaultMismatch = remoteOpened.vault.salt !== ctx.vault.salt;

        if (datasetsDiffer(ctx.dataset, mergedDataset)) {
          const baseRevision = Math.max(localRevision, remoteOpened.revision);
          if (vaultMismatch) {
            await adoptCloudVault(
              mergedDataset,
              baseRevision,
              remoteOpened.key,
              remoteOpened.vault
            );
          } else {
            await applySyncedDataset(mergedDataset, baseRevision);
          }
          merged = true;
        } else if (remoteOpened.revision > localRevision) {
          if (vaultMismatch) {
            await adoptCloudVault(
              mergedDataset,
              remoteOpened.revision,
              remoteOpened.key,
              remoteOpened.vault
            );
          } else {
            await applySyncedDataset(mergedDataset, remoteOpened.revision);
          }
          merged = true;
        } else if (vaultMismatch && localRevision <= 1) {
          await adoptCloudVault(
            remoteOpened.dataset,
            remoteOpened.revision,
            remoteOpened.key,
            remoteOpened.vault
          );
          merged = true;
        }
      }
    }

    const freshText = await adapter.load();
    if (!freshText) {
      throw new AppError("errors.localBundleMissing");
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
    const message = formatSyncError(err);

    if (err instanceof SessionLockedError) {
      patchSyncState({
        status: "blocked",
        lastError: message,
        isSessionOwner: false,
        activeDeviceName: err.activeDeviceName,
      });
      return { ok: false, merged: false, pushed: false, error: message };
    }

    patchSyncState({ status: "error", lastError: message });
    return { ok: false, merged: false, pushed: false, error: message };
  }
}
