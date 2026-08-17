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
} from "@/lib/schemas/accumulation-plan";
import { generateId } from "@/lib/db/index";
import { todayISO } from "@/lib/utils/dates";

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
    status: previous.status,
    pausePeriods: previous.pausePeriods,
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

  const updated = accumulationPlanSchema.parse({
    ...previous,
    status: "paused",
    pausePeriods,
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

  const updated = accumulationPlanSchema.parse({
    ...previous,
    status: "active",
    pausePeriods,
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
