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

export function formatCents(
  cents: number,
  currency = "EUR",
  locale = "it-IT"
): string {
  return new Intl.NumberFormat(locale, {
    style: "currency",
    currency,
  }).format(cents / 100);
}

export function parseEuroInput(value: string): number {
  return toCents(value);
}
