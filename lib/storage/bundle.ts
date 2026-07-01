/**
 * Formato "bundle" della FASE 2: un UNICO file cifrato che vive nella cartella
 * sincronizzata sul cloud. Contiene il vault (salt + verifier + parametri KDF),
 * i metadati di sincronizzazione (revision/device) e il dataset cifrato.
 *
 * Avere un solo file riduce le superfici di conflitto della sincronizzazione e
 * rende la guardia anti-stale semplice: prima di salvare ricarichiamo il file e
 * confrontiamo la revisione (nessun merge automatico, coerente con l'uso "un
 * dispositivo alla volta").
 */
import {
  createVaultWeb,
  decryptJsonWeb,
  encryptJsonWeb,
  verifyVaultPasswordWeb,
  type VaultFile,
} from "@/lib/crypto/web-crypto";
import type { StorageAdapter } from "@/lib/storage/adapter";

export const BUNDLE_FORMAT = 1;

export interface Bundle {
  app: "financeguard";
  format: number;
  vault: VaultFile;
  revision: number;
  lastWriterDeviceId: string;
  lastWriteAt: string;
  /** Dataset cifrato (envelope JSON) con la chiave del vault. */
  data: string;
}

export interface OpenedBundle<T> {
  key: Uint8Array;
  vault: VaultFile;
  revision: number;
  dataset: T;
}

export class ConflictError extends Error {
  constructor(
    public readonly localRevision: number,
    public readonly remoteRevision: number
  ) {
    super(
      "Il file e' stato modificato da un altro dispositivo (revisione " +
        `${remoteRevision} > ${localRevision}). Ricarica i dati prima di salvare.`
    );
    this.name = "ConflictError";
  }
}

export function revisionOf(bundleText: string): number {
  try {
    const rev = (JSON.parse(bundleText) as { revision?: number }).revision;
    return typeof rev === "number" ? rev : 0;
  } catch {
    return 0;
  }
}

function parseBundle(text: string): Bundle {
  const parsed = JSON.parse(text) as Bundle;
  if (parsed.app !== "financeguard" || typeof parsed.revision !== "number") {
    throw new Error("File non riconosciuto come bundle FinanceGuard.");
  }
  return parsed;
}

/** Crea il testo di un nuovo bundle a partire da un dataset iniziale. */
export async function createBundle<T>(
  password: string,
  dataset: T,
  deviceId: string
): Promise<{ text: string; key: Uint8Array; vault: VaultFile }> {
  const { vault, key } = await createVaultWeb(password);
  const data = await encryptJsonWeb(dataset, key);
  const bundle: Bundle = {
    app: "financeguard",
    format: BUNDLE_FORMAT,
    vault,
    revision: 1,
    lastWriterDeviceId: deviceId,
    lastWriteAt: new Date().toISOString(),
    data,
  };
  return { text: JSON.stringify(bundle), key, vault };
}

/** Apre e decifra il bundle dall'adapter usando la password. */
export async function openBundle<T>(
  adapter: StorageAdapter,
  password: string
): Promise<OpenedBundle<T> | null> {
  const text = await adapter.load();
  if (!text) return null;
  return openBundleText<T>(text, password);
}

/** Apre e decifra un bundle già in memoria (sync cloud). */
export async function openBundleText<T>(
  text: string,
  password: string
): Promise<OpenedBundle<T> | null> {
  const bundle = parseBundle(text);
  const key = await verifyVaultPasswordWeb(bundle.vault, password);
  if (!key) throw new Error("Password errata per questo file.");
  const dataset = await decryptJsonWeb<T>(bundle.data, key);
  return { key, vault: bundle.vault, revision: bundle.revision, dataset };
}

/** Decifra un bundle con la chiave di sessione già in memoria. */
export async function decryptBundleWithKey<T>(
  text: string,
  key: Uint8Array
): Promise<{ revision: number; dataset: T; vault: VaultFile }> {
  const bundle = parseBundle(text);
  const dataset = await decryptJsonWeb<T>(bundle.data, key);
  return { revision: bundle.revision, dataset, vault: bundle.vault };
}

/**
 * Salva il dataset incrementando la revisione. Prima ricarica il file e, se la
 * revisione remota e' piu' avanti di quella attesa, lancia ConflictError invece
 * di sovrascrivere (la UI deve invitare a ricaricare).
 */
export async function saveBundle<T>(
  adapter: StorageAdapter,
  opened: Pick<OpenedBundle<T>, "key" | "vault" | "revision">,
  dataset: T,
  deviceId: string
): Promise<number> {
  const current = await adapter.load();
  if (current) {
    const remote = parseBundle(current);
    if (remote.revision > opened.revision) {
      throw new ConflictError(opened.revision, remote.revision);
    }
  }
  const nextRevision = opened.revision + 1;
  const bundle: Bundle = {
    app: "financeguard",
    format: BUNDLE_FORMAT,
    vault: opened.vault,
    revision: nextRevision,
    lastWriterDeviceId: deviceId,
    lastWriteAt: new Date().toISOString(),
    data: await encryptJsonWeb(dataset, opened.key),
  };
  await adapter.save(JSON.stringify(bundle));
  return nextRevision;
}
