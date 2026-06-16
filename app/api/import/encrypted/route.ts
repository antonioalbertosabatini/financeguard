import path from "path";
import JSZip from "jszip";
import { NextResponse } from "next/server";
import {
  ACCOUNT_TRANSFERS_DIR,
  DATA_DIR,
  TRANSACTIONS_DIR,
  VAULT_FILENAME,
} from "@/lib/constants";
import { ensureDataDir, writeJsonAtomic } from "@/lib/db/index";
import { decryptJson } from "@/lib/crypto/cipher";
import { isUnlocked, setSessionKey } from "@/lib/crypto/session";
import {
  verifyVaultPassword,
  writeVaultFile,
  type VaultFile,
} from "@/lib/crypto/vault";
import {
  ROOT_DATA_FILES,
  clearDataFiles,
  rootFileValidators,
} from "@/lib/db/backup";
import { accountTransfersFileSchema } from "@/lib/schemas/account-transfer";
import { transactionsFileSchema } from "@/lib/schemas/transaction";

export async function POST(request: Request) {
  if (!isUnlocked()) {
    return NextResponse.json(
      { error: "App bloccata. Sblocca con la password per importare." },
      { status: 401 }
    );
  }

  try {
    const formData = await request.formData();
    const file = formData.get("file");
    const password = formData.get("password");

    if (!file || !(file instanceof Blob)) {
      return NextResponse.json({ error: "File mancante" }, { status: 400 });
    }
    if (typeof password !== "string" || password.length === 0) {
      return NextResponse.json({ error: "Password mancante" }, { status: 400 });
    }

    const buffer = Buffer.from(await file.arrayBuffer());
    const zip = await JSZip.loadAsync(buffer);

    const dataFolder = zip.folder("data");
    if (!dataFolder) {
      return NextResponse.json(
        { error: "Archivio non valido: cartella data/ mancante" },
        { status: 400 }
      );
    }

    const vaultFile = dataFolder.file(VAULT_FILENAME);
    if (!vaultFile) {
      return NextResponse.json(
        {
          error:
            "Questo non e' un backup criptato (vault.json mancante). Usa l'import in chiaro.",
        },
        { status: 400 }
      );
    }

    const vault = JSON.parse(await vaultFile.async("string")) as VaultFile;
    const keyB = verifyVaultPassword(vault, password);
    if (!keyB) {
      return NextResponse.json(
        { error: "Password errata per questo backup." },
        { status: 400 }
      );
    }

    const rootData: { filename: string; validated: unknown }[] = [];
    for (const filename of ROOT_DATA_FILES) {
      const zipFile = dataFolder.file(filename);
      if (!zipFile) continue;
      const content = await zipFile.async("string");
      const decrypted = decryptJson<unknown>(content, keyB);
      rootData.push({
        filename,
        validated: rootFileValidators[filename](decrypted),
      });
    }

    const txData: { filename: string; validated: unknown }[] = [];
    const txFolder = dataFolder.folder("transactions");
    if (txFolder) {
      const txEntries: { name: string; file: JSZip.JSZipObject }[] = [];
      txFolder.forEach((relativePath, file) => {
        if (!file.dir && relativePath.endsWith(".json")) {
          txEntries.push({ name: path.basename(relativePath), file });
        }
      });
      for (const { name, file: entry } of txEntries) {
        const content = await entry.async("string");
        const decrypted = decryptJson<unknown>(content, keyB);
        txData.push({
          filename: name,
          validated: transactionsFileSchema.parse(decrypted),
        });
      }
    }

    const transferData: { filename: string; validated: unknown }[] = [];
    const transferFolder = dataFolder.folder("account-transfers");
    if (transferFolder) {
      const entries: { name: string; file: JSZip.JSZipObject }[] = [];
      transferFolder.forEach((relativePath, file) => {
        if (!file.dir && relativePath.endsWith(".json")) {
          entries.push({ name: path.basename(relativePath), file });
        }
      });
      for (const { name, file: entry } of entries) {
        const content = await entry.async("string");
        const decrypted = decryptJson<unknown>(content, keyB);
        transferData.push({
          filename: name,
          validated: accountTransfersFileSchema.parse(decrypted),
        });
      }
    }

    await ensureDataDir();
    setSessionKey(keyB);
    await clearDataFiles();
    await writeVaultFile(vault);

    for (const { filename, validated } of rootData) {
      await writeJsonAtomic(path.join(DATA_DIR, filename), validated);
    }
    for (const { filename, validated } of txData) {
      await writeJsonAtomic(path.join(TRANSACTIONS_DIR, filename), validated);
    }
    for (const { filename, validated } of transferData) {
      await writeJsonAtomic(
        path.join(ACCOUNT_TRANSFERS_DIR, filename),
        validated
      );
    }

    return NextResponse.json({ success: true });
  } catch (err) {
    return NextResponse.json(
      {
        error:
          err instanceof Error ? err.message : "Errore durante l'import",
      },
      { status: 400 }
    );
  }
}
