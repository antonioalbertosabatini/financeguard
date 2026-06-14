import crypto from "crypto";
import fs from "fs/promises";
import path from "path";
import {
  DATA_DIR,
  ROOT_DATA_FILES,
  TRANSACTIONS_DIR,
  VAULT_PATH,
} from "@/lib/constants";
import {
  decrypt,
  deriveKey,
  encrypt,
  encryptJson,
  isEnvelope,
  scryptParamsEqual,
  SCRYPT_PARAMS,
  LEGACY_SCRYPT_PARAMS,
  type Envelope,
  type ScryptParams,
} from "@/lib/crypto/cipher";
import { writeFileRobust } from "@/lib/db/index";
import { markDataWritten } from "@/lib/db/sync-guard";

const VERIFIER_PLAINTEXT = "financeguard-vault-v1";
const SALT_LENGTH = 16;

export interface VaultFile {
  v: 1;
  salt: string;
  verifier: Envelope;
  // Parametri KDF usati per questo vault. Assente => vault legacy.
  kdf?: ScryptParams;
}

function vaultParams(vault: VaultFile): ScryptParams {
  return vault.kdf ?? LEGACY_SCRYPT_PARAMS;
}

export function vaultNeedsUpgrade(vault: VaultFile): boolean {
  return !scryptParamsEqual(vaultParams(vault), SCRYPT_PARAMS);
}

export async function vaultExists(): Promise<boolean> {
  try {
    await fs.access(VAULT_PATH);
    return true;
  } catch {
    return false;
  }
}

async function readVault(): Promise<VaultFile> {
  const content = await fs.readFile(VAULT_PATH, "utf-8");
  return JSON.parse(content) as VaultFile;
}

async function writeRaw(filePath: string, content: string): Promise<void> {
  await writeFileRobust(filePath, content);
}

export function createVault(password: string): {
  vault: VaultFile;
  key: Buffer;
} {
  const salt = crypto.randomBytes(SALT_LENGTH);
  const key = deriveKey(password, salt, SCRYPT_PARAMS);
  const vault: VaultFile = {
    v: 1,
    salt: salt.toString("base64"),
    verifier: encrypt(VERIFIER_PLAINTEXT, key),
    kdf: { ...SCRYPT_PARAMS },
  };
  return { vault, key };
}

export function verifyVaultPassword(
  vault: VaultFile,
  password: string
): Buffer | null {
  const salt = Buffer.from(vault.salt, "base64");
  const key = deriveKey(password, salt, vaultParams(vault));
  try {
    if (decrypt(vault.verifier, key) !== VERIFIER_PLAINTEXT) return null;
    return key;
  } catch {
    return null;
  }
}

export async function writeVaultFile(vault: VaultFile): Promise<void> {
  await writeRaw(VAULT_PATH, JSON.stringify(vault, null, 2));
}

async function encryptFileIfPlaintext(
  filePath: string,
  key: Buffer
): Promise<void> {
  let content: string;
  try {
    content = await fs.readFile(filePath, "utf-8");
  } catch {
    return;
  }
  if (content.trim() === "") return;

  let parsed: unknown;
  try {
    parsed = JSON.parse(content);
  } catch {
    return;
  }
  if (isEnvelope(parsed)) return;

  await writeRaw(filePath, encryptJson(parsed, key));
}

async function migrateToEncrypted(key: Buffer): Promise<void> {
  for (const filename of ROOT_DATA_FILES) {
    await encryptFileIfPlaintext(path.join(DATA_DIR, filename), key);
  }

  try {
    const txFiles = await fs.readdir(TRANSACTIONS_DIR);
    for (const filename of txFiles) {
      if (!filename.endsWith(".json")) continue;
      await encryptFileIfPlaintext(
        path.join(TRANSACTIONS_DIR, filename),
        key
      );
    }
  } catch {
    // transactions dir may not exist yet
  }
}

async function reKeyFile(
  filePath: string,
  fromKey: Buffer,
  toKey: Buffer
): Promise<void> {
  let content: string;
  try {
    content = await fs.readFile(filePath, "utf-8");
  } catch {
    return;
  }
  if (content.trim() === "") return;

  let parsed: unknown;
  try {
    parsed = JSON.parse(content);
  } catch {
    return;
  }
  if (!isEnvelope(parsed)) return;

  const reEncrypted = JSON.stringify(encrypt(decrypt(parsed, fromKey), toKey));
  await writeRaw(filePath, reEncrypted);
}

export async function reKeyAllData(
  fromKey: Buffer,
  toKey: Buffer
): Promise<void> {
  for (const filename of ROOT_DATA_FILES) {
    await reKeyFile(path.join(DATA_DIR, filename), fromKey, toKey);
  }

  try {
    const txFiles = await fs.readdir(TRANSACTIONS_DIR);
    for (const filename of txFiles) {
      if (!filename.endsWith(".json")) continue;
      await reKeyFile(path.join(TRANSACTIONS_DIR, filename), fromKey, toKey);
    }
  } catch {
    // transactions dir may not exist yet
  }
}

export async function initVault(password: string): Promise<Buffer> {
  await fs.mkdir(DATA_DIR, { recursive: true });
  const { vault, key } = createVault(password);

  await migrateToEncrypted(key);
  await writeVaultFile(vault);
  await markDataWritten();

  return key;
}

/**
 * Aggiorna i parametri KDF del vault: deriva una nuova chiave con i parametri
 * attuali (nuovo salt), ri-cifra tutti i dati e riscrive il vault. Restituisce
 * la nuova chiave da usare per la sessione.
 */
export async function upgradeVaultKdf(
  password: string,
  oldKey: Buffer
): Promise<Buffer> {
  const { vault, key: newKey } = createVault(password);
  await reKeyAllData(oldKey, newKey);
  await writeVaultFile(vault);
  await markDataWritten();
  return newKey;
}

export async function verifyPassword(password: string): Promise<Buffer | null> {
  const vault = await readVault();
  const key = verifyVaultPassword(vault, password);
  if (!key) return null;
  if (vaultNeedsUpgrade(vault)) {
    try {
      return await upgradeVaultKdf(password, key);
    } catch {
      // Se l'upgrade fallisce, consenti comunque l'accesso con la chiave attuale.
      return key;
    }
  }
  return key;
}
