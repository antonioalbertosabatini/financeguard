/**
 * Haptic feedback on iOS/Android (Capacitor). A silent no-op on the web and
 * in Electron, so callers never need to check the platform.
 */
import { Capacitor } from "@capacitor/core";

type HapticKind = "tap" | "select" | "success" | "warning" | "error";

let hapticsModule: Promise<typeof import("@capacitor/haptics")> | null = null;

function load() {
  hapticsModule ??= import("@capacitor/haptics");
  return hapticsModule;
}

export function haptic(kind: HapticKind = "tap"): void {
  if (!Capacitor.isNativePlatform()) return;
  void load()
    .then(({ Haptics, ImpactStyle, NotificationType }) => {
      switch (kind) {
        case "tap":
          return Haptics.impact({ style: ImpactStyle.Light });
        case "select":
          return Haptics.selectionChanged();
        case "success":
          return Haptics.notification({ type: NotificationType.Success });
        case "warning":
          return Haptics.notification({ type: NotificationType.Warning });
        case "error":
          return Haptics.notification({ type: NotificationType.Error });
      }
    })
    .catch(() => {
      // Haptics unavailable on this device: ignore.
    });
}
