import { getAccounts } from "@/lib/db/accounts";
import {
  changeAccumulationPlanAmount as dbChangeAmount,
  createAccumulationPlan as dbCreate,
  deleteAccumulationPlan as dbDelete,
  getAccumulationPlans as dbGetPlans,
  pauseAccumulationPlan as dbPause,
  removeAccumulationPlanAmountChange as dbRemoveAmountChange,
  resumeAccumulationPlan as dbResume,
  updateAccumulationPlan as dbUpdate,
} from "@/lib/db/accumulation-plans";
import { getSettings } from "@/lib/db/settings";
import { AppError } from "@/lib/i18n/app-error";
import {
  accumulationPlanInputSchema,
  changeAccumulationPlanAmountSchema,
  removeAccumulationPlanAmountChangeSchema,
  type AccumulationPlanInput,
  type ChangeAccumulationPlanAmountInput,
} from "@/lib/schemas/accumulation-plan";
import {
  calculateAccountBalance,
} from "@/lib/utils/balance";
import {
  accumulationAsOfISO,
  amountOnDate,
  contributionsForYear,
  lifetimePostedContributions,
  postedAsOf,
  sumAccumulation,
} from "@/lib/utils/accumulation";
import { getAccountTransfersForYear } from "@/lib/db/account-transfers";
import { getTransactionsForYear } from "@/lib/db/transactions";
import { expandRecurrences } from "@/lib/utils/recurrence";
import { currentYear, todayISO } from "@/lib/utils/dates";

async function requireSourceAccount(accountId: string) {
  const accounts = await getAccounts();
  const account = accounts.find((item) => item.id === accountId);
  if (!account) throw new AppError("errors.accountNotFound");
  return account;
}

export async function getAccumulationPlans() {
  return dbGetPlans();
}

export async function createAccumulationPlan(data: AccumulationPlanInput) {
  const parsed = accumulationPlanInputSchema.parse(data);
  await requireSourceAccount(parsed.sourceAccountId);
  return dbCreate(parsed);
}

export async function updateAccumulationPlan(
  id: string,
  data: AccumulationPlanInput
) {
  const parsed = accumulationPlanInputSchema.parse(data);
  await requireSourceAccount(parsed.sourceAccountId);
  return dbUpdate(id, parsed);
}

export async function changeAccumulationPlanAmount(
  id: string,
  data: ChangeAccumulationPlanAmountInput
) {
  const parsed = changeAccumulationPlanAmountSchema.parse(data);
  return dbChangeAmount(id, parsed);
}

export async function removeAccumulationPlanAmountChange(
  id: string,
  from: string
) {
  const parsed = removeAccumulationPlanAmountChangeSchema.parse({ from });
  return dbRemoveAmountChange(id, parsed.from);
}

export async function pauseAccumulationPlan(id: string) {
  return dbPause(id);
}

export async function resumeAccumulationPlan(id: string) {
  return dbResume(id);
}

export async function deleteAccumulationPlan(id: string) {
  await dbDelete(id);
}

export async function getAccumulationPlansPageData(year: number) {
  const [plans, accounts, settings, transfers, rawTxs] = await Promise.all([
    dbGetPlans(),
    getAccounts(),
    getSettings(),
    getAccountTransfersForYear(year),
    getTransactionsForYear(year),
  ]);

  const asOfISO = accumulationAsOfISO(year);
  const expanded = expandRecurrences(rawTxs, year).filter(
    (tx) => tx.date <= asOfISO
  );
  const postedYear = postedAsOf(contributionsForYear(plans, year), asOfISO);
  const transfersAsOf = transfers.filter((tr) => tr.date <= asOfISO);
  const today = todayISO();
  const nowYear = currentYear();

  const accountBalances = Object.fromEntries(
    accounts.map((account) => [
      account.id,
      calculateAccountBalance(account, expanded, transfersAsOf, postedYear),
    ])
  );

  const items = plans.map((plan) => {
    const yearItems = contributionsForYear([plan], year);
    const posted = postedAsOf(yearItems, asOfISO);
    const upcoming =
      year === nowYear
        ? yearItems.filter((item) => item.date > asOfISO)
        : year > nowYear
          ? yearItems
          : [];
    const sourceBalance = accountBalances[plan.sourceAccountId] ?? 0;
    const currentAmount = amountOnDate(plan, today);

    return {
      ...plan,
      amount: currentAmount,
      sourceAccountName:
        accounts.find((account) => account.id === plan.sourceAccountId)?.name ??
        plan.sourceAccountId,
      lifetimeBalance: sumAccumulation(
        lifetimePostedContributions(plan, today)
      ),
      yearBalance: sumAccumulation(posted),
      posted,
      upcoming,
      insufficientFunds: sourceBalance < currentAmount,
    };
  });

  return {
    settings,
    accounts,
    items,
  };
}
