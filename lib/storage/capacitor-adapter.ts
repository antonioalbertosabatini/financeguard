/**
 * StorageAdapter basato su @capacitor/filesystem per le app native iOS/Android.
 *
 * NB: lo store di default del vault resta IndexedDB (lib/storage/idb-adapter),
 * che nelle WebView di iOS/Android e' persistente e non richiede permessi.
 * Questo adapter serve come destinazione alternativa quando si vuole tenere il
 * bundle cifrato come file nativo (es. per condivisione/backup o sync su una
 * cartella). Implementa la stessa interfaccia StorageAdapter, quindi e'
 * intercambiabile senza toccare lib/crypto o lib/storage/data-store.
 *
 * Il modulo @capacitor/filesystem viene importato in modo dinamico per non
 * rompere il bundle quando gira su web/desktop dove il plugin non esiste.
 */
import type { StorageAdapter } from "@/lib/storage/adapter";

const BUNDLE_FILE = "financeguard.fgv";

export class CapacitorFilesystemAdapter implements StorageAdapter {
  readonly id = "capacitor-filesystem";

  async load(): Promise<string | null> {
    const { Filesystem, Directory, Encoding } = await import(
      "@capacitor/filesystem"
    );
    try {
      const result = await Filesystem.readFile({
        path: BUNDLE_FILE,
        directory: Directory.Data,
        encoding: Encoding.UTF8,
      });
      const text =
        typeof result.data === "string" ? result.data : await result.data.text();
      return text.trim() === "" ? null : text;
    } catch {
      return null;
    }
  }

  async save(content: string): Promise<void> {
    const { Filesystem, Directory, Encoding } = await import(
      "@capacitor/filesystem"
    );
    await Filesystem.writeFile({
      path: BUNDLE_FILE,
      data: content,
      directory: Directory.Data,
      encoding: Encoding.UTF8,
    });
  }
}
