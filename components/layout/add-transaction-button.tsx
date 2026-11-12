"use client";

import Link from "next/link";
import { useYearHref } from "@/hooks/use-year-href";
import { Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useI18n } from "@/providers/i18n-provider";

export function AddTransactionButton() {
  const { t } = useI18n();
  const withYear = useYearHref();

  return (
    <Button asChild size="sm" className="rounded-xl">
      <Link href={withYear("/add")}>
        <Plus className="size-4" />
        <span className="hidden sm:inline">{t("nav.newTransaction")}</span>
      </Link>
    </Button>
  );
}
