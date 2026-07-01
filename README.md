# FinanceGuard

**Zero-knowledge personal finance tracker.** Your financial data is encrypted on your device with your master password. Without that password, nobody — not even a cloud server — can read or recover your data.

FinanceGuard runs fully offline as a local-only app, or optionally syncs an **encrypted** vault across your devices through a Supabase project you control. In cloud mode the server only ever stores ciphertext: it never sees your password or your data.

- 🔐 **Zero-knowledge** — AES-256-GCM encryption, key derived from your password with scrypt. The key never leaves memory and is never persisted.
- 💻 **Local-first** — works 100% offline, no account required.
- ☁️ **Optional cloud sync** — bring your own Supabase project; only the encrypted bundle is uploaded.
- 🖥️ **Multi-platform** — web (PWA), desktop (Electron), mobile scaffolding (Capacitor).

> ⚠️ **There is no password recovery.** Because the app is zero-knowledge, a forgotten master password means the data is unrecoverable. Choose a strong password and export encrypted backups regularly.

---

## Features

- **Dashboard** — total balance, monthly income/expense, category breakdown and trends.
- **Accounts** — checking, cash, savings, credit card; per-account currency and initial balance.
- **Transactions** — income, expenses and inter-account transfers, with tags, search and year filtering.
- **Recurrences** — recurring transactions with start/end dates.
- **Categories** — customizable income/expense categories (sensible defaults seeded).
- **Budgets** — set limits per category and track actual vs. budgeted spending.
- **Reports** — analytics on spending by category and over time.
- **Backups** — export/import an encrypted (or cleartext) ZIP; a backup can use its own password.
- **Profile** — cloud account management and sync status.

---

## Local vs. Cloud mode

On first launch you choose how to use the app:

- **Local only** — set a master password and you're done. No account, no network, no configuration. Data lives encrypted in your browser (IndexedDB) or, on desktop, in a file. You can still export encrypted backups.
- **Cloud** — sync the encrypted vault between devices via Supabase. This requires configuring environment variables (see below). If the cloud isn't configured yet, the app tells you how and lets you continue locally.

A red banner appears on the dashboard whenever cloud sync is **not** active — no account configured, not signed in, or a failed sync. You can toggle this warning off in **Profile → Cloud account** (it starts off automatically if you chose local-only mode).

---

## Tech stack

- [Next.js 16](https://nextjs.org/) (App Router, static export) + [React 19](https://react.dev/) + TypeScript
- [Tailwind CSS 4](https://tailwindcss.com/) with [shadcn/ui](https://ui.shadcn.com/) (Radix primitives)
- Crypto: [@noble/hashes](https://github.com/paulmillr/noble-hashes) (scrypt) + Web Crypto API (AES-256-GCM)
- [Zod](https://zod.dev/) + [React Hook Form](https://react-hook-form.com/) for validation/forms
- [Supabase](https://supabase.com/) for optional cloud sync
- [Recharts](https://recharts.org/), [date-fns](https://date-fns.org/), [Sonner](https://sonner.emilkowal.ski/)
- [Electron](https://www.electronjs.org/) (desktop) and [Capacitor](https://capacitorjs.com/) (mobile)
- [Vitest](https://vitest.dev/) for tests

---

## Quick start

Requirements: **Node.js 20+**.

```bash
git clone <your-repo-url> financeguard
cd financeguard
npm install
npm run dev
```

Open <http://localhost:3000>. On first launch you'll pick **Local** or **Cloud** and set your master password. No `.env` is needed for local mode — the app runs and builds fine without one.

Useful scripts:

| Script | What it does |
| --- | --- |
| `npm run dev` | Start the dev server |
| `npm run build` | Production build (static export to `out/`) |
| `npm run start` | Serve the production build |
| `npm run lint` | Run ESLint |
| `npm run test` | Run the Vitest suite |

---

## Enabling cloud sync (optional)

Cloud sync is bring-your-own-backend: you run your own Supabase project, so you stay in control of your (encrypted) data.

1. **Create a Supabase project** at <https://supabase.com>.
2. **Run the migrations** in [`supabase/migrations/`](supabase/migrations/) against your project (Supabase SQL editor or CLI):
   - `0001_vault.sql` — `vault_meta` table + private `vaults` storage bucket, with Row Level Security so each user can only reach their own encrypted bundle.
   - `0002_active_session.sql` — `active_sessions` table (heartbeat) to avoid concurrent edits from multiple devices.
3. **Configure environment variables.** Copy [`.env.example`](.env.example) to `.env.local` and fill in:

   ```bash
   NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
   NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
   ```

   These are `NEXT_PUBLIC_*` variables, so they are compiled into the client **at build time** — restart the dev server or rebuild after changing them.
4. Restart the app, open **Profile → Cloud account**, and create or sign in to your cloud account.

> The Supabase anon key is public by design. Security does not rely on keeping it secret: the vault is encrypted client-side and Row Level Security scopes every row/object to the authenticated user. The master password and encryption key are never sent to Supabase.

If `.env.local` is missing or the variables are empty, cloud features are simply hidden and the app stays 100% local — nothing breaks.

---

## Desktop (Electron)

```bash
npm run electron:dev     # run the desktop app in dev
npm run electron:build   # build a distributable (dmg / nsis / AppImage)
```

Optional desktop env vars `FG_DATA_DIR` / `FG_LOCAL_DIR` (see `.env.example`) let you point the encrypted bundle and per-device state at custom folders — e.g. a synced cloud folder.

## Mobile (Capacitor)

Mobile support is scaffolded via Capacitor:

```bash
npm run cap:ios       # build, sync and open the iOS project
npm run cap:android   # build, sync and open the Android project
```

---

## Security model

- **Key derivation:** scrypt (`N=131072, r=8, p=1`) over your master password + a random per-vault salt. Legacy vaults are auto-upgraded on unlock.
- **Encryption:** AES-256-GCM with a random IV and authentication tag. The entire dataset is stored as a single encrypted bundle (`.fgv`).
- **Session key:** held in memory only; never written to disk.
- **Cloud auth:** a separate auth hash is derived from your credentials (the master password itself is never sent). Only the encrypted bundle is uploaded; merges happen client-side after decryption.
- **Isolation:** Supabase Row Level Security ensures each account can only access its own bundle and metadata.

---

## Contributing

Issues and pull requests are welcome. Please run `npm run lint` and `npm run test` before opening a PR.

> Note: this project pins a specific Next.js version whose conventions may differ from older releases — check the guides bundled under `node_modules/next/dist/docs/` when working on Next.js-specific code.

## License

[MIT](LICENSE) © 2026 Antonio Alberto Sabatini
