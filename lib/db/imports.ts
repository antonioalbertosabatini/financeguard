/**
 * Scrittura dell'import da file. Valida tutto prima di toccare il dataset, poi
 * in un'unica mutazione: crea i piani PAC mancanti, aggiunge i versamenti,
 * aggiunge le transazioni (senza categoria) e fa un solo commit().
 */
import { generateId, getYearFromDate, getYearTransactions } from "@/lib/db/index";
import { AppError } from "@/lib/i18n/app-error";
import { collectExternalIds, newPlanKey, type PlanTarget } from "@/lib/import/preview";
import type { ImportedTransactionType } from "@/lib/import/types";
import {
  accumulationPlanSchema,
  type AccumulationPlan,
} from "@/lib/schemas/accumulation-plan";
import { transactionSchema, type Transaction } from "@/lib/schemas/transaction";
import { commit, getDataset, getDeviceId } from "@/lib/storage/data-store";
import {
  trackAccumulationPlanUpsert,
  trackTransactionUpsert,
} from "@/lib/sync/sync-metadata";

export type ImportTransactionItem = {
  type: ImportedTransactionType;
  date: string;
  amount: number;
  notes: string;
  externalId: string;
};

export type ImportContributionItem = {
  date: string;
  amount: number;
  externalId: string;
  target: PlanTarget;
  /** ISIN letto dal file: completa un piano esistente che ne e' privo. */
  isin?: string;
};

export type ImportSelection = {
  accountId: string;
  transactions: ImportTransactionItem[];
  contributions: ImportContributionItem[];
};

export type ImportResult = {
  transactions: number;
  contributions: number;
  plansCreated: number;
  duplicatesSkipped: number;
};

function allTransactions(): Transaction[] {
  return Object.values(getDataset().transactionsByYear).flat();
}

export async function applyImport(selection: ImportSelection): Promise<ImportResult> {
  const dataset = getDataset();
  const deviceId = getDeviceId();

  if (!dataset.accounts.some((account) => account.id === selection.accountId)) {
    throw new AppError("errors.accountNotFound");
  }

  // Ricontrollo dei duplicati sullo stato attuale (l'anteprima puo' essere vecchia).
  const existing = collectExternalIds({
    transactions: allTransactions(),
    transfers: Object.values(dataset.accountTransfersByYear).flat(),
    plans: dataset.accumulationPlans,
  });
  let duplicatesSkipped = 0;
  const fresh = <T extends { externalId: string }>(items: T[]) =>
    items.filter((item) => {
      if (existing.has(item.externalId)) {
        duplicatesSkipped++;
        return false;
      }
      existing.add(item.externalId);
      return true;
    });
  const transactionItems = fresh(selection.transactions);
  const contributionItems = fresh(selection.contributions);

  // --- Validazione (nessuna scrittura) ---
  const newTransactions = transactionItems.map((item) =>
    transactionSchema.parse({
      id: generateId("tx"),
      date: item.date,
      amount: item.amount,
      type: item.type,
      categoryId: null,
      accountId: selection.accountId,
      notes: item.notes,
      tags: [],
      isRecurring: false,
      externalId: item.externalId,
    })
  );

  const plansById = new Map(dataset.accumulationPlans.map((plan) => [plan.id, plan]));
  const updatedPlans = new Map<string, AccumulationPlan>();
  const createdPlans = new Map<string, AccumulationPlan>();

  for (const item of contributionItems) {
    let plan: AccumulationPlan | undefined;
    if (item.target.kind === "existing") {
      plan = updatedPlans.get(item.target.planId) ?? plansById.get(item.target.planId);
      if (!plan) throw new AppError("errors.planNotFound");
    } else {
      const key = newPlanKey(item.target);
      plan = createdPlans.get(key);
      if (!plan) {
        plan = accumulationPlanSchema.parse({
          id: generateId("pac"),
          name: item.target.name,
          isin: item.target.isin,
          oneTimeContributions: [],
        });
        createdPlans.set(key, plan);
      }
    }

    const next = accumulationPlanSchema.parse({
      ...plan,
      isin: plan.isin ?? item.isin,
      oneTimeContributions: [
        ...(plan.oneTimeContributions ?? []),
        {
          id: generateId("pax"),
          date: item.date,
          amount: item.amount,
          sourceAccountId: selection.accountId,
          externalId: item.externalId,
        },
      ],
    });
    if (item.target.kind === "existing") updatedPlans.set(next.id, next);
    else createdPlans.set(newPlanKey(item.target), next);
  }

  // --- Scrittura ---
  for (const plan of createdPlans.values()) {
    dataset.accumulationPlans.push(plan);
    trackAccumulationPlanUpsert(dataset, plan, deviceId);
  }
  for (const [id, plan] of updatedPlans) {
    const index = dataset.accumulationPlans.findIndex((item) => item.id === id);
    const previous = dataset.accumulationPlans[index];
    dataset.accumulationPlans[index] = plan;
    trackAccumulationPlanUpsert(dataset, plan, deviceId, previous);
  }

  const byYear = new Map<number, Transaction[]>();
  for (const tx of newTransactions) {
    const year = getYearFromDate(tx.date);
    byYear.set(year, [...(byYear.get(year) ?? []), tx]);
    trackTransactionUpsert(dataset, tx, deviceId);
  }
  for (const [year, items] of byYear) {
    dataset.transactionsByYear[String(year)] = [...getYearTransactions(year), ...items];
  }

  commit();

  return {
    transactions: newTransactions.length,
    contributions: contributionItems.length,
    plansCreated: createdPlans.size,
    duplicatesSkipped,
  };
}
