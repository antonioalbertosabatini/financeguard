"use client";

import { type ReactNode } from "react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { useI18n } from "@/providers/i18n-provider";

export function SyncErrorDetailsDialog({
  error,
  trigger,
}: {
  error: string | null;
  trigger?: ReactNode;
}) {
  const { t } = useI18n();

  if (!error?.trim()) return null;

  return (
    <Dialog>
      <DialogTrigger asChild>
        {trigger ?? (
          <Button
            type="button"
            variant="link"
            className="h-auto p-0 text-inherit underline underline-offset-2"
          >
            {t("common.seeDetails")}
          </Button>
        )}
      </DialogTrigger>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>{t("sync.errorDialogTitle")}</DialogTitle>
          <DialogDescription>
            {t("sync.errorDialogDescription")}
          </DialogDescription>
        </DialogHeader>
        <p className="whitespace-pre-wrap rounded-lg border bg-muted/40 p-3 font-mono text-xs leading-relaxed">
          {error}
        </p>
        <DialogFooter>
          <DialogClose asChild>
            <Button type="button" variant="outline">
              {t("common.close")}
            </Button>
          </DialogClose>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
