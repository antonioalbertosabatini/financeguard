/**
 * Quantita' e prezzi unitari degli investimenti, come interi scalati 1e8.
 *
 * I centesimi di lib/utils/money non bastano qui: una frazione di ETF o una
 * quantita' di crypto hanno molti piu' decimali di due. La scala resta intera
 * per gli stessi motivi del resto dell'app (niente errori di virgola mobile in
 * archivio), ma i prodotti quantita' x prezzo si calcolano in virgola mobile:
 * moltiplicare due interi 1e8 supererebbe Number.MAX_SAFE_INTEGER.
 */
export const UNIT_SCALE = 100_000_000;
export const UNIT_DECIMALS = 8;

/** Converte l'input utente ("1,5" o "1.5") in unita' scalate. */
export function toUnits(input: string): number {
  const normalized = input.replace(",", ".").trim();
  if (!normalized) return 0;
  const value = parseFloat(normalized);
  if (Number.isNaN(value)) return 0;
  return Math.round(value * UNIT_SCALE);
}

export function unitsToNumber(units: number): number {
  return units / UNIT_SCALE;
}

/** Stringa modificabile per i campi form: nessun separatore di migliaia. */
export function unitsToInputString(units: number): string {
  if (units === 0) return "";
  return String(parseFloat(unitsToNumber(units).toFixed(UNIT_DECIMALS)));
}

/**
 * Formattazione per la lettura: pochi decimali per titoli e ETF, molti per le
 * crypto, dove il valore unitario puo' essere una frazione minuscola.
 */
export function formatUnits(
  units: number,
  locale = "it-IT",
  maxDecimals = 8
): string {
  return new Intl.NumberFormat(locale, {
    minimumFractionDigits: 0,
    maximumFractionDigits: maxDecimals,
  }).format(unitsToNumber(units));
}

/** Prezzo unitario formattato nella valuta di quotazione dello strumento. */
export function formatUnitPrice(
  price8: number,
  currency: string,
  locale = "it-IT"
): string {
  const value = unitsToNumber(price8);
  // Sotto l'euro (crypto minori) due decimali azzererebbero il prezzo.
  const decimals = value !== 0 && Math.abs(value) < 1 ? 8 : 2;
  return new Intl.NumberFormat(locale, {
    style: "currency",
    currency,
    minimumFractionDigits: 2,
    maximumFractionDigits: decimals,
  }).format(value);
}

/** Controvalore in centesimi della valuta di quotazione. */
export function grossValueCents(quantity8: number, price8: number): number {
  return Math.round(unitsToNumber(quantity8) * unitsToNumber(price8) * 100);
}

/** Prezzo unitario scalato ricavato da un controvalore e una quantita'. */
export function unitPriceFromCents(
  valueCents: number,
  quantity8: number
): number {
  if (quantity8 === 0) return 0;
  return Math.round((valueCents / 100 / unitsToNumber(quantity8)) * UNIT_SCALE);
}
