/**
 * Configurazione Capacitor per le app native iOS/Android di FinanceGuard.
 *
 * L'app e' un export statico Next.js (cartella `out/`, vedi `webDir`) 100%
 * client-side: la WebView carica i file locali, il vault e' cifrato lato client
 * (lib/crypto/web-crypto) e persiste in IndexedDB (lib/storage/idb-adapter).
 *
 * `androidScheme: "https"` serve a far girare la WebView Android in un secure
 * context, requisito di Web Crypto (`crypto.subtle`).
 *
 * Flusso: `npm run build` -> `npx cap sync` -> `npx cap open ios|android`.
 */
import type { CapacitorConfig } from "@capacitor/cli";

const config: CapacitorConfig = {
  appId: "app.financeguard",
  appName: "FinanceGuard",
  webDir: "out",
  server: { androidScheme: "https" },
};

export default config;
