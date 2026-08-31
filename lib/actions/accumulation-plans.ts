import { getAccounts } from "@/lib/db/accounts";
import {
  addAccumulationPlanOneTimeContribution as dbAddOneTime,
  createAccumulationPlan as dbCreate,
  deleteAccumulationPlan as dbDelete,
  getAccumulationPlans as dbGetPlans,
  removeAccumulationPlanOneTimeContribution as dbRemoveOneTime,
  updateAccumulationPlan as dbUpdate,
} from "@/lib/db/accumulation-plans";
import { getSettings } from "@/lib/db/settings";
import { AppError } from "@/lib/i18n/app-error";
import {
  accumulationPlanInputSchema,
  addAccumulationPlanOneTimeContributionSchema,
  removeAccumulationPlanOneTimeContributionSchema,
  type AccumulationPlanInput,
  type AddAccumulationPlanOneTimeContributionInput,
} from "@/lib/schemas/accumulation-plan";
import {
  accumulationAsOfISO,
  contributionsForYear,
  lifetimePostedContributions,
  postedAsOf,
  sumAccumulation,
} from "@/lib/utils/accumulation";

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
  return dbCreate(parsed);
}

export async function updateAccumulationPlan(
  id: string,
  data: AccumulationPlanInput
) {
  const parsed = accumulationPlanInputSchema.parse(data);
  return dbUpdate(id, parsed);
}

export async function addAccumulationPlanOneTimeContribution(
  id: string,
  data: AddAccumulationPlanOneTimeContributionInput
) {
  const parsed = addAccumulationPlanOneTimeContributionSchema.parse(data);
  await requireSourceAccount(parsed.sourceAccountId);
  return dbAddOneTime(id, parsed);
}

export async function removeAccumulationPlanOneTimeContribution(
  id: string,
  contributionId: string
) {
  const parsed = removeAccumulationPlanOneTimeContributionSchema.parse({
    contributionId,
  });
  return dbRemoveOneTime(id, parsed.contributionId);
}

export async function deleteAccumulationPlan(id: string) {
  await dbDelete(id);
}

export async function getAccumulationPlansPageData(year: number) {
  const [plans, accounts, settings] = await Promise.all([
    dbGetPlans(),
    getAccounts(),
    getSettings(),
  ]);

  const asOfISO = accumulationAsOfISO(year);

  const items = plans.map((plan) => {
    const posted = postedAsOf(contributionsForYear([plan], year), asOfISO);

    return {
      ...plan,
      lifetimeBalance: sumAccumulation(
        lifetimePostedContributions(plan, asOfISO)
      ),
      yearBalance: sumAccumulation(posted),
      posted,
    };
  });

  return {
    settings,
    accounts,
    items,
  };
}
