import {
  ACCUMULATION_CATEGORY_COLOR,
  ACCUMULATION_CATEGORY_ID,
} from "@/lib/constants";
import type {
  AccumulationPlan,
  AmountSegment,
} from "@/lib/schemas/accumulation-plan";
import type { ExpandedTransaction } from "@/lib/schemas/transaction";
import {
  getDayFromDate,
  getDaysInMonth,
  getMonthFromDate,
  toISODate,
  todayISO,
} from "@/lib/utils/dates";

const MAX_OCCURRENCES = 2000;

function getYearFromDate(date: string): number {
  return parseInt(date.slice(0, 4), 10);
}

export type AccumulationContribution = {
  planId: string;
  occurrenceId: string;
  date: string;
  amount: number;
  sourceAccountId: string;
  kind: "scheduled" | "oneTime";
};

type PlanAmountLookup = Pick<AccumulationPlan, "amount" | "startDate"> & {
  amountSchedule?: AmountSegment[];
};

function sortAndUniq(segments: AmountSegment[]): AmountSegment[] {
  const sorted = [...segments].sort((a, b) => a.from.localeCompare(b.from));
  const unique: AmountSegment[] = [];
  for (const segment of sorted) {
    const last = unique[unique.length - 1];
    if (last && last.from === segment.from) {
      unique[unique.length - 1] = segment;
    } else {
      unique.push({ from: segment.from, amount: segment.amount });
    }
  }
  return unique;
}

function collapseConsecutive(segments: AmountSegment[]): AmountSegment[] {
  const result: AmountSegment[] = [];
  for (const segment of segments) {
    const last = result[result.length - 1];
    if (last && last.amount === segment.amount) continue;
    result.push(segment);
  }
  return result;
}

function amountFromSchedule(
  schedule: AmountSegment[],
  date: string,
  fallbackAmount: number
): number {
  if (schedule.length === 0) return fallbackAmount;
  let amount = schedule[0].amount;
  for (const segment of schedule) {
    if (segment.from <= date) amount = segment.amount;
    else break;
  }
  return amount;
}

/**
 * Segmenti half-open [from, next.from): l'importo in vigore in una data è
 * quello dell'ultimo segmento con from <= date. Array vuoto (vault vecchi) =
 * un solo segmento da startDate con plan.amount.
 */
export function normalizeAmountSchedule(
  plan: PlanAmountLookup
): AmountSegment[] {
  const raw = plan.amountSchedule ?? [];
  if (raw.length === 0) {
    return [{ from: plan.startDate, amount: plan.amount }];
  }

  const unique = sortAndUniq(raw);
  const start = plan.startDate;
  let coverIndex = -1;
  for (let i = 0; i < unique.length; i++) {
    if (unique[i].from <= start) coverIndex = i;
    else break;
  }

  const covering =
    coverIndex === -1
      ? { from: start, amount: unique[0].amount }
      : { from: start, amount: unique[coverIndex].amount };
  const rest = unique.filter((segment) => segment.from > start);
  return collapseConsecutive([covering, ...rest]);
}

export function amountOnDate(plan: PlanAmountLookup, date: string): number {
  return amountFromSchedule(
    normalizeAmountSchedule(plan),
    date,
    plan.amount
  );
}

export function applyAmountChange(
  schedule: AmountSegment[],
  effectiveFrom: string,
  amount: number
): AmountSegment[] {
  const sorted = sortAndUniq(schedule);
  if (sorted.length === 0) return [{ from: effectiveFrom, amount }];
  const current = amountFromSchedule(sorted, effectiveFrom, sorted[0].amount);
  if (current === amount) return collapseConsecutive(sorted);

  const next = sorted.filter((segment) => segment.from !== effectiveFrom);
  next.push({ from: effectiveFrom, amount });
  return collapseConsecutive(sortAndUniq(next));
}

export function removeAmountChange(
  schedule: AmountSegment[],
  from: string
): AmountSegment[] {
  const sorted = sortAndUniq(schedule);
  if (sorted.length <= 1 || sorted[0]?.from === from) return sorted;
  return collapseConsecutive(sorted.filter((segment) => segment.from !== from));
}

export function withNormalizedAmount(
  plan: PlanAmountLookup,
  asOfISO: string = todayISO()
): { amountSchedule: AmountSegment[]; amount: number } {
  const amountSchedule = normalizeAmountSchedule(plan);
  return {
    amountSchedule,
    amount: amountFromSchedule(amountSchedule, asOfISO, plan.amount),
  };
}

/** Intervallo di pausa [from, to): `to` assente = ancora in pausa. */
export function isDatePaused(plan: AccumulationPlan, date: string): boolean {
  return plan.pausePeriods.some((period) => {
    if (date < period.from) return false;
    if (!period.to) return true;
    return date < period.to;
  });
}

function addDaysISO(date: string, days: number): string {
  const year = getYearFromDate(date);
  const month = getMonthFromDate(date);
  const day = getDayFromDate(date);
  const next = new Date(Date.UTC(year, month - 1, day + days));
  return toISODate(
    next.getUTCFullYear(),
    next.getUTCMonth() + 1,
    next.getUTCDate()
  );
}

