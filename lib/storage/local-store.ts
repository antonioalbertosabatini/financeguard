/**
 * Stato locale per-dispositivo per la FASE 2, salvato in IndexedDB (browser).
 *
 * Serve a: ricordare il file scelto (FileSystemFileHandle e' clonabile e puo'
 * essere persistito in IndexedDB), conservare l'ultima revisione vista da questo
 * dispositivo (guardia anti-stale) e il device id. NON viene mai sincronizzato
 * sul cloud: e' l'equivalente client di `LOCAL_STATE_DIR` lato server.
 */

const DB_NAME = "financeguard-local";
const STORE = "kv";
const DB_VERSION = 1;

function isAvailable(): boolean {
  return typeof indexedDB !== "undefined";
}

function openDb(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION);
    request.onupgradeneeded = () => {
      const db = request.result;
      if (!db.objectStoreNames.contains(STORE)) {
        db.createObjectStore(STORE);
      }
    };
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

async function withStore<T>(
  mode: IDBTransactionMode,
  fn: (store: IDBObjectStore) => IDBRequest
): Promise<T> {
  const db = await openDb();
  try {
    return await new Promise<T>((resolve, reject) => {
      const tx = db.transaction(STORE, mode);
      const request = fn(tx.objectStore(STORE));
      request.onsuccess = () => resolve(request.result as T);
      request.onerror = () => reject(request.error);
    });
  } finally {
    db.close();
  }
}

export async function idbGet<T>(key: string): Promise<T | undefined> {
  if (!isAvailable()) return undefined;
  return withStore<T | undefined>("readonly", (store) => store.get(key));
}

export async function idbSet<T>(key: string, value: T): Promise<void> {
  if (!isAvailable()) return;
  await withStore("readwrite", (store) => store.put(value, key));
}

export async function idbDelete(key: string): Promise<void> {
  if (!isAvailable()) return;
  await withStore("readwrite", (store) => store.delete(key));
}

const DEVICE_ID_KEY = "device-id";
const LAST_SEEN_KEY = "last-seen-revision";
const FILE_HANDLE_KEY = "file-handle";

export async function getLocalDeviceId(): Promise<string> {
  const existing = await idbGet<string>(DEVICE_ID_KEY);
  if (existing) return existing;
  const id =
    typeof crypto !== "undefined" && "randomUUID" in crypto
      ? crypto.randomUUID()
      : `dev-${Date.now()}-${Math.random().toString(36).slice(2)}`;
  await idbSet(DEVICE_ID_KEY, id);
  return id;
}

export async function getLastSeenRevision(): Promise<number> {
  return (await idbGet<number>(LAST_SEEN_KEY)) ?? 0;
}

export async function setLastSeenRevision(revision: number): Promise<void> {
  await idbSet(LAST_SEEN_KEY, revision);
}

export async function rememberFileHandle<T>(handle: T): Promise<void> {
  await idbSet(FILE_HANDLE_KEY, handle);
}

export async function recallFileHandle<T>(): Promise<T | undefined> {
  return idbGet<T>(FILE_HANDLE_KEY);
}
