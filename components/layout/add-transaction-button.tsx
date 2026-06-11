"use client";

import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { Plus } from "lucide-react";
import { Button } from "@/components/ui/button";

export function AddTransactionButton() {
  const searchParams = useSearchParams();
  const yearParam = searchParams.get("year");
  const query = yearParam ? `?year=${yearParam}` : "";

  return (
    <Button asChild size="sm" className="rounded-xl">
      <Link href={`/add${query}`}>
        <Plus className="size-4" />
        <span className="hidden sm:inline">Nuova transazione</span>
      </Link>
    </Button>
  );
}
