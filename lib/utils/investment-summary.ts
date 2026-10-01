import type { AccumulationContribution } from "@/lib/utils/accumulation";

export type InvestmentKind = "plan" | "stock";

export type InvestmentInstrument = {
  id: string;
  name: string;
  kind: InvestmentKind;
  /** Lifetime amount invested (cents), as of the reference date. */
  invested: number;
  /** Amount invested in the selected year (cents). */
  yearInvested: number;
};

export type AllocationSlice = {
  id: string;
  name: string;
  kind: InvestmentKind | "others";
  amount: number;
  /** Fraction of the total, between 0 and 1. */
  share: number;
};

export type TimelinePoint = {
  key: string;
  period: "month" | "year";
  year: number;
  /** 1-12, only for monthly points. */
  month?: number;
  amount: number;
  cumulative: number;
};

export const OTHERS_SLICE_ID = "__others__";

export function summarizeInvestments(instruments: InvestmentInstrument[]) {
  let total = 0;
  let yearTotal = 0;
  let plansTotal = 0;
  let stocksTotal = 0;
  let count = 0;
  for (const item of instruments) {
    total += item.invested;
    yearTotal += item.yearInvested;
    if (item.kind === "plan") plansTotal += item.invested;
    else stocksTotal += item.invested;
    if (item.invested > 0) count += 1;
  }
  return { total, yearTotal, plansTotal, stocksTotal, instruments: count };
}

/**
 * One slice per instrument, largest first. When there are more than
 * `maxSlices` instruments, the smallest are grouped into a single "others"
 * slice so the total number of slices never exceeds `maxSlices`.
 */
export function buildAllocation(
  instruments: InvestmentInstrument[],
  maxSlices = 6
): AllocationSlice[] {
  const positive = instruments
    .filter((item) => item.invested > 0)
    .sort((a, b) => b.invested - a.invested || a.name.localeCompare(b.name));
  const total = positive.reduce((sum, item) => sum + item.invested, 0);
  if (total === 0) return [];

  const toSlice = (item: InvestmentInstrument): AllocationSlice => ({
    id: item.id,
    name: item.name,
    kind: item.kind,
    amount: item.invested,
    share: item.invested / total,
  });

  if (positive.length <= maxSlices) return positive.map(toSlice);

  const head = positive.slice(0, Math.max(maxSlices - 1, 0)).map(toSlice);
  const othersAmount = positive
    .slice(head.length)
    .reduce((sum, item) => sum + item.invested, 0);
  return [
    ...head,
    {
      id: OTHERS_SLICE_ID,
      name: "",
      kind: "others",
      amount: othersAmount,
      share: othersAmount / total,
    },
  ];
}

function monthIndex(date: string): number {
  const year = parseInt(date.slice(0, 4), 10);
  const month = parseInt(date.slice(5, 7), 10);
  return year * 12 + (month - 1);
}

/**
 * Contributions grouped by month, from the first contribution up to the
 * month of `asOfISO`, with empty months filled with zero. When the range
 * spans more than `maxMonths`, contributions are grouped by year instead.
 */
export function buildContributionTimeline(
  contributions: AccumulationContribution[],
  asOfISO: string,
  maxMonths = 48
): TimelinePoint[] {
  const relevant = contributions.filter((item) => item.date <= asOfISO);
  if (relevant.length === 0) return [];

  const first = Math.min(...relevant.map((item) => monthIndex(item.date)));
  const last = Math.max(
    monthIndex(asOfISO),
    ...relevant.map((item) => monthIndex(item.date))
  );
  const byYear = last - first + 1 > maxMonths;

  const buckets = new Map<number, number>();
  for (const item of relevant) {
    const index = monthIndex(item.date);
    const bucket = byYear ? Math.floor(index / 12) : index;
    buckets.set(bucket, (buckets.get(bucket) ?? 0) + item.amount);
  }

  const start = byYear ? Math.floor(first / 12) : first;
  const end = byYear ? Math.floor(last / 12) : last;
  const points: TimelinePoint[] = [];
  let cumulative = 0;
  for (let bucket = start; bucket <= end; bucket++) {
    const amount = buckets.get(bucket) ?? 0;
    cumulative += amount;
    if (byYear) {
      points.push({
        key: String(bucket),
        period: "year",
        year: bucket,
        amount,
        cumulative,
      });
    } else {
      const year = Math.floor(bucket / 12);
      const month = (bucket % 12) + 1;
      points.push({
        key: `${year}-${String(month).padStart(2, "0")}`,
        period: "month",
        year,
        month,
        amount,
        cumulative,
      });
    }
  }
  return points;
}
