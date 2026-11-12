/**
 * Conversione di un'entrata/uscita in trasferimento tra conti. Un bonifico tra
 * conti propri arriva dall'import come entrata (o uscita): convertendolo in
 * trasferimento non viene piu' contato come reddito/spesa. Se sull'altro conto
 * c'e' gia' la transazione speculare (tipo opposto, stesso importo, data
 * vicina) va eliminata per non contare due volte il movimento.
 */
import type { Transaction } from "@/lib/schemas/transaction";

export const MIRROR_MAX_DAYS = 3;

type ConvertibleTx = Pick<
  Transaction,
  "id" | "type" | "amount" | "date" | "accountId" | "isRecurring"
>;

export function isConvertibleToTransfer(tx: ConvertibleTx) {
  return (tx.type === "income" || tx.type === "expense") && !tx.isRecurring;
}

/** Entrata: l'altro conto e' l'origine. Uscita: l'altro conto e' la destinazione. */
export function transferDirection(tx: ConvertibleTx, otherAccountId: string) {
  return tx.type === "income"
    ? { fromAccountId: otherAccountId, toAccountId: tx.accountId }
    : { fromAccountId: tx.accountId, toAccountId: otherAccountId };
}

function daysBetween(a: string, b: string) {
  const ms = Math.abs(Date.parse(`${a}T00:00:00Z`) - Date.parse(`${b}T00:00:00Z`));
  return Math.round(ms / 86_400_000);
}

/** Transazioni sull'altro conto che sembrano l'altra faccia dello stesso movimento. */
export function findMirrorTransactions<T extends ConvertibleTx>(
  tx: ConvertibleTx,
  otherAccountId: string,
  candidates: T[],
  maxDays = MIRROR_MAX_DAYS
): T[] {
  const mirrorType = tx.type === "income" ? "expense" : "income";
  return candidates
    .filter(
      (candidate) =>
        candidate.id !== tx.id &&
        candidate.accountId === otherAccountId &&
        candidate.type === mirrorType &&
        candidate.amount === tx.amount &&
        !candidate.isRecurring &&
        daysBetween(candidate.date, tx.date) <= maxDays
    )
    .sort(
      (a, b) => daysBetween(a.date, tx.date) - daysBetween(b.date, tx.date)
    );
}
