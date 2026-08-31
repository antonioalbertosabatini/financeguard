import {
  ACCUMULATION_CATEGORY_COLOR,
  ACCUMULATION_CATEGORY_ID,
} from "@/lib/constants";
import type { AccumulationPlan } from "@/lib/schemas/accumulation-plan";
import type { ExpandedTransaction } from "@/lib/schemas/transaction";
import { todayISO } from "@/lib/utils/dates";

function getYearFromDate(date: string): number {
  return parseInt(date.slice(0, 4), 10);
}

export type AccumulationContribution = {
  planId: string;
  occurrenceId: string;
  date: string;
  amount: number;
  sourceAccountId: string;
};

export function expandPlanContributions(
  plan: AccumulationPlan,
  rangeEnd: string,
  rangeStart?: string
): AccumulationContribution[] {
  const result: AccumulationContribution[] = [];
  for (const extra of plan.oneTimeContributions ?? []) {
    if (extra.date > rangeEnd) continue;
    if (rangeStart && extra.date < rangeStart) continue;
    result.push({
      planId: plan.id,
      occurrenceId: extra.id,
      date: extra.date,
      amount: extra.amount,
      sourceAccountId: extra.sourceAccountId,
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
    expandPlanContributions(plan, rangeEnd, rangeStart)
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

export function contributionYears(plans: AccumulationPlan[]): number[] {
  const years = new Set<number>();
  for (const plan of plans) {
    for (const extra of plan.oneTimeContributions ?? []) {
      const year = getYearFromDate(extra.date);
      if (!Number.isNaN(year)) years.add(year);
    }
  }
  return [...years];
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
