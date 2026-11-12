/**
 * Native window chrome on iOS/Android: status bar colours that follow the
 * app theme, and the launch splash hidden once the app is ready.
 * Silent no-ops on the web and in Electron.
 */
import { Capacitor } from "@capacitor/core";
import { THEME_BACKGROUND_HEX, type ResolvedTheme } from "@/lib/theme";

export async function syncStatusBar(theme: ResolvedTheme): Promise<void> {
  if (!Capacitor.isNativePlatform()) return;
  try {
    const { StatusBar, Style } = await import("@capacitor/status-bar");
    // Style.Dark = light content, for dark backgrounds.
    await StatusBar.setStyle({ style: theme === "dark" ? Style.Dark : Style.Light });
    if (Capacitor.getPlatform() === "android") {
      await StatusBar.setBackgroundColor({ color: THEME_BACKGROUND_HEX[theme] });
    }
  } catch {
    // Plugin unavailable: keep the system default.
  }
}

export async function hideSplash(): Promise<void> {
  if (!Capacitor.isNativePlatform()) return;
  try {
    const { SplashScreen } = await import("@capacitor/splash-screen");
    await SplashScreen.hide({ fadeOutDuration: 200 });
  } catch {
    // ignore
  }
}
