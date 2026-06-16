import path from "path";
import JSZip from "jszip";
import { NextResponse } from "next/server";
import { ACCOUNT_TRANSFERS_DIR, DATA_DIR, TRANSACTIONS_DIR } from "@/lib/constants";
import { ensureDataDir, writeJsonAtomic } from "@/lib/db/index";
import { isUnlocked } from "@/lib/crypto/session";
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
    if (!file || !(file instanceof Blob)) {
      return NextResponse.json({ error: "File mancante" }, { status: 400 });
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

    const rootData: { filename: string; validated: unknown }[] = [];
    for (const filename of ROOT_DATA_FILES) {
      const zipFile = dataFolder.file(filename);
      if (!zipFile) continue;
      const content = await zipFile.async("string");
      const parsed = JSON.parse(content);
      rootData.push({
        filename,
        validated: rootFileValidators[filename](parsed),
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
        txData.push({
          filename: name,
          validated: transactionsFileSchema.parse(JSON.parse(content)),
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
        transferData.push({
          filename: name,
          validated: accountTransfersFileSchema.parse(JSON.parse(content)),
        });
      }
    }

    await ensureDataDir();
    await clearDataFiles();

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
