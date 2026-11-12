"use client";

import {
  createContext,
  useCallback,
  useContext,
  useRef,
  useState,
  type ReactNode,
} from "react";
import { AlertDialog as AlertDialogPrimitive } from "radix-ui";
import { AlertTriangle, HelpCircle } from "lucide-react";
import { buttonVariants } from "@/components/ui/button";
import { useI18n } from "@/providers/i18n-provider";
import { cn } from "@/lib/utils";
import { haptic } from "@/lib/native/haptics";

export interface ConfirmOptions {
  /** Short question. Defaults to "Sei sicuro?". */
  title?: string;
  /** Consequences of the action. */
  description?: ReactNode;
  /** Label of the confirm button. Defaults to "Conferma". */
  confirmLabel?: string;
  cancelLabel?: string;
  /** "danger" for destructive or irreversible actions. */
  tone?: "danger" | "default";
}

type ConfirmFn = (options: ConfirmOptions) => Promise<boolean>;

const ConfirmContext = createContext<ConfirmFn | null>(null);

/**
 * App-wide confirmation dialog. Replaces window.confirm() (which looks
 * foreign inside the Capacitor/Electron shells) with an accessible
 * alertdialog that matches the design system.
 */
export function ConfirmProvider({ children }: { children: ReactNode }) {
  const { t } = useI18n();
  const [options, setOptions] = useState<ConfirmOptions | null>(null);
  const [open, setOpen] = useState(false);
  const resolver = useRef<((value: boolean) => void) | null>(null);

  const confirm = useCallback<ConfirmFn>((opts) => {
    if ((opts.tone ?? "danger") === "danger") haptic("warning");
    // A pending confirmation is answered "no" if a new one replaces it.
    resolver.current?.(false);
    setOptions(opts);
    setOpen(true);
    return new Promise<boolean>((resolve) => {
      resolver.current = resolve;
    });
  }, []);

  const settle = useCallback((value: boolean) => {
    resolver.current?.(value);
    resolver.current = null;
    setOpen(false);
  }, []);

  const danger = (options?.tone ?? "danger") === "danger";
  const Icon = danger ? AlertTriangle : HelpCircle;

  return (
    <ConfirmContext.Provider value={confirm}>
      {children}
      <AlertDialogPrimitive.Root
        open={open}
        onOpenChange={(next) => {
          if (!next) settle(false);
        }}
      >
        <AlertDialogPrimitive.Portal>
          <AlertDialogPrimitive.Overlay className="fixed inset-0 z-50 bg-scrim duration-200 supports-backdrop-filter:backdrop-blur-[2px] data-open:animate-in data-open:fade-in-0 data-closed:animate-out data-closed:fade-out-0" />
          <AlertDialogPrimitive.Content className="fixed top-1/2 left-1/2 z-50 w-[calc(100%-2rem)] max-w-sm -translate-x-1/2 -translate-y-1/2 rounded-3xl border border-border bg-popover p-6 text-popover-foreground shadow-pop outline-none duration-200 ease-fluid data-open:animate-in data-open:fade-in-0 data-open:zoom-in-95 data-closed:animate-out data-closed:fade-out-0 data-closed:zoom-out-95 sm:max-w-md">
            <div className="flex flex-col items-center text-center sm:flex-row sm:items-start sm:gap-4 sm:text-left">
              <span
                className={cn(
                  "flex size-12 shrink-0 items-center justify-center rounded-2xl",
                  danger
                    ? "bg-danger-soft text-danger"
                    : "bg-primary-soft text-primary-soft-foreground"
                )}
              >
                <Icon className="size-[1.375rem]" aria-hidden="true" />
              </span>
              <div className="mt-3 sm:mt-0.5">
                <AlertDialogPrimitive.Title className="text-lg leading-snug font-bold tracking-tight">
                  {options?.title ?? t("states.confirmTitle")}
                </AlertDialogPrimitive.Title>
                {options?.description ? (
                  <AlertDialogPrimitive.Description className="mt-1.5 text-sm leading-relaxed text-muted-foreground">
                    {options.description}
                  </AlertDialogPrimitive.Description>
                ) : (
                  <AlertDialogPrimitive.Description className="sr-only">
                    {options?.title ?? t("states.confirmTitle")}
                  </AlertDialogPrimitive.Description>
                )}
              </div>
            </div>
            <div className="mt-6 grid grid-cols-2 gap-2.5 sm:flex sm:justify-end">
              <AlertDialogPrimitive.Cancel
                className={cn(buttonVariants({ variant: "secondary", size: "lg" }))}
              >
                {options?.cancelLabel ?? t("common.cancel")}
              </AlertDialogPrimitive.Cancel>
              <AlertDialogPrimitive.Action
                className={cn(
                  buttonVariants({ variant: danger ? "danger" : "default", size: "lg" })
                )}
                onClick={() => settle(true)}
              >
                {options?.confirmLabel ?? t("common.confirm")}
              </AlertDialogPrimitive.Action>
            </div>
          </AlertDialogPrimitive.Content>
        </AlertDialogPrimitive.Portal>
      </AlertDialogPrimitive.Root>
    </ConfirmContext.Provider>
  );
}

/** `const confirm = useConfirm(); if (!(await confirm({...}))) return;` */
export function useConfirm(): ConfirmFn {
  const ctx = useContext(ConfirmContext);
  if (!ctx) throw new Error("useConfirm must be used within ConfirmProvider");
  return ctx;
}
