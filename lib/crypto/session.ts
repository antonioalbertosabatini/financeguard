const GLOBAL_KEY = Symbol.for("financeguard.sessionKey");

interface KeyStore {
  key: Buffer | null;
}

function store(): KeyStore {
  const g = globalThis as unknown as Record<symbol, KeyStore | undefined>;
  if (!g[GLOBAL_KEY]) {
    g[GLOBAL_KEY] = { key: null };
  }
  return g[GLOBAL_KEY]!;
}

export function setSessionKey(key: Buffer): void {
  store().key = key;
}

export function getSessionKey(): Buffer {
  const key = store().key;
  if (!key) {
    throw new Error(
      "App bloccata: inserisci la password per accedere ai dati."
    );
  }
  return key;
}

export function isUnlocked(): boolean {
  return store().key !== null;
}

export function lockSession(): void {
  store().key = null;
}
