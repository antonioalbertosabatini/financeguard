import fs from "fs/promises";
import path from "path";
import JSZip from "jszip";
import { NextResponse } from "next/server";
import { DATA_DIR, TRANSACTIONS_DIR } from "@/lib/constants";
import { ensureDataDir, writeJsonAtomic } from "@/lib/db/index";
import { accountsFileSchema } from "@/lib/schemas/account";
import { parseCategoriesFile } from "@/lib/schemas/category";
import { budgetsFileSchema } from "@/lib/schemas/budget";
import { settingsSchema } from "@/lib/schemas/settings";
import { transactionsFileSchema } from "@/lib/schemas/transaction";

export async function POST(request: Request) {
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

    await ensureDataDir();

    const rootFiles = ["accounts.json", "categories.json", "budgets.json", "settings.json"];
    const validators: Record<string, (data: unknown) => unknown> = {
      "accounts.json": (d) => accountsFileSchema.parse(d),
      "categories.json": (d) => ({ categories: parseCategoriesFile(d) }),
      "budgets.json": (d) => budgetsFileSchema.parse(d),
      "settings.json": (d) => settingsSchema.parse(d),
    };

    for (const filename of rootFiles) {
      const zipFile = dataFolder.file(filename);
      if (zipFile) {
        const content = await zipFile.async("string");
        const parsed = JSON.parse(content);
        const validated = validators[filename](parsed);
        await writeJsonAtomic(path.join(DATA_DIR, filename), validated);
      }
    }

    const txFolder = dataFolder.folder("transactions");
    if (txFolder) {
      await fs.mkdir(TRANSACTIONS_DIR, { recursive: true });
      const txFiles = Object.keys(txFolder.files).filter(
        (f) => f.endsWith(".json") && !f.endsWith("/")
      );

      for (const filename of txFiles) {
        const zipFile = txFolder.file(filename);
        if (zipFile) {
          const content = await zipFile.async("string");
          const parsed = transactionsFileSchema.parse(JSON.parse(content));
          await writeJsonAtomic(
            path.join(TRANSACTIONS_DIR, filename),
            parsed
          );
        }
      }
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
