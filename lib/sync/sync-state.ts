/**
 * Stato osservabile del sync automatico (per UI e banner).
 */
export type SyncStatus = "idle" | "syncing" | "error" | "blocked" | "offline";

export interface SyncState {
  status: SyncStatus;
  lastSyncedAt: string | null;
  lastError: string | null;
  warnings: string[];
  activeDeviceName: string | null;
  isSessionOwner: boolean;
}

const initialState: SyncState = {
  status: "idle",
  lastSyncedAt: null,
  lastError: null,
  warnings: [],
  activeDeviceName: null,
  isSessionOwner: false,
};

let state: SyncState = { ...initialState };
const listeners = new Set<() => void>();

function emit(): void {
  for (const listener of listeners) listener();
}

export function getSyncState(): SyncState {
  return state;
}

export function subscribeSyncState(listener: () => void): () => void {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

export function patchSyncState(patch: Partial<SyncState>): void {
  state = { ...state, ...patch };
  emit();
}

export function addSyncWarning(message: string): void {
  if (state.warnings.includes(message)) return;
  patchSyncState({ warnings: [...state.warnings, message] });
}

export function clearSyncWarnings(): void {
  if (state.warnings.length === 0) return;
  patchSyncState({ warnings: [] });
}

export function resetSyncState(): void {
  state = { ...initialState };
  emit();
}
