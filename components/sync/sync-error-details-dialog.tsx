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

export function SyncErrorDetailsDialog({
  error,
  trigger,
}: {
  error: string | null;
  trigger?: ReactNode;
}) {
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
            Vedi dettagli
          </Button>
        )}
      </DialogTrigger>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Dettaglio errore di sincronizzazione</DialogTitle>
          <DialogDescription>
            Messaggio restituito dal servizio cloud o dal browser.
          </DialogDescription>
        </DialogHeader>
        <p className="whitespace-pre-wrap rounded-lg border bg-muted/40 p-3 font-mono text-xs leading-relaxed">
          {error}
        </p>
        <DialogFooter>
          <DialogClose asChild>
            <Button type="button" variant="outline">
              Chiudi
            </Button>
          </DialogClose>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
