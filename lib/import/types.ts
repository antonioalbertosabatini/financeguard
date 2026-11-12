/**
 * Tipi condivisi del motore di import da file (CSV/Excel esportati dalle banche).
 * Ogni banca ha un parser che trasforma le righe grezze del file in ParsedRow;
 * l'anteprima (preview.ts) le confronta poi con i dati esistenti.
 */

export type ImportedTransactionType = "income" | "expense";

export type SkipReason =
  /** Compravendita titoli non da piano di accumulo: non gestita. */
  | "unsupportedTrade"
  /** Importo nullo o non leggibile. */
  | "invalidAmount"
  /** Data mancante o non riconosciuta. */
  | "invalidDate";

type ParsedRowBase = {
  /** Indice della riga nel file (1 = prima riga dopo l'intestazione). */
  line: number;
  /** Id stabile della riga (es. "tr:<uuid>"), usato per evitare duplicati. */
  externalId: string;
  /** Tipo del movimento cosi' come scritto nel file (es. CARD_TRANSACTION). */
  sourceType: string;
};

export type ParsedTransactionRow = ParsedRowBase & {
  kind: "transaction";
  type: ImportedTransactionType;
  date: string;
  /** Centesimi, sempre positivi: il segno e' in `type`. */
  amount: number;
  currency: string;
  notes: string;
  /** Tipo di movimento non riconosciuto: classificato in base al segno. */
  uncertain: boolean;
};

export type ParsedPacContributionRow = ParsedRowBase & {
  kind: "pacContribution";
  date: string;
  /** Centesimi, positivi (uscita dal conto: importo + commissioni). */
  amount: number;
  currency: string;
  planName: string;
  isin?: string;
  notes: string;
};

export type ParsedSkippedRow = ParsedRowBase & {
  kind: "skipped";
  reason: SkipReason;
  date?: string;
  /** Centesimi con segno, se leggibili. */
  amount?: number;
  notes: string;
};

export type ParsedRow =
  | ParsedTransactionRow
  | ParsedPacContributionRow
  | ParsedSkippedRow;

export type BankImporter = {
  id: string;
  label: string;
  /** Estensioni accettate dal selettore file (es. [".csv"]). */
  accept: string[];
  /** Testo per preselezionare il conto di destinazione (match sul nome). */
  accountNameHint?: string;
  /**
   * Trasforma la tabella del file (prima riga = intestazione) in righe
   * interpretate. Lancia AppError se il file non e' nel formato atteso.
   */
  parse(table: string[][]): ParsedRow[];
};
