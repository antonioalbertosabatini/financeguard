/**
 * Tassi di cambio dai riferimenti BCE via Frankfurter: nessuna chiave, CORS
 * aperto, un aggiornamento al giorno. I valori sono quante unita' di valuta
 * estera valgono un euro, la stessa convenzione della BCE.
 */
import { fetchJson } from "@/lib/market/http";
import type { FxRates } from "@/lib/utils/portfolio";

const URL = "https://api.frankfurter.dev/v1/latest?base=EUR";

interface FrankfurterResponse {
  date?: string;
  rates?: Record<string, number>;
}

export interface FxSnapshot {
  rates: FxRates;
  /** Data dei tassi pubblicata dalla fonte, non quella dello scaricamento. */
  date: string;
}

export async function fetchFxRates(signal?: AbortSignal): Promise<FxSnapshot> {
  const response = await fetchJson<FrankfurterResponse>(URL, signal);
  return {
    rates: response.rates ?? {},
    date: response.date ?? new Date().toISOString().slice(0, 10),
  };
}
