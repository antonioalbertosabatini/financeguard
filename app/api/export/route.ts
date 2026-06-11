import fs from "fs/promises";
import path from "path";
import JSZip from "jszip";
import { NextResponse } from "next/server";
import { DATA_DIR, TRANSACTIONS_DIR, VAULT_FILENAME } from "@/lib/constants";
import { ensureDataDir } from "@/lib/db/index";
import { decryptJson } from "@/lib/crypto/cipher";
import { getSessionKey, isUnlocked } from "@/lib/crypto/session";

async function readDecrypted(filePath: string, key: Buffer): Promise<string> {
  const content = await fs.readFile(filePath, "utf-8");
  const data = decryptJson<unknown>(content, key);
  return JSON.stringify(data, null, 2);
}

export async function GET() {
  if (!isUnlocked()) {
    return NextResponse.json(
      { error: "App bloccata. Sblocca con la password per esportare." },
      { status: 401 }
    );
  }

  const key = getSessionKey();
  await ensureDataDir();

  const zip = new JSZip();

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
        zipFolder.file(entry, await readDecrypted(fullPath, key));
      }
    }
  }

  const rootFolder = zip.folder("data")!;
  const rootFiles = await fs.readdir(DATA_DIR);
  for (const file of rootFiles) {
    if (file === VAULT_FILENAME) continue;
    const fullPath = path.join(DATA_DIR, file);
    const stat = await fs.stat(fullPath);
    if (stat.isFile() && file.endsWith(".json")) {
      rootFolder.file(file, await readDecrypted(fullPath, key));
    }
  }

  await addDir(TRANSACTIONS_DIR, rootFolder.folder("transactions")!);

  const buffer = await zip.generateAsync({ type: "arraybuffer" });

  return new NextResponse(buffer, {
    headers: {
      "Content-Type": "application/zip",
      "Content-Disposition": `attachment; filename="financeguard-export-${new Date().toISOString().slice(0, 10)}.zip"`,
    },
  });
}
