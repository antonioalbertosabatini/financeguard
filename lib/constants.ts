import path from "path";

export const DATA_DIR = path.join(process.cwd(), "data");
export const TRANSACTIONS_DIR = path.join(DATA_DIR, "transactions");
export const VAULT_FILENAME = "vault.json";
export const VAULT_PATH = path.join(DATA_DIR, VAULT_FILENAME);

export const ACCOUNT_TYPES = [
  "checking",
  "cash",
  "savings",
  "credit_card",
] as const;

export const CATEGORY_TYPES = ["income", "expense"] as const;

export const TRANSACTION_TYPES = ["income", "expense", "transfer"] as const;

export const ACCOUNT_TYPE_LABELS: Record<
  (typeof ACCOUNT_TYPES)[number],
  string
> = {
  checking: "Conto corrente",
  cash: "Contanti",
  savings: "Risparmio",
  credit_card: "Carta di credito",
};

export const TRANSACTION_TYPE_LABELS: Record<
  (typeof TRANSACTION_TYPES)[number],
  string
> = {
  income: "Entrata",
  expense: "Uscita",
  transfer: "Trasferimento",
};

export const MONTH_LABELS = [
  "Gen",
  "Feb",
  "Mar",
  "Apr",
  "Mag",
  "Giu",
  "Lug",
  "Ago",
  "Set",
  "Ott",
  "Nov",
  "Dic",
] as const;

export const MONTH_LABELS_FULL = [
  "Gennaio",
  "Febbraio",
  "Marzo",
  "Aprile",
  "Maggio",
  "Giugno",
  "Luglio",
  "Agosto",
  "Settembre",
  "Ottobre",
  "Novembre",
  "Dicembre",
] as const;
