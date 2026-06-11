"use client";

import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useSyncExternalStore,
  type ReactNode,
} from "react";

const STORAGE_KEY = "financeguard:sidebar-open";
const STORAGE_EVENT = "financeguard:sidebar-open-change";

type SidebarContextValue = {
  sidebarOpen: boolean;
  toggleSidebar: () => void;
  setSidebarOpen: (open: boolean) => void;
};

const SidebarContext = createContext<SidebarContextValue | null>(null);

function readStoredOpen(): boolean {
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored === "false") return false;
    return true;
  } catch {
    return true;
  }
}

function writeStoredOpen(open: boolean) {
  try {
    localStorage.setItem(STORAGE_KEY, String(open));
    window.dispatchEvent(new Event(STORAGE_EVENT));
  } catch {
    // ignore storage errors
  }
}

function subscribe(onStoreChange: () => void) {
  window.addEventListener(STORAGE_EVENT, onStoreChange);
  window.addEventListener("storage", onStoreChange);
  return () => {
    window.removeEventListener(STORAGE_EVENT, onStoreChange);
    window.removeEventListener("storage", onStoreChange);
  };
}

function getServerSnapshot() {
  return true;
}

export function SidebarProvider({ children }: { children: ReactNode }) {
  const sidebarOpen = useSyncExternalStore(
    subscribe,
    readStoredOpen,
    getServerSnapshot
  );

  const setSidebarOpen = useCallback((open: boolean) => {
    writeStoredOpen(open);
  }, []);

  const toggleSidebar = useCallback(() => {
    writeStoredOpen(!readStoredOpen());
  }, []);

  const value = useMemo(
    () => ({ sidebarOpen, toggleSidebar, setSidebarOpen }),
    [sidebarOpen, toggleSidebar, setSidebarOpen]
  );

  return (
    <SidebarContext.Provider value={value}>{children}</SidebarContext.Provider>
  );
}

export function useSidebar() {
  const ctx = useContext(SidebarContext);
  if (!ctx) {
    throw new Error("useSidebar must be used within SidebarProvider");
  }
  return ctx;
}
