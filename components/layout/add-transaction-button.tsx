"use client";

import Link from "next/link";
import { Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Kbd } from "@/components/ui/kbd";
import { useYearHref } from "@/hooks/use-year-href";
import { useI18n } from "@/providers/i18n-provider";

export function AddTransactionButton() {
  const { t } = useI18n();
  const withYear = useYearHref();

  return (
    <Button asChild className="rounded-xl pr-3">
      <Link href={withYear("/add")}>
        <Plus className="size-[1.125rem]" strokeWidth={2.3} />
        <span className="hidden lg:inline">{t("nav.newTransaction")}</span>
        <Kbd
          aria-hidden="true"
          className="hidden border-primary-foreground/30 bg-transparent text-primary-foreground/85 lg:inline-flex"
        >
          N
        </Kbd>
      </Link>
    </Button>
  );
}
