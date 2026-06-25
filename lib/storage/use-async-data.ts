"use client";

import { useEffect, useState, type DependencyList } from "react";
import { useDataStore } from "@/lib/storage/data-store";

export interface AsyncData<T> {
  data: T | null;
  loading: boolean;
  error: string | null;
}

/**
 * Carica dati derivati dal dataset client (es. getDashboardData) e li ricalcola
 * automaticamente quando il dataset cambia (version) oltre che quando cambiano
 * le dipendenze passate (es. l'anno). Sostituisce il fetching server-side delle
 * pagine, mantenendo le stesse funzioni di lib/actions.
 */
export function useAsyncData<T>(
  loader: () => Promise<T>,
  deps: DependencyList
): AsyncData<T> {
  const { version, status } = useDataStore();
  const [state, setState] = useState<AsyncData<T>>({
    data: null,
    loading: true,
    error: null,
  });

  useEffect(() => {
    if (status !== "unlocked") return;
    let cancelled = false;
    setState((prev) => ({ ...prev, loading: true }));
    loader().then(
      (data) => {
        if (!cancelled) setState({ data, loading: false, error: null });
      },
      (err: unknown) => {
        if (!cancelled) {
          setState({
            data: null,
            loading: false,
            error: err instanceof Error ? err.message : "Errore",
          });
        }
      }
    );
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [version, status, ...deps]);

  return state;
}
