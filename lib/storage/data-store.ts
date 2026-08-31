/**
 * Store dati client-side: la "colonna portante" dell'app multipiattaforma.
 *
 * Tiene in memoria la chiave di sessione (mai su disco), il vault e il dataset
 * decifrato, e li persiste come singolo bundle cifrato tramite uno
 * StorageAdapter (di default IndexedDB). Sostituisce le server action + il
 * filesystem Node: lib/db/* legge/scrive il dataset da qui.
 *
 * E' un singleton osservabile compatibile con `useSyncExternalStore`: lo stato
 * pubblico ({status, version}) cambia riferimento a ogni emit, mentre chiave,
 * dataset e vault restano in campi interni non esposti a React.
 */
import { useSyncExternalStore } from "react";
import { MIN_PASSWORD_LENGTH } from "@/lib/constants";
import { AppError } from "@/lib/i18n/app-error";
import { getCurrentLanguage } from "@/lib/i18n/runtime";
import { translate } from "@/lib/i18n/translate";
import { verifyVaultPasswordWeb, type VaultFile } from "@/lib/crypto/web-crypto";
import type { StorageAdapter } from "@/lib/storage/adapter";
import {
  createBundle,
  openBundle,
  saveBundle,
} from "@/lib/storage/bundle";
import { emptyDataset, normalizeDataset, type Dataset } from "@/lib/storage/dataset";
import { IndexedDbAdapter } from "@/lib/storage/idb-adapter";
import { getLocalDeviceId } from "@/lib/storage/local-store";
import {
  migrateSyncMetadataIfNeeded,
  stampDatasetAsAuthoritative,
} from "@/lib/sync/sync-metadata";

export type StoreStatus = "loading" | "needs-setup" | "locked" | "unlocked";

export interface StoreState {
  status: StoreStatus;
  /** Incrementa a ogni mutazione del dataset: le viste lo usano come dipendenza. */
  version: number;
}

let snapshot: StoreState = { status: "loading", version: 0 };
const listeners = new Set<() => void>();

// Stato interno NON esposto a React (chiavi e dati sensibili in memoria).
let adapter: StorageAdapter | null = null;
let deviceId = "";
let key: Uint8Array | null = null;
let vault: VaultFile | null = null;
let revision = 0;
let dataset: Dataset | null = null;
/** Master password in memoria (solo sessione sbloccata) per decifrare il bundle cloud. */
let sessionPassword: string | null = null;

let initPromise: Promise<void> | null = null;
let saveChain: Promise<void> = Promise.resolve();
let saveTimer: ReturnType<typeof setTimeout> | null = null;

function emit(next: Partial<StoreState>): void {
  snapshot = { ...snapshot, ...next };
  for (const listener of listeners) listener();
}

function getAdapter(): StorageAdapter {
  if (!adapter) adapter = new IndexedDbAdapter();
  return adapter;
}

/** Inizializza lo store una sola volta: stabilisce se serve setup o unlock. */
export function initStore(): Promise<void> {
  if (initPromise) return initPromise;
  initPromise = (async () => {
    deviceId = await getLocalDeviceId();
    const existing = await getAdapter().load();
    emit({ status: existing ? "locked" : "needs-setup" });
  })();
  return initPromise;
}

function ensureValidPassword(password: string): string | null {
  if (password.length < MIN_PASSWORD_LENGTH) {
    return translate(getCurrentLanguage(), "validation.passwordMinLength", {
      minLength: MIN_PASSWORD_LENGTH,
    });
  }
  return null;
}

export type AuthError = { error: string };

/** Crea un nuovo vault con il dataset iniziale e sblocca l'app. */
export async function setupPassword(
  password: string,
  confirm: string
): Promise<AuthError | void> {
  const invalid = ensureValidPassword(password);
  if (invalid) return { error: invalid };
  if (password !== confirm) {
    return { error: translate(getCurrentLanguage(), "errors.passwordMismatch") };
  }

  const data = emptyDataset();
  const created = await createBundle(password, data, deviceId);
  await getAdapter().save(created.text);

  key = created.key;
  vault = created.vault;
  revision = 1;
  dataset = data;
  sessionPassword = password;
  emit({ status: "unlocked", version: snapshot.version + 1 });
}

/** Apre e decifra il bundle esistente con la password fornita. */
export async function unlockApp(password: string): Promise<AuthError | void> {
  const opened = await openBundle<Dataset>(getAdapter(), password).catch(
    () => null
  );
  if (!opened) {
    return { error: translate(getCurrentLanguage(), "errors.wrongPassword") };
  }

  key = opened.key;
  vault = opened.vault;
  revision = opened.revision;
  dataset = normalizeDataset(opened.dataset);
  sessionPassword = password;
  if (migrateSyncMetadataIfNeeded(dataset, deviceId)) {
    emit({ version: snapshot.version + 1 });
    await persistNow();
  }
  emit({ status: "unlocked", version: snapshot.version + 1 });
}

/** Blocca la sessione: azzera chiave e dataset dalla memoria. */
export function lockApp(): void {
  key = null;
  vault = null;
  dataset = null;
  revision = 0;
  sessionPassword = null;
  emit({ status: "locked", version: snapshot.version + 1 });
}

