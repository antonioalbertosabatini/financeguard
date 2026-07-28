import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const downloadRemoteBundle = vi.fn();
const uploadBundle = vi.fn();
const getRemoteRevision = vi.fn();
const hasCloudSession = vi.fn();
const isCloudConfigured = vi.fn();
const acquireSessionLock = vi.fn();
const refreshSessionHeartbeat = vi.fn();
const persistNow = vi.fn();
const advanceRevisionBase = vi.fn();
const getSyncContext = vi.fn();
const isUnlocked = vi.fn();
const adapterLoad = vi.fn();

vi.mock("@/lib/sync/cloud-sync", () => ({
  downloadRemoteBundle: (...args: unknown[]) => downloadRemoteBundle(...args),
  uploadBundle: (...args: unknown[]) => uploadBundle(...args),
  getRemoteRevision: (...args: unknown[]) => getRemoteRevision(...args),
  hasCloudSession: (...args: unknown[]) => hasCloudSession(...args),
  isCloudConfigured: (...args: unknown[]) => isCloudConfigured(...args),
}));

vi.mock("@/lib/sync/session-lock", () => ({
  acquireSessionLock: (...args: unknown[]) => acquireSessionLock(...args),
  refreshSessionHeartbeat: (...args: unknown[]) =>
    refreshSessionHeartbeat(...args),
  SessionLockedError: class SessionLockedError extends Error {
    activeDeviceName: string | null;
    constructor(message: string, activeDeviceName: string | null = null) {
      super(message);
      this.activeDeviceName = activeDeviceName;
    }
  },
}));

vi.mock("@/lib/sync/sync-state", () => ({
  clearSyncWarnings: vi.fn(),
  patchSyncState: vi.fn(),
}));

vi.mock("@/lib/storage/idb-adapter", () => ({
  IndexedDbAdapter: class {
    load() {
      return adapterLoad();
    }
  },
}));

vi.mock("@/lib/storage/data-store", () => ({
  adoptCloudVault: vi.fn(),
  advanceRevisionBase: (...args: unknown[]) => advanceRevisionBase(...args),
  applySyncedDataset: vi.fn(),
  getSyncContext: (...args: unknown[]) => getSyncContext(...args),
  isUnlocked: (...args: unknown[]) => isUnlocked(...args),
  persistNow: (...args: unknown[]) => persistNow(...args),
}));

vi.mock("@/lib/storage/bundle", () => ({
  openBundleText: vi.fn(),
  revisionOf: (text: string) => {
    const parsed = JSON.parse(text) as { revision: number };
    return parsed.revision;
  },
}));

describe("sync orchestrator push-only", () => {
  beforeEach(() => {
    vi.resetModules();
    downloadRemoteBundle.mockReset();
    uploadBundle.mockReset();
    getRemoteRevision.mockReset();
    hasCloudSession.mockReset();
    isCloudConfigured.mockReset();
    acquireSessionLock.mockReset();
    refreshSessionHeartbeat.mockReset();
    persistNow.mockReset();
    advanceRevisionBase.mockReset();
    getSyncContext.mockReset();
    isUnlocked.mockReset();
    adapterLoad.mockReset();

    Object.defineProperty(globalThis, "navigator", {
      configurable: true,
      value: { onLine: true },
    });

    isCloudConfigured.mockReturnValue(true);
    isUnlocked.mockReturnValue(true);
    hasCloudSession.mockResolvedValue(true);
    acquireSessionLock.mockResolvedValue(undefined);
    refreshSessionHeartbeat.mockResolvedValue(undefined);
    persistNow.mockResolvedValue(undefined);
    getSyncContext.mockReturnValue({
      key: new Uint8Array([1]),
      vault: { salt: "local-salt", verifier: "v", kdf: "scrypt" },
      revision: 1,
      dataset: { accounts: [] },
      deviceId: "dev-a",
      password: "password-long-enough",
    });
    adapterLoad.mockResolvedValue(
      JSON.stringify({ app: "financeguard", revision: 1 })
    );
    getRemoteRevision.mockResolvedValue(10);
    uploadBundle.mockResolvedValue(undefined);
    advanceRevisionBase.mockImplementation(async () => {
      adapterLoad.mockResolvedValue(
        JSON.stringify({ app: "financeguard", revision: 11 })
      );
    });
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  it("skips download and uploads when mode is push-only", async () => {
    const { syncNow } = await import("@/lib/sync/sync-orchestrator");

    const result = await syncNow("import", { mode: "push-only" });

    expect(result).toEqual({ ok: true, merged: false, pushed: true });
    expect(downloadRemoteBundle).not.toHaveBeenCalled();
    expect(advanceRevisionBase).toHaveBeenCalledWith(10);
    expect(uploadBundle).toHaveBeenCalledWith(
      JSON.stringify({ app: "financeguard", revision: 11 }),
      11
    );
  });

  it("uses push-only when local override is active even without options", async () => {
    const {
      beginLocalOverrideSync,
      clearLocalOverrideSync,
      syncNow,
    } = await import("@/lib/sync/sync-orchestrator");

    beginLocalOverrideSync();
    const result = await syncNow("unlock");
    expect(result.pushed).toBe(true);
    expect(downloadRemoteBundle).not.toHaveBeenCalled();
    expect(uploadBundle).toHaveBeenCalled();
    clearLocalOverrideSync();
  });

  it("cancelScheduledSync prevents a pending scheduleSync from running", async () => {
    vi.useFakeTimers();
    const { cancelScheduledSync, scheduleSync } = await import(
      "@/lib/sync/sync-orchestrator"
    );

    scheduleSync("data-change", 3000);
    cancelScheduledSync();
    await vi.advanceTimersByTimeAsync(3000);

    expect(downloadRemoteBundle).not.toHaveBeenCalled();
    expect(uploadBundle).not.toHaveBeenCalled();
    vi.useRealTimers();
  });
});
