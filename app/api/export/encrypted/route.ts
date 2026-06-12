import fs from "fs/promises";
import path from "path";
import JSZip from "jszip";
import { NextResponse } from "next/server";
import { DATA_DIR, TRANSACTIONS_DIR, VAULT_FILENAME } from "@/lib/constants";
import { ensureDataDir } from "@/lib/db/index";
import { decrypt, encrypt, isEnvelope } from "@/lib/crypto/cipher";
import { getSessionKey, isUnlocked } from "@/lib/crypto/session";
import { createVault } from "@/lib/crypto/vault";

const MIN_PASSWORD_LENGTH = 8;

function reKey(content: string, keyFrom: Buffer, keyTo: Buffer): string {
  const parsed: unknown = JSON.parse(content);
  if (!isEnvelope(parsed)) {
    throw new Error("File non in formato cifrato.");
  }
  const plaintext = decrypt(parsed, keyFrom);
  return JSON.stringify(encrypt(plaintext, keyTo));
}

export async function POST(request: Request) {
  if (!isUnlocked()) {
    return NextResponse.json(
      { error: "App bloccata. Sblocca con la password per esportare." },
      { status: 401 }
    );
  }

  let password: string;
  try {
    const body = (await request.json()) as { password?: unknown };
    if (typeof body.password !== "string") {
      return NextResponse.json({ error: "Password mancante" }, { status: 400 });
    }
    password = body.password;
  } catch {
    return NextResponse.json({ error: "Richiesta non valida" }, { status: 400 });
  }

  if (password.length < MIN_PASSWORD_LENGTH) {
    return NextResponse.json(
      {
        error: `La password deve avere almeno ${MIN_PASSWORD_LENGTH} caratteri.`,
      },
      { status: 400 }
    );
  }

  const keyA = getSessionKey();
  const { vault, key: keyB } = createVault(password);
  await ensureDataDir();

  const zip = new JSZip();
  const rootFolder = zip.folder("data")!;

  async function addDir(dirPath: string, zipFolder: JSZip) {
    let entries: string[];
    try {
      entries = await fs.readdir(dirPath);
    } catch {
      return;
    }
    for (const entry of entries) {
      const fullPath = path.join(dirPath, entry);
      const stat = await fs.stat(fullPath);
      if (stat.isDirectory()) {
        await addDir(fullPath, zipFolder.folder(entry)!);
      } else if (entry.endsWith(".json")) {
        const content = await fs.readFile(fullPath, "utf-8");
        zipFolder.file(entry, reKey(content, keyA, keyB));
      }
    }
  }

  const rootFiles = await fs.readdir(DATA_DIR);
  for (const file of rootFiles) {
    if (file === VAULT_FILENAME) continue;
    const fullPath = path.join(DATA_DIR, file);
    const stat = await fs.stat(fullPath);
    if (stat.isFile() && file.endsWith(".json")) {
      const content = await fs.readFile(fullPath, "utf-8");
      rootFolder.file(file, reKey(content, keyA, keyB));
    }
  }

  await addDir(TRANSACTIONS_DIR, rootFolder.folder("transactions")!);

  rootFolder.file(VAULT_FILENAME, JSON.stringify(vault, null, 2));

  const buffer = await zip.generateAsync({ type: "arraybuffer" });

  return new NextResponse(buffer, {
    headers: {
      "Content-Type": "application/zip",
      "Content-Disposition": `attachment; filename="financeguard-backup-criptato-${new Date().toISOString().slice(0, 10)}.zip"`,
    },
  });
}
