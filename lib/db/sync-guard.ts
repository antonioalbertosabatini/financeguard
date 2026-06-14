import crypto from "crypto";
import fs from "fs/promises";
import os from "os";
import path from "path";
import {
  DATA_DIR,
  LOCAL_STATE_DIR,
  LOCK_PATH,
  NON_DATA_FILES,
  ROOT_DATA_FILES,
  SYNC_META_PATH,
  TMP_DIRNAME,
  TRANSACTIONS_DIR,
} from "@/lib/constants";

const DEVICE_ID_PATH = path.join(LOCAL_STATE_DIR, "device-id");
const LAST_SEEN_PATH = path.join(LOCAL_STATE_DIR, "last-seen.json");

// Un lock piu' vecchio di questa soglia e' considerato abbandonato.
const LOCK_TTL_MS = 5 * 60 * 1000;
// Frequenza minima di riscrittura dell'heartbeat del lock, per non generare
// traffico di sincronizzazione a ogni navigazione.
const LOCK_REFRESH_INTERVAL_MS = 60 * 1000;

let lastLockRefresh = 0;

export interface SyncMeta {
  v: 1;
  revision: number;
  lastWriterDeviceId: string;
  lastWriteAt: string;
}

interface LockInfo {
  deviceId: string;
  hostname: string;
  updatedAt: string;
}

interface LastSeen {
  revision: number;
  updatedAt: string;
}

export interface SyncStatus {
  warnings: string[];
}

async function writeAtomicRaw(filePath: string, content: string): Promise<void> {
  await fs.mkdir(path.dirname(filePath), { recursive: true });
  const tmp = `${filePath}.${crypto.randomUUID()}.tmp`;
  const fh = await fs.open(tmp, "w");
  try {
    await fh.writeFile(content, "utf-8");
    await fh.sync();
  } finally {
    await fh.close();
  }
  await fs.rename(tmp, filePath);
}

async function readJson<T>(filePath: string): Promise<T | null> {
  try {
    return JSON.parse(await fs.readFile(filePath, "utf-8")) as T;
  } catch {
    return null;
  }
}

let cachedDeviceId: string | null = null;

export async function getDeviceId(): Promise<string> {
  if (cachedDeviceId) return cachedDeviceId;
  try {
    const existing = (await fs.readFile(DEVICE_ID_PATH, "utf-8")).trim();
    if (existing) {
      cachedDeviceId = existing;
      return existing;
    }
  } catch {
    // file mancante: lo creiamo sotto
  }
  const id = crypto.randomUUID();
  await writeAtomicRaw(DEVICE_ID_PATH, id);
  cachedDeviceId = id;
  return id;
}

export async function readSyncMeta(): Promise<SyncMeta | null> {
  const parsed = await readJson<SyncMeta>(SYNC_META_PATH);
  if (parsed && typeof parsed.revision === "number") return parsed;
  return null;
}

async function writeLastSeen(revision: number): Promise<void> {
  await writeAtomicRaw(
    LAST_SEEN_PATH,
    JSON.stringify({ revision, updatedAt: new Date().toISOString() }, null, 2)
  );
}

/**
 * Da chiamare dopo ogni scrittura di dati: incrementa la revisione e registra
 * quale dispositivo ha scritto per ultimo. Aggiorna anche la revisione vista
 * localmente, cosi' la guardia anti-stale resta coerente.
 */
export async function markDataWritten(): Promise<void> {
  const deviceId = await getDeviceId();
  const current = await readSyncMeta();
  const next: SyncMeta = {
    v: 1,
    revision: (current?.revision ?? 0) + 1,
    lastWriterDeviceId: deviceId,
    lastWriteAt: new Date().toISOString(),
  };
  await writeAtomicRaw(SYNC_META_PATH, JSON.stringify(next, null, 2));
  await writeLastSeen(next.revision);
}

