import crypto from "crypto";

const ALGORITHM = "aes-256-gcm";
const KEY_LENGTH = 32;
const IV_LENGTH = 12;

export const SCRYPT_PARAMS = { N: 16384, r: 8, p: 1 } as const;
const SCRYPT_MAXMEM = 64 * 1024 * 1024;

export interface Envelope {
  v: 1;
  iv: string;
  tag: string;
  ct: string;
}

export function deriveKey(password: string, salt: Buffer): Buffer {
  return crypto.scryptSync(password, salt, KEY_LENGTH, {
    N: SCRYPT_PARAMS.N,
    r: SCRYPT_PARAMS.r,
    p: SCRYPT_PARAMS.p,
    maxmem: SCRYPT_MAXMEM,
  });
}

export function encrypt(plaintext: string, key: Buffer): Envelope {
  const iv = crypto.randomBytes(IV_LENGTH);
  const cipher = crypto.createCipheriv(ALGORITHM, key, iv);
  const ct = Buffer.concat([cipher.update(plaintext, "utf8"), cipher.final()]);
  const tag = cipher.getAuthTag();
  return {
    v: 1,
    iv: iv.toString("base64"),
    tag: tag.toString("base64"),
    ct: ct.toString("base64"),
  };
}

export function decrypt(env: Envelope, key: Buffer): string {
  const iv = Buffer.from(env.iv, "base64");
  const tag = Buffer.from(env.tag, "base64");
  const ct = Buffer.from(env.ct, "base64");
  const decipher = crypto.createDecipheriv(ALGORITHM, key, iv);
  decipher.setAuthTag(tag);
  return Buffer.concat([decipher.update(ct), decipher.final()]).toString("utf8");
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

export function encryptJson<T>(data: T, key: Buffer): string {
  return JSON.stringify(encrypt(JSON.stringify(data), key));
}

export function decryptJson<T>(text: string, key: Buffer): T {
  const parsed: unknown = JSON.parse(text);
  if (!isEnvelope(parsed)) {
    throw new Error("Il file non e' in formato cifrato.");
  }
  return JSON.parse(decrypt(parsed, key)) as T;
}
