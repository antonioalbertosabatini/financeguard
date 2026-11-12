/**
 * Import dell'export CSV di Trade Republic (Impostazioni → Attivita' → Esporta).
 *
 * Colonne: datetime, date, account_type, category, type, asset_class, name,
 * symbol, shares, price, amount, fee, tax, currency, original_amount,
 * original_currency, fx_rate, description, transaction_id, counterparty_name,
 * counterparty_iban, payment_reference, mcc_code.
 *
 * Mappatura:
 * - BUY con descrizione "Savings plan execution" → versamento sul PAC (name/symbol)
 * - altri BUY/SELL (compravendite manuali di titoli) → saltati
 * - tutto il resto (carta, bonifici, interessi, dividendi, rimborsi…) →
 *   entrata o uscita in base al segno di `amount`
 */
import { AppError } from "@/lib/i18n/app-error";
import { normalizeDate, parseAmountToCents } from "@/lib/import/amount";
import type { BankImporter, ParsedRow } from "@/lib/import/types";
import { ISIN_REGEX } from "@/lib/schemas/accumulation-plan";

const REQUIRED_COLUMNS = ["date", "type", "amount", "transaction_id"] as const;

/** Tipi di movimento noti; gli altri vengono classificati per segno con avviso. */
const KNOWN_CASH_TYPES = new Set([
  "CARD_TRANSACTION",
  "CARD_REFUND",
  "CARD_ORDER_BILLED",
  "TRANSFER_INBOUND",
  "TRANSFER_INSTANT_INBOUND",
  "TRANSFER_OUTBOUND",
  "TRANSFER_INSTANT_OUTBOUND",
  "DIRECT_DEBIT",
  "SEPA_DIRECT_DEBIT",
  "INTEREST_PAYMENT",
  "DIVIDEND",
  "DISTRIBUTION",
  "TAX_REFUND",
]);

const TRADE_TYPES = new Set(["BUY", "SELL"]);

const SAVINGS_PLAN_RE = /savings\s*plan|sparplan|piano\s+d[i']\s*accumulo|plan\s+d'investissement|plan\s+de\s+inversi/i;

export const TRADE_REPUBLIC_ID = "trade-republic";

export function tradeRepublicExternalId(transactionId: string) {
  return `tr:${transactionId}`;
}

/** Ripulisce il nome dello strumento dalla descrizione se manca la colonna name. */
function planNameFromDescription(description: string, isin?: string): string {
  let text = description.replace(SAVINGS_PLAN_RE, "").replace(/execution/i, "");
  if (isin) text = text.replace(isin, "");
  text = text.replace(/,\s*quantity:.*$/i, "").trim();
  return text || isin || "PAC";
}

export function parseTradeRepublic(table: string[][]): ParsedRow[] {
  if (table.length === 0) throw new AppError("errors.importEmptyFile");

  const header = table[0].map((cell) => cell.trim().toLowerCase());
  const missing = REQUIRED_COLUMNS.filter((col) => !header.includes(col));
  if (missing.length > 0) {
    throw new AppError("errors.importWrongFormat", {
      bank: "Trade Republic",
      columns: missing.join(", "),
    });
  }
  const col = (name: string) => header.indexOf(name);
  const idx = {
    datetime: col("datetime"),
    date: col("date"),
    category: col("category"),
    type: col("type"),
    name: col("name"),
    symbol: col("symbol"),
    amount: col("amount"),
    fee: col("fee"),
    currency: col("currency"),
    description: col("description"),
    transactionId: col("transaction_id"),
    counterparty: col("counterparty_name"),
  };

  const rows: ParsedRow[] = [];
  for (let i = 1; i < table.length; i++) {
    const cells = table[i];
    const get = (index: number) => (index >= 0 ? (cells[index] ?? "").trim() : "");

    const transactionId = get(idx.transactionId);
    const sourceType = get(idx.type).toUpperCase();
    const description = get(idx.description);
    const notes = description || get(idx.counterparty) || get(idx.name);
    const externalId = tradeRepublicExternalId(transactionId || `line-${i}`);
    const date = normalizeDate(get(idx.date) || get(idx.datetime));
    const amount = parseAmountToCents(get(idx.amount));
    const base = { line: i, externalId, sourceType, notes };

    if (!date) {
      rows.push({ ...base, kind: "skipped", reason: "invalidDate", amount: amount ?? undefined });
      continue;
    }
    if (amount === null || amount === 0) {
      rows.push({ ...base, kind: "skipped", reason: "invalidAmount", date });
      continue;
    }

    const currency = get(idx.currency).toUpperCase() || "EUR";

    if (TRADE_TYPES.has(sourceType)) {
      const isSavingsPlan = sourceType === "BUY" && SAVINGS_PLAN_RE.test(description);
      if (!isSavingsPlan || amount > 0) {
        rows.push({ ...base, kind: "skipped", reason: "unsupportedTrade", date, amount });
        continue;
      }
      const symbol = get(idx.symbol).toUpperCase();
      const isin = ISIN_REGEX.test(symbol) ? symbol : undefined;
      const fee = Math.abs(parseAmountToCents(get(idx.fee)) ?? 0);
      rows.push({
        ...base,
        kind: "pacContribution",
        date,
        amount: Math.abs(amount) + fee,
        currency,
        planName: get(idx.name) || planNameFromDescription(description, isin),
        isin,
      });
      continue;
    }

    rows.push({
      ...base,
      kind: "transaction",
      type: amount > 0 ? "income" : "expense",
      date,
      amount: Math.abs(amount),
      currency,
      uncertain: !KNOWN_CASH_TYPES.has(sourceType),
    });
  }
  return rows;
}

export const tradeRepublicImporter: BankImporter = {
  id: TRADE_REPUBLIC_ID,
  label: "Trade Republic",
  accept: [".csv", ".xlsx"],
  accountNameHint: "trade republic",
  parse: parseTradeRepublic,
};