function monthlyOccurrence(startDate: string, monthsFromStart: number): string {
  const startYear = getYearFromDate(startDate);
  const startMonth = getMonthFromDate(startDate);
  const anchorDay = getDayFromDate(startDate);
  const totalMonths = startYear * 12 + (startMonth - 1) + monthsFromStart;
  const year = Math.floor(totalMonths / 12);
  const month = (totalMonths % 12) + 1;
  const day = Math.min(anchorDay, getDaysInMonth(year, month));
  return toISODate(year, month, day);
}

function pushContribution(
  result: AccumulationContribution[],
  plan: AccumulationPlan,
  date: string,
  rangeStart: string,
  rangeEnd: string
) {
  if (date < rangeStart || date > rangeEnd) return;
  if (date < plan.startDate) return;
  if (isDatePaused(plan, date)) return;
  result.push({
    planId: plan.id,
    occurrenceId: `${plan.id}_${date}`,
    date,
    amount: amountOnDate(plan, date),
    sourceAccountId: plan.sourceAccountId,
    kind: "scheduled",
  });
}

export function expandPlanContributions(
  plan: AccumulationPlan,
  rangeEnd: string,
  rangeStart: string = plan.startDate
): AccumulationContribution[] {
  const result: AccumulationContribution[] = [];

  if (rangeEnd >= plan.startDate) {
    const start = plan.startDate;

    if (plan.frequency === "monthly") {
      for (let i = 0; i < MAX_OCCURRENCES; i++) {
        const date = monthlyOccurrence(start, i);
        if (date > rangeEnd) break;
        pushContribution(result, plan, date, rangeStart, rangeEnd);
      }
    } else {
      const stepDays = plan.frequency === "weekly" ? 7 : 14;
      let date = start;
      for (let i = 0; i < MAX_OCCURRENCES; i++) {
        if (date > rangeEnd) break;
        pushContribution(result, plan, date, rangeStart, rangeEnd);
        date = addDaysISO(date, stepDays);
      }
    }
  }

  for (const extra of plan.oneTimeContributions ?? []) {
    if (extra.date > rangeEnd) continue;
    result.push({
      planId: plan.id,
      occurrenceId: extra.id,
      date: extra.date,
      amount: extra.amount,
      sourceAccountId: extra.sourceAccountId,
      kind: "oneTime",
    });
  }

  result.sort(
    (a, b) =>
      a.date.localeCompare(b.date) || a.occurrenceId.localeCompare(b.occurrenceId)
  );
  return result;
}

export function expandAllContributions(
  plans: AccumulationPlan[],
  rangeEnd: string,
  rangeStart?: string
): AccumulationContribution[] {
  return plans.flatMap((plan) =>
    expandPlanContributions(plan, rangeEnd, rangeStart ?? plan.startDate)
  );
}

export function filterContributionsByYear(
  contributions: AccumulationContribution[],
  year: number
): AccumulationContribution[] {
  const prefix = String(year);
  return contributions.filter((item) => item.date.startsWith(prefix));
}

export function postedAsOf(
  contributions: AccumulationContribution[],
  asOfISO: string
): AccumulationContribution[] {
  return contributions.filter((item) => item.date <= asOfISO);
}

export function accumulationAsOfISO(
  year: number,
  now: Date = new Date()
): string {
  const current = now.getFullYear();
  if (year < current) return `${year}-12-31`;
  if (year > current) return `${year - 1}-12-31`;
  return todayISO();
}

export function yearBounds(year: number): { start: string; end: string } {
  return { start: `${year}-01-01`, end: `${year}-12-31` };
}

export function sumAccumulation(
  contributions: AccumulationContribution[]
): number {
  return contributions.reduce((sum, item) => sum + item.amount, 0);
}

export function contributionsForYear(
  plans: AccumulationPlan[],
  year: number
): AccumulationContribution[] {
  const { end } = yearBounds(year);
  return filterContributionsByYear(expandAllContributions(plans, end), year);
}

export function postedContributionsForYear(
  plans: AccumulationPlan[],
  year: number,
  asOfISO: string = accumulationAsOfISO(year)
): AccumulationContribution[] {
  return postedAsOf(contributionsForYear(plans, year), asOfISO);
}

export function lifetimePostedContributions(
  plan: AccumulationPlan,
  asOfISO: string = todayISO()
): AccumulationContribution[] {
  return postedAsOf(expandPlanContributions(plan, asOfISO), asOfISO);
}

export function toSyntheticExpenses(
  contributions: AccumulationContribution[]
): ExpandedTransaction[] {
  return contributions.map((item) => ({
    id: item.occurrenceId,
    date: item.date,
    amount: item.amount,
    type: "expense",
    categoryId: ACCUMULATION_CATEGORY_ID,
    accountId: item.sourceAccountId,
    notes: "",
    tags: [],
    isRecurring: false,
    occurrenceId: item.occurrenceId,
    isOccurrence: true,
    sourceTransactionId: item.planId,
  }));
}

export function accumulationCategory(name: string) {
  return {
    id: ACCUMULATION_CATEGORY_ID,
    name,
    type: "expense" as const,
    color: ACCUMULATION_CATEGORY_COLOR,
    icon: "piggy-bank",
  };
}