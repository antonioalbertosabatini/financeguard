---
name: financeguard
description: FinanceGuard project domain knowledge — local-first encrypted personal finance app (Next.js, client-side bundle, Italian UI). Use when working in this repo on features, bugs, data models, sync, crypto, storage, UI, or architecture decisions.
---

# FinanceGuard

App di gestione finanze personali **local-first e cifrata**. Nessun database remoto obbligatorio, nessuna telemetria. L'interfaccia è **bilingue** (italiano/inglese).

## Architettura

```
UI (components/, app/) → lib/actions/* → lib/db/* → lib/storage/data-store → bundle cifrato
                                                              ↓
                                                    StorageAdapter (IndexedDB / Capacitor / FS)
                                                              ↓
                                              lib/sync/* (Supabase opt-in, zero-knowledge)
```

- **Next.js 16** con `output: "export"` — app 100% client-side, impacchettabile con Electron e Capacitor.
- **Data store centrale**: `lib/storage/data-store.ts` — singleton con `useSyncExternalStore`, stati `loading | needs-setup | locked | unlocked`.
- **Persistenza**: un unico bundle cifrato (`.fgv`) in `lib/storage/bundle.ts`. Contiene vault + revision + dataset cifrato.
- **Data layer**: `lib/db/*` legge/scrive il `Dataset` in memoria; chiama `commit()` per persistere (debounced).
- **Server actions**: `lib/actions/*` validano con Zod e delegano a `lib/db/*`. Non usano filesystem Node né API server-side per i dati.

## Modello dati (`lib/storage/dataset.ts`)

| Entità | Schema | Note |
|--------|--------|------|
| Account | `lib/schemas/account.ts` | Saldo in centesimi (`initialBalance`), tipi: checking/cash/savings/credit_card |
| Categoria | `lib/schemas/category.ts` | income/expense, icone in `lib/constants/category-icons.ts` |
| Transazione | `lib/schemas/transaction.ts` | Importi interi positivi; date `YYYY-MM-DD`; raggruppate per anno in `transactionsByYear` |
| Trasferimento | `lib/schemas/account-transfer.ts` | Entità separata in `accountTransfersByYear` (non confondere con `type: "transfer"` legacy) |
| Budget | `lib/schemas/budget.ts` | Per categoria e periodo |
| Settings | `lib/schemas/settings.ts` | Valuta, `language` (it/en), `locale` (derivato), preferenze UI |

**Regole dominio:**
- Tutti gli importi sono **interi in centesimi** — usare `lib/utils/money.ts` (`toCents`, `formatCents`, `parseEuroInput`).
- Le transazioni ricorrenti si espandono a runtime con `lib/utils/recurrence.ts` (`expandRecurrences`).
- Gli ID seguono `generateId(prefix)` in `lib/db/index.ts` (es. `tx_a1b2c3d4`).
- Per entrate/uscite la categoria è obbligatoria; i trasferimenti tra conti usano `account-transfers`.

## Sicurezza

- Cifratura **AES-256-GCM** via Web Crypto (`lib/crypto/web-crypto.ts`).
- Chiave derivata con **scrypt** (`@noble/hashes`); **mai salvata su disco** — solo in memoria dopo unlock.
- Password minima: `MIN_PASSWORD_LENGTH` (12) in `lib/constants.ts`; validare con `getPasswordError()`.
- Il cloud (Supabase) riceve **solo il bundle cifrato** — zero-knowledge (`lib/sync/cloud-sync.ts`).

## Sync cloud (opt-in)

- Orchestrato da `lib/sync/sync-orchestrator.ts`: pull → merge client-side → push.
- Merge field-level in `lib/sync/merge-datasets.ts`; metadati in `lib/sync/sync-metadata.ts`.
- Session lock per evitare scritture concorrenti (`lib/sync/session-lock.ts`).
- `ConflictError` se la revisione remota è più recente — nessun merge automatico silenzioso su conflitto di revisione bundle.

## Convenzioni codice

**Aggiungere/modificare dati:**
1. Schema Zod in `lib/schemas/`
2. CRUD in `lib/db/` (muta `getDataset()`, traccia sync se applicabile, chiama `commit()`)
3. Facciata in `lib/actions/` (parse + delega)
4. UI in `components/` o `app/(app)/`

**UI:**
- shadcn/ui + Tailwind 4; icone Lucide.
- Form con react-hook-form + zod resolver.
- Importi: hook `useFormatCents()` per rispettare la visibilità importi mascherati.
- Navigazione: `components/layout/nav-config.ts`.

L'interfaccia supporta **italiano** e **inglese** (selezionabile in Impostazioni). Il campo `settings.language` (`"it" | "en"`) è sincronizzato nel vault; `settings.locale` è derivato automaticamente (`it-IT` / `en-US`) per formattazione numeri e date.

**Test:** Vitest — `npm test`. Test esistenti in `lib/sync/*.test.ts`.

## Comandi utili

```bash
npm run dev          # sviluppo web
npm test             # test unitari
npm run build        # export statico in out/
npm run electron:dev # desktop (serve out/ o dev server)
npm run cap:ios      # sync + apri Xcode
npm run cap:android  # sync + apri Android Studio
```

## Vincoli importanti

- **Non** aggiungere dipendenze da filesystem Node o server-side DB — l'app deve restare client-only.
- **Non** salvare chiavi o password in storage persistente.
- **Non** usare API Next.js che richiedono un server runtime (Route Handlers dinamici, SSR con dati locali).
- Rispettare `output: "export"` — niente `next/image` ottimizzato, niente route dinamiche server-side.
- Per nuove feature multipiattaforma, estendere `StorageAdapter` (`lib/storage/adapter.ts`) piuttosto che accedere direttamente a IndexedDB.
- Leggere `node_modules/next/dist/docs/` prima di usare API Next.js — questa versione ha breaking changes rispetto al training data.

## Pagine principali

| Route | Scopo |
|-------|-------|
| `/setup`, `/unlock` | Primo avvio e sblocco vault |
| `/` | Dashboard |
| `/transactions`, `/add` | Lista e creazione transazioni |
| `/accounts` | Conti |
| `/budget` | Budget |
| `/reports` | Report |
| `/categories` | Categorie |
| `/data` | Backup export/import |
| `/profile` | Profilo e sync cloud |
| `/settings` | Impostazioni |

## Risorse

- Panoramica utente e sicurezza: [README.md](../../../README.md)
- Dettaglio merge sync e metadati: [reference.md](reference.md)
