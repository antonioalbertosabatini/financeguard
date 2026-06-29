"use client";

import { useSyncExternalStore } from "react";
import {
  getSyncState,
  subscribeSyncState,
  type SyncState,
} from "@/lib/sync/sync-state";

export function useSyncState(): SyncState {
  return useSyncExternalStore(subscribeSyncState, getSyncState, getSyncState);
}
