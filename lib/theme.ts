export type ThemePreference = "light" | "dark" | "system";
export type ResolvedTheme = "light" | "dark";

export const THEME_PREFERENCES: ThemePreference[] = ["light", "dark", "system"];

/** localStorage key. Kept outside the encrypted vault so the theme also applies on /unlock and /setup. */
export const THEME_STORAGE_KEY = "fg-theme";

/** Hex equivalents of `--background` (oklch) for browser chrome / status bar. */
export const THEME_BACKGROUND_HEX: Record<ResolvedTheme, string> = {
  light: "#f9f9fc",
  dark: "#0b0b12",
};

export function isThemePreference(value: unknown): value is ThemePreference {
  return value === "light" || value === "dark" || value === "system";
}

/**
 * Inline script run before first paint (from the root layout) so the correct
 * theme class is on <html> before React hydrates: no flash of the wrong theme.
 */
export const THEME_INIT_SCRIPT = `(function(){try{var t=localStorage.getItem(${JSON.stringify(
  THEME_STORAGE_KEY
)});var d=t==="dark"||((!t||t==="system")&&window.matchMedia("(prefers-color-scheme: dark)").matches);document.documentElement.classList.toggle("dark",d);}catch(e){}})();`;
