/**
 * Configurazione del provider di quotazioni.
 *
 * Le variabili NEXT_PUBLIC_* sono compilate nel bundle, quindi la chiave e'
 * leggibile da chi possiede il binario: va usata una chiave gratuita dedicata.
 * L'override a runtime, salvato cifrato nelle impostazioni, evita di dover
 * ricompilare l'app quando la chiave cambia.
 */
export const QUOTE_PROVIDERS = ["yahoo", "twelvedata", "none"] as const;
export type QuoteProviderId = (typeof QUOTE_PROVIDERS)[number];

const ENV_PROVIDER = process.env.NEXT_PUBLIC_MARKET_PROVIDER;
const ENV_API_KEY = process.env.NEXT_PUBLIC_MARKET_API_KEY;

let runtimeProvider: QuoteProviderId | null = null;
let runtimeApiKey: string | null = null;

function isQuoteProviderId(value: unknown): value is QuoteProviderId {
  return QUOTE_PROVIDERS.includes(value as QuoteProviderId);
}

/** Applica le preferenze salvate nel vault; hanno la precedenza sull'ambiente. */
export function setRuntimeMarketConfig(config: {
  provider?: string | null;
  apiKey?: string | null;
}): void {
  runtimeProvider = isQuoteProviderId(config.provider) ? config.provider : null;
  runtimeApiKey = config.apiKey?.trim() ? config.apiKey.trim() : null;
}

export function getQuoteProviderId(): QuoteProviderId {
  if (runtimeProvider) return runtimeProvider;
  if (isQuoteProviderId(ENV_PROVIDER)) return ENV_PROVIDER;
  return "yahoo";
}

export function getMarketApiKey(): string | null {
  return runtimeApiKey ?? (ENV_API_KEY?.trim() ? ENV_API_KEY.trim() : null);
}
