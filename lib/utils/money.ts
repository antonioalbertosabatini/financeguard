const formatterCache = new Map<string, Intl.NumberFormat>();

function getFormatter(locale: string, currency: string): Intl.NumberFormat {
  const key = `${locale}:${currency}`;
  let formatter = formatterCache.get(key);
  if (!formatter) {
    formatter = new Intl.NumberFormat(locale, {
      style: "currency",
      currency,
    });
    formatterCache.set(key, formatter);
  }
  return formatter;
}

export function toCents(euroString: string): number {
  const normalized = euroString.replace(",", ".").trim();
  if (!normalized) return 0;
  const value = parseFloat(normalized);
  if (Number.isNaN(value)) return 0;
  return Math.round(value * 100);
}

export function centsToEuroString(cents: number): string {
  return (cents / 100).toFixed(2);
}

export const HIDDEN_AMOUNT = "••••••";

export function formatCents(
  cents: number,
  currency = "EUR",
  locale = "it-IT"
): string {
  return getFormatter(locale, currency).format(cents / 100);
}

export function formatCentsMasked(
  cents: number,
  currency = "EUR",
  locale = "it-IT",
  hidden = false
): string {
  if (hidden) return HIDDEN_AMOUNT;
  return formatCents(cents, currency, locale);
}

export function formatSignedCents(
  cents: number,
  type: "income" | "expense" | "transfer",
  currency = "EUR",
  locale = "it-IT",
  hidden = false
): string {
  const formatted = formatCentsMasked(cents, currency, locale, hidden);
  if (type === "income") return `+${formatted}`;
  if (type === "expense") return `-${formatted}`;
  return formatted;
}
