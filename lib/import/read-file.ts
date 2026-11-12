/**
 * Legge un file scelto dall'utente (CSV o Excel) e lo restituisce come tabella
 * di stringhe (prima riga = intestazione). Gira interamente nel client: funziona
 * uguale su web, Electron e Capacitor perche' usa l'oggetto File del webview.
 */
import { AppError } from "@/lib/i18n/app-error";
import { parseCsv } from "@/lib/import/csv";

function pad(value: number) {
  return String(value).padStart(2, "0");
}

function cellToString(cell: unknown): string {
  if (cell === null || cell === undefined) return "";
  if (cell instanceof Date) {
    // Le date Excel non hanno fuso: usiamo i componenti UTC.
    return `${cell.getUTCFullYear()}-${pad(cell.getUTCMonth() + 1)}-${pad(
      cell.getUTCDate()
    )}`;
  }
  return String(cell);
}

export function fileExtension(name: string): string {
  const idx = name.lastIndexOf(".");
  return idx >= 0 ? name.slice(idx).toLowerCase() : "";
}

export async function readTabularFile(file: File): Promise<string[][]> {
  const ext = fileExtension(file.name);
  if (ext === ".csv" || ext === ".txt" || ext === ".tsv") {
    return parseCsv(await file.text());
  }
  if (ext === ".xlsx") {
    const { readSheet } = await import("read-excel-file/browser");
    try {
      const data = await readSheet(file);
      return data
        .map((row) => row.map(cellToString))
        .filter((row) => row.some((cell) => cell.trim() !== ""));
    } catch {
      throw new AppError("errors.importUnreadableFile");
    }
  }
  throw new AppError("errors.importUnsupportedFile");
}