/** Aggiorna il lock di sessione con un heartbeat di questo dispositivo. */
export async function refreshLock(force = false): Promise<void> {
  const now = Date.now();
  if (!force && now - lastLockRefresh < LOCK_REFRESH_INTERVAL_MS) return;
  lastLockRefresh = now;
  const deviceId = await getDeviceId();
  const info: LockInfo = {
    deviceId,
    hostname: os.hostname(),
    updatedAt: new Date().toISOString(),
  };
  await writeAtomicRaw(LOCK_PATH, JSON.stringify(info, null, 2));
}

/** Rilascia il lock se appartiene a questo dispositivo. */
export async function releaseLock(): Promise<void> {
  const deviceId = await getDeviceId();
  const lock = await readJson<LockInfo>(LOCK_PATH);
  if (lock && lock.deviceId === deviceId) {
    await fs.rm(LOCK_PATH, { force: true });
  }
  lastLockRefresh = 0;
}

function isKnownRootFile(name: string): boolean {
  return (
    NON_DATA_FILES.has(name) ||
    (ROOT_DATA_FILES as readonly string[]).includes(name)
  );
}

/**
 * Cerca file che la sincronizzazione cloud potrebbe aver creato come copie di
 * conflitto (es. "accounts-PC-DiCasa.json"): nomi non riconosciuti nella radice
 * dati o nella cartella transactions.
 */
async function findConflictCopies(): Promise<string[]> {
  const result: string[] = [];
  try {
    for (const name of await fs.readdir(DATA_DIR)) {
      if (name.startsWith(".") || name === TMP_DIRNAME) continue;
      const stat = await fs.stat(path.join(DATA_DIR, name));
      if (stat.isDirectory()) continue;
      if (!isKnownRootFile(name)) result.push(name);
    }
  } catch {
    // DATA_DIR potrebbe non esistere ancora
  }
  try {
    for (const name of await fs.readdir(TRANSACTIONS_DIR)) {
      if (name.startsWith(".")) continue;
      if (!/^\d{4}\.json$/.test(name)) result.push(`transactions/${name}`);
    }
  } catch {
    // cartella transactions potrebbe non esistere ancora
  }
  return result;
}

/**
 * Calcola gli avvisi di sincronizzazione da mostrare all'utente e aggiorna
 * l'heartbeat del lock + la revisione vista localmente. Non richiede la chiave
 * di sessione: legge solo metadati in chiaro.
 */
export async function getSyncStatus(): Promise<SyncStatus> {
  const warnings: string[] = [];
  const deviceId = await getDeviceId();
  const meta = await readSyncMeta();
  const lastSeen = await readJson<LastSeen>(LAST_SEEN_PATH);

  if (meta && lastSeen && meta.revision < lastSeen.revision) {
    warnings.push(
      "I dati nella cartella sincronizzata sembrano piu' vecchi dell'ultima " +
        "versione usata su questo dispositivo. Attendi che il cloud (es. " +
        "OneDrive) completi la sincronizzazione prima di apportare modifiche, " +
        "per evitare conflitti o perdita di dati."
    );
  }

  const lock = await readJson<LockInfo>(LOCK_PATH);
  if (lock && lock.deviceId !== deviceId) {
    const age = Date.now() - new Date(lock.updatedAt).getTime();
    if (Number.isFinite(age) && age >= 0 && age < LOCK_TTL_MS) {
      warnings.push(
        `Un altro dispositivo ("${lock.hostname}") potrebbe avere FinanceGuard ` +
          "aperto di recente. Usa un solo dispositivo alla volta per evitare " +
          "conflitti di sincronizzazione."
      );
    }
  }

  const conflicts = await findConflictCopies();
  if (conflicts.length > 0) {
    warnings.push(
      "Rilevati possibili file di conflitto creati dalla sincronizzazione " +
        `cloud: ${conflicts.join(", ")}. Verifica i dati: potrebbe esserci ` +
        "stata una modifica simultanea da piu' dispositivi."
    );
  }

  // Acquisiamo questa revisione come "vista" e rinfreschiamo il lock.
  if (meta && (!lastSeen || meta.revision >= lastSeen.revision)) {
    await writeLastSeen(meta.revision);
  }
  await refreshLock();

  return { warnings };
}
