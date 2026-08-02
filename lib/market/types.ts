import type { InstrumentKind } from "@/lib/schemas/instrument";

/** Risultato della ricerca simboli, gia' pronto a diventare un Instrument. */
export interface SymbolResult {
  /** Simbolo nella forma richiesta dal provider di quotazioni. */
  symbol: string;
  ticker: string;
  name: string;
  kind: InstrumentKind;
  currency: string;
  exchange: string;
}

export interface ProviderQuote {
  symbol: string;
  price: number;
  currency: string;
  /** ISO del momento a cui si riferisce il prezzo. */
  asOf: string;
}

export interface SymbolSearchProvider {
  readonly id: string;
  search(query: string, signal?: AbortSignal): Promise<SymbolResult[]>;
}

export interface QuoteProvider {
  readonly id: string;
  /** True se il provider e' utilizzabile con la configurazione corrente. */
  isConfigured(): boolean;
  getQuotes(symbols: string[], signal?: AbortSignal): Promise<ProviderQuote[]>;
}

/**
 * Il provider e' raggiungibile ma non copre lo strumento (tipico dei piani
 * gratuiti limitati agli Stati Uniti): la UI lo distingue da un errore di rete
 * per suggerire il prezzo manuale.
 */
export class SymbolNotCoveredError extends Error {
  constructor(readonly symbol: string) {
    super(`Symbol not covered: ${symbol}`);
    this.name = "SymbolNotCoveredError";
  }
}
