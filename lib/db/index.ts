/**
 * Helper del data layer client-side. Prima questo modulo leggeva/scriveva file
 * cifrati su disco (fs + lowdb); ora i moduli di lib/db operano sul Dataset in
 * memoria gestito da lib/storage/data-store, che pensa lui a cifrare e persistere
 * il bundle. Qui restano solo le utility condivise (id, anno, accesso alle
 * transazioni per anno).
 */
import { commit, getDataset } from "@/lib/storage/data-store";
import type { Transaction } from "@/lib/schemas/transaction";

export function generateId(prefix: string): string {
  const uuid =
    typeof crypto !== "undefined" && "randomUUID" in crypto
      ? crypto.randomUUID()
      : `${Date.now()}-${Math.random().toString(36).slice(2)}`;
  return `${prefix}_${uuid.slice(0, 8)}`;
}

export function getYearFromDate(date: string): number {
  return parseInt(date.slice(0, 4), 10);
}

/** Anni che hanno transazioni nel dataset, dal piu' recente. */
export async function listTransactionYears(): Promise<number[]> {
  const dataset = getDataset();
  return Object.keys(dataset.transactionsByYear)
    .map((year) => parseInt(year, 10))
    .filter((year) => !Number.isNaN(year))
    .sort((a, b) => b - a);
}

/** Transazioni dell'anno (array vuoto se l'anno non esiste ancora). */
export function getYearTransactions(year: number): Transaction[] {
  return getDataset().transactionsByYear[String(year)] ?? [];
}

/**
 * Sostituisce le transazioni dell'anno e segnala la mutazione (persist con
 * debounce). L'anno resta presente anche se l'array e' vuoto, coerentemente con
 * il vecchio comportamento a file (un anno svuotato restava elencato).
 */
export function setYearTransactions(year: number, transactions: Transaction[]): void {
  getDataset().transactionsByYear[String(year)] = transactions;
  commit();
}
