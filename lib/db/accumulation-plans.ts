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
  type ChangeAccumulationPlanAmountInput,
} from "@/lib/schemas/accumulation-plan";
import { generateId } from "@/lib/db/index";
import { todayISO } from "@/lib/utils/dates";
import {
  applyAmountChange,
  removeAmountChange,
  withNormalizedAmount,
} from "@/lib/utils/accumulation";

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
    status: "active",
    pausePeriods: [],
    amountSchedule: [{ from: input.startDate, amount: input.amount }],
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
  const { amountSchedule, amount } = withNormalizedAmount({
    ...previous,
    startDate: input.startDate,
  });
  const updated = accumulationPlanSchema.parse({
    ...input,
    id,
    amount,
    status: previous.status,
    pausePeriods: previous.pausePeriods,
    amountSchedule,
    oneTimeContributions: previous.oneTimeContributions ?? [],
  });
  plans[index] = updated;
  trackAccumulationPlanUpsert(getDataset(), updated, getDeviceId(), previous);
  commit();
  return updated;
}

export async function changeAccumulationPlanAmount(
  id: string,
  input: ChangeAccumulationPlanAmountInput
): Promise<AccumulationPlan> {
  const plans = getDataset().accumulationPlans;
  const index = plans.findIndex((plan) => plan.id === id);
  if (index === -1) throw new AppError("errors.planNotFound");
  const previous = plans[index];
  if (input.effectiveFrom < previous.startDate) {
    throw new AppError("errors.amountChangeBeforeStart");
  }

  const normalized = withNormalizedAmount(previous);
  const amountSchedule = applyAmountChange(
    normalized.amountSchedule,
    input.effectiveFrom,
    input.amount
  );
  const { amount } = withNormalizedAmount({
    ...previous,
    amountSchedule,
  });
  const updated = accumulationPlanSchema.parse({
    ...previous,
    amount,
    amountSchedule,
  });
  plans[index] = updated;
  trackAccumulationPlanUpsert(getDataset(), updated, getDeviceId(), previous);
  commit();
  return updated;
}

export async function removeAccumulationPlanAmountChange(
  id: string,
  from: string
): Promise<AccumulationPlan> {
  const plans = getDataset().accumulationPlans;
  const index = plans.findIndex((plan) => plan.id === id);
  if (index === -1) throw new AppError("errors.planNotFound");
  const previous = plans[index];
  const normalized = withNormalizedAmount(previous);
  if (
    normalized.amountSchedule.length <= 1 ||
    normalized.amountSchedule[0].from === from
  ) {
    throw new AppError("errors.cannotRemoveInitialAmount");
  }
  if (!normalized.amountSchedule.some((segment) => segment.from === from)) {
    return previous;
  }

  const amountSchedule = removeAmountChange(
    normalized.amountSchedule,
    from
  );
  const { amount } = withNormalizedAmount({
    ...previous,
    amountSchedule,
  });
  const updated = accumulationPlanSchema.parse({
    ...previous,
    amount,
    amountSchedule,
  });
  plans[index] = updated;
  trackAccumulationPlanUpsert(getDataset(), updated, getDeviceId(), previous);
  commit();
  return updated;
}

export async function pauseAccumulationPlan(
  id: string
): Promise<AccumulationPlan> {
  const plans = getDataset().accumulationPlans;
  const index = plans.findIndex((plan) => plan.id === id);
  if (index === -1) throw new AppError("errors.planNotFound");
  const previous = plans[index];
  if (previous.status === "paused") return previous;

  const today = todayISO();
  const pausePeriods = [...previous.pausePeriods];
  const last = pausePeriods[pausePeriods.length - 1];
  if (!last || last.to) {
    pausePeriods.push({ from: today });
  }

  const { amountSchedule, amount } = withNormalizedAmount(previous);
  const updated = accumulationPlanSchema.parse({
    ...previous,
    status: "paused",
    pausePeriods,
    amountSchedule,
    amount,
  });
  plans[index] = updated;
  trackAccumulationPlanUpsert(getDataset(), updated, getDeviceId(), previous);
  commit();
  return updated;
}

export async function resumeAccumulationPlan(
  id: string
): Promise<AccumulationPlan> {
  const plans = getDataset().accumulationPlans;
  const index = plans.findIndex((plan) => plan.id === id);
  if (index === -1) throw new AppError("errors.planNotFound");
  const previous = plans[index];
  if (previous.status === "active") return previous;

  const today = todayISO();
  const pausePeriods = previous.pausePeriods.map((period, i) => {
    const isLast = i === previous.pausePeriods.length - 1;
    if (isLast && !period.to) {
      return { ...period, to: today };
    }
    return period;
  });

  const { amountSchedule, amount } = withNormalizedAmount(previous);
  const updated = accumulationPlanSchema.parse({
    ...previous,
    status: "active",
    pausePeriods,
    amountSchedule,
    amount,
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
