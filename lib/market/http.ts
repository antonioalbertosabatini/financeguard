/**
 * Trasporto HTTP per i dati di mercato.
 *
 * Le fonti gratuite che coprono gli ETF europei non mandano header CORS: nel
 * browser la risposta viene scartata. Dove l'app gira dentro un guscio nativo la
 * richiesta puo' uscire da fuori della WebView, che quella politica non la
 * applica. In ordine: ponte Electron, HTTP nativo di Capacitor, fetch normale.
 */
import { Capacitor, CapacitorHttp } from "@capacitor/core";

interface DesktopBridge {
  marketFetch(url: string): Promise<string>;
}

function desktopBridge(): DesktopBridge | null {
  if (typeof window === "undefined") return null;
  const bridge = (window as unknown as Record<string, unknown>)
    .financeguardDesktop;
  return bridge ? (bridge as DesktopBridge) : null;
}

/** True se la piattaforma corrente puo' contattare fonti senza header CORS. */
export function canReachCorsRestrictedSources(): boolean {
  return desktopBridge() !== null || Capacitor.isNativePlatform();
}

export async function fetchJson<T>(
  url: string,
  signal?: AbortSignal
): Promise<T> {
  const bridge = desktopBridge();
  if (bridge) {
    return JSON.parse(await bridge.marketFetch(url)) as T;
  }

  if (Capacitor.isNativePlatform()) {
    const response = await CapacitorHttp.get({
      url,
      headers: { Accept: "application/json" },
    });
    if (response.status >= 400) {
      throw new Error(`HTTP ${response.status}`);
    }
    return (
      typeof response.data === "string"
        ? JSON.parse(response.data)
        : response.data
    ) as T;
  }

  const response = await fetch(url, {
    signal,
    headers: { Accept: "application/json" },
  });
  if (!response.ok) {
    throw new Error(`HTTP ${response.status}`);
  }
  return (await response.json()) as T;
}
