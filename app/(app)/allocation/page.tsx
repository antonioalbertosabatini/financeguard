"use client";

import { AllocationView } from "@/components/allocation/allocation-view";
import { useYear } from "@/providers/year-provider";

export default function AllocationPage() {
  const { year } = useYear();
  return <AllocationView year={year} />;
}
