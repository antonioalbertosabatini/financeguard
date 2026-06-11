import crypto from "crypto";
import fs from "fs/promises";
import path from "path";
import { DATA_DIR, TRANSACTIONS_DIR, VAULT_PATH } from "@/lib/constants";
import {
  decrypt,
  deriveKey,
  encrypt,
  encryptJson,
  isEnvelope,
  type Envelope,
} from "@/lib/crypto/cipher";

const VERIFIER_PLAINTEXT = "financeguard-vault-v1";
const SALT_LENGTH = 16;
const ROOT_DATA_FILES = [
  "accounts.json",
  "categories.json",
  "budgets.json",
  "settings.json",
];

interface VaultFile {
  v: 1;
  salt: string;
  verifier: Envelope;
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
  await fs.mkdir(path.dirname(filePath), { recursive: true });
  const tempPath = `${filePath}.tmp`;
  await fs.writeFile(tempPath, content, "utf-8");
  await fs.rename(tempPath, filePath);
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

export async function initVault(password: string): Promise<Buffer> {
  await fs.mkdir(DATA_DIR, { recursive: true });
  const salt = crypto.randomBytes(SALT_LENGTH);
  const key = deriveKey(password, salt);

  await migrateToEncrypted(key);

  const vault: VaultFile = {
    v: 1,
    salt: salt.toString("base64"),
    verifier: encrypt(VERIFIER_PLAINTEXT, key),
  };
  await writeRaw(VAULT_PATH, JSON.stringify(vault, null, 2));

  return key;
}

export async function verifyPassword(password: string): Promise<Buffer | null> {
  const vault = await readVault();
  const salt = Buffer.from(vault.salt, "base64");
  const key = deriveKey(password, salt);
  try {
    if (decrypt(vault.verifier, key) !== VERIFIER_PLAINTEXT) return null;
    return key;
  } catch {
    return null;
  }
}
