/**
 * Converte un importo testuale in centesimi interi con segno, senza passare dai
 * float. Gestisce "-89.790000", "200", "1.234,56", "1,234.56", "-5,00 €".
 * Restituisce null se la stringa non e' un numero.
 */
export function parseAmountToCents(raw: string): number | null {
  let value = raw.trim().replace(/[\s€$£ ']/g, "");
  if (!value) return null;

  let sign = 1;
  if (value.startsWith("(") && value.endsWith(")")) {
    sign = -1;
    value = value.slice(1, -1);
  }
  if (value.startsWith("-")) {
    sign = -sign;
    value = value.slice(1);
  } else if (value.startsWith("+")) {
    value = value.slice(1);
  }

  const lastDot = value.lastIndexOf(".");
  const lastComma = value.lastIndexOf(",");
  let decimalSep: "." | "," | null = null;
  if (lastDot >= 0 && lastComma >= 0) {
    decimalSep = lastDot > lastComma ? "." : ",";
  } else if (lastComma >= 0) {
    decimalSep = ",";
  } else if (lastDot >= 0) {
    // "1.234.567" (solo separatori delle migliaia) vs "12.34"
    decimalSep = value.indexOf(".") === lastDot ? "." : null;
  }

  let intPart = value;
  let fracPart = "";
  if (decimalSep) {
    const idx = value.lastIndexOf(decimalSep);
    intPart = value.slice(0, idx);
    fracPart = value.slice(idx + 1);
  }
  intPart = intPart.replace(/[.,]/g, "");
  if (intPart === "") intPart = "0";
  if (!/^\d+$/.test(intPart) || !/^\d*$/.test(fracPart)) return null;

  const padded = (fracPart + "000").slice(0, 3);
  let cents = parseInt(intPart, 10) * 100 + parseInt(padded.slice(0, 2), 10);
  if (parseInt(padded[2], 10) >= 5) cents += 1;
  if (!Number.isSafeInteger(cents)) return null;
  return cents === 0 ? 0 : sign * cents;
}

/**
 * Normalizza una data in "YYYY-MM-DD". Accetta ISO (anche con orario),
 * "DD/MM/YYYY", "DD.MM.YYYY", "DD-MM-YYYY". Restituisce null se non valida.
 */
export function normalizeDate(raw: string): string | null {
  const value = raw.trim();
  let year: number;
  let month: number;
  let day: number;

  const iso = /^(\d{4})-(\d{2})-(\d{2})(?:[T\s].*)?$/.exec(value);
  const eu = /^(\d{1,2})[/.-](\d{1,2})[/.-](\d{4})$/.exec(value);
  if (iso) {
    year = +iso[1];
    month = +iso[2];
    day = +iso[3];
  } else if (eu) {
    day = +eu[1];
    month = +eu[2];
    year = +eu[3];
  } else {
    return null;
  }

  const date = new Date(Date.UTC(year, month - 1, day));
  if (
    date.getUTCFullYear() !== year ||
    date.getUTCMonth() !== month - 1 ||
    date.getUTCDate() !== day
  ) {
    return null;
  }
  return `${year}-${String(month).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
}
