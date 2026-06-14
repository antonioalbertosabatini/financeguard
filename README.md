# FinanceGuard

Gestione delle finanze personali, **locale e cifrata**. App [Next.js](https://nextjs.org) (App Router) che salva i dati come file JSON cifrati sul tuo disco: niente database remoto, niente account, niente telemetria.

## Avvio

```bash
npm install
npm run dev
```

Apri [http://localhost:3000](http://localhost:3000). Al primo avvio imposti una password; da quel momento i dati vengono cifrati con essa.

## Modello di sicurezza

- **Cifratura**: AES-256-GCM con IV casuale e tag di autenticazione per ogni file (`lib/crypto/cipher.ts`).
- **Derivazione chiave**: `scrypt` (parametri in `SCRYPT_PARAMS`) a partire dalla password, con salt casuale. La chiave **non viene mai salvata su disco**: resta solo in memoria dopo lo sblocco (`lib/crypto/session.ts`).
- **Vault**: `data/vault.json` contiene solo il salt (in chiaro), un verificatore cifrato e i parametri KDF. Non rivela la password.
- **Nessun vincolo al dispositivo**: i file sono portabili. Chi ottiene i file dal cloud vede solo blob cifrati.
- **Lunghezza minima password**: `MIN_PASSWORD_LENGTH` in `lib/constants.ts` (12). Usa una passphrase robusta: il vault, se finisce sul cloud, e' soggetto ad attacchi offline a forza bruta.

## Uso su piu' dispositivi con cartella cloud (OneDrive, ecc.)

Stato attuale: **supportato su desktop, un dispositivo alla volta.**

### Puntare i dati alla cartella cloud

Imposta la variabile d'ambiente `FG_DATA_DIR` sulla cartella sincronizzata:

```bash
# macOS / Linux
FG_DATA_DIR="$HOME/OneDrive/FinanceGuard" npm run start

# Windows (PowerShell)
$env:FG_DATA_DIR="C:\Users\<utente>\OneDrive\FinanceGuard"; npm run start
```

Lo stato locale per-dispositivo (device id, ultima revisione vista) viene tenuto **fuori** dalla cartella sincronizzata, in `~/.financeguard` (override con `FG_LOCAL_DIR`).

### Protezioni contro i conflitti di sincronizzazione

Anche usando un dispositivo alla volta, il client cloud sincronizza in background. FinanceGuard aggiunge alcune salvaguardie (`lib/db/sync-guard.ts`):

- **Scritture robuste**: file temporaneo in `data/.fg-tmp`, `fsync` e poi `rename` atomico, per non far sincronizzare file parziali.
- **Revisione**: `data/sync-meta.json` traccia un contatore monotono e l'ultimo dispositivo che ha scritto.
- **Guardia anti-stale**: se i dati sul disco risultano piu' vecchi dell'ultima versione vista da questo dispositivo, compare un avviso che invita ad attendere la sincronizzazione.
- **Lock di sessione**: `data/app.lock` con heartbeat; se un altro dispositivo risulta attivo di recente, compare un avviso.
- **Rilevamento copie di conflitto**: se il cloud crea file duplicati, vengono segnalati.

Regola pratica: **attendi che la sincronizzazione sia completa prima di aprire l'app su un altro dispositivo.**

### Aggiornamento automatico dei parametri di sicurezza

Se il costo `scrypt` viene aumentato, al primo sblocco i vault esistenti vengono ri-cifrati con i nuovi parametri (`upgradeVaultKdf` in `lib/crypto/vault.ts`), in modo trasparente.

## Roadmap multi-piattaforma (FASE 2)

Obiettivo: app installabile su desktop **e mobile** (iOS/Android), local-first, con il bundle cifrato in una cartella cloud. Le fondamenta sono gia' nel repository:

- **Crittografia lato client** (`lib/crypto/web-crypto.ts`): AES-GCM via Web Crypto + `scrypt` (`@noble/hashes`), **formato envelope/vault identico** a quello server (verificato compatibile).
- **Astrazione di storage** (`lib/storage/adapter.ts`): interfaccia `StorageAdapter` con implementazione `FileSystemAccessAdapter` (desktop) e selezione file; su mobile si aggiunge un adapter basato sul document picker nativo.
- **Stato locale client** (`lib/storage/local-store.ts`): IndexedDB per device id, ultima revisione e handle del file scelto.
- **Bundle cifrato unico** (`lib/storage/bundle.ts`): un solo file `.fgv` con vault + `revision` + dataset cifrato e guardia anti-conflitto (`ConflictError`).
- **PWA**: `app/manifest.ts` + `public/icon.svg` rendono l'app installabile.
- **Capacitor**: `capacitor.config.ts` (template) per impacchettare l'app web come app nativa.

Passi rimanenti per completare la FASE 2:

1. Spostare il data layer da server (`lib/db/*`, server actions) a client, usando `lib/storage/bundle.ts` come persistenza e IndexedDB come copia di lavoro.
2. Configurare l'export statico (`output: "export"`) e un service worker per l'uso offline.
3. Installare Capacitor (`npm i -D @capacitor/cli @capacitor/core`) e generare i progetti nativi, aggiungendo icone PNG 192/512.

## Backup

Dalla sezione Dati puoi esportare/importare backup in chiaro o cifrati (ZIP). Il backup cifrato puo' usare una password diversa da quella dell'app.
