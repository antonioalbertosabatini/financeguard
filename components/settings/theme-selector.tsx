"use client";

import { Monitor, Moon, Sun, type LucideIcon } from "lucide-react";
import { cn } from "@/lib/utils";
import { THEME_PREFERENCES, type ThemePreference } from "@/lib/theme";
import { useTheme } from "@/providers/theme-provider";
import { useI18n } from "@/providers/i18n-provider";
import { haptic } from "@/lib/native/haptics";

const ICONS: Record<ThemePreference, LucideIcon> = {
  light: Sun,
  dark: Moon,
  system: Monitor,
};

/** Segmented Light / Dark / System control. Applies immediately, no save needed. */
export function ThemeSelector() {
  const { theme, setTheme } = useTheme();
  const { t } = useI18n();

  return (
    <div
      role="radiogroup"
      aria-label={t("settings.appearanceTitle")}
      className="grid grid-cols-3 gap-1 rounded-xl bg-surface-2 p-1"
    >
      {THEME_PREFERENCES.map((pref) => {
        const Icon = ICONS[pref];
        const selected = theme === pref;
        return (
          <button
            key={pref}
            type="button"
            role="radio"
            aria-checked={selected}
            onClick={() => {
              haptic("select");
              setTheme(pref);
            }}
            className={cn(
              "pressable flex h-11 items-center justify-center gap-2 rounded-lg text-sm font-semibold outline-none focus-visible:ring-2 focus-visible:ring-ring",
              selected
                ? "bg-card text-foreground shadow-soft"
                : "text-muted-foreground hover:text-foreground"
            )}
          >
            <Icon className="size-4" aria-hidden="true" />
            {t(`settings.theme.${pref}`)}
          </button>
        );
      })}
    </div>
  );
}
