"use client";

import { useEffect } from "react";
import { initStore } from "@/lib/storage/data-store";

/**
 * Inizializza il data store client una sola volta all'avvio: stabilisce se
 * esiste gia' un bundle (→ unlock) o serve il primo setup. Non renderizza nulla.
 */
export function StoreBootstrap() {
  useEffect(() => {
    void initStore();
  }, []);
  return null;
}
