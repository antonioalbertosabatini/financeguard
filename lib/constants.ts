import path from "path";

const DEFAULT_DATA_DIR = path.join(process.cwd(), "data");

// Cartella dati. Puo' puntare a una cartella sincronizzata su cloud
// (es. OneDrive) impostando la variabile d'ambiente FG_DATA_DIR.
export const DATA_DIR = process.env.FG_DATA_DIR
  ? path.resolve(process.env.FG_DATA_DIR)
  : DEFAULT_DATA_DIR;

export const TRANSACTIONS_DIR = path.join(DATA_DIR, "transactions");
export const VAULT_FILENAME = "vault.json";
export const VAULT_PATH = path.join(DATA_DIR, VAULT_FILENAME);

// Lunghezza minima della password (app e backup). Piu' alta = piu' resistente
// agli attacchi offline su un vault sincronizzato sul cloud.
export const MIN_PASSWORD_LENGTH = 12;

// Metadati di sincronizzazione (in chiaro, non sensibili) e lock di sessione.
// Vivono dentro DATA_DIR cosi' da essere sincronizzati tra i dispositivi.
export const SYNC_META_FILENAME = "sync-meta.json";
export const SYNC_META_PATH = path.join(DATA_DIR, SYNC_META_FILENAME);
export const LOCK_FILENAME = "app.lock";
export const LOCK_PATH = path.join(DATA_DIR, LOCK_FILENAME);

// Sottocartella per le scritture temporanee (stesso volume di DATA_DIR per
// garantire rename atomico). Il prefisso "." la nasconde e la esclude dai backup.
export const TMP_DIRNAME = ".fg-tmp";
export const TMP_DIR = path.join(DATA_DIR, TMP_DIRNAME);

// File presenti in DATA_DIR che NON sono envelope di dati utente: vanno
// ignorati da export/import e dal rilevamento conflitti.
export const NON_DATA_FILES = new Set<string>([
  VAULT_FILENAME,
  SYNC_META_FILENAME,
  LOCK_FILENAME,
]);

// Nomi dei file dati nella radice di DATA_DIR.
export const ROOT_DATA_FILES = [
  "accounts.json",
  "categories.json",
  "budgets.json",
  "settings.json",
] as const;

// Stato locale per-dispositivo (device id, ultima revisione vista). Tenuto
// FUORI dalla cartella sincronizzata, cosi' non viene mai condiviso.
const HOME_DIR =
  process.env.HOME || process.env.USERPROFILE || process.cwd();
export const LOCAL_STATE_DIR = process.env.FG_LOCAL_DIR
  ? path.resolve(process.env.FG_LOCAL_DIR)
  : path.join(HOME_DIR, ".financeguard");

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
