"use client";

import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useSyncExternalStore,
  type ReactNode,
} from "react";

const STORAGE_KEY = "financeguard:amounts-hidden";
const STORAGE_EVENT = "financeguard:amounts-hidden-change";

type AmountVisibilityContextValue = {
  amountsHidden: boolean;
  toggleAmountsVisibility: () => void;
  setAmountsHidden: (hidden: boolean) => void;
};

const AmountVisibilityContext =
  createContext<AmountVisibilityContextValue | null>(null);

function readStoredHidden(): boolean {
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored === "false") return false;
    return true;
  } catch {
    return true;
  }
}

function writeStoredHidden(hidden: boolean) {
  try {
    localStorage.setItem(STORAGE_KEY, String(hidden));
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

export function AmountVisibilityProvider({ children }: { children: ReactNode }) {
  const amountsHidden = useSyncExternalStore(
    subscribe,
    readStoredHidden,
    getServerSnapshot
  );

  const setAmountsHidden = useCallback((hidden: boolean) => {
    writeStoredHidden(hidden);
  }, []);

  const toggleAmountsVisibility = useCallback(() => {
    writeStoredHidden(!readStoredHidden());
  }, []);

  const value = useMemo(
    () => ({ amountsHidden, toggleAmountsVisibility, setAmountsHidden }),
    [amountsHidden, toggleAmountsVisibility, setAmountsHidden]
  );

  return (
    <AmountVisibilityContext.Provider value={value}>
      {children}
    </AmountVisibilityContext.Provider>
  );
}

export function useAmountVisibility() {
  const ctx = useContext(AmountVisibilityContext);
  if (!ctx) {
    throw new Error(
      "useAmountVisibility must be used within AmountVisibilityProvider"
    );
  }
  return ctx;
}
