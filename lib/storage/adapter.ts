/**
 * Astrazione di storage per la FASE 2 (app local-first multi-piattaforma).
 *
 * Un `StorageAdapter` legge/scrive il bundle cifrato (vedi `bundle.ts`) da/verso
 * una destinazione concreta. Su desktop usiamo la File System Access API per
 * puntare direttamente a un file dentro la cartella sincronizzata (es. OneDrive);
 * su mobile l'implementazione userebbe il document picker nativo (Capacitor).
 *
 * Mantenere questa interfaccia stretta permette di sostituire la destinazione
 * senza toccare la logica dati/crittografia.
 */

export interface StorageAdapter {
  readonly id: string;
  /** Restituisce il contenuto del bundle, o null se non esiste/e' vuoto. */
  load(): Promise<string | null>;
  /** Sovrascrive il bundle con il contenuto fornito. */
  save(content: string): Promise<void>;
}

/** Sottoinsieme di FileSystemFileHandle usato da questo modulo. */
export interface FileSystemFileHandleLike {
  readonly name: string;
  getFile(): Promise<File>;
  createWritable(): Promise<{
    write(data: string | BufferSource | Blob): Promise<void>;
    close(): Promise<void>;
  }>;
  queryPermission?(descriptor: {
    mode: "read" | "readwrite";
  }): Promise<PermissionState>;
  requestPermission?(descriptor: {
    mode: "read" | "readwrite";
  }): Promise<PermissionState>;
}

export class FileSystemAccessAdapter implements StorageAdapter {
  readonly id = "file-system-access";

  constructor(private readonly handle: FileSystemFileHandleLike) {}

  /** Verifica/chiede il permesso di scrittura sul file scelto. */
  async ensurePermission(): Promise<boolean> {
    const descriptor = { mode: "readwrite" as const };
    if (this.handle.queryPermission) {
      if ((await this.handle.queryPermission(descriptor)) === "granted") {
        return true;
      }
    }
    if (this.handle.requestPermission) {
      return (await this.handle.requestPermission(descriptor)) === "granted";
    }
    return true;
  }

  async load(): Promise<string | null> {
    try {
      const file = await this.handle.getFile();
      const text = await file.text();
      return text.trim() === "" ? null : text;
    } catch {
      return null;
    }
  }

  async save(content: string): Promise<void> {
    const writable = await this.handle.createWritable();
    try {
      await writable.write(content);
    } finally {
      await writable.close();
    }
  }
}

export function isFileSystemAccessSupported(): boolean {
  return typeof window !== "undefined" && "showOpenFilePicker" in window;
}

interface FilePickerWindow {
  showOpenFilePicker(options?: unknown): Promise<FileSystemFileHandleLike[]>;
  showSaveFilePicker(options?: unknown): Promise<FileSystemFileHandleLike>;
}

const FILE_PICKER_TYPES = [
  {
    description: "FinanceGuard vault",
    accept: { "application/json": [".fgv", ".json"] },
  },
];

export async function pickExistingFile(): Promise<FileSystemFileHandleLike | null> {
  if (!isFileSystemAccessSupported()) return null;
  const win = window as unknown as FilePickerWindow;
  const [handle] = await win.showOpenFilePicker({
    types: FILE_PICKER_TYPES,
    multiple: false,
  });
  return handle ?? null;
}

export async function pickNewFile(
  suggestedName = "financeguard.fgv"
): Promise<FileSystemFileHandleLike | null> {
  if (!isFileSystemAccessSupported()) return null;
  const win = window as unknown as FilePickerWindow;
  return win.showSaveFilePicker({ suggestedName, types: FILE_PICKER_TYPES });
}
