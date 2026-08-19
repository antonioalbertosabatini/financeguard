import {
  Car,
  Coffee,
  Home,
  Scale,
  TrendingUp,
  type LucideIcon,
} from "lucide-react";
import type { MessageKey } from "@/lib/i18n/types";
import {
  INCOME_ALLOCATION_BUCKET_IDS,
  type IncomeAllocationBucketId,
} from "@/lib/schemas/settings";

export type AllocationBucketUi = {
  id: IncomeAllocationBucketId;
  icon: LucideIcon;
  iconClassName: string;
  barClassName: string;
  titleKey: MessageKey;
  hintKey: MessageKey;
};

const BUCKET_UI: Record<IncomeAllocationBucketId, Omit<AllocationBucketUi, "id">> =
  {
    essentials: {
      icon: Home,
      iconClassName: "bg-chart-1/15 text-chart-1",
      barClassName: "bg-chart-1",
      titleKey: "allocation.essentials",
      hintKey: "allocation.essentialsHint",
    },
    discretionary: {
      icon: Coffee,
      iconClassName: "bg-chart-4/15 text-chart-4",
      barClassName: "bg-chart-4",
      titleKey: "allocation.discretionary",
      hintKey: "allocation.discretionaryHint",
    },
    debtOrInvest: {
      icon: Scale,
      iconClassName: "bg-chart-3/15 text-chart-3",
      barClassName: "bg-chart-3",
      titleKey: "allocation.debtOrInvest",
      hintKey: "allocation.debtOrInvestHint",
    },
    shortTerm: {
      icon: Car,
      iconClassName: "bg-chart-5/15 text-chart-5",
      barClassName: "bg-chart-5",
      titleKey: "allocation.shortTerm",
      hintKey: "allocation.shortTermHint",
    },
    longTerm: {
      icon: TrendingUp,
      iconClassName: "bg-chart-2/15 text-chart-2",
      barClassName: "bg-chart-2",
      titleKey: "allocation.longTerm",
      hintKey: "allocation.longTermHint",
    },
  };

export const ALLOCATION_BUCKETS: AllocationBucketUi[] =
  INCOME_ALLOCATION_BUCKET_IDS.map((id) => ({ id, ...BUCKET_UI[id] }));

export const ALLOCATION_BUCKET_BY_ID: Record<
  IncomeAllocationBucketId,
  AllocationBucketUi
> = Object.fromEntries(
  ALLOCATION_BUCKETS.map((bucket) => [bucket.id, bucket])
) as Record<IncomeAllocationBucketId, AllocationBucketUi>;