/** Cambia la password ri-cifrando il dataset corrente con un nuovo vault. */
export async function changePassword(
  oldPassword: string,
  newPassword: string,
  confirm: string
): Promise<AuthError | void> {
  if (!vault || !dataset) {
    return { error: translate(getCurrentLanguage(), "errors.appLocked") };
  }
  const invalid = ensureValidPassword(newPassword);
  if (invalid) {
    return {
      error: translate(getCurrentLanguage(), "validation.passwordMinLengthNew", {
        minLength: MIN_PASSWORD_LENGTH,
      }),
    };
  }
  if (newPassword !== confirm) {
    return { error: translate(getCurrentLanguage(), "errors.passwordMismatch") };
  }

  const verified = await verifyVaultPasswordWeb(vault, oldPassword);
  if (!verified) {
    return { error: translate(getCurrentLanguage(), "errors.wrongOldPassword") };
  }

  const created = await createBundle(newPassword, dataset, deviceId);
  await getAdapter().save(created.text);
  key = created.key;
  vault = created.vault;
  revision = 1;
  sessionPassword = newPassword;
}

/** Restituisce il dataset vivo (muta in place); lancia se l'app e' bloccata. */
export function getDataset(): Dataset {
  if (!dataset) {
    throw new AppError("errors.appLockedWithHint");
  }
  return normalizeDataset(dataset);
}

/**
 * Sostituisce l'intero dataset (es. import in chiaro) mantenendo la password
 * di accesso corrente, quindi persiste.
 */
export async function replaceDataset(next: Dataset): Promise<void> {
  if (!key || !vault) throw new AppError("errors.appLocked");
  normalizeDataset(next);
  stampDatasetAsAuthoritative(next, deviceId);
  dataset = next;
  emit({ version: snapshot.version + 1 });
  await persistNow();
}

/**
 * Sostituisce il dataset e ri-cifra con una nuova password (es. import di un
 * backup criptato: la password di accesso diventa quella del backup).
 */
export async function replaceDatasetWithPassword(
  next: Dataset,
  password: string
): Promise<void> {
  normalizeDataset(next);
  stampDatasetAsAuthoritative(next, deviceId);
  const created = await createBundle(password, next, deviceId);
  await getAdapter().save(created.text);
  key = created.key;
  vault = created.vault;
  revision = 1;
  dataset = next;
  sessionPassword = password;
  emit({ status: "unlocked", version: snapshot.version + 1 });
}

/**
 * Imposta la revisione base in memoria e persiste (revision+1 su disco).
 * Usato dal sync push-only per superare la revisione remota.
 */
export async function advanceRevisionBase(baseRevision: number): Promise<void> {
  if (!key || !vault || !dataset) throw new AppError("errors.appLocked");
  revision = baseRevision;
  await persistNow();
}

export function isUnlocked(): boolean {
  return dataset !== null;
}

export function getDeviceId(): string {
  return deviceId;
}

export function getRevision(): number {
  return revision;
}

/** Contesto per sync cloud (solo con vault sbloccato). */
export function getSyncContext(): {
  key: Uint8Array;
  vault: VaultFile;
  revision: number;
  dataset: Dataset;
  deviceId: string;
  password: string | null;
} | null {
  if (!key || !vault || !dataset) return null;
  return { key, vault, revision, dataset, deviceId, password: sessionPassword };
}

/**
 * Adotta vault e chiave del bundle cloud (nuovo browser/dispositivo con salt
 * diverso) e persiste il dataset merged o ripristinato.
 */
export async function adoptCloudVault(
  next: Dataset,
  baseRevision: number,
  nextKey: Uint8Array,
  nextVault: VaultFile
): Promise<number> {
  if (!dataset) throw new AppError("errors.appLocked");
  key = nextKey;
  vault = nextVault;
  dataset = next;
  revision = baseRevision;
  emit({ version: snapshot.version + 1 });
  const newRevision = await saveBundle(
    getAdapter(),
    { key, vault, revision },
    dataset,
    deviceId
  );
  revision = newRevision;
  return newRevision;
}

/**
 * Applica un dataset merged dal sync cloud, persiste e aggiorna la revisione.
 */
export async function applySyncedDataset(
  next: Dataset,
  baseRevision: number
): Promise<number> {
  if (!key || !vault || !dataset) throw new AppError("errors.appLocked");
  dataset = normalizeDataset(next);
  revision = baseRevision;
  emit({ version: snapshot.version + 1 });
  const newRevision = await saveBundle(
    getAdapter(),
    { key, vault, revision },
    dataset,
    deviceId
  );
  revision = newRevision;
  return newRevision;
}

/**
 * Da chiamare dopo ogni mutazione del dataset: notifica le viste (bump version)
 * e pianifica un salvataggio del bundle con debounce.
 */
export function commit(): void {
  emit({ version: snapshot.version + 1 });
  schedulePersist();
}

function schedulePersist(): void {
  if (saveTimer) clearTimeout(saveTimer);
  saveTimer = setTimeout(() => {
    saveTimer = null;
    void persistNow();
  }, 250);
}

/** Salva subito il bundle (usato dal debounce e prima dell'export). */
export function persistNow(): Promise<void> {
  if (!key || !vault || !dataset) return Promise.resolve();
  const current = { key, vault, revision };
  const data = dataset;
  saveChain = saveChain.then(async () => {
    revision = await saveBundle(getAdapter(), current, data, deviceId);
  });
  return saveChain;
}

// --- Integrazione con React -------------------------------------------------

function subscribe(listener: () => void): () => void {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

function getSnapshot(): StoreState {
  return snapshot;
}

// In static export il primo render e' lato build/SSR: stato costante "loading".
const serverSnapshot: StoreState = { status: "loading", version: 0 };
function getServerSnapshot(): StoreState {
  return serverSnapshot;
}

export function useDataStore(): StoreState {
  return useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);
}
