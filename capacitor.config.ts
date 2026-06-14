/**
 * Configurazione Capacitor (FASE 2 - app native desktop/mobile).
 *
 * Questo file e' un TEMPLATE: non e' operativo finche' non si installano i
 * pacchetti Capacitor e non si genera un build client statico. Vedi la sezione
 * "Roadmap multi-piattaforma" nel README per i passaggi completi.
 *
 * Dopo `npm i -D @capacitor/cli @capacitor/core`, sostituisci l'interfaccia
 * locale qui sotto con: `import type { CapacitorConfig } from "@capacitor/cli"`.
 */
interface CapacitorConfig {
  appId: string;
  appName: string;
  webDir: string;
  server?: { androidScheme?: string };
}

const config: CapacitorConfig = {
  appId: "app.financeguard",
  appName: "FinanceGuard",
  // Cartella dell'export client statico (richiede output: "export" e un data
  // layer interamente lato client - vedi lib/storage e lib/crypto/web-crypto).
  webDir: "out",
  server: { androidScheme: "https" },
};

export default config;
