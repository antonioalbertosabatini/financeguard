"use client";

import { Moon, Sun } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useI18n } from "@/providers/i18n-provider";
import { useTheme } from "@/providers/theme-provider";
import { haptic } from "@/lib/native/haptics";

/** Quick light/dark switch in the header (full choice incl. "System" lives in Settings). */
export function ThemeToggle() {
  const { resolvedTheme, setTheme } = useTheme();
  const { t } = useI18n();
  const dark = resolvedTheme === "dark";
  const label = dark ? t("palette.switchToLight") : t("palette.switchToDark");

  return (
    <Button
      type="button"
      variant="ghost"
      size="icon"
      onClick={() => {
        haptic("select");
        setTheme(dark ? "light" : "dark");
      }}
      aria-label={label}
      title={label}
      className="rounded-full text-muted-foreground hover:text-foreground"
    >
      {dark ? <Sun className="size-[1.125rem]" /> : <Moon className="size-[1.125rem]" />}
    </Button>
  );
}
