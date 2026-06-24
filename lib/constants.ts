// Lunghezza minima della password (app e backup). Piu' alta = piu' resistente
// agli attacchi offline su un vault esportato o sincronizzato sul cloud.
export const MIN_PASSWORD_LENGTH = 12;

// Nomi logici dei file dati usati da export/import (ZIP) per restare
// compatibili con i backup creati dalla versione server.
export const ROOT_DATA_FILES = [
  "accounts.json",
  "categories.json",
  "budgets.json",
  "settings.json",
] as const;

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
