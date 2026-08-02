/**
 * Cache locale di quotazioni e cambi.
 *
 * Sta nello storage per-dispositivo (lib/storage/local-store) e non nel dataset
 * cifrato: i prezzi non sono dati personali, e scriverli nel vault a ogni
 * aggiornamento significherebbe ri-cifrare il bundle e generare conflitti di
 * sincronizzazione per informazioni che ogni dispositivo puo' riscaricare.
 *
 * Serve anche da ultima linea offline: senza rete si mostra l'ultimo prezzo noto
 * con la data a cui si riferisce.
 */
import { idbGet, idbSet } from "@/lib/storage/local-store";

const CACHE_KEY = "market-cache";
/** I dati gratuiti sono di fine giornata: ricaricarli piu' spesso non aggiunge nulla. */
export const QUOTE_TTL_MS = 6 * 60 * 60 * 1000;

export interface CachedQuote {
  price: number;
  currency: string;
  asOf: string;
  fetchedAt: string;
}

export interface CachedFx {
  rates: Record<string, number>;
  date: string;
  fetchedAt: string;
}

interface MarketCache {
  quotes: Record<string, CachedQuote>;
  fx?: CachedFx;
}

const EMPTY: MarketCache = { quotes: {} };

export async function readCache(): Promise<MarketCache> {
  return (await idbGet<MarketCache>(CACHE_KEY)) ?? EMPTY;
}

export async function writeQuotes(
  quotes: Record<string, CachedQuote>
): Promise<void> {
  const cache = await readCache();
  await idbSet<MarketCache>(CACHE_KEY, {
    ...cache,
    quotes: { ...cache.quotes, ...quotes },
  });
}

export async function writeFx(fx: CachedFx): Promise<void> {
  const cache = await readCache();
  await idbSet<MarketCache>(CACHE_KEY, { ...cache, fx });
}

export function isFresh(fetchedAt: string, now = Date.now()): boolean {
  const time = Date.parse(fetchedAt);
  return !Number.isNaN(time) && now - time < QUOTE_TTL_MS;
}
