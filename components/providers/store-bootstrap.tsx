"use client";

import { useEffect } from "react";
import { initStore } from "@/lib/storage/data-store";
import { hideSplash } from "@/lib/native/chrome";

/**
 * Inizializza il data store client una sola volta all'avvio: stabilisce se
 * esiste gia' un bundle (→ unlock) o serve il primo setup. Non renderizza nulla.
 */
export function StoreBootstrap() {
  useEffect(() => {
    // The native splash stays up until we know which screen to show.
    void initStore().finally(() => void hideSplash());
    if (process.env.NODE_ENV === "development") {
      // Dev-only helper to review the UI with realistic data: run
      // `await __fgSeedDemo()` in the console of an unlocked, empty vault.
      (window as unknown as Record<string, unknown>).__fgSeedDemo = async () => {
        const { seedDemoData } = await import("@/lib/dev/demo-data");
        return seedDemoData();
      };
    }
  }, []);
  return null;
}
