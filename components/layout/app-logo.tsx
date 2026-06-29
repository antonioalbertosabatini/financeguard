import { cn } from "@/lib/utils";

export function AppLogo({ className }: { className?: string }) {
  return (
    <img
      src="/icon.svg"
      alt="FinanceGuard"
      className={cn("shrink-0 rounded-xl", className)}
    />
  );
}
