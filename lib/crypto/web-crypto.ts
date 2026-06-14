/**
 * Crittografia isomorfa basata su Web Crypto (SubtleCrypto) + scrypt
 * (@noble/hashes). Produce e consuma lo STESSO formato envelope/vault del
 * modulo server `cipher.ts`/`vault.ts`, cosi' i dati restano compatibili.
 *
 * Questo modulo e' la base per la FASE 2 (app multi-piattaforma): puo' girare
 * nel browser e dentro un'app mobile (Capacitor/PWA) senza un server Node.
 */
import { scrypt } from "@noble/hashes/scrypt.js";

export interface ScryptParams {
  N: number;
  r: number;
  p: number;
}

export const SCRYPT_PARAMS: ScryptParams = { N: 131072, r: 8, p: 1 };
export const LEGACY_SCRYPT_PARAMS: ScryptParams = { N: 16384, r: 8, p: 1 };

const KEY_LENGTH = 32;
const IV_LENGTH = 12;
const TAG_LENGTH = 16;
const VERIFIER_PLAINTEXT = "financeguard-vault-v1";
const SALT_LENGTH = 16;

export interface Envelope {
  v: 1;
  iv: string;
  tag: string;
  ct: string;
}

export interface VaultFile {
  v: 1;
  salt: string;
  verifier: Envelope;
  kdf?: ScryptParams;
}

function getCrypto(): Crypto {
  const c = (globalThis as { crypto?: Crypto }).crypto;
  if (!c?.subtle) {
    throw new Error("Web Crypto non disponibile in questo ambiente.");
  }
  return c;
}

// I tipi DOM richiedono un BufferSource con ArrayBuffer "puro"; le Uint8Array
// prodotte da scrypt/TextEncoder sono tipizzate come ArrayBufferLike.
function asBufferSource(view: Uint8Array): BufferSource {
  return view as unknown as BufferSource;
}

function toBase64(bytes: Uint8Array): string {
  if (typeof btoa === "function") {
    let binary = "";
    for (let i = 0; i < bytes.length; i++) {
      binary += String.fromCharCode(bytes[i]);
    }
    return btoa(binary);
  }
  return Buffer.from(bytes).toString("base64");
}

function fromBase64(value: string): Uint8Array {
  if (typeof atob === "function") {
    const binary = atob(value);
    const out = new Uint8Array(binary.length);
    for (let i = 0; i < binary.length; i++) {
      out[i] = binary.charCodeAt(i);
    }
    return out;
  }
  return new Uint8Array(Buffer.from(value, "base64"));
}

export function deriveKeyWeb(
  password: string,
  salt: Uint8Array,
  params: ScryptParams = SCRYPT_PARAMS
): Uint8Array {
  return scrypt(new TextEncoder().encode(password), salt, {
    N: params.N,
    r: params.r,
    p: params.p,
    dkLen: KEY_LENGTH,
  });
}

async function importKey(
  key: Uint8Array,
  usage: "encrypt" | "decrypt"
): Promise<CryptoKey> {
  return getCrypto().subtle.importKey(
    "raw",
    asBufferSource(key),
    "AES-GCM",
    false,
    [usage]
  );
}

export async function encryptWeb(
  plaintext: string,
  key: Uint8Array
): Promise<Envelope> {
  const crypto = getCrypto();
  const iv = crypto.getRandomValues(new Uint8Array(IV_LENGTH));
  const ck = await importKey(key, "encrypt");
  const ctWithTag = new Uint8Array(
    await crypto.subtle.encrypt(
      { name: "AES-GCM", iv: asBufferSource(iv), tagLength: TAG_LENGTH * 8 },
      ck,
      asBufferSource(new TextEncoder().encode(plaintext))
    )
  );
  // Web Crypto concatena il tag in coda; lo separiamo per il formato envelope.
  const ct = ctWithTag.slice(0, ctWithTag.length - TAG_LENGTH);
  const tag = ctWithTag.slice(ctWithTag.length - TAG_LENGTH);
  return {
    v: 1,
    iv: toBase64(iv),
    tag: toBase64(tag),
    ct: toBase64(ct),
  };
}

export async function decryptWeb(
  env: Envelope,
  key: Uint8Array
): Promise<string> {
  const crypto = getCrypto();
  const iv = fromBase64(env.iv);
  const ct = fromBase64(env.ct);
  const tag = fromBase64(env.tag);
  const combined = new Uint8Array(ct.length + tag.length);
  combined.set(ct, 0);
  combined.set(tag, ct.length);
  const ck = await importKey(key, "decrypt");
  const pt = await crypto.subtle.decrypt(
    { name: "AES-GCM", iv: asBufferSource(iv), tagLength: TAG_LENGTH * 8 },
    ck,
    asBufferSource(combined)
  );
  return new TextDecoder().decode(pt);
}

export function isEnvelope(value: unknown): value is Envelope {
  if (typeof value !== "object" || value === null) return false;
  const env = value as Record<string, unknown>;
  return (
    env.v === 1 &&
    typeof env.iv === "string" &&
    typeof env.tag === "string" &&
    typeof env.ct === "string"
  );
}

export async function encryptJsonWeb<T>(
  data: T,
  key: Uint8Array
): Promise<string> {
  return JSON.stringify(await encryptWeb(JSON.stringify(data), key));
}

export async function decryptJsonWeb<T>(
  text: string,
  key: Uint8Array
): Promise<T> {
  const parsed: unknown = JSON.parse(text);
  if (!isEnvelope(parsed)) {
    throw new Error("Il file non e' in formato cifrato.");
  }
  return JSON.parse(await decryptWeb(parsed, key)) as T;
}

export async function createVaultWeb(
  password: string
): Promise<{ vault: VaultFile; key: Uint8Array }> {
  const salt = getCrypto().getRandomValues(new Uint8Array(SALT_LENGTH));
  const key = deriveKeyWeb(password, salt, SCRYPT_PARAMS);
  const verifier = await encryptWeb(VERIFIER_PLAINTEXT, key);
  return {
    vault: { v: 1, salt: toBase64(salt), verifier, kdf: { ...SCRYPT_PARAMS } },
    key,
  };
}

export async function verifyVaultPasswordWeb(
  vault: VaultFile,
  password: string
): Promise<Uint8Array | null> {
  const salt = fromBase64(vault.salt);
  const params = vault.kdf ?? LEGACY_SCRYPT_PARAMS;
  const key = deriveKeyWeb(password, salt, params);
  try {
    if ((await decryptWeb(vault.verifier, key)) !== VERIFIER_PLAINTEXT) {
      return null;
    }
    return key;
  } catch {
    return null;
  }
}
