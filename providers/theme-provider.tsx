"use client";

import {
  createContext,
  useContext,
  useMemo,
  useSyncExternalStore,
  type ReactNode,
} from "react";
import {
  THEME_BACKGROUND_HEX,
  THEME_STORAGE_KEY,
  isThemePreference,
  type ResolvedTheme,
  type ThemePreference,
} from "@/lib/theme";

interface ThemeContextValue {
  /** User preference (light / dark / follow the system). */
  theme: ThemePreference;
  /** Theme actually applied right now. */
  resolvedTheme: ResolvedTheme;
  setTheme: (theme: ThemePreference) => void;
}

const DARK_QUERY = "(prefers-color-scheme: dark)";

/* ------------------------------------------------------------------ */
/* External store: localStorage preference + OS color scheme.          */
/* The <html> class is updated here (outside React) so it never flips  */
/* during hydration; THEME_INIT_SCRIPT handles the very first paint.   */
/* ------------------------------------------------------------------ */

const listeners = new Set<() => void>();

function readPreference(): ThemePreference {
  try {
    const stored = window.localStorage.getItem(THEME_STORAGE_KEY);
    return isThemePreference(stored) ? stored : "system";
  } catch {
    return "system";
  }
}

function readSystemDark(): boolean {
  return window.matchMedia(DARK_QUERY).matches;
}

function resolve(pref: ThemePreference, systemDark: boolean): ResolvedTheme {
  return pref === "system" ? (systemDark ? "dark" : "light") : pref;
}

function applyToDocument() {
  const resolved = resolve(readPreference(), readSystemDark());
  document.documentElement.classList.toggle("dark", resolved === "dark");
  // Keep browser chrome / PWA title bar in sync with the chosen theme,
  // overriding the media-based <meta name="theme-color"> defaults.
  document
    .querySelectorAll<HTMLMetaElement>('meta[name="theme-color"]')
    .forEach((meta) => {
      meta.content = THEME_BACKGROUND_HEX[resolved];
    });
}

function emit() {
  applyToDocument();
  listeners.forEach((listener) => listener());
}

function subscribe(listener: () => void) {
  if (listeners.size === 0) {
    applyToDocument();
  }
  listeners.add(listener);
  const mql = window.matchMedia(DARK_QUERY);
  // Another window (e.g. a second Electron window) changed the preference.
  const onStorage = (e: StorageEvent) => {
    if (e.key === THEME_STORAGE_KEY) emit();
  };
  mql.addEventListener("change", emit);
  window.addEventListener("storage", onStorage);
  return () => {
    listeners.delete(listener);
    mql.removeEventListener("change", emit);
    window.removeEventListener("storage", onStorage);
  };
}

function setTheme(next: ThemePreference) {
  try {
    window.localStorage.setItem(THEME_STORAGE_KEY, next);
  } catch {
    // Storage unavailable (private mode): nothing to persist.
  }
  emit();
}

/* ------------------------------------------------------------------ */

const ThemeContext = createContext<ThemeContextValue | null>(null);

export function ThemeProvider({ children }: { children: ReactNode }) {
  const theme = useSyncExternalStore(
    subscribe,
    readPreference,
    () => "system" as const
  );
  const systemDark = useSyncExternalStore(
    subscribe,
    readSystemDark,
    () => false
  );
  const resolvedTheme = resolve(theme, systemDark);

  const value = useMemo(
    () => ({ theme, resolvedTheme, setTheme }),
    [theme, resolvedTheme]
  );

  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>;
}

export function useTheme(): ThemeContextValue {
  const ctx = useContext(ThemeContext);
  if (!ctx) throw new Error("useTheme must be used within ThemeProvider");
  return ctx;
}
