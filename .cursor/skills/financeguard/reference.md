# FinanceGuard — Reference

## Bundle format (`lib/storage/bundle.ts`)

```json
{
  "app": "financeguard",
  "format": 1,
  "vault": { /* salt, verifier, scrypt params */ },
  "revision": 42,
  "lastWriterDeviceId": "...",
  "lastWriteAt": "2026-06-29T...",
  "data": "<encrypted envelope JSON>"
}
```

- `revision` è monotono; incrementa ad ogni salvataggio.
- `ConflictError` se si tenta di salvare con revisione locale < remota.

## Data store API (`lib/storage/data-store.ts`)

| Funzione | Uso |
|----------|-----|
| `initStore()` | Avvio app — determina setup vs unlock |
| `setupPassword()` / `unlockApp()` | Auth |
| `lockApp()` | Blocca sessione, azzera chiave |
| `getDataset()` | Accesso al dataset (solo se unlocked) |
| `commit()` | Segnala mutazione + persist debounced |
| `persistNow()` | Persist immediato |
| `useDataStore()` | Hook React per status/version |
| `getSyncContext()` | Chiave + deviceId per sync |

## Sync metadata (`lib/sync/sync-metadata.ts`)

Traccia per ogni record:
- `updatedAt` per campo (merge last-write-wins per campo)
- Tombstone su delete

Entità tracciate: accounts, categories, budgets, transactions, accountTransfers, settings.

## Account transfers vs transaction transfer

- **`AccountTransfer`** (`lib/schemas/account-transfer.ts`): entità dedicata per spostamenti tra conti, con `fromAccountId` / `toAccountId`.
- **`Transaction` con `type: "transfer"`**: tipo legacy nel schema; il form transazioni usa solo income/expense (`TRANSACTION_FORM_TYPES`).

Preferire `AccountTransfer` per nuovi trasferimenti tra conti.

## Backup (`lib/storage/backup-client.ts`)

- Export/import ZIP con file JSON in chiaro o cifrati.
- Nomi file legacy per compatibilità: `accounts.json`, `categories.json`, `budgets.json`, `settings.json`, `transactions-YYYY.json`.
- Il backup cifrato può usare password diversa dalla master password.

## Recurrence (`lib/utils/recurrence.ts`)

Transazioni con `isRecurring: true` hanno `recurrenceStart` / `recurrenceEnd` nello stesso anno della `date`.
`expandRecurrences()` genera occorrenze virtuali (`ExpandedTransaction`) per visualizzazione e filtri.

## Balance (`lib/utils/balance.ts`)

Calcolo saldi conto considerando transazioni, trasferimenti e saldo iniziale.
Usare per dashboard e report — non ricalcolare ad hoc nelle viste.

## Supabase (opt-in)

Variabili env in `lib/sync/supabase-client.ts`. Se non configurate, sync cloud è disabilitato silenziosamente.
Auth derivata da email+password (`lib/sync/auth-derive.ts`) — hash separato dalla chiave vault.

## Electron / Capacitor

- **Electron** (`electron/main.js`): schema custom `app://` per secure context (Web Crypto).
- **Capacitor** (`capacitor.config.ts`): webDir `out/`, adapter filesystem in `lib/storage/capacitor-adapter.ts`.
