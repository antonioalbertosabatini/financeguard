import { z } from "zod";
import { INSTRUMENT_KINDS } from "@/lib/constants";

export const instrumentSchema = z.object({
  id: z.string(),
  /**
   * Simbolo nella forma richiesta dal provider di quotazioni: "SWDA.MI" per
   * Yahoo, "AAPL" per Twelve Data, l'id CoinGecko ("bitcoin") per le crypto.
   */
  symbol: z.string().min(1),
  /** Ticker breve mostrato in UI, indipendente dal provider (es. "SWDA"). */
  ticker: z.string().min(1),
  name: z.string().min(1),
  kind: z.enum(INSTRUMENT_KINDS),
  /** Valuta di quotazione, non necessariamente quella del portafoglio. */
  currency: z.string().min(3).max(4),
  exchange: z.string().optional().default(""),
  isin: z.string().optional().default(""),
  /**
   * Prezzo inserito a mano: unico modo di valorizzare uno strumento che il
   * provider non copre (tipico degli ETF europei sui piani gratuiti).
   */
  manualPrice8: z.number().int().nonnegative().nullable().optional().default(null),
  manualPriceAt: z.string().nullable().optional().default(null),
});

export const instrumentInputSchema = instrumentSchema.omit({ id: true });

export const instrumentsFileSchema = z.object({
  instruments: z.array(instrumentSchema),
});

export type Instrument = z.infer<typeof instrumentSchema>;
export type InstrumentInput = z.infer<typeof instrumentInputSchema>;
export type InstrumentKind = Instrument["kind"];
