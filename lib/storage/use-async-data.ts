"use client";

import { useCallback, useEffect, useState, type DependencyList } from "react";
import { useDataStore } from "@/lib/storage/data-store";

export interface AsyncData<T> {
  data: T | null;
  loading: boolean;
  /** Technical message of the last failure (null when the error has no message). */
  error: string | null;
  /** True when the last load failed, even if `error` has no message. */
  failed: boolean;
}

export interface AsyncDataResult<T> extends AsyncData<T> {
  /** Runs the loader again (e.g. from an error state's "Retry" button). */
  reload: () => void;
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
): AsyncDataResult<T> {
  const { version, status } = useDataStore();
  const [attempt, setAttempt] = useState(0);
  const [state, setState] = useState<AsyncData<T>>({
    data: null,
    loading: true,
    error: null,
    failed: false,
  });

  useEffect(() => {
    if (status !== "unlocked") return;
    let cancelled = false;
    setState((prev) => ({
      ...prev,
      loading: prev.data === null,
      error: null,
      failed: false,
    }));
    loader().then(
      (data) => {
        if (!cancelled) setState({ data, loading: false, error: null, failed: false });
      },
      (err: unknown) => {
        if (!cancelled) {
          setState({
            data: null,
            loading: false,
            error: err instanceof Error ? err.message : null,
            failed: true,
          });
        }
      }
    );
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [version, status, attempt, ...deps]);

  const reload = useCallback(() => setAttempt((n) => n + 1), []);

  return { ...state, reload };
}
