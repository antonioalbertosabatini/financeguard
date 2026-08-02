"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { loadQuotes } from "@/lib/market";
import { setRuntimeMarketConfig } from "@/lib/market/config";
import type { Instrument } from "@/lib/schemas/instrument";
import type { Settings } from "@/lib/schemas/settings";
import type { FxRates, QuoteMap } from "@/lib/utils/portfolio";

interface MarketQuotesState {
  quotes: QuoteMap;
  rates: FxRates;
  loading: boolean;
  hasErrors: boolean;
}

const INITIAL: MarketQuotesState = {
  quotes: {},
  rates: {},
  loading: true,
  hasErrors: false,
};

/**
 * Carica quotazioni e cambi per gli strumenti indicati.
 *
 * Non blocca la pagina: al primo giro serve la cache locale, poi arrivano i
 * valori aggiornati. Un fallimento di rete lascia in piedi gli ultimi prezzi
 * noti invece di svuotare la vista.
 */
export function useMarketQuotes(
  instruments: Instrument[],
  settings: Pick<Settings, "marketProvider" | "marketApiKey">
) {
  const [state, setState] = useState<MarketQuotesState>(INITIAL);
  const { marketProvider, marketApiKey } = settings;

  // Gli strumenti cambiano identita' a ogni ricarica del dataset: e' la lista
  // dei simboli a determinare se serve davvero riscaricare.
  const symbolsKey = useMemo(
    () =>
      instruments
        .map((instrument) => instrument.symbol)
        .sort()
        .join(","),
    [instruments]
  );

  const stableInstruments = useMemo(
    () => instruments,
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [symbolsKey]
  );

  const run = useCallback(
    (force: boolean, signal?: AbortSignal) => {
      setRuntimeMarketConfig({
        provider: marketProvider,
        apiKey: marketApiKey,
      });
      return loadQuotes(stableInstruments, { force, signal }).then(
        (result) => {
          if (signal?.aborted) return;
          setState({
            quotes: result.quotes,
            rates: result.rates,
            loading: false,
            hasErrors: result.hasErrors,
          });
        },
        () => {
          if (signal?.aborted) return;
          setState((prev) => ({ ...prev, loading: false, hasErrors: true }));
        }
      );
    },
    [marketProvider, marketApiKey, stableInstruments]
  );

  useEffect(() => {
    const controller = new AbortController();
    void run(false, controller.signal);
    return () => controller.abort();
  }, [run]);

  const refresh = useCallback(() => {
    setState((prev) => ({ ...prev, loading: true }));
    return run(true);
  }, [run]);

  return { ...state, refresh };
}
