import fs from "fs/promises";
import path from "path";
import JSZip from "jszip";
import { NextResponse } from "next/server";
import { DATA_DIR, TRANSACTIONS_DIR } from "@/lib/constants";
import { ensureDataDir } from "@/lib/db/index";

export async function GET() {
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
        const content = await fs.readFile(fullPath, "utf-8");
        zipFolder.file(entry, content);
      }
    }
  }

  const rootFolder = zip.folder("data")!;
  const rootFiles = await fs.readdir(DATA_DIR);
  for (const file of rootFiles) {
    const fullPath = path.join(DATA_DIR, file);
    const stat = await fs.stat(fullPath);
    if (stat.isFile() && file.endsWith(".json")) {
      const content = await fs.readFile(fullPath, "utf-8");
      rootFolder.file(file, content);
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
