import { commit, getDataset, getDeviceId } from "@/lib/storage/data-store";
import { AppError } from "@/lib/i18n/app-error";
import {
  trackAccumulationPlanUpsert,
  trackDelete,
} from "@/lib/sync/sync-metadata";
import {
  accumulationPlanSchema,
  accumulationPlansFileSchema,
  type AccumulationPlan,
  type AccumulationPlanInput,
  type AddAccumulationPlanOneTimeContributionInput,
} from "@/lib/schemas/accumulation-plan";
import { generateId } from "@/lib/db/index";

export async function getAccumulationPlans(): Promise<AccumulationPlan[]> {
  return accumulationPlansFileSchema.parse({
    accumulationPlans: getDataset().accumulationPlans ?? [],
  }).accumulationPlans;
}

export async function createAccumulationPlan(
  input: AccumulationPlanInput
): Promise<AccumulationPlan> {
  const plan = accumulationPlanSchema.parse({
    ...input,
    id: generateId("pac"),
    oneTimeContributions: [],
  });
  const dataset = getDataset();
  dataset.accumulationPlans.push(plan);
  trackAccumulationPlanUpsert(dataset, plan, getDeviceId());
  commit();
  return plan;
}

export async function updateAccumulationPlan(
  id: string,
  input: AccumulationPlanInput
): Promise<AccumulationPlan> {
  const plans = getDataset().accumulationPlans;
  const index = plans.findIndex((plan) => plan.id === id);
  if (index === -1) throw new AppError("errors.planNotFound");
  const previous = plans[index];
  const updated = accumulationPlanSchema.parse({
    ...input,
    id,
    oneTimeContributions: previous.oneTimeContributions ?? [],
  });
  plans[index] = updated;
  trackAccumulationPlanUpsert(getDataset(), updated, getDeviceId(), previous);
  commit();
  return updated;
}

export async function addAccumulationPlanOneTimeContribution(
  id: string,
  input: AddAccumulationPlanOneTimeContributionInput
): Promise<AccumulationPlan> {
  const plans = getDataset().accumulationPlans;
  const index = plans.findIndex((plan) => plan.id === id);
  if (index === -1) throw new AppError("errors.planNotFound");
  const previous = plans[index];
  const extra = {
    id: generateId("pax"),
    date: input.date,
    amount: input.amount,
    sourceAccountId: input.sourceAccountId,
  };
  const updated = accumulationPlanSchema.parse({
    ...previous,
    oneTimeContributions: [
      ...(previous.oneTimeContributions ?? []),
      extra,
    ],
  });
  plans[index] = updated;
  trackAccumulationPlanUpsert(getDataset(), updated, getDeviceId(), previous);
  commit();
  return updated;
}

export async function removeAccumulationPlanOneTimeContribution(
  id: string,
  contributionId: string
): Promise<AccumulationPlan> {
  const plans = getDataset().accumulationPlans;
  const index = plans.findIndex((plan) => plan.id === id);
  if (index === -1) throw new AppError("errors.planNotFound");
  const previous = plans[index];
  const extras = previous.oneTimeContributions ?? [];
  if (!extras.some((item) => item.id === contributionId)) {
    return previous;
  }
  const updated = accumulationPlanSchema.parse({
    ...previous,
    oneTimeContributions: extras.filter((item) => item.id !== contributionId),
  });
  plans[index] = updated;
  trackAccumulationPlanUpsert(getDataset(), updated, getDeviceId(), previous);
  commit();
  return updated;
}

export async function deleteAccumulationPlan(id: string): Promise<void> {
  const dataset = getDataset();
  const exists = dataset.accumulationPlans.some((plan) => plan.id === id);
  if (!exists) throw new AppError("errors.planNotFound");
  dataset.accumulationPlans = dataset.accumulationPlans.filter(
    (plan) => plan.id !== id
  );
  trackDelete(dataset, "accumulationPlan", id, getDeviceId());
  commit();
}
