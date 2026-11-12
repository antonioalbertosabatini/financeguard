"use client";

import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useSyncExternalStore,
  type ReactNode,
} from "react";

/**
 * Desktop sidebar has three states:
 * - "expanded": icons + labels (default)
 * - "collapsed": icons only, labels in tooltips
 * - "hidden": no sidebar, content uses the full width
 */
export type SidebarMode = "expanded" | "collapsed" | "hidden";

const STORAGE_KEY = "financeguard:sidebar-mode";
/** Pre-restyling key (boolean "open"), migrated on first read. */
const LEGACY_KEY = "financeguard:sidebar-open";
/** Remembers the last visible mode so "show" restores it. */
const LAST_VISIBLE_KEY = "financeguard:sidebar-last-visible";
const STORAGE_EVENT = "financeguard:sidebar-mode-change";

type SidebarContextValue = {
  mode: SidebarMode;
  /** True when the sidebar takes space on screen (expanded or collapsed). */
  sidebarVisible: boolean;
  setMode: (mode: SidebarMode) => void;
  /** expanded ⇄ collapsed (keyboard shortcut, in-sidebar button). */
  toggleCollapsed: () => void;
  /** hidden ⇄ last visible mode (header button). */
  toggleHidden: () => void;
};

const SidebarContext = createContext<SidebarContextValue | null>(null);

function isMode(value: unknown): value is SidebarMode {
  return value === "expanded" || value === "collapsed" || value === "hidden";
}

function readMode(): SidebarMode {
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (isMode(stored)) return stored;
    if (localStorage.getItem(LEGACY_KEY) === "false") return "hidden";
  } catch {
    // ignore storage errors
  }
  return "expanded";
}

function readLastVisible(): Exclude<SidebarMode, "hidden"> {
  try {
    const stored = localStorage.getItem(LAST_VISIBLE_KEY);
    if (stored === "collapsed") return "collapsed";
  } catch {
    // ignore storage errors
  }
  return "expanded";
}

function writeMode(mode: SidebarMode) {
  try {
    localStorage.setItem(STORAGE_KEY, mode);
    if (mode !== "hidden") localStorage.setItem(LAST_VISIBLE_KEY, mode);
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

function getServerSnapshot(): SidebarMode {
  return "expanded";
}

export function SidebarProvider({ children }: { children: ReactNode }) {
  const mode = useSyncExternalStore(subscribe, readMode, getServerSnapshot);

  const setMode = useCallback((next: SidebarMode) => writeMode(next), []);

  const toggleCollapsed = useCallback(() => {
    const current = readMode();
    writeMode(current === "expanded" ? "collapsed" : "expanded");
  }, []);

  const toggleHidden = useCallback(() => {
    const current = readMode();
    writeMode(current === "hidden" ? readLastVisible() : "hidden");
  }, []);

  const value = useMemo(
    () => ({
      mode,
      sidebarVisible: mode !== "hidden",
      setMode,
      toggleCollapsed,
      toggleHidden,
    }),
    [mode, setMode, toggleCollapsed, toggleHidden]
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
