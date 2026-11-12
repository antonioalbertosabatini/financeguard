import { AppLogo } from "@/components/layout/app-logo";

/**
 * Layout for setup / unlock: centred card on a soft branded backdrop.
 * The radial tint uses the primary token, so it follows light/dark themes.
 */
export function AuthShell({
  title,
  description,
  children,
}: {
  title: string;
  description: string;
  children: React.ReactNode;
}) {
  return (
    <div className="relative flex min-h-dvh items-center justify-center overflow-hidden bg-background p-4 pt-safe pb-safe">
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-x-0 top-0 h-[60vh] bg-[radial-gradient(ellipse_at_top,color-mix(in_oklch,var(--primary)_14%,transparent),transparent_70%)]"
      />
      <div className="relative w-full max-w-sm animate-rise space-y-7">
        <div className="flex flex-col items-center gap-4 text-center">
          <AppLogo className="size-16 rounded-2xl shadow-pop" />
          <div>
            <h1 className="text-title">{title}</h1>
            <p className="mt-1.5 text-sm text-muted-foreground">{description}</p>
          </div>
        </div>
        {children}
      </div>
    </div>
  );
}
